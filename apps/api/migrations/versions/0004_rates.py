"""rates / property domain

Revision ID: 0004_rates
Revises: 0003_reports
Create Date: 2026-06-04 13:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004_rates"
down_revision: str | None = "0003_reports"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _jsonb() -> sa.types.TypeEngine:  # type: ignore[type-arg]
    return postgresql.JSONB(astext_type=sa.Text())


def upgrade() -> None:
    op.create_table(
        "property",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("address", sa.String(300), nullable=False),
        sa.Column("suburb", sa.String(120)),
        sa.Column("postcode", sa.String(8)),
        sa.Column("property_type", sa.String(16), nullable=False, server_default="primary"),
        sa.Column("lat", sa.Float()),
        sa.Column("lng", sa.Float()),
        sa.Column("parcel_geojson", _jsonb()),
        sa.Column("land_size_sqm", sa.Integer()),
        sa.Column("zone", sa.String(32)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint(
            "property_type IN ('primary','investment','commercial')", name="ck_property_type"
        ),
    )

    op.create_table(
        "property_ownership",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("property_id", sa.Integer(), sa.ForeignKey("property.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("role", sa.String(16), nullable=False, server_default="owner"),
        sa.Column("verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("verified_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("property_id", "user_id", name="uq_property_ownership"),
    )

    op.create_table(
        "rates_account",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("property_id", sa.Integer(), sa.ForeignKey("property.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("account_number", sa.String(32), nullable=False, unique=True),
        sa.Column("balance_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("next_due_date", sa.Date()),
        sa.Column("ebilling_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("direct_debit", _jsonb()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "rates_invoice",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("account_id", sa.Integer(), sa.ForeignKey("rates_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("invoice_number", sa.String(32), nullable=False),
        sa.Column("issue_date", sa.Date(), nullable=False, index=True),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="issued"),
        sa.Column("line_items", _jsonb()),
        sa.Column("pdf_r2_key", sa.String(500)),
        sa.CheckConstraint(
            "status IN ('issued','paid','partial','overdue','cancelled')",
            name="ck_invoice_status",
        ),
    )

    op.create_table(
        "valuation",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("property_id", sa.Integer(), sa.ForeignKey("property.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("land_value_cents", sa.Integer(), nullable=False),
        sa.Column("capital_value_cents", sa.Integer(), nullable=False),
        sa.UniqueConstraint("property_id", "year", name="uq_valuation_property_year"),
    )

    op.create_table(
        "rate_charge",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("property_id", sa.Integer(), sa.ForeignKey("property.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("category", sa.String(32), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("note", sa.Text()),
    )

    op.create_table(
        "concession",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("property_id", sa.Integer(), sa.ForeignKey("property.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("type", sa.String(32), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
        sa.Column("annual_value_cents", sa.Integer()),
        sa.Column("link_apply", sa.String(500)),
    )

    op.create_table(
        "property_overlay",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("property_id", sa.Integer(), sa.ForeignKey("property.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("source", sa.String(120)),
        sa.Column("note", sa.Text()),
    )

    op.create_table(
        "waste_entitlement",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("property_id", sa.Integer(), sa.ForeignKey("property.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("bin_size_l", sa.Integer()),
        sa.Column("extra_bins", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("collection_day", sa.String(16)),
        sa.Column("notes", sa.Text()),
    )

    op.create_table(
        "billing_setting",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("property_id", sa.Integer(), sa.ForeignKey("property.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("direct_debit_active", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("ebill_active", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("update_payment_link", sa.String(500)),
    )

    op.create_table(
        "bpay_crn",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("account_id", sa.Integer(), sa.ForeignKey("rates_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("crn", sa.String(20), nullable=False),
        sa.Column("biller_code", sa.String(16), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("used_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("council_id", "crn", name="uq_bpay_crn_council"),
    )


def downgrade() -> None:
    op.drop_table("bpay_crn")
    op.drop_table("billing_setting")
    op.drop_table("waste_entitlement")
    op.drop_table("property_overlay")
    op.drop_table("concession")
    op.drop_table("rate_charge")
    op.drop_table("valuation")
    op.drop_table("rates_invoice")
    op.drop_table("rates_account")
    op.drop_table("property_ownership")
    op.drop_table("property")
