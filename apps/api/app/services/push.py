"""Web Push fanout via VAPID.

Best-effort: silently no-ops if VAPID keys aren't configured (so dev
without keys doesn't break the resident UX). Failures per-device are
swallowed and stale subscriptions get pruned by the caller.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Device, User

_log = logging.getLogger(__name__)


def is_configured() -> bool:
    return bool(settings.vapid_public_key and settings.vapid_private_key)


def vapid_public_key() -> str | None:
    return settings.vapid_public_key


def _send_one(
    *,
    subscription: dict[str, Any],
    payload: dict[str, Any],
    ttl: int = 60 * 60 * 24,
) -> tuple[bool, int | None]:
    """Returns (sent, status_code). When VAPID isn't configured, returns
    (False, None) without raising — caller continues."""
    if not is_configured():
        _log.debug("[push] skipped (no VAPID keys): %s", payload.get("title"))
        return False, None
    try:
        from pywebpush import WebPushException, webpush  # noqa: PLC0415

        webpush(
            subscription_info=subscription,
            data=json.dumps(payload),
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_subject},
            ttl=ttl,
        )
        return True, 201
    except WebPushException as exc:
        status = getattr(exc.response, "status_code", None)
        _log.warning("[push] failed (HTTP %s): %s", status, exc)
        return False, status
    except Exception as exc:
        _log.warning("[push] unexpected failure: %s", exc)
        return False, None


def push_to_user(
    db: Session,
    *,
    user: User,
    title: str,
    body: str,
    url: str = "/",
    extra: dict[str, Any] | None = None,
) -> dict[str, int]:
    """Sends a push to every device the user has registered.
    Prunes subscriptions that come back 404/410 (gone)."""
    devices = db.query(Device).filter(Device.user_id == user.id).all()
    if not devices:
        return {"sent": 0, "failed": 0, "pruned": 0}

    payload: dict[str, Any] = {"title": title, "body": body, "url": url}
    if extra:
        payload.update(extra)

    sent = failed = pruned = 0
    for d in devices:
        sub = {
            "endpoint": d.endpoint,
            "keys": {"p256dh": d.p256dh, "auth": d.auth_key},
        }
        ok, status = _send_one(subscription=sub, payload=payload)
        if ok:
            sent += 1
        else:
            failed += 1
            if status in (404, 410):
                db.delete(d)
                pruned += 1
    if pruned:
        db.commit()
    return {"sent": sent, "failed": failed, "pruned": pruned}
