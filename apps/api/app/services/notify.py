"""Unified notification helper — one call emits push, audit log, and an
optional webhook event.

Use this for ANY user-visible state change so the resident knows, the
council has the audit trail, and external integrations stay in sync.
"""
from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.models import User
from app.services import audit, push, webhooks

_log = logging.getLogger(__name__)


def notify(
    db: Session,
    *,
    user: User | None,
    council_id: int,
    action: str,
    title: str,
    body: str,
    url: str = "/",
    target_type: str | None = None,
    target_id: str | int | None = None,
    extra: dict[str, Any] | None = None,
    webhook_event: str | None = None,
) -> None:
    """Push to the user's devices (best-effort) + audit + optional webhook.

    Failures never raise — notifications are fire-and-forget. The caller's
    transaction is preserved (push/webhook commit independently).
    """
    if user is not None:
        try:
            push.push_to_user(db, user=user, title=title, body=body, url=url, extra=extra)
        except Exception as exc:
            _log.warning("[notify] push failed for user %s: %s", user.id, exc)

    try:
        audit.record(db, actor=user, action=action,
                     target_type=target_type, target_id=target_id,
                     metadata=extra, commit=False)
    except Exception as exc:
        _log.warning("[notify] audit failed for %s: %s", action, exc)

    if webhook_event is not None:
        try:
            webhooks.deliver_event(
                db, council_id=council_id, event_type=webhook_event,
                payload={"action": action, "title": title, "body": body,
                         "target_type": target_type,
                         "target_id": str(target_id) if target_id is not None else None,
                         "user_id": user.id if user else None,
                         **(extra or {})},
            )
        except Exception as exc:
            _log.warning("[notify] webhook %s failed: %s", webhook_event, exc)
