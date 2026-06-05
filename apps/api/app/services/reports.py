from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.models import (
    Report,
    ReportAttachment,
    ReportCategory,
    ReportEvent,
    ReportEventKind,
    ReportStatus,
    ReportSubscription,
    StaffTeam,
    User,
)
from app.services import events_pubsub, push


def append_event(
    db: Session,
    *,
    report: Report,
    actor: User | None,
    kind: ReportEventKind,
    body: str | None = None,
    internal: bool = False,
    metadata: dict[str, Any] | None = None,
    commit: bool = True,
) -> ReportEvent:
    event = ReportEvent(
        report_id=report.id,
        actor_user_id=actor.id if actor is not None else None,
        kind=kind.value,
        body=body,
        internal=internal,
        event_metadata=metadata,
    )
    db.add(event)
    if commit:
        db.commit()
        db.refresh(event)
        events_pubsub.publish(
            report.id,
            {
                "id": event.id,
                "kind": event.kind,
                "actor_user_id": event.actor_user_id,
                "actor_name": actor.name if actor else None,
                "body": event.body,
                "internal": event.internal,
                "metadata": event.event_metadata,
                "created_at": event.created_at.isoformat() if event.created_at else None,
            },
        )
        _push_to_reporter_if_applicable(db, report=report, event=event)
    return event


def _push_to_reporter_if_applicable(
    db: Session, *, report: Report, event: ReportEvent
) -> None:
    """Best-effort web push to the report's reporter for public events
    they care about. Silently no-ops if VAPID isn't configured or the
    actor is the reporter (don't push to yourself)."""
    if event.internal:
        return
    if event.actor_user_id == report.reporter_user_id:
        return
    if event.kind not in {
        "message",
        "status_change",
        "file_request",
        "appointment_proposed",
        "appointment_completed",
    }:
        return
    reporter = db.get(User, report.reporter_user_id)
    if reporter is None:
        return
    titles = {
        "message": f"New reply on #{report.id}",
        "status_change": f"Status update on #{report.id}",
        "file_request": f"Council needs something from you (#{report.id})",
        "appointment_proposed": f"Council proposed a time (#{report.id})",
        "appointment_completed": f"Visit complete (#{report.id})",
    }
    push.push_to_user(
        db,
        user=reporter,
        title=titles.get(event.kind, "Update on your report"),
        body=(event.body or report.title)[:140],
        url=f"/reports/{report.id}",
    )


def create_report(
    db: Session,
    *,
    council_id: int,
    reporter: User,
    category: ReportCategory,
    title: str,
    description: str,
    lat: float | None,
    lng: float | None,
    address_text: str | None,
    custom_fields: dict[str, Any] | None,
    attachment_keys: list[str],
) -> Report:
    now = datetime.now(UTC)
    sla_due_at = now + timedelta(hours=category.sla_hours) if category.sla_hours else None

    # Team routing — category default team if present.
    team_id = category.default_team_id
    status = ReportStatus.assigned.value if team_id is not None else ReportStatus.new.value

    report = Report(
        council_id=council_id,
        category_id=category.id,
        reporter_user_id=reporter.id,
        title=title,
        description=description,
        lat=lat,
        lng=lng,
        address_text=address_text,
        custom_fields=custom_fields,
        status=status,
        team_id=team_id,
        sla_due_at=sla_due_at,
    )
    db.add(report)
    db.flush()  # need report.id for attachments + events

    # Attachments uploaded via presign before report creation are committed here by r2_key.
    for r2_key in attachment_keys:
        db.add(
            ReportAttachment(
                report_id=report.id,
                kind="photo",
                r2_key=r2_key,
                uploaded_by_user_id=reporter.id,
            )
        )

    # Auto-subscribe the reporter to their own report.
    db.add(ReportSubscription(report_id=report.id, user_id=reporter.id))

    # Seed event: routed to team (if any).
    if team_id is not None:
        team = db.get(StaffTeam, team_id)
        append_event(
            db,
            report=report,
            actor=None,
            kind=ReportEventKind.assignment,
            body=None,
            internal=True,
            metadata={"auto_route": True, "to_team_id": team_id, "to_team_name": team.name if team else None},
            commit=False,
        )

    db.commit()
    db.refresh(report)
    return report


# --- Query helpers ---


def list_resident_reports(
    db: Session, *, user: User, limit: int = 100
) -> list[tuple[Report, ReportCategory, User | None]]:
    """Returns (report, category, assignee) tuples for the resident's own reports."""
    rows = (
        db.query(Report, ReportCategory, User)
        .join(ReportCategory, ReportCategory.id == Report.category_id)
        .outerjoin(User, User.id == Report.assignee_user_id)
        .filter(Report.council_id == user.council_id, Report.reporter_user_id == user.id)
        .order_by(desc(Report.created_at))
        .limit(limit)
        .all()
    )
    return [(r, c, a) for r, c, a in rows]


def list_staff_reports(
    db: Session,
    *,
    council_id: int,
    status: str | None,
    category_id: int | None,
    assignee_user_id: int | None,
    team_id: int | None,
    mine_user_id: int | None,
    sla_at_risk: bool,
    limit: int,
    offset: int,
) -> tuple[list[tuple[Report, ReportCategory, User | None]], int]:
    q = (
        db.query(Report, ReportCategory, User)
        .join(ReportCategory, ReportCategory.id == Report.category_id)
        .outerjoin(User, User.id == Report.assignee_user_id)
        .filter(Report.council_id == council_id)
    )
    if status is not None:
        q = q.filter(Report.status == status)
    if category_id is not None:
        q = q.filter(Report.category_id == category_id)
    if assignee_user_id is not None:
        q = q.filter(Report.assignee_user_id == assignee_user_id)
    if team_id is not None:
        q = q.filter(Report.team_id == team_id)
    if mine_user_id is not None:
        q = q.filter(Report.assignee_user_id == mine_user_id)
    if sla_at_risk:
        soon = datetime.now(UTC) + timedelta(hours=24)
        q = q.filter(
            Report.status.notin_(("resolved", "closed", "duplicate", "rejected")),
            Report.sla_due_at.isnot(None),
            Report.sla_due_at <= soon,
        )

    total = q.count()
    rows = q.order_by(desc(Report.created_at)).offset(offset).limit(limit).all()
    return [(r, c, a) for r, c, a in rows], total


def queue_summary(db: Session, *, council_id: int, mine_user_id: int) -> dict[str, Any]:
    open_statuses = ("new", "triaging", "assigned", "in_progress", "awaiting_resident")

    total_open = (
        db.query(func.count(Report.id))
        .filter(Report.council_id == council_id, Report.status.in_(open_statuses))
        .scalar()
        or 0
    )

    by_status_rows = (
        db.query(Report.status, func.count(Report.id))
        .filter(Report.council_id == council_id, Report.status.in_(open_statuses))
        .group_by(Report.status)
        .all()
    )
    by_status = {s: c for s, c in by_status_rows}

    by_team_rows = (
        db.query(StaffTeam.name, func.count(Report.id))
        .join(StaffTeam, StaffTeam.id == Report.team_id)
        .filter(Report.council_id == council_id, Report.status.in_(open_statuses))
        .group_by(StaffTeam.name)
        .all()
    )
    by_team = {n: c for n, c in by_team_rows}

    now = datetime.now(UTC)
    soon = now + timedelta(hours=24)
    sla_breached = (
        db.query(func.count(Report.id))
        .filter(
            Report.council_id == council_id,
            Report.status.in_(open_statuses),
            Report.sla_due_at.isnot(None),
            Report.sla_due_at < now,
        )
        .scalar()
        or 0
    )
    sla_at_risk = (
        db.query(func.count(Report.id))
        .filter(
            Report.council_id == council_id,
            Report.status.in_(open_statuses),
            Report.sla_due_at.isnot(None),
            Report.sla_due_at >= now,
            Report.sla_due_at <= soon,
        )
        .scalar()
        or 0
    )
    mine = (
        db.query(func.count(Report.id))
        .filter(
            Report.council_id == council_id,
            Report.status.in_(open_statuses),
            Report.assignee_user_id == mine_user_id,
        )
        .scalar()
        or 0
    )

    return {
        "total_open": int(total_open),
        "by_status": by_status,
        "by_team": by_team,
        "sla_breached": int(sla_breached),
        "sla_at_risk": int(sla_at_risk),
        "mine": int(mine),
    }
