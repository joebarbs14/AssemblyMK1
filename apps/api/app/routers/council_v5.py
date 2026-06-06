"""V5 endpoints: childcare, EV chargers, swim sites, burn permits + fire
bans, library of things, lost & found, citizen panels, meeting
transcripts, footpath audits, heritage / First Nations sites."""
from __future__ import annotations

import hashlib
import random
import secrets
from datetime import UTC, date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import (
    BurnPermit,
    ChildcareCentre,
    ChildcareWaitlist,
    CitizenPanel,
    CouncilMeeting,
    EvBooking,
    EvCharger,
    FireBan,
    FootpathAudit,
    HeritageSite,
    LostFoundItem,
    LotItem,
    LotLoan,
    PanelExpression,
    SwimReading,
    SwimSite,
    User,
    UserRole,
)

router = APIRouter(tags=["council-v5"])
public_router = APIRouter(prefix="/public", tags=["council-v5-public"])


def _staff(user: User) -> None:
    if user.role not in (UserRole.staff.value, UserRole.admin.value):
        raise HTTPException(status_code=403, detail="Staff only")


# ============ #1 Childcare ============


class ChildcareCentreOut(BaseModel):
    id: int
    name: str
    kind: str
    address: str
    lat: float | None
    lng: float | None
    phone: str | None
    website: str | None
    age_min_months: int
    age_max_months: int
    daily_fee_cents: int
    vacancies: int
    rating: str | None


@router.get("/childcare", response_model=list[ChildcareCentreOut])
def list_childcare(user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)) -> list[ChildcareCentreOut]:
    rows = db.query(ChildcareCentre).filter(ChildcareCentre.council_id == user.council_id).all()
    return [ChildcareCentreOut(
        id=c.id, name=c.name, kind=c.kind, address=c.address,
        lat=c.lat, lng=c.lng, phone=c.phone, website=c.website,
        age_min_months=c.age_min_months, age_max_months=c.age_max_months,
        daily_fee_cents=c.daily_fee_cents, vacancies=c.vacancies, rating=c.rating,
    ) for c in rows]


class WaitlistIn(BaseModel):
    child_first_name: str = Field(min_length=1, max_length=80)
    child_dob: date
    needed_from: date
    days_per_week: int = Field(default=5, ge=1, le=7)


@router.post("/childcare/{cid}/waitlist", status_code=201)
def join_waitlist(cid: int, body: WaitlistIn, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)) -> dict[str, Any]:
    c = db.get(ChildcareCentre, cid)
    if c is None or c.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    w = ChildcareWaitlist(
        centre_id=cid, user_id=user.id,
        child_first_name=body.child_first_name, child_dob=body.child_dob,
        needed_from=body.needed_from, days_per_week=body.days_per_week,
    )
    # Auto-offer if vacancy available
    if c.vacancies > 0:
        w.status = "offered"
        c.vacancies -= 1
    db.add(w)
    db.commit()
    db.refresh(w)
    position = (
        db.query(ChildcareWaitlist)
        .filter(ChildcareWaitlist.centre_id == cid,
                ChildcareWaitlist.status == "waiting",
                ChildcareWaitlist.id <= w.id)
        .count()
    )
    from app.services.notify import notify  # noqa: PLC0415
    if w.status == "offered":
        notify(db, user=user, council_id=user.council_id,
               action="childcare.offered",
               title="Childcare offer",
               body=f"{c.name} has a vacancy for {body.child_first_name} — confirm in your account.",
               url="/childcare", target_type="childcare_waitlist", target_id=w.id)
    else:
        notify(db, user=user, council_id=user.council_id,
               action="childcare.waitlisted",
               title="On the waitlist",
               body=f"{c.name} — you're #{position} for {body.child_first_name}.",
               url="/childcare", target_type="childcare_waitlist", target_id=w.id)
    return {"id": w.id, "position": position, "status": w.status}


@router.delete("/childcare/waitlist/{wid}", status_code=204)
def cancel_waitlist(wid: int, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> None:
    w = db.get(ChildcareWaitlist, wid)
    if w is None or w.user_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    if w.status not in ("waiting", "offered"):
        raise HTTPException(status_code=400, detail="Cannot cancel now")
    if w.status == "offered":
        # release vacancy back
        c = db.get(ChildcareCentre, w.centre_id)
        if c is not None:
            c.vacancies += 1
    w.status = "cancelled"
    db.commit()


# ============ #2 EV chargers ============


class EvChargerOut(BaseModel):
    id: int
    name: str
    operator: str
    plug_type: str
    kw: float
    address: str
    lat: float
    lng: float
    cents_per_kwh: int
    available: bool
    bookable: bool


@router.get("/ev/chargers", response_model=list[EvChargerOut])
def list_chargers(user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)) -> list[EvChargerOut]:
    rows = db.query(EvCharger).filter(EvCharger.council_id == user.council_id).all()
    return [EvChargerOut(
        id=c.id, name=c.name, operator=c.operator, plug_type=c.plug_type, kw=c.kw,
        address=c.address, lat=c.lat, lng=c.lng, cents_per_kwh=c.cents_per_kwh,
        available=c.available, bookable=c.bookable,
    ) for c in rows]


class EvBookIn(BaseModel):
    starts_at: datetime
    ends_at: datetime


@router.post("/ev/chargers/{cid}/book", status_code=201)
def book_charger(cid: int, body: EvBookIn,
                 user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)) -> dict[str, Any]:
    c = db.get(EvCharger, cid)
    if c is None or c.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    if not c.bookable:
        raise HTTPException(status_code=400, detail="This charger is not bookable")
    if body.ends_at <= body.starts_at:
        raise HTTPException(status_code=400, detail="ends_at must be after starts_at")
    conflict = (
        db.query(EvBooking)
        .filter(EvBooking.charger_id == cid,
                EvBooking.status == "confirmed",
                EvBooking.starts_at < body.ends_at,
                EvBooking.ends_at > body.starts_at)
        .first()
    )
    if conflict is not None:
        raise HTTPException(status_code=409, detail="Slot already taken")
    b = EvBooking(charger_id=cid, user_id=user.id,
                  starts_at=body.starts_at, ends_at=body.ends_at, status="confirmed")
    db.add(b)
    db.commit()
    db.refresh(b)
    return {"id": b.id, "status": b.status}


# ============ #3 Swim sites ============


class SwimSiteOut(BaseModel):
    id: int
    name: str
    kind: str
    lat: float
    lng: float
    address: str | None
    facilities: list[str] | None
    status: str
    latest_grade: str | None
    latest_temp_c: float | None
    latest_taken_at: datetime | None


@router.get("/swim-sites", response_model=list[SwimSiteOut])
def list_swim(user: User = Depends(get_current_user),
              db: Session = Depends(get_db)) -> list[SwimSiteOut]:
    rows = db.query(SwimSite).filter(SwimSite.council_id == user.council_id).all()
    sids = [s.id for s in rows]
    latest: dict[int, SwimReading] = {}
    if sids:
        for reading in (
            db.query(SwimReading)
            .filter(SwimReading.site_id.in_(sids))
            .order_by(SwimReading.taken_at.desc())
            .all()
        ):
            latest.setdefault(reading.site_id, reading)
    out: list[SwimSiteOut] = []
    for s in rows:
        r = latest.get(s.id)
        out.append(SwimSiteOut(
            id=s.id, name=s.name, kind=s.kind, lat=s.lat, lng=s.lng,
            address=s.address, facilities=s.facilities, status=s.status,
            latest_grade=r.grade if r else None,
            latest_temp_c=r.water_temp_c if r else None,
            latest_taken_at=r.taken_at if r else None,
        ))
    return out


# ============ #4 Burn permits & fire bans ============


class BurnPermitIn(BaseModel):
    property_address: str = Field(min_length=4, max_length=300)
    lat: float | None = None
    lng: float | None = None
    burn_kind: str = Field(pattern="^(pile|stubble|hazard_reduction)$")
    starts_at: datetime
    ends_at: datetime


class BurnPermitOut(BaseModel):
    id: int
    permit_no: str
    property_address: str
    burn_kind: str
    starts_at: datetime
    ends_at: datetime
    status: str
    conditions: str | None


@router.post("/burn-permits", response_model=BurnPermitOut, status_code=201)
def apply_burn(body: BurnPermitIn, user: User = Depends(get_current_user),
               db: Session = Depends(get_db)) -> BurnPermitOut:
    now = datetime.now(UTC)
    ban = (
        db.query(FireBan)
        .filter(FireBan.council_id == user.council_id,
                FireBan.declared_at <= body.starts_at,
                FireBan.ends_at >= body.starts_at,
                FireBan.rating.in_(["extreme", "catastrophic"]))
        .first()
    )
    if ban is not None:
        raise HTTPException(status_code=400, detail=f"Total fire ban in effect ({ban.rating})")
    p = BurnPermit(
        council_id=user.council_id, user_id=user.id,
        permit_no=f"BP-{now.strftime('%Y%m')}-{secrets.token_hex(3).upper()}",
        property_address=body.property_address, lat=body.lat, lng=body.lng,
        burn_kind=body.burn_kind, starts_at=body.starts_at, ends_at=body.ends_at,
        status="approved",
        conditions="Notify neighbours and RFS before lighting. Have water on hand. Extinguish before dark.",
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return BurnPermitOut(
        id=p.id, permit_no=p.permit_no, property_address=p.property_address,
        burn_kind=p.burn_kind, starts_at=p.starts_at, ends_at=p.ends_at,
        status=p.status, conditions=p.conditions,
    )


@router.get("/burn-permits/mine", response_model=list[BurnPermitOut])
def my_burns(user: User = Depends(get_current_user),
             db: Session = Depends(get_db)) -> list[BurnPermitOut]:
    rows = (
        db.query(BurnPermit)
        .filter(BurnPermit.user_id == user.id)
        .order_by(BurnPermit.starts_at.desc())
        .all()
    )
    return [BurnPermitOut(
        id=p.id, permit_no=p.permit_no, property_address=p.property_address,
        burn_kind=p.burn_kind, starts_at=p.starts_at, ends_at=p.ends_at,
        status=p.status, conditions=p.conditions,
    ) for p in rows]


class FireBanOut(BaseModel):
    id: int
    rating: str
    declared_at: datetime
    ends_at: datetime
    source: str
    note: str | None


@router.get("/fire-bans/current", response_model=FireBanOut | None)
def current_ban(user: User = Depends(get_current_user),
                db: Session = Depends(get_db)) -> FireBanOut | None:
    now = datetime.now(UTC)
    b = (
        db.query(FireBan)
        .filter(FireBan.council_id == user.council_id,
                FireBan.declared_at <= now,
                FireBan.ends_at >= now)
        .order_by(FireBan.declared_at.desc())
        .first()
    )
    if b is None:
        return None
    return FireBanOut(id=b.id, rating=b.rating, declared_at=b.declared_at,
                      ends_at=b.ends_at, source=b.source, note=b.note)


# ============ #5 Library of Things ============


class LotItemOut(BaseModel):
    id: int
    name: str
    kind: str
    description: str | None
    image_url: str | None
    deposit_cents: int
    max_loan_days: int
    available: bool


@router.get("/lot/items", response_model=list[LotItemOut])
def list_lot(kind: str | None = None,
             user: User = Depends(get_current_user),
             db: Session = Depends(get_db)) -> list[LotItemOut]:
    q = db.query(LotItem).filter(LotItem.council_id == user.council_id)
    if kind:
        q = q.filter(LotItem.kind == kind)
    rows = q.order_by(LotItem.name).all()
    return [LotItemOut(
        id=i.id, name=i.name, kind=i.kind, description=i.description,
        image_url=i.image_url, deposit_cents=i.deposit_cents,
        max_loan_days=i.max_loan_days, available=i.available,
    ) for i in rows]


@router.post("/lot/items/{iid}/borrow", status_code=201)
def borrow_lot(iid: int, user: User = Depends(get_current_user),
               db: Session = Depends(get_db)) -> dict[str, Any]:
    item = db.get(LotItem, iid)
    if item is None or item.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    if not item.available:
        raise HTTPException(status_code=400, detail="Not available")
    now = datetime.now(UTC)
    loan = LotLoan(item_id=iid, user_id=user.id,
                   due_at=now + timedelta(days=item.max_loan_days), status="active")
    item.available = False
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return {"loan_id": loan.id, "due_at": loan.due_at.isoformat()}


# ============ #6 Lost & found ============


def _phash_from_text(text: str) -> str:
    """Quick text-based hash placeholder. Swap for image perceptual hash later."""
    return hashlib.sha1(text.lower().encode()).hexdigest()[:16]


class LostFoundIn(BaseModel):
    kind: str = Field(pattern="^(pet|item)$")
    direction: str = Field(pattern="^(lost|found)$")
    title: str = Field(min_length=2, max_length=200)
    description: str = Field(min_length=2, max_length=2000)
    lat: float | None = None
    lng: float | None = None
    contact: str | None = Field(default=None, max_length=120)


class LostFoundOut(BaseModel):
    id: int
    kind: str
    direction: str
    title: str
    description: str
    lat: float | None
    lng: float | None
    contact: str | None
    status: str
    created_at: datetime
    candidate_match_id: int | None


@router.get("/lost-found", response_model=list[LostFoundOut])
def list_lost_found(direction: str | None = None, kind: str | None = None,
                    days: int = Query(default=60, ge=1, le=365),
                    limit: int = Query(default=50, ge=1, le=200),
                    offset: int = Query(default=0, ge=0),
                    user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> list[LostFoundOut]:
    # Auto-close stale lost posts older than `days`
    cutoff = datetime.now(UTC) - timedelta(days=days)
    q = db.query(LostFoundItem).filter(
        LostFoundItem.council_id == user.council_id,
        LostFoundItem.status.in_(("open", "matched")),
        LostFoundItem.created_at >= cutoff,
    )
    if direction:
        q = q.filter(LostFoundItem.direction == direction)
    if kind:
        q = q.filter(LostFoundItem.kind == kind)
    rows = q.order_by(LostFoundItem.created_at.desc()).offset(offset).limit(limit).all()
    return [LostFoundOut(
        id=r.id, kind=r.kind, direction=r.direction, title=r.title,
        description=r.description, lat=r.lat, lng=r.lng, contact=r.contact,
        status=r.status, created_at=r.created_at,
        candidate_match_id=None,
    ) for r in rows]


@router.post("/lost-found", response_model=LostFoundOut, status_code=201)
def report_lost_found(body: LostFoundIn, user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)) -> LostFoundOut:
    phash = _phash_from_text(f"{body.kind}:{body.title}")
    opposite = "found" if body.direction == "lost" else "lost"
    candidate = (
        db.query(LostFoundItem)
        .filter(LostFoundItem.council_id == user.council_id,
                LostFoundItem.kind == body.kind,
                LostFoundItem.direction == opposite,
                LostFoundItem.status == "open",
                LostFoundItem.phash == phash)
        .first()
    )
    item = LostFoundItem(
        council_id=user.council_id, reporter_user_id=user.id,
        kind=body.kind, direction=body.direction, title=body.title,
        description=body.description, phash=phash,
        lat=body.lat, lng=body.lng, contact=body.contact,
        status="matched" if candidate is not None else "open",
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    if candidate is not None:
        candidate.status = "matched"
        db.commit()
        from app.services.notify import notify  # noqa: PLC0415
        notify(db, user=user, council_id=user.council_id,
               action="lost_found.match",
               title="Possible match!",
               body=f"Someone may have your {body.kind} — '{candidate.title}'.",
               url="/lost-found", target_type="lost_found_item", target_id=item.id)
        # Also notify the other side
        other = db.get(User, candidate.reporter_user_id) if candidate.reporter_user_id else None
        if other is not None:
            notify(db, user=other, council_id=user.council_id,
                   action="lost_found.match",
                   title="Possible match for your post",
                   body=f"Someone reported '{body.title}' — could be yours.",
                   url="/lost-found", target_type="lost_found_item", target_id=candidate.id)
    return LostFoundOut(
        id=item.id, kind=item.kind, direction=item.direction, title=item.title,
        description=item.description, lat=item.lat, lng=item.lng, contact=item.contact,
        status=item.status, created_at=item.created_at,
        candidate_match_id=candidate.id if candidate else None,
    )


@router.post("/lost-found/{iid}/reunite", status_code=200)
def reunite_lost_found(iid: int, user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)) -> dict[str, Any]:
    item = db.get(LostFoundItem, iid)
    if item is None or item.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    if item.reporter_user_id != user.id and user.role == UserRole.resident.value:
        raise HTTPException(status_code=403, detail="Only the poster can close")
    item.status = "reunited"
    db.commit()
    return {"ok": True}


# ============ #7 Citizen panels ============


class PanelOut(BaseModel):
    id: int
    title: str
    description: str
    question: str
    target_size: int
    opens_at: datetime
    deliberates_at: datetime
    status: str
    expressed: bool
    selected: bool


@router.get("/panels", response_model=list[PanelOut])
def list_panels(user: User = Depends(get_current_user),
                db: Session = Depends(get_db)) -> list[PanelOut]:
    rows = (
        db.query(CitizenPanel)
        .filter(CitizenPanel.council_id == user.council_id)
        .order_by(CitizenPanel.deliberates_at)
        .all()
    )
    mine: dict[int, PanelExpression] = {
        e.panel_id: e for e in
        db.query(PanelExpression)
        .filter(PanelExpression.user_id == user.id,
                PanelExpression.panel_id.in_([p.id for p in rows]))
        .all()
    }
    return [PanelOut(
        id=p.id, title=p.title, description=p.description, question=p.question,
        target_size=p.target_size, opens_at=p.opens_at,
        deliberates_at=p.deliberates_at, status=p.status,
        expressed=p.id in mine,
        selected=bool(mine.get(p.id, None) and mine[p.id].selected),
    ) for p in rows]


@router.post("/panels/{pid}/express", status_code=201)
def express_panel(pid: int, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)) -> dict[str, Any]:
    p = db.get(CitizenPanel, pid)
    if p is None or p.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    if p.status != "recruiting":
        raise HTTPException(status_code=400, detail="Recruitment closed")
    existing = (
        db.query(PanelExpression)
        .filter(PanelExpression.panel_id == pid, PanelExpression.user_id == user.id)
        .first()
    )
    if existing is not None:
        return {"ok": True}
    db.add(PanelExpression(panel_id=pid, user_id=user.id))
    db.commit()
    return {"ok": True}


@router.post("/panels/{pid}/draw", status_code=201)
def draw_panel(pid: int, user: User = Depends(get_current_user),
               db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    p = db.get(CitizenPanel, pid)
    if p is None or p.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    pool = list(db.query(PanelExpression).filter(PanelExpression.panel_id == pid).all())
    if not pool:
        raise HTTPException(status_code=400, detail="No expressions in pool")
    drawn = random.sample(pool, min(p.target_size, len(pool)))
    for e in drawn:
        e.selected = True
    p.status = "selected"
    db.commit()
    from app.services.notify import notify  # noqa: PLC0415
    for e in drawn:
        selected_user = db.get(User, e.user_id)
        if selected_user is None:
            continue
        notify(db, user=selected_user, council_id=user.council_id,
               action="panel.selected",
               title="You're on the panel",
               body=f"You've been randomly selected for the '{p.title}' citizen panel. "
                    f"First sitting {p.deliberates_at.date()}.",
               url="/panels", target_type="citizen_panel", target_id=p.id,
               webhook_event="panel.drawn")
    return {"ok": True, "drawn": len(drawn), "pool": len(pool)}


# ============ #8 Meeting transcripts ============


class TranscriptUpdate(BaseModel):
    transcript_text: str = Field(min_length=10)


@router.put("/staff/meetings/{mid}/transcript", status_code=200)
def upload_transcript(mid: int, body: TranscriptUpdate,
                      user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    m = db.get(CouncilMeeting, mid)
    if m is None or m.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    m.transcript_text = body.transcript_text
    db.commit()
    return {"ok": True}


@router.get("/meetings/{mid}/transcript")
def get_transcript(mid: int, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)) -> dict[str, Any]:
    m = db.get(CouncilMeeting, mid)
    if m is None or m.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    return {"transcript_text": m.transcript_text or "", "title": m.title}


# ============ #9 Footpath audit ============


class FootpathAuditIn(BaseModel):
    lat: float
    lng: float
    issue: str = Field(pattern="^(cracked|raised|missing|narrow|no_kerb_ramp|obstructed)$")
    grade: str = Field(pattern="^(good|fair|poor|impassable)$")
    notes: str | None = Field(default=None, max_length=2000)


class FootpathAuditOut(BaseModel):
    id: int
    lat: float
    lng: float
    issue: str
    grade: str
    notes: str | None
    verified: bool
    created_at: datetime


@router.post("/footpath/audits", response_model=FootpathAuditOut, status_code=201)
def submit_audit(body: FootpathAuditIn, user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)) -> FootpathAuditOut:
    a = FootpathAudit(
        council_id=user.council_id, reporter_user_id=user.id,
        lat=body.lat, lng=body.lng, issue=body.issue,
        grade=body.grade, notes=body.notes,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return FootpathAuditOut(
        id=a.id, lat=a.lat, lng=a.lng, issue=a.issue, grade=a.grade,
        notes=a.notes, verified=a.verified, created_at=a.created_at,
    )


@router.get("/footpath/audits", response_model=list[FootpathAuditOut])
def list_audits(hours: int = Query(default=720, ge=1, le=4320),
                user: User = Depends(get_current_user),
                db: Session = Depends(get_db)) -> list[FootpathAuditOut]:
    cutoff = datetime.now(UTC) - timedelta(hours=hours)
    rows = (
        db.query(FootpathAudit)
        .filter(FootpathAudit.council_id == user.council_id,
                FootpathAudit.created_at >= cutoff)
        .order_by(FootpathAudit.created_at.desc())
        .limit(500)
        .all()
    )
    return [FootpathAuditOut(
        id=a.id, lat=a.lat, lng=a.lng, issue=a.issue, grade=a.grade,
        notes=a.notes, verified=a.verified, created_at=a.created_at,
    ) for a in rows]


# ============ #10 Heritage / First Nations ============


class HeritageSiteOut(BaseModel):
    id: int
    name: str
    traditional_name: str | None
    country: str | None
    language_group: str | None
    kind: str
    significance: str
    address: str | None
    lat: float | None
    lng: float | None
    image_url: str | None
    audio_url: str | None


@router.get("/heritage", response_model=list[HeritageSiteOut])
def list_heritage(user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)) -> list[HeritageSiteOut]:
    rows = (
        db.query(HeritageSite)
        .filter(HeritageSite.council_id == user.council_id,
                HeritageSite.public.is_(True))
        .all()
    )
    return [HeritageSiteOut(
        id=h.id, name=h.name, traditional_name=h.traditional_name,
        country=h.country, language_group=h.language_group, kind=h.kind,
        significance=h.significance, address=h.address, lat=h.lat, lng=h.lng,
        image_url=h.image_url, audio_url=h.audio_url,
    ) for h in rows]


# ============ Demo seed ============


def seed_v5_demo(db: Session, *, council_id: int) -> dict[str, int]:
    counts = {"childcare": 0, "ev": 0, "swim": 0, "burn": 0, "fire_ban": 0,
              "lot": 0, "lost_found": 0, "panel": 0, "footpath": 0, "heritage": 0}
    now = datetime.now(UTC)

    # Childcare
    if not db.query(ChildcareCentre).filter(ChildcareCentre.council_id == council_id).first():
        for name, kind, addr, lat, lng, vac, fee, rating in [
            ("Leeton Early Learning Centre", "long_day", "12 Wade St, Leeton",
             -34.555, 146.401, 3, 13500, "exceeding"),
            ("Yanco Preschool", "preschool", "Main St, Yanco",
             -34.602, 146.398, 0, 9800, "meeting"),
            ("Little Pioneers Family Day Care", "family_day", "Multiple homes, Leeton",
             -34.555, 146.402, 5, 11200, "meeting"),
            ("Leeton OSHC", "oshc", "Leeton PS, Pine Ave",
             -34.554, 146.402, 8, 4500, "exceeding"),
        ]:
            db.add(ChildcareCentre(
                council_id=council_id, name=name, kind=kind, address=addr, lat=lat, lng=lng,
                age_min_months=6 if kind != "preschool" else 36,
                age_max_months=72, daily_fee_cents=fee, vacancies=vac, rating=rating,
            ))
            counts["childcare"] += 1

    # EV chargers
    if not db.query(EvCharger).filter(EvCharger.council_id == council_id).first():
        for name, op, plug, kw, addr, lat, lng, cents, bookable in [
            ("Leeton Shire Library", "council", "type2", 22.0, "Library, Main St",
             -34.553, 146.404, 35, True),
            ("Roxy Theatre", "chargefox", "ccs2", 50.0, "118 Pine Ave, Leeton",
             -34.556, 146.402, 45, False),
            ("Visitor Centre", "evie", "ccs2", 75.0, "10 Yanco Rd, Leeton",
             -34.560, 146.395, 50, False),
            ("Whitton Community Hall", "council", "type2", 7.4, "Main St, Whitton",
             -34.500, 146.190, 30, True),
        ]:
            db.add(EvCharger(council_id=council_id, name=name, operator=op,
                             plug_type=plug, kw=kw, address=addr, lat=lat, lng=lng,
                             cents_per_kwh=cents, available=True, bookable=bookable))
            counts["ev"] += 1

    # Swim sites
    if not db.query(SwimSite).filter(SwimSite.council_id == council_id).first():
        sites = [
            ("Leeton Swimming Pool", "pool", -34.557, 146.401, "Wade St, Leeton",
             ["lifeguard", "kiosk", "shower"], "open", 24.5, "good"),
            ("Murrumbidgee River — Pine Beach", "river", -34.580, 146.380,
             "Pine Beach Rd", ["bbq", "toilets"], "caution", 19.2, "fair"),
            ("Yanco Weir", "river", -34.610, 146.390, "Yanco Weir Rd",
             ["toilets"], "open", 18.8, "good"),
        ]
        for name, kind, lat, lng, addr, fac, status, temp, grade in sites:
            s = SwimSite(council_id=council_id, name=name, kind=kind,
                         lat=lat, lng=lng, address=addr, facilities=fac, status=status)
            db.add(s)
            db.flush()
            db.add(SwimReading(site_id=s.id, taken_at=now - timedelta(hours=3),
                               water_temp_c=temp, enterococci_per_100ml=12,
                               turbidity_ntu=2.4, grade=grade))
            counts["swim"] += 1

    # Fire ban
    if not db.query(FireBan).filter(FireBan.council_id == council_id).first():
        db.add(FireBan(council_id=council_id,
                       declared_at=now + timedelta(days=3),
                       ends_at=now + timedelta(days=4),
                       rating="high", source="rfs",
                       note="High fire danger forecast Saturday. No solid-fuel burning without permit."))
        counts["fire_ban"] += 1

    # Burn permits — seeded so users see a sample
    if not db.query(BurnPermit).filter(BurnPermit.council_id == council_id).first():
        counts["burn"] = 0  # Don't auto-seed user-owned; left empty

    # Library of Things
    if not db.query(LotItem).filter(LotItem.council_id == council_id).first():
        items = [
            ("Cordless drill (Makita 18V)", "tool", "Includes 2 batteries + driver bits.", 5000),
            ("Pasta maker", "kitchen", "Hand-crank, with cutters.", 2000),
            ("Whipper-snipper", "garden", "Petrol — bring your own fuel.", 5000),
            ("Sewing machine (Brother)", "sewing", "With pedal, basic kit.", 3000),
            ("Projector (Epson 1080p)", "tech", "HDMI, USB-C. Returns next day.", 10000),
            ("Tennis racquets x2 + balls", "sport", "Adult and junior.", 1000),
            ("Cake tins set (10 shapes)", "kitchen", "Round, square, novelty.", 0),
        ]
        for name, kind, desc, dep in items:
            db.add(LotItem(council_id=council_id, name=name, kind=kind,
                           description=desc, deposit_cents=dep,
                           max_loan_days=14, available=True))
            counts["lot"] += 1

    # Lost & found
    if not db.query(LostFoundItem).filter(LostFoundItem.council_id == council_id).first():
        for kind, direction, title, desc, contact in [
            ("pet", "found", "Tabby cat, Pine Ave",
             "Friendly tabby cat near Pine Park. Wearing red collar, no tag.", "council ranger"),
            ("item", "lost", "AirPods Pro case",
             "Lost white AirPods Pro case at the Library Saturday morning.", None),
            ("item", "found", "Black umbrella",
             "Black umbrella left at Roxy Café Friday.", "Roxy Café staff"),
        ]:
            db.add(LostFoundItem(
                council_id=council_id, kind=kind, direction=direction,
                title=title, description=desc, contact=contact,
                phash=hashlib.sha1(f"{kind}:{title}".lower().encode()).hexdigest()[:16],
                status="open",
            ))
            counts["lost_found"] += 1

    # Citizen panel
    if not db.query(CitizenPanel).filter(CitizenPanel.council_id == council_id).first():
        db.add(CitizenPanel(
            council_id=council_id,
            title="Main St redesign panel",
            description="A randomly-selected panel of 24 residents will deliberate over two "
                        "weekends on the Main St redesign. Travel and childcare reimbursed.",
            question="What should Main St look and feel like in 10 years?",
            target_size=24,
            strata={"by_ward": True, "age_bands": ["18-29", "30-49", "50-69", "70+"]},
            opens_at=now - timedelta(days=2),
            deliberates_at=now + timedelta(days=45),
            status="recruiting",
        ))
        counts["panel"] += 1

    # Footpath audits — seeded a handful
    if not db.query(FootpathAudit).filter(FootpathAudit.council_id == council_id).first():
        for lat, lng, issue, grade, note in [
            (-34.554, 146.402, "cracked", "fair", "Long crack outside #14, ok with pram"),
            (-34.555, 146.401, "raised", "poor", "Tree root has lifted slab, trip hazard"),
            (-34.556, 146.400, "no_kerb_ramp", "impassable", "No ramp at this corner — wheelchair has to detour"),
        ]:
            db.add(FootpathAudit(council_id=council_id, lat=lat, lng=lng,
                                 issue=issue, grade=grade, notes=note, verified=False))
            counts["footpath"] += 1

    # Heritage / First Nations
    if not db.query(HeritageSite).filter(HeritageSite.council_id == council_id).first():
        heritage: list[tuple[str, str | None, str | None, str | None, str, str, str | None, float | None, float | None, str | None]] = [
            ("Murrumbidgee River", "Marrambidya Bila", "Wiradjuri", "Wiradjuri",
             "natural",
             "The 'big water' — sustaining life for tens of thousands of years. "
             "Sacred fishing and meeting places along its banks.",
             None, -34.580, 146.380,
             "Wiradjuri Council of Elders"),
            ("Roxy Theatre", None, None, None, "built",
             "1930 Spanish Mission cinema, one of the best-preserved in NSW.",
             "118 Pine Ave, Leeton", -34.556, 146.402, None),
            ("Yanco Agricultural High School", None, None, None, "built",
             "1900s agricultural college, listed for state heritage.",
             "Yanco, NSW", -34.610, 146.398, None),
            ("Fivebough Wetlands", "Wiradjuri name TBC with Elders",
             "Wiradjuri", "Wiradjuri", "cultural",
             "Internationally-significant wetland (Ramsar). Important food source and "
             "story place for Wiradjuri people.",
             "Petersham Rd, Leeton", -34.546, 146.400,
             "Wiradjuri Council of Elders"),
        ]
        for h_name, h_trad, h_country, h_lang, h_kind, h_sig, h_addr, h_lat, h_lng, h_consent in heritage:
            db.add(HeritageSite(
                council_id=council_id, name=h_name, traditional_name=h_trad,
                country=h_country, language_group=h_lang, kind=h_kind,
                significance=h_sig, address=h_addr, lat=h_lat, lng=h_lng,
                consent_holder=h_consent, public=True,
            ))
            counts["heritage"] += 1

    db.commit()
    return counts
