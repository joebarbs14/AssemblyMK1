from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class PaypalOrderOut(BaseModel):
    order_id: str
    approve_url: str
    mock: bool
    invoice_id: int
    amount_cents: int


class PaypalCaptureIn(BaseModel):
    order_id: str


class PaymentOut(BaseModel):
    id: int
    amount_cents: int
    currency: str
    provider: str
    status: str
    paid_at: datetime | None
    invoice_id: int | None
    crn: str | None
    created_at: datetime
