"""V6 endpoints: surveys, petitions, DA submissions, FOI/GIPA,
tenders/contracts, jobs, AI FAQ, climate rebates, garden plots,
inspector workflow."""
from __future__ import annotations

import secrets
from datetime import UTC, date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import (
    ChatMessage,
    ContractAward,
    DaSubmission,
    DevelopmentApplication,
    GardenPlot,
    InfoRequest,
    InspectionRecord,
    InspectionTemplate,
    JobListing,
    KbArticle,
    Petition,
    PetitionSignature,
    PlotAssignment,
    RebateScheme,
    Survey,
    SurveyQuestion,
    SurveyResponse,
    Tender,
    User,
    UserRole,
)
from app.services import chatbot

router = APIRouter(tags=["council-v6"])


def _staff(user: User) -> None:
    if user.role not in (UserRole.staff.value, UserRole.admin.value):
        raise HTTPException(status_code=403, detail="Staff only")


# ============ #1 Surveys & polls ============


class SurveyQuestionOut(BaseModel):
    id: int
    position: int
    prompt: str
    kind: str
    options: list[str] | None
    required: bool


class SurveyOut(BaseModel):
    id: int
    title: str
    description: str | None
    kind: str
    closes_at: datetime | None
    status: str
    response_count: int
    answered: bool
    questions: list[SurveyQuestionOut]


@router.get("/surveys", response_model=list[SurveyOut])
def list_surveys(user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)) -> list[SurveyOut]:
    rows = (
        db.query(Survey)
        .filter(Survey.council_id == user.council_id,
                Survey.status == "open")
        .order_by(Survey.opens_at.desc())
        .all()
    )
    sids = [s.id for s in rows]
    counts: dict[int, int] = {}
    answered: set[int] = set()
    questions_by_sid: dict[int, list[SurveyQuestion]] = {}
    if sids:
        for sid, n in db.query(SurveyResponse.survey_id, func.count()).filter(
            SurveyResponse.survey_id.in_(sids)
        ).group_by(SurveyResponse.survey_id).all():
            counts[sid] = int(n)
        for r in db.query(SurveyResponse).filter(
            SurveyResponse.survey_id.in_(sids), SurveyResponse.user_id == user.id
        ).all():
            answered.add(r.survey_id)
        for q in db.query(SurveyQuestion).filter(
            SurveyQuestion.survey_id.in_(sids)
        ).order_by(SurveyQuestion.position).all():
            questions_by_sid.setdefault(q.survey_id, []).append(q)
    return [SurveyOut(
        id=s.id, title=s.title, description=s.description, kind=s.kind,
        closes_at=s.closes_at, status=s.status,
        response_count=counts.get(s.id, 0),
        answered=s.id in answered,
        questions=[SurveyQuestionOut(id=q.id, position=q.position, prompt=q.prompt,
                                      kind=q.kind, options=q.options, required=q.required)
                   for q in questions_by_sid.get(s.id, [])],
    ) for s in rows]


class SurveySubmitIn(BaseModel):
    answers: dict[str, Any]  # question_id -> answer


@router.post("/surveys/{sid}/respond", status_code=201)
def submit_survey(sid: int, body: SurveySubmitIn,
                  user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)) -> dict[str, Any]:
    s = db.get(Survey, sid)
    if s is None or s.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    if s.status != "open":
        raise HTTPException(status_code=400, detail="Survey closed")
    existing = db.query(SurveyResponse).filter(
        SurveyResponse.survey_id == sid, SurveyResponse.user_id == user.id
    ).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Already responded")
    db.add(SurveyResponse(survey_id=sid, user_id=user.id, answers=body.answers))
    db.commit()
    return {"ok": True}


@router.get("/surveys/{sid}/results")
def survey_results(sid: int, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)) -> dict[str, Any]:
    s = db.get(Survey, sid)
    if s is None or s.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    questions = db.query(SurveyQuestion).filter(SurveyQuestion.survey_id == sid).all()
    responses = db.query(SurveyResponse).filter(SurveyResponse.survey_id == sid).all()
    tallies: dict[str, dict[str, int]] = {}
    for q in questions:
        tallies[str(q.id)] = {}
        if q.kind in ("single", "scale") and q.options:
            for opt in q.options:
                tallies[str(q.id)][opt] = 0
    for resp in responses:
        for qid, val in resp.answers.items():
            if qid in tallies:
                if isinstance(val, list):
                    for v in val:
                        tallies[qid][str(v)] = tallies[qid].get(str(v), 0) + 1
                elif isinstance(val, (str, int)):
                    tallies[qid][str(val)] = tallies[qid].get(str(val), 0) + 1
    return {"survey_id": sid, "total_responses": len(responses), "tallies": tallies}


# ============ #2 Petitions ============


class PetitionOut(BaseModel):
    id: int
    title: str
    summary: str
    ask: str
    threshold: int
    signature_count: int
    closes_at: datetime | None
    status: str
    council_response: str | None
    created_at: datetime
    signed: bool


@router.get("/petitions", response_model=list[PetitionOut])
def list_petitions(user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)) -> list[PetitionOut]:
    rows = (
        db.query(Petition)
        .filter(Petition.council_id == user.council_id)
        .order_by(Petition.created_at.desc())
        .limit(100)
        .all()
    )
    pids = [p.id for p in rows]
    counts: dict[int, int] = {}
    mine: set[int] = set()
    if pids:
        for pid, n in db.query(PetitionSignature.petition_id, func.count()).filter(
            PetitionSignature.petition_id.in_(pids)
        ).group_by(PetitionSignature.petition_id).all():
            counts[pid] = int(n)
        for sig in db.query(PetitionSignature).filter(
            PetitionSignature.petition_id.in_(pids), PetitionSignature.user_id == user.id
        ).all():
            mine.add(sig.petition_id)
    return [PetitionOut(
        id=p.id, title=p.title, summary=p.summary, ask=p.ask,
        threshold=p.threshold, signature_count=counts.get(p.id, 0),
        closes_at=p.closes_at, status=p.status,
        council_response=p.council_response, created_at=p.created_at,
        signed=p.id in mine,
    ) for p in rows]


class PetitionCreateIn(BaseModel):
    title: str = Field(min_length=10, max_length=200)
    summary: str = Field(min_length=20, max_length=2000)
    ask: str = Field(min_length=10, max_length=2000)


@router.post("/petitions", status_code=201)
def create_petition(body: PetitionCreateIn, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> dict[str, Any]:
    p = Petition(
        council_id=user.council_id, author_user_id=user.id,
        title=body.title, summary=body.summary, ask=body.ask,
        closes_at=datetime.now(UTC) + timedelta(days=90),
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id}


class SignIn(BaseModel):
    comment: str | None = Field(default=None, max_length=500)


@router.post("/petitions/{pid}/sign", status_code=201)
def sign_petition(pid: int, body: SignIn, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)) -> dict[str, Any]:
    p = db.get(Petition, pid)
    if p is None or p.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    if p.status != "open":
        raise HTTPException(status_code=400, detail="Petition closed")
    existing = db.query(PetitionSignature).filter(
        PetitionSignature.petition_id == pid, PetitionSignature.user_id == user.id
    ).first()
    if existing is not None:
        return {"ok": True}
    db.add(PetitionSignature(petition_id=pid, user_id=user.id, comment=body.comment))
    count = db.query(PetitionSignature).filter(PetitionSignature.petition_id == pid).count() + 1
    if count >= p.threshold and p.status == "open":
        p.status = "review"
    db.commit()
    return {"ok": True, "signature_count": count}


# ============ #3 DA submissions ============


class DaSubmissionIn(BaseModel):
    stance: str = Field(pattern="^(support|object|neutral)$")
    body: str = Field(min_length=20, max_length=5000)
    anonymous: bool = False


class DaSubmissionOut(BaseModel):
    id: int
    stance: str
    body: str
    anonymous: bool
    created_at: datetime
    author_name: str | None


@router.get("/das/{da_id}/submissions", response_model=list[DaSubmissionOut])
def list_da_submissions(da_id: int, user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)) -> list[DaSubmissionOut]:
    da = db.get(DevelopmentApplication, da_id)
    if da is None or da.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    rows = (
        db.query(DaSubmission, User)
        .outerjoin(User, User.id == DaSubmission.user_id)
        .filter(DaSubmission.da_id == da_id)
        .order_by(DaSubmission.created_at.desc())
        .all()
    )
    return [DaSubmissionOut(
        id=s.id, stance=s.stance, body=s.body, anonymous=s.anonymous,
        created_at=s.created_at,
        author_name=None if s.anonymous else (u.name if u else None),
    ) for s, u in rows]


@router.post("/das/{da_id}/submissions", status_code=201)
def make_da_submission(da_id: int, body: DaSubmissionIn,
                       user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)) -> dict[str, Any]:
    da = db.get(DevelopmentApplication, da_id)
    if da is None or da.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    if da.exhibition_ends_at is not None and da.exhibition_ends_at < datetime.now(UTC):
        raise HTTPException(status_code=400, detail="Exhibition period has closed")
    s = DaSubmission(da_id=da_id, user_id=user.id, stance=body.stance,
                     body=body.body, anonymous=body.anonymous)
    db.add(s)
    db.commit()
    db.refresh(s)
    return {"id": s.id}


# ============ #4 FOI / GIPA ============


class InfoRequestIn(BaseModel):
    title: str = Field(min_length=4, max_length=200)
    description: str = Field(min_length=20, max_length=5000)
    kind: str = Field(default="formal", pattern="^(formal|informal)$")


class InfoRequestOut(BaseModel):
    id: int
    reference: str
    title: str
    description: str
    kind: str
    status: str
    decision: str | None
    fees_cents: int | None
    due_by: date
    created_at: datetime


@router.post("/foi", response_model=InfoRequestOut, status_code=201)
def lodge_info_request(body: InfoRequestIn, user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)) -> InfoRequestOut:
    now = datetime.now(UTC)
    business_days = 20 if body.kind == "formal" else 10
    r = InfoRequest(
        council_id=user.council_id, user_id=user.id,
        reference=f"GIPA-{now.strftime('%Y%m')}-{secrets.token_hex(3).upper()}",
        title=body.title, description=body.description, kind=body.kind,
        due_by=date.today() + timedelta(days=business_days * 7 // 5),  # rough cal days
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return InfoRequestOut(
        id=r.id, reference=r.reference, title=r.title, description=r.description,
        kind=r.kind, status=r.status, decision=r.decision, fees_cents=r.fees_cents,
        due_by=r.due_by, created_at=r.created_at,
    )


@router.get("/foi/mine", response_model=list[InfoRequestOut])
def my_foi(user: User = Depends(get_current_user),
           db: Session = Depends(get_db)) -> list[InfoRequestOut]:
    rows = (
        db.query(InfoRequest)
        .filter(InfoRequest.user_id == user.id)
        .order_by(InfoRequest.created_at.desc())
        .all()
    )
    return [InfoRequestOut(
        id=r.id, reference=r.reference, title=r.title, description=r.description,
        kind=r.kind, status=r.status, decision=r.decision, fees_cents=r.fees_cents,
        due_by=r.due_by, created_at=r.created_at,
    ) for r in rows]


# ============ #5 Tenders & contracts ============


class TenderOut(BaseModel):
    id: int
    reference: str
    title: str
    description: str
    category: str
    estimated_value_cents: int | None
    opens_at: date
    closes_at: date
    status: str
    documents_url: str | None


@router.get("/tenders", response_model=list[TenderOut])
def list_tenders(user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)) -> list[TenderOut]:
    rows = (
        db.query(Tender)
        .filter(Tender.council_id == user.council_id)
        .order_by(Tender.closes_at.desc())
        .limit(50)
        .all()
    )
    return [TenderOut(
        id=t.id, reference=t.reference, title=t.title, description=t.description,
        category=t.category, estimated_value_cents=t.estimated_value_cents,
        opens_at=t.opens_at, closes_at=t.closes_at, status=t.status,
        documents_url=t.documents_url,
    ) for t in rows]


class ContractOut(BaseModel):
    id: int
    contract_no: str
    title: str
    supplier_name: str
    supplier_abn: str | None
    value_cents: int
    starts_on: date
    ends_on: date
    local_supplier: bool
    summary: str | None


@router.get("/contracts", response_model=list[ContractOut])
def list_contracts(user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)) -> list[ContractOut]:
    rows = (
        db.query(ContractAward)
        .filter(ContractAward.council_id == user.council_id)
        .order_by(ContractAward.starts_on.desc())
        .limit(100)
        .all()
    )
    return [ContractOut(
        id=c.id, contract_no=c.contract_no, title=c.title,
        supplier_name=c.supplier_name, supplier_abn=c.supplier_abn,
        value_cents=c.value_cents, starts_on=c.starts_on, ends_on=c.ends_on,
        local_supplier=c.local_supplier, summary=c.summary,
    ) for c in rows]


# ============ #6 Jobs board ============


class JobOut(BaseModel):
    id: int
    title: str
    employer: str
    is_council: bool
    kind: str
    salary_min_cents: int | None
    salary_max_cents: int | None
    description: str
    location: str | None
    apply_url: str | None
    posted_at: datetime
    closes_at: date | None


@router.get("/jobs", response_model=list[JobOut])
def list_jobs(council_only: bool = False,
              user: User = Depends(get_current_user),
              db: Session = Depends(get_db)) -> list[JobOut]:
    q = db.query(JobListing).filter(JobListing.council_id == user.council_id,
                                    JobListing.status == "open")
    if council_only:
        q = q.filter(JobListing.is_council.is_(True))
    rows = q.order_by(JobListing.posted_at.desc()).limit(100).all()
    return [JobOut(
        id=j.id, title=j.title, employer=j.employer, is_council=j.is_council,
        kind=j.kind, salary_min_cents=j.salary_min_cents,
        salary_max_cents=j.salary_max_cents, description=j.description,
        location=j.location, apply_url=j.apply_url,
        posted_at=j.posted_at, closes_at=j.closes_at,
    ) for j in rows]


# ============ #7 AI FAQ ============


class ChatIn(BaseModel):
    session_id: str = Field(min_length=8, max_length=40)
    question: str = Field(min_length=2, max_length=500)


class ChatOut(BaseModel):
    answer: str
    citations: list[dict[str, Any]]


@router.post("/chat", response_model=ChatOut)
def chat(body: ChatIn, user: User = Depends(get_current_user),
         db: Session = Depends(get_db)) -> ChatOut:
    db.add(ChatMessage(council_id=user.council_id, user_id=user.id,
                       session_id=body.session_id, role="user", text=body.question))
    answer_text, cite_ids = chatbot.answer(db, council_id=user.council_id, question=body.question)
    db.add(ChatMessage(council_id=user.council_id, user_id=user.id,
                       session_id=body.session_id, role="assistant",
                       text=answer_text, citations=cite_ids))
    db.commit()
    cites: list[dict[str, Any]] = []
    if cite_ids:
        for a in db.query(KbArticle).filter(KbArticle.id.in_(cite_ids)).all():
            cites.append({"id": a.id, "title": a.title, "category": a.category,
                          "source_url": a.source_url})
    return ChatOut(answer=answer_text, citations=cites)


@router.get("/chat/history")
def chat_history(session_id: str = Query(...),
                 user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id,
                ChatMessage.user_id == user.id)
        .order_by(ChatMessage.created_at)
        .all()
    )
    return [{"role": m.role, "text": m.text,
             "citations": m.citations, "created_at": m.created_at.isoformat()}
            for m in rows]


# ============ #8 Climate rebates ============


class RebateOut(BaseModel):
    id: int
    level: str
    title: str
    description: str
    category: str
    max_amount_cents: int | None
    eligibility: str
    apply_url: str | None
    expires_on: date | None


@router.get("/rebates", response_model=list[RebateOut])
def list_rebates(category: str | None = None,
                 user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)) -> list[RebateOut]:
    today = date.today()
    q = db.query(RebateScheme).filter(
        or_(RebateScheme.council_id == user.council_id,
            RebateScheme.council_id.is_(None)),
        or_(RebateScheme.expires_on.is_(None), RebateScheme.expires_on >= today),
    )
    if category:
        q = q.filter(RebateScheme.category == category)
    rows = q.order_by(RebateScheme.expires_on.asc().nullslast()).all()
    return [RebateOut(
        id=r.id, level=r.level, title=r.title, description=r.description,
        category=r.category, max_amount_cents=r.max_amount_cents,
        eligibility=r.eligibility, apply_url=r.apply_url, expires_on=r.expires_on,
    ) for r in rows]


# ============ #9 Garden plots ============


class GardenPlotOut(BaseModel):
    id: int
    garden_name: str
    plot_code: str
    size_sqm: float
    annual_fee_cents: int
    status: str
    notes: str | None


@router.get("/gardens/plots", response_model=list[GardenPlotOut])
def list_plots(user: User = Depends(get_current_user),
               db: Session = Depends(get_db)) -> list[GardenPlotOut]:
    rows = (
        db.query(GardenPlot)
        .filter(GardenPlot.council_id == user.council_id)
        .order_by(GardenPlot.garden_name, GardenPlot.plot_code)
        .all()
    )
    return [GardenPlotOut(
        id=p.id, garden_name=p.garden_name, plot_code=p.plot_code,
        size_sqm=p.size_sqm, annual_fee_cents=p.annual_fee_cents,
        status=p.status, notes=p.notes,
    ) for p in rows]


@router.post("/gardens/plots/{pid}/apply", status_code=201)
def apply_plot(pid: int, user: User = Depends(get_current_user),
               db: Session = Depends(get_db)) -> dict[str, Any]:
    p = db.get(GardenPlot, pid)
    if p is None or p.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    existing = (
        db.query(PlotAssignment)
        .filter(PlotAssignment.plot_id == pid, PlotAssignment.user_id == user.id,
                PlotAssignment.status.in_(("waitlisted", "active")))
        .first()
    )
    if existing is not None:
        return {"ok": True, "status": existing.status}
    is_first = p.status == "available"
    a = PlotAssignment(plot_id=pid, user_id=user.id,
                       status="active" if is_first else "waitlisted")
    if is_first:
        p.status = "assigned"
    db.add(a)
    db.commit()
    return {"ok": True, "status": a.status}


# ============ #10 Inspector workflow ============


class TemplateOut(BaseModel):
    id: int
    name: str
    kind: str
    checklist: list[dict[str, Any]]


@router.get("/inspections/templates", response_model=list[TemplateOut])
def list_templates(user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)) -> list[TemplateOut]:
    _staff(user)
    rows = (
        db.query(InspectionTemplate)
        .filter(InspectionTemplate.council_id == user.council_id,
                InspectionTemplate.active.is_(True))
        .all()
    )
    return [TemplateOut(id=t.id, name=t.name, kind=t.kind, checklist=t.checklist) for t in rows]


class InspectionIn(BaseModel):
    template_id: int
    target_kind: str
    target_id: int | None = None
    target_address: str
    lat: float | None = None
    lng: float | None = None
    answers: dict[str, Any]
    outcome: str = Field(pattern="^(pass|conditional|fail)$")
    notes: str | None = None
    photos: list[str] | None = None


@router.post("/inspections", status_code=201)
def submit_inspection(body: InspectionIn, user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    t = db.get(InspectionTemplate, body.template_id)
    if t is None or t.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Template not found")
    rec = InspectionRecord(
        council_id=user.council_id, template_id=body.template_id,
        officer_user_id=user.id, target_kind=body.target_kind,
        target_id=body.target_id, target_address=body.target_address,
        lat=body.lat, lng=body.lng, answers=body.answers, outcome=body.outcome,
        notes=body.notes, photos=body.photos,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return {"id": rec.id, "outcome": rec.outcome}


@router.get("/inspections")
def list_inspections(user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    _staff(user)
    rows = (
        db.query(InspectionRecord)
        .filter(InspectionRecord.council_id == user.council_id)
        .order_by(InspectionRecord.inspected_at.desc())
        .limit(50)
        .all()
    )
    return [{"id": r.id, "target_address": r.target_address, "outcome": r.outcome,
             "inspected_at": r.inspected_at.isoformat()} for r in rows]


# ============ Demo seed ============


def seed_v6_demo(db: Session, *, council_id: int, author_user_id: int | None = None) -> dict[str, int]:
    counts = {"surveys": 0, "petitions": 0, "foi": 0, "tenders": 0,
              "contracts": 0, "jobs": 0, "kb": 0, "rebates": 0,
              "plots": 0, "templates": 0}
    now = datetime.now(UTC)
    today = date.today()

    # Surveys
    if not db.query(Survey).filter(Survey.council_id == council_id).first():
        s = Survey(council_id=council_id, title="How was your last service?",
                   description="Two-question NPS — takes 20 seconds.", kind="nps",
                   closes_at=now + timedelta(days=60), status="open")
        db.add(s)
        db.flush()
        db.add(SurveyQuestion(survey_id=s.id, position=1,
                              prompt="How likely are you to recommend Leeton Shire Council services?",
                              kind="scale", options=["0","1","2","3","4","5","6","7","8","9","10"]))
        db.add(SurveyQuestion(survey_id=s.id, position=2,
                              prompt="What's one thing we could do better?",
                              kind="long_text", required=False))
        counts["surveys"] += 1

        s2 = Survey(council_id=council_id, title="Main St redesign — quick poll",
                    description="What's your priority for the redesign?", kind="poll",
                    closes_at=now + timedelta(days=21), status="open")
        db.add(s2)
        db.flush()
        db.add(SurveyQuestion(survey_id=s2.id, position=1,
                              prompt="Top priority?", kind="single",
                              options=["More trees & shade", "Wider footpaths",
                                       "More parking", "Outdoor dining", "Bike lanes"]))
        counts["surveys"] += 1

    # Petitions
    if not db.query(Petition).filter(Petition.council_id == council_id).first() and author_user_id:
        db.add(Petition(
            council_id=council_id, author_user_id=author_user_id,
            title="Save the Roxy Theatre forecourt trees",
            summary="Plans to remove the four heritage jacarandas in front of the Roxy "
                    "should be reconsidered.",
            ask="Council to commission an arborist report before any tree removal.",
            threshold=250, closes_at=now + timedelta(days=60), status="open",
        ))
        counts["petitions"] += 1

    # Tenders + contracts
    if not db.query(Tender).filter(Tender.council_id == council_id).first():
        t1 = Tender(council_id=council_id,
                    reference=f"T-{today.year}-001",
                    title="Pine Ave resurfacing — 2km",
                    description="Reseal and line-mark Pine Ave from Wade to Yanco Rd.",
                    category="construction", estimated_value_cents=185000000,
                    opens_at=today - timedelta(days=14),
                    closes_at=today + timedelta(days=14), status="open",
                    documents_url=None)
        db.add(t1)
        db.add(Tender(council_id=council_id,
                      reference=f"T-{today.year}-002",
                      title="Library catalogue software — 3 year",
                      description="Replace the current LMS. FOSS preferred.",
                      category="services", estimated_value_cents=18000000,
                      opens_at=today + timedelta(days=2),
                      closes_at=today + timedelta(days=35), status="open"))
        counts["tenders"] += 2
        db.flush()
        db.add(ContractAward(
            council_id=council_id, tender_id=t1.id,
            contract_no=f"C-{today.year - 1}-018", title="Yanco Rd kerb & gutter renewal",
            supplier_name="Riverina Civil Works Pty Ltd", supplier_abn="51234567890",
            value_cents=42000000, starts_on=today - timedelta(days=120),
            ends_on=today + timedelta(days=240), local_supplier=True,
            summary="Award based on best value + local supplier preference under sect. 55."))
        counts["contracts"] += 1

    # Jobs
    if not db.query(JobListing).filter(JobListing.council_id == council_id).first():
        for title, employer, council, kind, smin, smax, desc, loc in [
            ("Civil Engineer — Roads", "Leeton Shire Council", True, "full_time",
             95000_00, 115000_00, "5+ yrs experience in road design and construction.",
             "Leeton, NSW"),
            ("Trainee Lifeguard (Summer)", "Leeton Shire Council", True, "casual",
             3500, 4200, "Bronze medallion required. 6-week summer position.",
             "Leeton Swimming Pool"),
            ("Apprentice Carpenter", "Murrumbidgee Building Co", False, "full_time",
             42000_00, 48000_00, "4-year apprenticeship. School-based welcome.",
             "Leeton"),
            ("Year 10 Work Experience — Civil", "Leeton Shire Council", True, "work_experience",
             None, None, "1-week placement with the civil works team.",
             "Leeton Depot"),
        ]:
            db.add(JobListing(council_id=council_id, title=title, employer=employer,
                              is_council=council, kind=kind,
                              salary_min_cents=smin, salary_max_cents=smax,
                              description=desc, location=loc,
                              closes_at=today + timedelta(days=21), status="open"))
            counts["jobs"] += 1

    # KB articles for chatbot
    if not db.query(KbArticle).filter(KbArticle.council_id == council_id).first():
        kb = [
            ("Waste collection — bin night", "waste",
             "Red bin (general waste) is collected weekly on Tuesday. Yellow bin "
             "(recycling) is collected fortnightly on Tuesday, alternating with the "
             "green bin (organics). Put bins out by 6am."),
            ("Pet registration", "pets",
             "All dogs and cats must be registered with council from 6 months of age. "
             "Lifetime fee for a desexed pet is $69. Concessions available."),
            ("DA for a pergola", "permits",
             "A pergola under 25sqm and 3m high may be an exempt development under SEPP. "
             "Larger pergolas require a DA. Apply via the Development tab."),
            ("Rates due dates", "rates",
             "Rates are billed quarterly. Due dates are 31 August, 30 November, 28 February "
             "and 31 May. BPAY, PayPal and direct debit accepted."),
            ("Water restrictions", "water",
             "Permanent water-wise rules apply: sprinklers only before 10am and after 4pm. "
             "During drought, additional level restrictions may apply — check the climate page."),
        ]
        for title, cat, body in kb:
            db.add(KbArticle(council_id=council_id, title=title, category=cat, body=body))
            counts["kb"] += 1

    # Rebates
    if not db.query(RebateScheme).filter(
        or_(RebateScheme.council_id == council_id, RebateScheme.council_id.is_(None))
    ).first():
        rebates = [
            (None, "federal", "Small-scale Renewable Energy Scheme (STCs)",
             "Discount on solar PV systems via small-scale technology certificates.",
             "solar", None, "Owner of the property where solar is installed.",
             "https://www.cleanenergyregulator.gov.au/", today + timedelta(days=730)),
            (None, "state", "NSW Battery Rebate",
             "Up to $1600 rebate on a new home battery, plus VPP incentive.",
             "battery", 160000, "NSW homeowner, eligible battery, accredited installer.",
             "https://www.energy.nsw.gov.au/", today + timedelta(days=365)),
            (None, "state", "NSW EV Rebate (legacy holders)",
             "Up to $3000 rebate on certain EVs (limited remaining).",
             "ev", 300000, "EV under $68,750, NSW resident.",
             "https://www.nsw.gov.au/", today + timedelta(days=90)),
            (council_id, "council", "Leeton Water Tank Rebate",
             "$500 rebate on a 5,000L+ rainwater tank for residential properties.",
             "water_tank", 50000, "Connected to roof catchment, plumbed to garden/toilet.",
             None, today + timedelta(days=365)),
            (None, "federal", "Heat Pump Hot Water Rebate (STCs)",
             "STCs discount when replacing electric storage with a heat-pump system.",
             "heat_pump", None, "Replacement of existing electric storage water heater.",
             None, today + timedelta(days=730)),
        ]
        for cid, lvl, title, desc, cat, mx, elig, url, exp in rebates:
            db.add(RebateScheme(council_id=cid, level=lvl, title=title,
                                description=desc, category=cat, max_amount_cents=mx,
                                eligibility=elig, apply_url=url, expires_on=exp))
            counts["rebates"] += 1

    # Garden plots
    if not db.query(GardenPlot).filter(GardenPlot.council_id == council_id).first():
        for code, size, fee in [
            ("A1", 12.0, 5000), ("A2", 12.0, 5000), ("A3", 12.0, 5000),
            ("B1", 20.0, 8500), ("B2", 20.0, 8500),
            ("C1", 6.0, 2500),  # accessible raised bed
        ]:
            db.add(GardenPlot(council_id=council_id,
                              garden_name="Pine Park Community Garden",
                              plot_code=code, size_sqm=size, annual_fee_cents=fee,
                              status="available"))
            counts["plots"] += 1

    # Inspection templates
    if not db.query(InspectionTemplate).filter(InspectionTemplate.council_id == council_id).first():
        templates = [
            ("Building — slab pour", "building", [
                {"id": "level", "prompt": "Slab levelled?", "kind": "yes_no"},
                {"id": "rebar", "prompt": "Reinforcement spacing correct?", "kind": "yes_no"},
                {"id": "formwork", "prompt": "Formwork sound?", "kind": "yes_no"},
                {"id": "photo_overview", "prompt": "Overview photo", "kind": "photo"},
                {"id": "notes", "prompt": "Inspector notes", "kind": "note"},
            ]),
            ("Food premises — routine", "food", [
                {"id": "handwash", "prompt": "Hand-wash basin stocked?", "kind": "yes_no"},
                {"id": "temps", "prompt": "Fridge/freezer temps in range?", "kind": "yes_no"},
                {"id": "pests", "prompt": "Evidence of pests?", "kind": "yes_no"},
                {"id": "cleaning", "prompt": "Cleaning records up to date?", "kind": "yes_no"},
                {"id": "notes", "prompt": "Issues to address", "kind": "note"},
            ]),
            ("Pool safety — annual", "pool_safety", [
                {"id": "fence_height", "prompt": "Fence ≥ 1200mm?", "kind": "yes_no"},
                {"id": "gate_close", "prompt": "Gate self-closes & latches?", "kind": "yes_no"},
                {"id": "cpr_sign", "prompt": "CPR sign installed?", "kind": "yes_no"},
                {"id": "photo_fence", "prompt": "Fence photo", "kind": "photo"},
            ]),
        ]
        for name, kind, checklist in templates:
            db.add(InspectionTemplate(council_id=council_id, name=name, kind=kind,
                                      checklist=checklist, active=True))
            counts["templates"] += 1

    db.commit()
    return counts
