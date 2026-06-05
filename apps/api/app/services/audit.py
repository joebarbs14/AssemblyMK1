"""Append-only audit log helper."""
from __future__ import annotations

from typing import Any

from fastapi import Request
from sqlalchemy.orm import Session

from app.models import AuditEvent, User


def record(
    db: Session,
    *,
    actor: User | None,
    action: str,
    target_type: str | None = None,
    target_id: str | int | None = None,
    metadata: dict[str, Any] | None = None,
    request: Request | None = None,
    commit: bool = True,
) -> AuditEvent:
    ip = None
    ua = None
    if request is not None:
        ip = request.client.host if request.client else None
        ua = request.headers.get("user-agent", "")[:255]
    event = AuditEvent(
        council_id=actor.council_id if actor else None,
        actor_user_id=actor.id if actor else None,
        action=action,
        target_type=target_type,
        target_id=str(target_id) if target_id is not None else None,
        event_metadata=metadata,
        ip_address=ip,
        user_agent=ua,
    )
    db.add(event)
    if commit:
        db.commit()
    return event
