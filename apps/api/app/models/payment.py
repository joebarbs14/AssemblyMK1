from __future__ import annotations

import enum
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class PaymentProvider(enum.StrEnum):
    paypal = "paypal"
    bpay = "bpay"
    manual = "manual"


class PaymentStatus(enum.StrEnum):
    pending = "pending"
    succeeded = "succeeded"
    failed = "failed"
    refunded = "refunded"


class PlanStatus(enum.StrEnum):
    active = "active"
    completed = "completed"
    defaulted = "defaulted"
    cancelled = "cancelled"


class Payment(Base):
    __tablename__ = "payment"
    __table_args__ = (
        UniqueConstraint("provider", "provider_ref", name="uq_payment_provider_ref"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    account_id: Mapped[int] = mapped_column(
        ForeignKey("rates_account.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    invoice_id: Mapped[int | None] = mapped_column(
        ForeignKey("rates_invoice.id", ondelete="SET NULL"), index=True
    )
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="AUD", nullable=False)
    provider: Mapped[str] = mapped_column(String(16), nullable=False)
    provider_ref: Mapped[str | None] = mapped_column(String(120), index=True)
    status: Mapped[str] = mapped_column(
        String(16), default=PaymentStatus.pending.value, nullable=False, index=True
    )
    crn: Mapped[str | None] = mapped_column(String(20), index=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    raw_webhook: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )


class PaymentPlan(Base):
    __tablename__ = "payment_plan"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("rates_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    total_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    instalments: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(
        String(16), default=PlanStatus.active.value, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class WebhookEvent(Base):
    """Idempotency log for webhook deliveries."""

    __tablename__ = "webhook_event"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    provider: Mapped[str] = mapped_column(String(16), nullable=False)
    event_id: Mapped[str] = mapped_column(String(120), nullable=False)
    event_type: Mapped[str | None] = mapped_column(String(120))
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    payload: Mapped[dict[str, Any] | None] = mapped_column(JSON)

    __table_args__ = (
        UniqueConstraint("provider", "event_id", name="uq_webhook_event"),
    )
