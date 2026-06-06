"""SMS messaging — provider-agnostic, FOSS-friendly defaults.

Default mode is local-log: outbound messages get written to a log row in
sms_message so the flow is exercisable end-to-end without a paid SMS API.

Real providers that fit the FOSS / cost-conscious brief:
- Self-hosted SMS gateway (Gammu, Kannel, smsd) on a SIM modem
- HTTP-API gateways from MNO partners (most AU carriers offer one)
- Open-source RCS clients via Matrix bridges for richer threading
- Email-to-SMS carrier gateways (free, 1-way) for low-volume alerts

The send() interface stays stable; swap the implementation per council.
"""
from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.models import SmsMessage, User

_log = logging.getLogger(__name__)


def normalize_phone(phone: str) -> str:
    """Best-effort E.164 normalisation for AU numbers; preserves +CC otherwise."""
    s = "".join(c for c in phone if c.isdigit() or c == "+")
    if s.startswith("0") and len(s) == 10:
        return "+61" + s[1:]
    if s.startswith("+"):
        return s
    if len(s) == 9 and s.startswith("4"):
        return "+61" + s
    return s


def send_to_user(
    db: Session,
    *,
    council_id: int,
    user: User,
    body: str,
    report_id: int | None = None,
) -> SmsMessage | None:
    if not user.phone:
        return None
    phone = normalize_phone(user.phone)
    msg = SmsMessage(
        council_id=council_id,
        user_id=user.id,
        report_id=report_id,
        phone=phone,
        direction="out",
        body=body[:1600],
        provider="local-log",
        status="logged",
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    _log.info("[sms→%s] %s", phone, body[:200])
    return msg


def receive(
    db: Session,
    *,
    council_id: int,
    phone: str,
    body: str,
    provider_sid: str | None = None,
) -> dict[str, Any]:
    """Inbound message — log it, attach to a user if their phone matches."""
    phone = normalize_phone(phone)
    user = db.query(User).filter(User.phone.isnot(None)).all()
    matched = next(
        (u for u in user if normalize_phone(u.phone or "") == phone and u.council_id == council_id),
        None,
    )
    msg = SmsMessage(
        council_id=council_id,
        user_id=matched.id if matched else None,
        phone=phone,
        direction="in",
        body=body[:1600],
        provider="local-log",
        provider_sid=provider_sid,
        status="received",
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {"id": msg.id, "matched_user": matched.id if matched else None}
