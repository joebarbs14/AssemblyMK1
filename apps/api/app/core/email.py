"""Transactional email.

Dev: prints to logs. Prod: Resend (M2.x — stub raises until wired).
The send() interface is stable so callers don't change when we swap.
"""
from __future__ import annotations

import logging

from app.core.config import settings

_log = logging.getLogger(__name__)


def send_email(*, to: str, subject: str, body_text: str, body_html: str | None = None) -> None:
    if settings.resend_api_key:
        # M2.x — Resend HTTP call goes here. Until then, raise loudly in prod.
        if settings.env == "production":
            raise NotImplementedError("Resend integration pending (M2.x)")
    _log.info(
        "[dev email] to=%s subject=%r\n--- body ---\n%s\n--- end ---",
        to,
        subject,
        body_text,
    )


def send_magic_link(*, to: str, link: str) -> None:
    body = (
        "You requested a sign-in link for Assembly.\n\n"
        f"Click to sign in: {link}\n\n"
        "This link expires in 15 minutes. If you didn't request it, ignore this email."
    )
    send_email(to=to, subject="Your Assembly sign-in link", body_text=body)
