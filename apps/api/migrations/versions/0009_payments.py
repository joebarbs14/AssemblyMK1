"""payments + payment plans + webhook idempotency log

Revision ID: 0009_payments
Revises: 0008_leeton_palette
Create Date: 2026-06-04 18:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0009_payments"
down_revision: str | None = "0008_leeton_palette"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _jsonb() -> sa.types.TypeEngine:  # type: ignore[type-arg]
    return postgresql.JSONB(astext_type=sa.Text())


def upgrade() -> None:
    op.create_table(
        "payment",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("account_id", sa.Integer(), sa.ForeignKey("rates_account.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("rates_invoice.id", ondelete="SET NULL"), index=True),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="AUD"),
        sa.Column("provider", sa.String(16), nullable=False),
        sa.Column("provider_ref", sa.String(120), index=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending", index=True),
        sa.Column("crn", sa.String(20), index=True),
        sa.Column("paid_at", sa.DateTime(timezone=True)),
        sa.Column("raw_webhook", _jsonb()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"), index=True),
        sa.UniqueConstraint("provider", "provider_ref", name="uq_payment_provider_ref"),
        sa.CheckConstraint("provider IN ('paypal','bpay','manual')", name="ck_payment_provider"),
        sa.CheckConstraint(
            "status IN ('pending','succeeded','failed','refunded')", name="ck_payment_status"
        ),
    )

    op.create_table(
        "payment_plan",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("account_id", sa.Integer(), sa.ForeignKey("rates_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("total_cents", sa.Integer(), nullable=False),
        sa.Column("instalments", _jsonb(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint(
            "status IN ('active','completed','defaulted','cancelled')", name="ck_plan_status"
        ),
    )

    op.create_table(
        "webhook_event",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("provider", sa.String(16), nullable=False),
        sa.Column("event_id", sa.String(120), nullable=False),
        sa.Column("event_type", sa.String(120)),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("payload", _jsonb()),
        sa.UniqueConstraint("provider", "event_id", name="uq_webhook_event"),
    )


def downgrade() -> None:
    op.drop_table("webhook_event")
    op.drop_table("payment_plan")
    op.drop_table("payment")
