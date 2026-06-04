"""Staff/admin report endpoints — council-wide visibility, triage actions."""
from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import (
    Report,
    ReportEvent,
    ReportEventKind,
    ReportStatus,
    StaffTeam,
    User,
    UserRole,
)
from app.routers.reports import _serialize_detail, _serialize_event
from app.schemas.report import (
    EventOut,
    QueueSummary,
    ReportDetail,
    ReportListItem,
    ReportPatchIn,
    StaffEventIn,
)
from app.services import events_pubsub
from app.services.reports import append_event, list_staff_reports, queue_summary

router = APIRouter(prefix="/staff/reports", tags=["staff-reports"])


def _require_staff(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.staff.value, UserRole.admin.value):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff only")
    return user


def _get_council_report(db: Session, *, user: User, report_id: int) -> Report:
    rep = db.get(Report, report_id)
    if rep is None or rep.council_id != user.council_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return rep


@router.get("", response_model=list[ReportListItem])
def list_inbox(
    status_q: str | None = Query(default=None, alias="status"),
    category_id: int | None = None,
    assignee_user_id: int | None = None,
    team_id: int | None = None,
    mine: bool = False,
    sla_at_risk: bool = False,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(_require_staff),
    db: Session = Depends(get_db),
) -> list[ReportListItem]:
    rows, _total = list_staff_reports(
        db,
        council_id=user.council_id,
        status=status_q,
        category_id=category_id,
        assignee_user_id=assignee_user_id,
        team_id=team_id,
        mine_user_id=user.id if mine else None,
        sla_at_risk=sla_at_risk,
        limit=limit,
        offset=offset,
    )
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


@router.get("/queues/summary", response_model=QueueSummary)
def get_queue_summary(
    user: User = Depends(_require_staff),
    db: Session = Depends(get_db),
) -> QueueSummary:
    data = queue_summary(db, council_id=user.council_id, mine_user_id=user.id)
    return QueueSummary(**data)


@router.get("/{report_id}", response_model=ReportDetail)
def get_one(
    report_id: int,
    user: User = Depends(_require_staff),
    db: Session = Depends(get_db),
) -> ReportDetail:
    rep = _get_council_report(db, user=user, report_id=report_id)
    return _serialize_detail(db, rep)


@router.get("/{report_id}/events/stream")
async def stream_events_staff(
    report_id: int,
    request: Request,
    user: User = Depends(_require_staff),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """SSE stream for staff — includes internal events."""
    rep = _get_council_report(db, user=user, report_id=report_id)
    q = events_pubsub.subscribe(rep.id)

    async def gen() -> AsyncGenerator[bytes, None]:
        try:
            yield b": connected\n\n"
            while True:
                if await request.is_disconnected():
                    return
                try:
                    raw = await asyncio.wait_for(q.get(), timeout=20.0)
                except TimeoutError:
                    yield b": keepalive\n\n"
                    continue
                payload = json.loads(raw)
                yield f"id: {payload['id']}\nevent: report.event\ndata: {raw}\n\n".encode()
        finally:
            events_pubsub.unsubscribe(rep.id, q)

    return StreamingResponse(gen(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
    })


@router.get("/{report_id}/events", response_model=list[EventOut])
def list_events(
    report_id: int,
    user: User = Depends(_require_staff),
    db: Session = Depends(get_db),
) -> list[EventOut]:
    rep = _get_council_report(db, user=user, report_id=report_id)
    rows = (
        db.query(ReportEvent, User)
        .outerjoin(User, User.id == ReportEvent.actor_user_id)
        .filter(ReportEvent.report_id == rep.id)
        .order_by(ReportEvent.id)
        .all()
    )
    return [_serialize_event(e, a) for (e, a) in rows]


@router.post("/{report_id}/events", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def post_event(
    report_id: int,
    body: StaffEventIn,
    user: User = Depends(_require_staff),
    db: Session = Depends(get_db),
) -> EventOut:
    rep = _get_council_report(db, user=user, report_id=report_id)

    # Side-effects per kind — keep mutations and event-emission together so we
    # never end up with a status change without a timeline row.
    if body.kind == "status_change":
        new_status = (body.event_metadata or {}).get("to") if body.event_metadata else None
        if new_status not in {s.value for s in ReportStatus}:
            raise HTTPException(status_code=400, detail="Invalid status")
        prev = rep.status
        rep.status = new_status
        if new_status == ReportStatus.resolved.value:
            rep.resolved_at = datetime.now(UTC)
        event = append_event(
            db,
            report=rep,
            actor=user,
            kind=ReportEventKind.status_change,
            body=body.body,
            internal=body.internal,
            metadata={"from": prev, "to": new_status},
            commit=False,
        )
    elif body.kind == "assignment":
        new_assignee_id = (body.event_metadata or {}).get("to_user_id")
        new_team_id = (body.event_metadata or {}).get("to_team_id")
        prev_assignee = rep.assignee_user_id
        prev_team = rep.team_id
        if new_assignee_id is not None:
            target = db.get(User, int(new_assignee_id))
            if target is None or target.council_id != user.council_id:
                raise HTTPException(status_code=400, detail="Invalid assignee")
            rep.assignee_user_id = target.id
            if rep.status == ReportStatus.new.value:
                rep.status = ReportStatus.assigned.value
        if new_team_id is not None:
            team = db.get(StaffTeam, int(new_team_id))
            if team is None or team.council_id != user.council_id:
                raise HTTPException(status_code=400, detail="Invalid team")
            rep.team_id = team.id
        event = append_event(
            db,
            report=rep,
            actor=user,
            kind=ReportEventKind.assignment,
            body=body.body,
            internal=body.internal,
            metadata={
                "from_user_id": prev_assignee,
                "to_user_id": rep.assignee_user_id,
                "from_team_id": prev_team,
                "to_team_id": rep.team_id,
            },
            commit=False,
        )
    elif body.kind == "priority_change":
        new_pri = (body.event_metadata or {}).get("to")
        if new_pri not in {"low", "normal", "high", "urgent"}:
            raise HTTPException(status_code=400, detail="Invalid priority")
        prev = rep.priority
        rep.priority = new_pri
        event = append_event(
            db,
            report=rep,
            actor=user,
            kind=ReportEventKind.priority_change,
            body=body.body,
            internal=body.internal,
            metadata={"from": prev, "to": new_pri},
            commit=False,
        )
    elif body.kind == "file_request":
        if not body.body:
            raise HTTPException(status_code=400, detail="file_request needs a body explaining what's needed")
        rep.status = ReportStatus.awaiting_resident.value
        event = append_event(
            db,
            report=rep,
            actor=user,
            kind=ReportEventKind.file_request,
            body=body.body,
            internal=False,  # resident must see this
            metadata=body.event_metadata or {},
            commit=False,
        )
    else:  # message
        if not body.body:
            raise HTTPException(status_code=400, detail="message body required")
        event = append_event(
            db,
            report=rep,
            actor=user,
            kind=ReportEventKind.message,
            body=body.body,
            internal=body.internal,
            commit=False,
        )

    db.commit()
    db.refresh(event)
    return _serialize_event(event, user)


@router.patch("/{report_id}", response_model=ReportDetail)
def patch_report(
    report_id: int,
    body: ReportPatchIn,
    user: User = Depends(_require_staff),
    db: Session = Depends(get_db),
) -> ReportDetail:
    """Shortcut endpoint — applies multiple changes and emits one event per change."""
    rep = _get_council_report(db, user=user, report_id=report_id)

    if body.status is not None and body.status != rep.status:
        if body.status not in {s.value for s in ReportStatus}:
            raise HTTPException(status_code=400, detail="Invalid status")
        prev = rep.status
        rep.status = body.status
        if body.status == ReportStatus.resolved.value:
            rep.resolved_at = datetime.now(UTC)
        append_event(
            db, report=rep, actor=user, kind=ReportEventKind.status_change,
            metadata={"from": prev, "to": body.status}, commit=False,
        )

    if body.priority is not None and body.priority != rep.priority:
        if body.priority not in {"low", "normal", "high", "urgent"}:
            raise HTTPException(status_code=400, detail="Invalid priority")
        prev = rep.priority
        rep.priority = body.priority
        append_event(
            db, report=rep, actor=user, kind=ReportEventKind.priority_change,
            metadata={"from": prev, "to": body.priority}, commit=False,
        )

    assignee_changed = body.assignee_user_id is not None and body.assignee_user_id != rep.assignee_user_id
    team_changed = body.team_id is not None and body.team_id != rep.team_id
    if assignee_changed or team_changed:
        prev_a, prev_t = rep.assignee_user_id, rep.team_id
        if assignee_changed:
            target = db.get(User, body.assignee_user_id) if body.assignee_user_id else None
            if body.assignee_user_id and (target is None or target.council_id != user.council_id):
                raise HTTPException(status_code=400, detail="Invalid assignee")
            rep.assignee_user_id = body.assignee_user_id
        if team_changed:
            t = db.get(StaffTeam, body.team_id) if body.team_id else None
            if body.team_id and (t is None or t.council_id != user.council_id):
                raise HTTPException(status_code=400, detail="Invalid team")
            rep.team_id = body.team_id
        append_event(
            db, report=rep, actor=user, kind=ReportEventKind.assignment,
            metadata={
                "from_user_id": prev_a, "to_user_id": rep.assignee_user_id,
                "from_team_id": prev_t, "to_team_id": rep.team_id,
            }, commit=False,
        )

    db.commit()
    db.refresh(rep)
    return _serialize_detail(db, rep)
