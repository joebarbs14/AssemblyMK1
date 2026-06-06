"""V7 admin + cross-cutting endpoints: global search, staff admin
transitions for the v3-v6 modules, lifecycle batch runner.

This is the "make councils able to operate" pass — without these
endpoints, councils have to edit the database directly.
"""
from __future__ import annotations

import secrets
from datetime import UTC, date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import (
    Business,
    DisasterAlert,
    EvacCentre,
    FireBan,
    HeritageSite,
    InfoRequest,
    JobListing,
    KbArticle,
    LibraryHold,
    LostFoundItem,
    Petition,
    Report,
    SandbagDepot,
    Survey,
    SurveyQuestion,
    Tender,
    User,
    UserRole,
)
from app.services.notify import notify

router = APIRouter(tags=["council-v7-admin"])


def _staff(user: User) -> None:
    if user.role not in (UserRole.staff.value, UserRole.admin.value):
        raise HTTPException(status_code=403, detail="Staff only")


def _admin(user: User) -> None:
    if user.role != UserRole.admin.value:
        raise HTTPException(status_code=403, detail="Admin only")


# ============ Global search ============


@router.get("/search")
def global_search(q: str = Query(min_length=2, max_length=100),
                  user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)) -> dict[str, Any]:
    """Tenant-scoped lexical search across reports, KB, businesses, tenders,
    jobs, heritage and FAQ."""
    like = f"%{q}%"
    cid = user.council_id
    reports = (
        db.query(Report)
        .filter(Report.council_id == cid,
                or_(Report.title.ilike(like), Report.description.ilike(like)))
        .limit(10).all()
    )
    kb = (
        db.query(KbArticle)
        .filter(KbArticle.council_id == cid,
                or_(KbArticle.title.ilike(like), KbArticle.body.ilike(like)))
        .limit(10).all()
    )
    businesses = (
        db.query(Business)
        .filter(Business.council_id == cid,
                or_(Business.name.ilike(like), Business.description.ilike(like)))
        .limit(10).all()
    )
    tenders = (
        db.query(Tender)
        .filter(Tender.council_id == cid,
                or_(Tender.title.ilike(like), Tender.description.ilike(like)))
        .limit(10).all()
    )
    jobs = (
        db.query(JobListing)
        .filter(JobListing.council_id == cid,
                or_(JobListing.title.ilike(like), JobListing.employer.ilike(like)))
        .limit(10).all()
    )
    heritage = (
        db.query(HeritageSite)
        .filter(HeritageSite.council_id == cid, HeritageSite.public.is_(True),
                or_(HeritageSite.name.ilike(like),
                    HeritageSite.traditional_name.ilike(like),
                    HeritageSite.significance.ilike(like)))
        .limit(10).all()
    )
    return {
        "q": q,
        "groups": [
            {"label": "Reports", "href_template": "/reports/{id}",
             "items": [{"id": r.id, "title": r.title,
                        "snippet": (r.description or "")[:140]} for r in reports]},
            {"label": "FAQ", "href_template": "/ask",
             "items": [{"id": a.id, "title": a.title,
                        "snippet": a.body[:140]} for a in kb]},
            {"label": "Businesses", "href_template": "/businesses",
             "items": [{"id": b.id, "title": b.name,
                        "snippet": (b.description or b.category)[:140]} for b in businesses]},
            {"label": "Tenders", "href_template": "/procurement",
             "items": [{"id": t.id, "title": t.title,
                        "snippet": t.description[:140]} for t in tenders]},
            {"label": "Jobs", "href_template": "/jobs",
             "items": [{"id": j.id, "title": j.title,
                        "snippet": f"{j.employer} · {j.kind}"} for j in jobs]},
            {"label": "Heritage", "href_template": "/heritage",
             "items": [{"id": h.id, "title": h.name,
                        "snippet": h.significance[:140]} for h in heritage]},
        ],
    }


# ============ FOI staff queue ============


class FoiQueueRow(BaseModel):
    id: int
    reference: str
    title: str
    kind: str
    status: str
    due_by: date
    created_at: datetime
    overdue: bool
    requester_email: str | None


@router.get("/admin/foi", response_model=list[FoiQueueRow])
def admin_foi_queue(status: str | None = None,
                    user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> list[FoiQueueRow]:
    _staff(user)
    today = date.today()
    q = (
        db.query(InfoRequest, User)
        .outerjoin(User, User.id == InfoRequest.user_id)
        .filter(InfoRequest.council_id == user.council_id)
    )
    if status:
        q = q.filter(InfoRequest.status == status)
    rows = q.order_by(InfoRequest.due_by).limit(200).all()
    return [FoiQueueRow(
        id=r.id, reference=r.reference, title=r.title, kind=r.kind,
        status=r.status, due_by=r.due_by, created_at=r.created_at,
        overdue=r.due_by < today and r.status not in
            ("decided", "released", "refused", "withdrawn"),
        requester_email=u.email if u else None,
    ) for r, u in rows]


class FoiUpdate(BaseModel):
    status: str | None = None
    decision: str | None = None
    fees_cents: int | None = None


@router.patch("/admin/foi/{rid}")
def admin_foi_update(rid: int, body: FoiUpdate,
                     user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    r = db.get(InfoRequest, rid)
    if r is None or r.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    prev_status = r.status
    if body.status is not None:
        r.status = body.status
    if body.decision is not None:
        r.decision = body.decision
    if body.fees_cents is not None:
        r.fees_cents = body.fees_cents
    db.commit()
    if body.status is not None and body.status != prev_status:
        requester = db.get(User, r.user_id)
        if requester is not None:
            notify(db, user=requester, council_id=user.council_id,
                   action="foi.status_changed",
                   title=f"GIPA {r.reference}: {body.status.replace('_', ' ')}",
                   body=f"Status updated for '{r.title}'.",
                   url="/foi", target_type="info_request", target_id=r.id,
                   webhook_event="foi.status_changed")
    return {"ok": True, "status": r.status}


# ============ Petitions admin ============


class PetitionUpdate(BaseModel):
    status: str | None = Field(default=None, pattern="^(open|review|responded|closed)$")
    council_response: str | None = None


@router.patch("/admin/petitions/{pid}")
def admin_petition_update(pid: int, body: PetitionUpdate,
                          user: User = Depends(get_current_user),
                          db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    p = db.get(Petition, pid)
    if p is None or p.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    if body.status is not None:
        p.status = body.status
    if body.council_response is not None:
        p.council_response = body.council_response
        if p.status == "review":
            p.status = "responded"
    db.commit()
    author = db.get(User, p.author_user_id)
    if author is not None and body.council_response is not None:
        notify(db, user=author, council_id=user.council_id,
               action="petition.responded",
               title="Council has responded",
               body=f"'{p.title}' — read the response in your account.",
               url="/petitions", target_type="petition", target_id=p.id,
               webhook_event="petition.responded")
    return {"ok": True}


# ============ Surveys admin ============


class SurveyQuestionIn(BaseModel):
    prompt: str
    kind: str = Field(pattern="^(single|multi|scale|short_text|long_text)$")
    options: list[str] | None = None
    required: bool = True


class SurveyCreateIn(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: str | None = None
    kind: str = Field(pattern="^(poll|nps|consultation)$")
    closes_at: datetime | None = None
    questions: list[SurveyQuestionIn]


@router.post("/admin/surveys", status_code=201)
def admin_create_survey(body: SurveyCreateIn,
                        user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    s = Survey(council_id=user.council_id, title=body.title,
               description=body.description, kind=body.kind,
               closes_at=body.closes_at, status="open")
    db.add(s)
    db.flush()
    for i, q in enumerate(body.questions, start=1):
        db.add(SurveyQuestion(survey_id=s.id, position=i, prompt=q.prompt,
                              kind=q.kind, options=q.options, required=q.required))
    db.commit()
    return {"id": s.id}


@router.post("/admin/surveys/{sid}/close", status_code=200)
def admin_close_survey(sid: int, user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    s = db.get(Survey, sid)
    if s is None or s.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    s.status = "closed"
    db.commit()
    return {"ok": True}


# ============ Disaster admin ============


class AlertIn(BaseModel):
    kind: str = Field(pattern="^(bushfire|flood|storm|heatwave|cyclone)$")
    severity: str = Field(pattern="^(advice|watch|emergency)$")
    title: str = Field(min_length=4, max_length=200)
    body: str = Field(min_length=10)
    source: str = "council"
    starts_at: datetime
    ends_at: datetime | None = None
    affected_wards: list[str] | None = None


@router.post("/admin/disaster/alerts", status_code=201)
def admin_create_alert(body: AlertIn, user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    a = DisasterAlert(council_id=user.council_id, **body.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return {"id": a.id}


class EvacUpdate(BaseModel):
    status: str = Field(pattern="^(standby|open|full|closed)$")


@router.patch("/admin/disaster/evac-centres/{eid}")
def admin_update_evac(eid: int, body: EvacUpdate,
                      user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    e = db.get(EvacCentre, eid)
    if e is None or e.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    e.status = body.status
    db.commit()
    return {"ok": True}


class SandbagUpdate(BaseModel):
    bags_available: int = Field(ge=0)


@router.patch("/admin/disaster/sandbags/{sid}")
def admin_update_sandbag(sid: int, body: SandbagUpdate,
                         user: User = Depends(get_current_user),
                         db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    s = db.get(SandbagDepot, sid)
    if s is None or s.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    s.bags_available = body.bags_available
    db.commit()
    return {"ok": True}


class FireBanIn(BaseModel):
    rating: str = Field(pattern="^(moderate|high|extreme|catastrophic)$")
    declared_at: datetime
    ends_at: datetime
    source: str = "council"
    note: str | None = None


@router.post("/admin/fire-bans", status_code=201)
def admin_create_fire_ban(body: FireBanIn, user: User = Depends(get_current_user),
                          db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    b = FireBan(council_id=user.council_id, **body.model_dump())
    db.add(b)
    db.commit()
    db.refresh(b)
    return {"id": b.id}


@router.post("/admin/fire-bans/{bid}/lift", status_code=200)
def admin_lift_fire_ban(bid: int, user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    b = db.get(FireBan, bid)
    if b is None or b.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    b.ends_at = datetime.now(UTC)
    db.commit()
    return {"ok": True}


# ============ KB admin (for the chatbot) ============


class KbArticleIn(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    body: str = Field(min_length=10)
    category: str = Field(pattern="^(waste|rates|pets|permits|water|other)$")
    source_url: str | None = None


@router.get("/admin/kb")
def admin_list_kb(user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    _staff(user)
    rows = (
        db.query(KbArticle)
        .filter(KbArticle.council_id == user.council_id)
        .order_by(KbArticle.updated_at.desc())
        .all()
    )
    return [{"id": a.id, "title": a.title, "category": a.category,
             "body": a.body, "source_url": a.source_url,
             "updated_at": a.updated_at.isoformat()} for a in rows]


@router.post("/admin/kb", status_code=201)
def admin_create_kb(body: KbArticleIn, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    a = KbArticle(council_id=user.council_id, **body.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return {"id": a.id}


@router.put("/admin/kb/{aid}")
def admin_update_kb(aid: int, body: KbArticleIn,
                    user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    a = db.get(KbArticle, aid)
    if a is None or a.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in body.model_dump().items():
        setattr(a, k, v)
    db.commit()
    return {"ok": True}


@router.delete("/admin/kb/{aid}", status_code=204)
def admin_delete_kb(aid: int, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> None:
    _staff(user)
    a = db.get(KbArticle, aid)
    if a is None or a.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(a)
    db.commit()


# ============ Tenders + Jobs admin (small) ============


class TenderIn(BaseModel):
    title: str
    description: str
    category: str = Field(pattern="^(construction|services|supplies|consulting)$")
    estimated_value_cents: int | None = None
    opens_at: date
    closes_at: date
    documents_url: str | None = None


@router.post("/admin/tenders", status_code=201)
def admin_create_tender(body: TenderIn, user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    now = datetime.now(UTC)
    t = Tender(council_id=user.council_id,
               reference=f"T-{now.strftime('%Y%m')}-{secrets.token_hex(3).upper()}",
               status="open", **body.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return {"id": t.id, "reference": t.reference}


class JobIn(BaseModel):
    title: str
    employer: str
    is_council: bool = False
    kind: str
    salary_min_cents: int | None = None
    salary_max_cents: int | None = None
    description: str
    location: str | None = None
    apply_url: str | None = None
    closes_at: date | None = None


@router.post("/admin/jobs", status_code=201)
def admin_create_job(body: JobIn, user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    j = JobListing(council_id=user.council_id, status="open", **body.model_dump())
    db.add(j)
    db.commit()
    db.refresh(j)
    return {"id": j.id}


@router.post("/admin/jobs/{jid}/close", status_code=200)
def admin_close_job(jid: int, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    j = db.get(JobListing, jid)
    if j is None or j.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    j.status = "closed"
    db.commit()
    return {"ok": True}


@router.get("/admin/jobs")
def admin_list_jobs(user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    _staff(user)
    rows = (
        db.query(JobListing)
        .filter(JobListing.council_id == user.council_id)
        .order_by(JobListing.posted_at.desc())
        .limit(200).all()
    )
    return [{"id": j.id, "title": j.title, "employer": j.employer,
             "is_council": j.is_council, "kind": j.kind, "status": j.status,
             "posted_at": j.posted_at.isoformat(),
             "closes_at": j.closes_at.isoformat() if j.closes_at else None}
            for j in rows]


@router.get("/admin/tenders")
def admin_list_tenders(user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    _staff(user)
    rows = (
        db.query(Tender)
        .filter(Tender.council_id == user.council_id)
        .order_by(Tender.closes_at.desc()).limit(200).all()
    )
    return [{"id": t.id, "reference": t.reference, "title": t.title,
             "category": t.category, "status": t.status,
             "estimated_value_cents": t.estimated_value_cents,
             "opens_at": t.opens_at.isoformat(),
             "closes_at": t.closes_at.isoformat()} for t in rows]


@router.post("/admin/tenders/{tid}/close", status_code=200)
def admin_close_tender(tid: int, user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    t = db.get(Tender, tid)
    if t is None or t.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    t.status = "closed"
    db.commit()
    return {"ok": True}


class AwardIn(BaseModel):
    title: str
    supplier_name: str
    supplier_abn: str | None = None
    value_cents: int
    starts_on: date
    ends_on: date
    local_supplier: bool = False
    summary: str | None = None


@router.post("/admin/tenders/{tid}/award", status_code=201)
def admin_award_tender(tid: int, body: AwardIn,
                       user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    t = db.get(Tender, tid)
    if t is None or t.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    from app.models import ContractAward  # noqa: PLC0415
    now = datetime.now(UTC)
    c = ContractAward(
        council_id=user.council_id, tender_id=tid,
        contract_no=f"C-{now.strftime('%Y%m')}-{secrets.token_hex(3).upper()}",
        **body.model_dump(),
    )
    t.status = "awarded"
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "contract_no": c.contract_no}


# ============ Survey CSV export ============


@router.get("/admin/surveys/{sid}/export.csv")
def export_survey_csv(sid: int,
                      user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)) -> PlainTextResponse:
    import csv  # noqa: PLC0415
    import io  # noqa: PLC0415

    from app.models import SurveyResponse  # noqa: PLC0415

    _staff(user)
    s = db.get(Survey, sid)
    if s is None or s.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    questions = (
        db.query(SurveyQuestion)
        .filter(SurveyQuestion.survey_id == sid)
        .order_by(SurveyQuestion.position)
        .all()
    )
    responses = (
        db.query(SurveyResponse)
        .filter(SurveyResponse.survey_id == sid)
        .order_by(SurveyResponse.submitted_at)
        .all()
    )
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["response_id", "user_id", "submitted_at"] + [q.prompt for q in questions])
    for r in responses:
        row: list[Any] = [r.id, r.user_id, r.submitted_at.isoformat()]
        for q in questions:
            v = r.answers.get(str(q.id))
            if isinstance(v, list):
                row.append("; ".join(str(x) for x in v))
            else:
                row.append("" if v is None else str(v))
        w.writerow(row)
    return PlainTextResponse(
        buf.getvalue(), media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="survey-{sid}.csv"'},
    )


# ============ Lifecycle batch ============


@router.post("/admin/lifecycle/run")
def admin_lifecycle_run(user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)) -> dict[str, Any]:
    """Single-call sweep that fires the same transitions as on-read lifecycle.
    Safe to call hourly via cron; idempotent."""
    _admin(user)
    now = datetime.now(UTC)
    today = date.today()
    counts = {"surveys": 0, "petitions": 0, "tenders": 0, "jobs": 0,
              "fire_bans": 0, "lost_found": 0, "library_holds": 0}

    for s in db.query(Survey).filter(
        Survey.council_id == user.council_id, Survey.status == "open",
        Survey.closes_at.isnot(None), Survey.closes_at < now,
    ).all():
        s.status = "closed"
        counts["surveys"] += 1

    for p in db.query(Petition).filter(
        Petition.council_id == user.council_id, Petition.status == "open",
        Petition.closes_at.isnot(None), Petition.closes_at < now,
    ).all():
        p.status = "closed"
        counts["petitions"] += 1

    for t in db.query(Tender).filter(
        Tender.council_id == user.council_id, Tender.status == "open",
        Tender.closes_at < today,
    ).all():
        t.status = "closed"
        counts["tenders"] += 1

    for j in db.query(JobListing).filter(
        JobListing.council_id == user.council_id, JobListing.status == "open",
        JobListing.closes_at.isnot(None), JobListing.closes_at < today,
    ).all():
        j.status = "closed"
        counts["jobs"] += 1

    # Lost-found: close items older than 90 days
    stale = now - timedelta(days=90)
    for lf in db.query(LostFoundItem).filter(
        LostFoundItem.council_id == user.council_id,
        LostFoundItem.status.in_(("open", "matched")),
        LostFoundItem.created_at < stale,
    ).all():
        lf.status = "closed"
        counts["lost_found"] += 1

    # Library holds: expire ready holds not collected in 7 days
    hold_cutoff = now - timedelta(days=7)
    for h in (
        db.query(LibraryHold)
        .filter(LibraryHold.status == "ready",
                LibraryHold.ready_at.isnot(None),
                LibraryHold.ready_at < hold_cutoff)
        .all()
    ):
        h.status = "expired"
        counts["library_holds"] += 1

    db.commit()
    return {"ok": True, "transitions": counts, "at": now.isoformat()}
