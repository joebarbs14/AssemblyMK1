"""Payment endpoints — PayPal Checkout (create + capture) and webhook."""
from __future__ import annotations

import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import (
    InvoiceStatus,
    Payment,
    PaymentProvider,
    PaymentStatus,
    Property,
    PropertyOwnership,
    RatesAccount,
    RatesInvoice,
    User,
    WebhookEvent,
)
from app.schemas.payments import PaymentOut, PaypalCaptureIn, PaypalOrderOut
from app.services import paypal

_log = logging.getLogger(__name__)
router = APIRouter(prefix="/rates", tags=["payments"])


def _owned_invoice(db: Session, *, user: User, invoice_id: int) -> tuple[RatesInvoice, RatesAccount, Property]:
    inv = db.get(RatesInvoice, invoice_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    account = db.get(RatesAccount, inv.account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    prop = db.get(Property, account.property_id)
    if prop is None or prop.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Invoice not found")
    own = (
        db.query(PropertyOwnership)
        .filter(PropertyOwnership.property_id == prop.id, PropertyOwnership.user_id == user.id)
        .first()
    )
    if own is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return inv, account, prop


@router.post("/invoices/{invoice_id}/paypal-order", response_model=PaypalOrderOut)
async def paypal_create_order(
    invoice_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaypalOrderOut:
    inv, account, prop = _owned_invoice(db, user=user, invoice_id=invoice_id)
    if inv.status == InvoiceStatus.paid.value:
        raise HTTPException(status_code=400, detail="Invoice already paid")

    base = settings.public_app_url.rstrip("/")
    out = await paypal.create_order(
        amount_cents=inv.amount_cents,
        invoice_id=inv.id,
        return_url=f"{base}/rates/{prop.id}/pay/paypal-return?invoice={inv.id}",
        cancel_url=f"{base}/rates/{prop.id}/pay?cancelled=1",
    )

    # Pre-record a pending payment so a webhook race can find/update it.
    payment = Payment(
        council_id=user.council_id,
        account_id=account.id,
        invoice_id=inv.id,
        amount_cents=inv.amount_cents,
        currency="AUD",
        provider=PaymentProvider.paypal.value,
        provider_ref=out["order_id"],
        status=PaymentStatus.pending.value,
    )
    db.add(payment)
    db.commit()

    return PaypalOrderOut(
        order_id=out["order_id"],
        approve_url=out["approve_url"],
        mock=out["mock"],
        invoice_id=inv.id,
        amount_cents=inv.amount_cents,
    )


@router.post("/invoices/{invoice_id}/paypal-capture", response_model=PaymentOut)
async def paypal_capture(
    invoice_id: int,
    body: PaypalCaptureIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaymentOut:
    inv, account, _prop = _owned_invoice(db, user=user, invoice_id=invoice_id)

    # Find the pending payment we pre-recorded.
    payment = (
        db.query(Payment)
        .filter(
            Payment.provider == PaymentProvider.paypal.value,
            Payment.provider_ref == body.order_id,
            Payment.invoice_id == inv.id,
        )
        .one_or_none()
    )
    if payment is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if payment.status == PaymentStatus.succeeded.value:
        # Idempotent — return the existing record.
        return _serialize(payment)

    result = await paypal.capture_order(body.order_id)
    if result["status"] != "COMPLETED":
        payment.status = PaymentStatus.failed.value
        db.commit()
        raise HTTPException(
            status_code=502, detail=f"PayPal capture not completed: {result['status']}"
        )

    payment.status = PaymentStatus.succeeded.value
    payment.paid_at = datetime.now(UTC)
    payment.raw_webhook = {"capture": result}

    # Apply to invoice + balance.
    inv.status = InvoiceStatus.paid.value
    account.balance_cents = max(0, account.balance_cents - payment.amount_cents)
    db.commit()
    db.refresh(payment)
    return _serialize(payment)


@router.get("/properties/{property_id}/payments", response_model=list[PaymentOut])
def list_payments(
    property_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[PaymentOut]:
    prop = db.get(Property, property_id)
    if prop is None or prop.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Property not found")
    own = (
        db.query(PropertyOwnership)
        .filter(PropertyOwnership.property_id == prop.id, PropertyOwnership.user_id == user.id)
        .first()
    )
    if own is None:
        raise HTTPException(status_code=404, detail="Property not found")
    if prop.account is None:
        return []
    rows = (
        db.query(Payment)
        .filter(Payment.account_id == prop.account.id)
        .order_by(Payment.created_at.desc())
        .all()
    )
    return [_serialize(p) for p in rows]


# ---- Webhook ----

webhook_router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@webhook_router.post("/paypal", status_code=status.HTTP_204_NO_CONTENT)
async def paypal_webhook(request: Request, db: Session = Depends(get_db)) -> None:
    raw = await request.body()
    try:
        event = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON") from exc

    event_id = str(event.get("id") or "")
    event_type = str(event.get("event_type") or "")
    if not event_id:
        raise HTTPException(status_code=400, detail="Missing event id")

    headers = {k.lower(): v for k, v in request.headers.items()}
    if not await paypal.verify_webhook(headers=headers, body_raw=raw, event=event):
        _log.warning("Rejected PayPal webhook with bad signature: %s", event_id)
        raise HTTPException(status_code=401, detail="Invalid signature")

    # Idempotency.
    existing = (
        db.query(WebhookEvent)
        .filter(WebhookEvent.provider == "paypal", WebhookEvent.event_id == event_id)
        .one_or_none()
    )
    if existing is not None:
        return None
    db.add(
        WebhookEvent(
            provider="paypal", event_id=event_id, event_type=event_type, payload=event
        )
    )

    resource = event.get("resource", {}) or {}
    # Order completed (CHECKOUT.ORDER.APPROVED is fired before capture; CAPTURE
    # events confirm the money moved).
    if event_type.startswith("PAYMENT.CAPTURE.") and event_type.endswith(("COMPLETED", "DENIED")):
        # `supplementary_data.related_ids.order_id` carries the order we created.
        order_id = (
            resource.get("supplementary_data", {})
            .get("related_ids", {})
            .get("order_id")
        )
        if order_id:
            payment = (
                db.query(Payment)
                .filter(
                    Payment.provider == "paypal",
                    Payment.provider_ref == order_id,
                )
                .one_or_none()
            )
            if payment is not None:
                if event_type.endswith("COMPLETED"):
                    payment.status = PaymentStatus.succeeded.value
                    payment.paid_at = datetime.now(UTC)
                    if payment.invoice_id:
                        inv = db.get(RatesInvoice, payment.invoice_id)
                        if inv:
                            inv.status = InvoiceStatus.paid.value
                            account = db.get(RatesAccount, inv.account_id)
                            if account:
                                account.balance_cents = max(
                                    0, account.balance_cents - payment.amount_cents
                                )
                else:
                    payment.status = PaymentStatus.failed.value
                payment.raw_webhook = event

    db.commit()
    return None


def _serialize(p: Payment) -> PaymentOut:
    return PaymentOut(
        id=p.id,
        amount_cents=p.amount_cents,
        currency=p.currency,
        provider=p.provider,
        status=p.status,
        paid_at=p.paid_at,
        invoice_id=p.invoice_id,
        crn=p.crn,
        created_at=p.created_at,
    )
