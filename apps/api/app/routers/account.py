"""Resident self-service: data export + account delete.

Satisfies APP 12 (access) and the right-to-be-forgotten side of APP 11
(disposal of personal information). Soft-delete sets status=disabled so
audit trails are preserved per AU tax / records retention rules.
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import (
    Payment,
    Property,
    PropertyOwnership,
    Report,
    ReportEvent,
    User,
    UserStatus,
)
from app.services import audit

router = APIRouter(prefix="/account", tags=["account"])


@router.get("/export")
def export_self(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Returns everything we hold about the calling user. APP 12."""
    reports = (
        db.query(Report).filter(Report.reporter_user_id == user.id).all()
    )
    events = (
        db.query(ReportEvent)
        .filter(ReportEvent.actor_user_id == user.id)
        .all()
    )
    properties = (
        db.query(Property)
        .join(PropertyOwnership, PropertyOwnership.property_id == Property.id)
        .filter(PropertyOwnership.user_id == user.id)
        .all()
    )
    payments: list[Payment] = []
    for prop in properties:
        if prop.account is not None:
            payments.extend(
                db.query(Payment).filter(Payment.account_id == prop.account.id).all()
            )

    audit.record(
        db, actor=user, action="account.export", target_type="user",
        target_id=user.id, request=request,
    )

    return {
        "exported_at": datetime.now(UTC).isoformat(),
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "phone": user.phone,
            "role": user.role,
            "created_at": user.created_at.isoformat(),
        },
        "reports": [
            {
                "id": r.id,
                "title": r.title,
                "description": r.description,
                "status": r.status,
                "category_id": r.category_id,
                "lat": r.lat,
                "lng": r.lng,
                "address_text": r.address_text,
                "created_at": r.created_at.isoformat(),
            }
            for r in reports
        ],
        "report_events_authored": [
            {
                "report_id": e.report_id,
                "kind": e.kind,
                "body": e.body,
                "created_at": e.created_at.isoformat(),
            }
            for e in events
            if not e.internal
        ],
        "properties": [
            {
                "id": p.id,
                "address": p.address,
                "suburb": p.suburb,
                "postcode": p.postcode,
            }
            for p in properties
        ],
        "payments": [
            {
                "id": pay.id,
                "amount_cents": pay.amount_cents,
                "currency": pay.currency,
                "provider": pay.provider,
                "status": pay.status,
                "paid_at": pay.paid_at.isoformat() if pay.paid_at else None,
            }
            for pay in payments
        ],
    }


@router.delete("/delete", status_code=status.HTTP_204_NO_CONTENT)
def delete_self(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Soft-delete: status=disabled. Hard purge after 30-day grace runs in M8.x worker.

    Personal fields are nulled immediately; FK rows are preserved so audit /
    payment trails remain intact (AU records retention)."""
    user.status = UserStatus.disabled.value
    user.name = None
    user.phone = None
    user.password_hash = None
    db.commit()
    audit.record(
        db, actor=None, action="account.delete", target_type="user",
        target_id=user.id, metadata={"email_hash": user.email[:3] + "***"},
        request=request,
    )
    return None
