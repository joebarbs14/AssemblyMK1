"""HMAC-signed webhook fanout to external systems (TechnologyOne /
Authority / Pathway sync, custom council integrations).

Best-effort: failures are logged on the delivery row, never block the
originating request. Async fanout in M9.x worker; today synchronous.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.models import WebhookDelivery, WebhookSubscription

_log = logging.getLogger(__name__)


def sign(secret: str, body_bytes: bytes) -> str:
    return hmac.new(secret.encode(), body_bytes, hashlib.sha256).hexdigest()


def deliver_event(
    db: Session,
    *,
    council_id: int,
    event_type: str,
    payload: dict[str, Any],
) -> int:
    subs = (
        db.query(WebhookSubscription)
        .filter(
            WebhookSubscription.council_id == council_id,
            WebhookSubscription.active.is_(True),
        )
        .all()
    )
    delivered = 0
    body = json.dumps({"event": event_type, "data": payload}, default=str).encode()
    for sub in subs:
        types: list[str] = sub.event_types or []
        if "*" not in types and event_type not in types:
            continue
        signature = sign(sub.secret, body)
        try:
            r = httpx.post(
                sub.url,
                content=body,
                headers={
                    "Content-Type": "application/json",
                    "X-Assembly-Event": event_type,
                    "X-Assembly-Signature": f"sha256={signature}",
                },
                timeout=10.0,
            )
            sub.last_status = r.status_code
            db.add(WebhookDelivery(
                subscription_id=sub.id, event_type=event_type,
                payload=payload, status_code=r.status_code,
                error=None if r.is_success else r.text[:1000],
            ))
            if r.is_success:
                delivered += 1
        except Exception as exc:
            _log.warning("[webhook] %s failed: %s", sub.url, exc)
            db.add(WebhookDelivery(
                subscription_id=sub.id, event_type=event_type,
                payload=payload, status_code=None, error=str(exc)[:1000],
            ))
    db.commit()
    return delivered
