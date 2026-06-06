"""All v2 feature endpoints in one place: map, AI triage, SMS,
direct-debit, open-data, meetings, noticeboard, climate, programs.

FOSS-first throughout — no proprietary API calls without env-var opt-in.
"""
from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import (
    ClimateMetric,
    CommunityPost,
    Council,
    CouncilMeeting,
    DirectDebitAuth,
    MeetingAgendaItem,
    PostStatus,
    Program,
    ProgramBooking,
    ProgramKind,
    Property,
    PropertyOwnership,
    RatesAccount,
    Report,
    ReportCategory,
    User,
    UserRole,
)
from app.services import ai_triage, sms

router = APIRouter(tags=["v2"])
public_router = APIRouter(prefix="/public", tags=["public-open-data"])


# ============================================================
# Idea #1 — Map view of nearby reports
# ============================================================


class MapReportRow(BaseModel):
    id: int
    title: str
    category_label: str
    status: str
    lat: float
    lng: float


@router.get("/reports/map", response_model=list[MapReportRow])
def reports_map(
    bbox: str | None = Query(default=None, description="south,west,north,east"),
    days: int = Query(default=30, ge=1, le=365),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MapReportRow]:
    cutoff = datetime.now(UTC) - timedelta(days=days)
    q = (
        db.query(Report, ReportCategory)
        .join(ReportCategory, ReportCategory.id == Report.category_id)
        .filter(
            Report.council_id == user.council_id,
            Report.public.is_(True),
            Report.lat.isnot(None),
            Report.lng.isnot(None),
            Report.created_at >= cutoff,
            Report.status.notin_(("closed", "duplicate", "rejected")),
        )
    )
    if bbox:
        try:
            s, w, n, e = (float(x) for x in bbox.split(","))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="bbox must be 'south,west,north,east'") from exc
        q = q.filter(
            Report.lat >= s, Report.lat <= n,
            Report.lng >= w, Report.lng <= e,
        )
    rows = q.order_by(Report.created_at.desc()).limit(500).all()
    return [
        MapReportRow(
            id=r.id, title=r.title, category_label=c.label,
            status=r.status, lat=r.lat, lng=r.lng,
        )
        for (r, c) in rows
    ]


# ============================================================
# Idea #2 — AI report triage
# ============================================================


class TriageIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(default="", max_length=4000)
    has_photo: bool = False


class TriageOut(BaseModel):
    suggested_category_key: str
    suggested_category_id: int | None
    suggested_priority: str
    confidence: float
    rationale: str
    provider: str


@router.post("/triage/suggest", response_model=TriageOut)
def ai_triage_suggest(
    body: TriageIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TriageOut:
    """Hits the local rules-based classifier. Real Hugging Face / Ollama
    integration can replace the service implementation later."""
    result = ai_triage.classify_report(
        title=body.title, description=body.description, has_photo=body.has_photo,
    )
    cat = (
        db.query(ReportCategory)
        .filter(
            ReportCategory.council_id == user.council_id,
            ReportCategory.key == result["suggested_category_key"],
        )
        .first()
    )
    return TriageOut(
        suggested_category_key=result["suggested_category_key"],
        suggested_category_id=cat.id if cat else None,
        suggested_priority=result["suggested_priority"],
        confidence=result["confidence"],
        rationale=result["rationale"],
        provider=result["provider"],
    )


# ============================================================
# Idea #3 — SMS channel
# ============================================================


class SmsInIn(BaseModel):
    phone: str
    body: str
    provider_sid: str | None = None


@router.post("/sms/inbound")
def sms_inbound(
    body: SmsInIn,
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Webhook for any SMS provider — Twilio, MessageBird, self-hosted
    Gammu/Kannel — all post the same shape. Auth via shared secret in M8.x;
    today gated by Render's per-service network policy."""
    # Council resolution: header preferred; fallback to first council.
    slug = request.headers.get("x-council-slug")
    council = None
    if slug:
        council = db.query(Council).filter(Council.slug == slug).first()
    if council is None:
        council = db.query(Council).first()
    if council is None:
        raise HTTPException(status_code=400, detail="No council configured")
    out = sms.receive(
        db, council_id=council.id, phone=body.phone, body=body.body,
        provider_sid=body.provider_sid,
    )
    return out


# ============================================================
# Idea #4 — Voice-note reports + multilingual support
# ============================================================
# Voice notes are just report attachments with mime audio/*. The
# /reports/attachments/presign endpoint already supports them. Server-side
# transcription via Whisper-CPP / faster-whisper is wired in M9.x worker.
# For multilingual UI, translate.translate() is called per language code.


# ============================================================
# Idea #5 — Direct-debit rates auto-pay
# ============================================================


class DirectDebitIn(BaseModel):
    account_id: int
    cadence: str = Field(default="monthly", pattern="^(weekly|fortnightly|monthly|quarterly)$")
    amount_cents: int = Field(ge=100)
    starts_on: date | None = None


class DirectDebitOut(BaseModel):
    id: int
    account_id: int
    cadence: str
    amount_cents: int
    starts_on: date
    next_charge_on: date | None
    status: str
    provider: str


def _next_charge(starts: date, cadence: str) -> date:
    if cadence == "weekly":
        return starts + timedelta(days=7)
    if cadence == "fortnightly":
        return starts + timedelta(days=14)
    if cadence == "quarterly":
        return starts + timedelta(days=90)
    # monthly
    month = starts.month + 1
    year = starts.year + (1 if month > 12 else 0)
    month = ((month - 1) % 12) + 1
    day = min(starts.day, 28)
    return date(year, month, day)


@router.post("/rates/direct-debit", response_model=DirectDebitOut, status_code=201)
def setup_direct_debit(
    body: DirectDebitIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DirectDebitOut:
    account = db.get(RatesAccount, body.account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    prop = db.get(Property, account.property_id)
    if prop is None or prop.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Account not found")
    own = (
        db.query(PropertyOwnership)
        .filter(PropertyOwnership.property_id == prop.id, PropertyOwnership.user_id == user.id)
        .first()
    )
    if own is None:
        raise HTTPException(status_code=403, detail="Not your account")

    starts = body.starts_on or date.today()
    dd = DirectDebitAuth(
        account_id=account.id,
        user_id=user.id,
        provider="paypal",  # PayPal Subscriptions is free for the council
        cadence=body.cadence,
        amount_cents=body.amount_cents,
        starts_on=starts,
        next_charge_on=_next_charge(starts, body.cadence),
        status="active",
    )
    db.add(dd)
    db.commit()
    db.refresh(dd)
    return DirectDebitOut(
        id=dd.id, account_id=dd.account_id, cadence=dd.cadence,
        amount_cents=dd.amount_cents, starts_on=dd.starts_on,
        next_charge_on=dd.next_charge_on, status=dd.status, provider=dd.provider,
    )


@router.delete("/rates/direct-debit/{dd_id}", status_code=204)
def cancel_direct_debit(
    dd_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    dd = db.get(DirectDebitAuth, dd_id)
    if dd is None or dd.user_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    dd.status = "cancelled"
    db.commit()


# ============================================================
# Idea #6 — Public open-data dashboard
# ============================================================


class PublicStatsOut(BaseModel):
    council: str
    generated_at: datetime
    reports_last_30d: int
    open_reports: int
    resolved_last_30d: int
    sla_hit_pct: float | None
    reports_by_category: dict[str, int]
    avg_resolution_hours: float | None


@public_router.get("/stats/{council_slug}", response_model=PublicStatsOut)
def public_stats(council_slug: str, db: Session = Depends(get_db)) -> PublicStatsOut:
    """No-auth aggregated stats for journalists, researchers, and
    public transparency. Council-scoped, anonymised."""
    council = db.query(Council).filter(Council.slug == council_slug).first()
    if council is None:
        raise HTTPException(status_code=404, detail="Council not found")

    now = datetime.now(UTC)
    cutoff = now - timedelta(days=30)
    base = db.query(Report).filter(Report.council_id == council.id)

    last30 = base.filter(Report.created_at >= cutoff).count()
    open_count = base.filter(
        Report.status.notin_(("resolved", "closed", "duplicate", "rejected"))
    ).count()
    resolved30 = base.filter(
        Report.status == "resolved", Report.resolved_at >= cutoff
    ).count()

    by_cat_rows = (
        db.query(ReportCategory.label, func.count(Report.id))
        .join(ReportCategory, ReportCategory.id == Report.category_id)
        .filter(Report.council_id == council.id, Report.created_at >= cutoff)
        .group_by(ReportCategory.label)
        .all()
    )

    # SLA hit %: resolved within sla_due_at.
    sla_total = base.filter(
        Report.status == "resolved",
        Report.resolved_at.isnot(None),
        Report.sla_due_at.isnot(None),
    ).count()
    sla_hit = base.filter(
        Report.status == "resolved",
        Report.resolved_at.isnot(None),
        Report.sla_due_at.isnot(None),
        Report.resolved_at <= Report.sla_due_at,
    ).count()
    sla_pct = round((sla_hit / sla_total) * 100, 1) if sla_total else None

    return PublicStatsOut(
        council=council.name,
        generated_at=now,
        reports_last_30d=last30,
        open_reports=open_count,
        resolved_last_30d=resolved30,
        sla_hit_pct=sla_pct,
        reports_by_category={label: count for label, count in by_cat_rows},
        avg_resolution_hours=None,  # join math added in M8.x
    )


# ============================================================
# Idea #7 — Council meetings
# ============================================================


class AgendaItemOut(BaseModel):
    id: int
    position: int
    title: str
    description: str | None
    outcome: str | None
    votes_for: int | None
    votes_against: int | None
    votes_abstain: int | None


class MeetingOut(BaseModel):
    id: int
    title: str
    starts_at: datetime
    duration_minutes: int
    location: str | None
    agenda_url: str | None
    minutes_url: str | None
    livestream_url: str | None
    status: str
    items: list[AgendaItemOut]


@router.get("/meetings", response_model=list[MeetingOut])
def list_meetings(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MeetingOut]:
    meetings = (
        db.query(CouncilMeeting)
        .filter(CouncilMeeting.council_id == user.council_id)
        .order_by(CouncilMeeting.starts_at.desc())
        .limit(20)
        .all()
    )
    out: list[MeetingOut] = []
    for m in meetings:
        items = (
            db.query(MeetingAgendaItem)
            .filter(MeetingAgendaItem.meeting_id == m.id)
            .order_by(MeetingAgendaItem.position)
            .all()
        )
        out.append(MeetingOut(
            id=m.id, title=m.title, starts_at=m.starts_at,
            duration_minutes=m.duration_minutes, location=m.location,
            agenda_url=m.agenda_url, minutes_url=m.minutes_url,
            livestream_url=m.livestream_url, status=m.status,
            items=[AgendaItemOut(
                id=i.id, position=i.position, title=i.title,
                description=i.description, outcome=i.outcome,
                votes_for=i.votes_for, votes_against=i.votes_against,
                votes_abstain=i.votes_abstain,
            ) for i in items],
        ))
    return out


# ============================================================
# Idea #8 — Community noticeboard
# ============================================================


class PostIn(BaseModel):
    kind: str = Field(pattern="^(event|lost_found|garage_sale|community)$")
    title: str = Field(min_length=3, max_length=200)
    body_markdown: str = Field(min_length=5, max_length=10000)
    event_at: datetime | None = None
    location_text: str | None = Field(default=None, max_length=200)


class PostOut(BaseModel):
    id: int
    kind: str
    title: str
    body_markdown: str
    event_at: datetime | None
    location_text: str | None
    author_name: str | None
    status: str
    created_at: datetime


@router.get("/noticeboard", response_model=list[PostOut])
def list_posts(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[PostOut]:
    rows = (
        db.query(CommunityPost, User)
        .outerjoin(User, User.id == CommunityPost.author_user_id)
        .filter(
            CommunityPost.council_id == user.council_id,
            CommunityPost.status == PostStatus.published.value,
        )
        .order_by(CommunityPost.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        PostOut(
            id=p.id, kind=p.kind, title=p.title, body_markdown=p.body_markdown,
            event_at=p.event_at, location_text=p.location_text,
            author_name=author.name if author else None,
            status=p.status, created_at=p.created_at,
        )
        for (p, author) in rows
    ]


@router.post("/noticeboard", response_model=PostOut, status_code=201)
def create_post(
    body: PostIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PostOut:
    # Staff/admin posts auto-publish; resident posts await moderation.
    auto = user.role in (UserRole.staff.value, UserRole.admin.value)
    post = CommunityPost(
        council_id=user.council_id,
        author_user_id=user.id,
        kind=body.kind,
        title=body.title.strip(),
        body_markdown=body.body_markdown,
        event_at=body.event_at,
        location_text=body.location_text,
        status=PostStatus.published.value if auto else PostStatus.pending.value,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return PostOut(
        id=post.id, kind=post.kind, title=post.title,
        body_markdown=post.body_markdown, event_at=post.event_at,
        location_text=post.location_text, author_name=user.name,
        status=post.status, created_at=post.created_at,
    )


# ============================================================
# Idea #9 — Climate / sustainability metrics
# ============================================================


class ClimateMetricOut(BaseModel):
    key: str
    label: str
    unit: str
    value: float
    target: float | None
    target_year: int | None
    period_end: date


@router.get("/climate", response_model=list[ClimateMetricOut])
def climate_metrics(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ClimateMetricOut]:
    rows = (
        db.query(ClimateMetric)
        .filter(ClimateMetric.council_id == user.council_id)
        .order_by(ClimateMetric.metric_key, ClimateMetric.period_end.desc())
        .all()
    )
    # Latest reading per metric_key.
    seen: dict[str, ClimateMetric] = {}
    for m in rows:
        if m.metric_key not in seen:
            seen[m.metric_key] = m
    return [
        ClimateMetricOut(
            key=m.metric_key, label=m.label, unit=m.unit,
            value=m.value_num, target=m.target_num, target_year=m.target_year,
            period_end=m.period_end,
        )
        for m in seen.values()
    ]


# ============================================================
# Idea #10 — Programs / volunteer / bookings marketplace
# ============================================================


class ProgramOut(BaseModel):
    id: int
    title: str
    description: str
    kind: str
    capacity: int | None
    starts_at: datetime | None
    ends_at: datetime | None
    location: str | None
    fee_cents: int
    bookings_open: bool
    spots_remaining: int | None


@router.get("/programs", response_model=list[ProgramOut])
def list_programs(
    kind: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ProgramOut]:
    q = db.query(Program).filter(Program.council_id == user.council_id)
    if kind:
        q = q.filter(Program.kind == kind)
    rows = q.order_by(Program.starts_at.asc().nullslast()).limit(50).all()
    out: list[ProgramOut] = []
    for p in rows:
        booked = (
            db.query(func.count(ProgramBooking.id))
            .filter(
                ProgramBooking.program_id == p.id,
                ProgramBooking.status != "cancelled",
            )
            .scalar()
            or 0
        )
        remaining = (p.capacity - booked) if p.capacity is not None else None
        out.append(ProgramOut(
            id=p.id, title=p.title, description=p.description, kind=p.kind,
            capacity=p.capacity, starts_at=p.starts_at, ends_at=p.ends_at,
            location=p.location, fee_cents=p.fee_cents,
            bookings_open=p.bookings_open, spots_remaining=remaining,
        ))
    return out


class BookProgramIn(BaseModel):
    notes: str | None = None


@router.post("/programs/{program_id}/book", status_code=201)
def book_program(
    program_id: int,
    body: BookProgramIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    p = db.get(Program, program_id)
    if p is None or p.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Program not found")
    if not p.bookings_open:
        raise HTTPException(status_code=400, detail="Bookings closed")
    existing = (
        db.query(ProgramBooking)
        .filter(ProgramBooking.program_id == p.id, ProgramBooking.user_id == user.id)
        .first()
    )
    if existing is not None:
        return {"id": existing.id, "status": existing.status, "already": True}
    if p.capacity is not None:
        used = (
            db.query(func.count(ProgramBooking.id))
            .filter(ProgramBooking.program_id == p.id, ProgramBooking.status != "cancelled")
            .scalar()
            or 0
        )
        if used >= p.capacity:
            raise HTTPException(status_code=400, detail="Full")
    booking = ProgramBooking(program_id=p.id, user_id=user.id, notes=body.notes)
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return {"id": booking.id, "status": booking.status, "already": False}


# ============================================================
# Demo seed extension — populate everything for the demo council
# ============================================================


def seed_v2_demo(db: Session, *, council_id: int) -> dict[str, int]:
    today = date.today()
    counts = {"meetings": 0, "posts": 0, "climate": 0, "programs": 0}

    if not db.query(CouncilMeeting).filter(CouncilMeeting.council_id == council_id).first():
        m = CouncilMeeting(
            council_id=council_id,
            title="Ordinary council meeting",
            starts_at=datetime.now(UTC) + timedelta(days=5, hours=18),
            duration_minutes=120,
            location="Council chambers, Pine Ave",
            status="scheduled",
        )
        db.add(m)
        db.flush()
        db.add(MeetingAgendaItem(
            meeting_id=m.id, position=1, title="Adoption of minutes",
            description="Confirm minutes of the previous meeting.",
        ))
        db.add(MeetingAgendaItem(
            meeting_id=m.id, position=2, title="Quarterly budget review",
            description="Q3 financial position and forward outlook.",
        ))
        db.add(MeetingAgendaItem(
            meeting_id=m.id, position=3, title="Footpath renewal program",
            description="Award contract for FY26 footpath renewals (~$1.2M).",
        ))
        counts["meetings"] = 1

    if not db.query(CommunityPost).filter(CommunityPost.council_id == council_id).first():
        # Need at least one user to author posts; pick the first user in the council.
        author = db.query(User).filter(User.council_id == council_id).first()
        if author:
            db.add(CommunityPost(
                council_id=council_id, author_user_id=author.id,
                kind="event", title="Saturday Markets at the Park",
                body_markdown="Local growers and crafters every Saturday 8am – 1pm. Free entry.",
                event_at=datetime.now(UTC) + timedelta(days=3, hours=8),
                location_text="Pine Park, Pine Ave",
                status=PostStatus.published.value,
            ))
            db.add(CommunityPost(
                council_id=council_id, author_user_id=author.id,
                kind="lost_found", title="Found: small grey cat near Mill St",
                body_markdown="Friendly little grey cat with a green collar. Please call council if yours.",
                location_text="Mill St near no. 42",
                status=PostStatus.published.value,
            ))
            counts["posts"] = 2

    if not db.query(ClimateMetric).filter(ClimateMetric.council_id == council_id).first():
        metrics = [
            ("emissions_t", "Council operational emissions", "tCO2e", 1820.0, 0.0, 2035),
            ("waste_diverted_pct", "Waste diverted from landfill", "%", 58.0, 80.0, 2030),
            ("renewables_pct", "Council electricity from renewables", "%", 64.0, 100.0, 2027),
            ("trees_planted", "Trees planted this year", "trees", 1240.0, 2000.0, today.year),
        ]
        for key, label, unit, val, tgt, yr in metrics:
            db.add(ClimateMetric(
                council_id=council_id, metric_key=key, label=label, unit=unit,
                period_start=date(today.year, 1, 1), period_end=today,
                value_num=val, target_num=tgt, target_year=yr,
            ))
        counts["climate"] = len(metrics)

    if not db.query(Program).filter(Program.council_id == council_id).first():
        progs = [
            ("Tree-planting day", "Help plant 200 native trees along Mill Creek.",
             ProgramKind.volunteer.value, 50,
             datetime.now(UTC) + timedelta(days=21), "Mill Creek reserve", 0),
            ("Senior Centre Hall booking", "Hire the main hall for private events. Half-day or full-day.",
             ProgramKind.booking.value, None, None, "Senior Centre, Main St", 8000),
            ("Library Storytime", "Weekly storytime for under-5s. Free, no booking needed but spots limited.",
             ProgramKind.class_.value, 30,
             datetime.now(UTC) + timedelta(days=7), "Library, Main St", 0),
            ("Meals on Wheels volunteer", "Deliver hot meals to elderly residents. 2-hour shift, weekly.",
             ProgramKind.volunteer.value, 20,
             datetime.now(UTC) + timedelta(days=14), "Council depot", 0),
        ]
        for title, desc, kind, cap, starts, loc, fee in progs:
            db.add(Program(
                council_id=council_id, title=title, description=desc, kind=kind,
                capacity=cap, starts_at=starts,
                ends_at=(starts + timedelta(hours=3)) if starts else None,
                location=loc, fee_cents=fee, bookings_open=True,
            ))
        counts["programs"] = len(progs)

    db.commit()
    return counts
