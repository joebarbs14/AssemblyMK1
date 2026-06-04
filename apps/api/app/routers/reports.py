"""Resident-facing report endpoints. All scoped to user.council_id + reporter_user_id == user.id."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import (
    Report,
    ReportAttachment,
    ReportCategory,
    ReportEvent,
    ReportEventKind,
    User,
    UserRole,
)
from app.schemas.report import (
    AttachmentOut,
    CategoryOut,
    EventOut,
    ReportCreate,
    ReportDetail,
    ReportListItem,
    ResidentEventIn,
)
from app.services.reports import append_event, create_report, list_resident_reports

router = APIRouter(prefix="/reports", tags=["reports"])


def _require_resident(user: User) -> None:
    # Residents own this router; staff/admin use the staff router for triage,
    # but they can still file their own reports — allow.
    if user.role not in (UserRole.resident.value, UserRole.staff.value, UserRole.admin.value):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


def _get_owned_report(db: Session, *, user: User, report_id: int) -> Report:
    rep = db.get(Report, report_id)
    if rep is None or rep.council_id != user.council_id or rep.reporter_user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return rep


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CategoryOut]:
    rows = (
        db.query(ReportCategory)
        .filter(ReportCategory.council_id == user.council_id, ReportCategory.is_active.is_(True))
        .order_by(ReportCategory.label)
        .all()
    )
    return [
        CategoryOut(
            id=c.id, key=c.key, label=c.label, icon=c.icon, sla_hours=c.sla_hours,
            requires_photo=c.requires_photo,
        )
        for c in rows
    ]


@router.post("", response_model=ReportDetail, status_code=status.HTTP_201_CREATED)
def create(
    body: ReportCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReportDetail:
    _require_resident(user)
    category = db.get(ReportCategory, body.category_id)
    if category is None or category.council_id != user.council_id or not category.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown category")
    if category.requires_photo and not body.attachment_keys:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="This category requires a photo"
        )

    rep = create_report(
        db,
        council_id=user.council_id,
        reporter=user,
        category=category,
        title=body.title.strip(),
        description=body.description.strip(),
        lat=body.lat,
        lng=body.lng,
        address_text=body.address_text,
        custom_fields=body.custom_fields,
        attachment_keys=body.attachment_keys,
    )
    return _serialize_detail(db, rep)


@router.get("", response_model=list[ReportListItem])
def list_mine(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ReportListItem]:
    rows = list_resident_reports(db, user=user)
    return [
        ReportListItem(
            id=r.id,
            title=r.title,
            status=r.status,
            priority=r.priority,
            category_id=c.id,
            category_label=c.label,
            created_at=r.created_at,
            sla_due_at=r.sla_due_at,
            assignee_name=a.name if a else None,
        )
        for (r, c, a) in rows
    ]


@router.get("/{report_id}", response_model=ReportDetail)
def get_one(
    report_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReportDetail:
    rep = _get_owned_report(db, user=user, report_id=report_id)
    return _serialize_detail(db, rep)


@router.get("/{report_id}/events", response_model=list[EventOut])
def list_events(
    report_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[EventOut]:
    rep = _get_owned_report(db, user=user, report_id=report_id)
    rows = (
        db.query(ReportEvent, User)
        .outerjoin(User, User.id == ReportEvent.actor_user_id)
        .filter(ReportEvent.report_id == rep.id, ReportEvent.internal.is_(False))
        .order_by(ReportEvent.id)
        .all()
    )
    return [_serialize_event(e, a) for (e, a) in rows]


@router.post("/{report_id}/events", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def post_event(
    report_id: int,
    body: ResidentEventIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EventOut:
    rep = _get_owned_report(db, user=user, report_id=report_id)
    event = append_event(
        db, report=rep, actor=user, kind=ReportEventKind.message, body=body.body, internal=False
    )
    return _serialize_event(event, user)


# --- helpers ---


def _serialize_event(e: ReportEvent, actor: User | None) -> EventOut:
    return EventOut(
        id=e.id,
        kind=e.kind,
        actor_user_id=e.actor_user_id,
        actor_name=actor.name if actor else None,
        body=e.body,
        internal=e.internal,
        metadata=e.event_metadata,
        created_at=e.created_at,
    )


def _serialize_detail(db: Session, rep: Report) -> ReportDetail:
    category = db.get(ReportCategory, rep.category_id)
    reporter = db.get(User, rep.reporter_user_id)
    assignee = db.get(User, rep.assignee_user_id) if rep.assignee_user_id else None
    team_name: str | None = None
    if rep.team_id:
        from app.models import StaffTeam

        t = db.get(StaffTeam, rep.team_id)
        team_name = t.name if t else None

    atts = (
        db.query(ReportAttachment)
        .filter(ReportAttachment.report_id == rep.id)
        .order_by(ReportAttachment.id)
        .all()
    )
    return ReportDetail(
        id=rep.id,
        title=rep.title,
        description=rep.description,
        status=rep.status,
        priority=rep.priority,
        category_id=rep.category_id,
        category_label=category.label if category else "",
        reporter_user_id=rep.reporter_user_id,
        reporter_name=reporter.name if reporter else None,
        assignee_user_id=rep.assignee_user_id,
        assignee_name=assignee.name if assignee else None,
        team_id=rep.team_id,
        team_name=team_name,
        lat=rep.lat,
        lng=rep.lng,
        address_text=rep.address_text,
        created_at=rep.created_at,
        sla_due_at=rep.sla_due_at,
        resolved_at=rep.resolved_at,
        attachments=[
            AttachmentOut(id=a.id, kind=a.kind, r2_key=a.r2_key, mime=a.mime, created_at=a.created_at)
            for a in atts
        ],
        custom_fields=rep.custom_fields,
    )
