"""rates extension: instalments, interest, certificates, plans, claims,
objections, mixed-use apportionment, non-ad-valorem levies, ward-based
category overlay

Revision ID: 0022_rates_ext
Revises: 0021_rate_category
Create Date: 2026-06-06 07:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0022_rates_ext"
down_revision: str | None = "0021_rate_category"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _jsonb() -> sa.types.TypeEngine:  # type: ignore[type-arg]
    return postgresql.JSONB(astext_type=sa.Text())


def upgrade() -> None:
    op.add_column("rate_category",
                  sa.Column("ward_id", sa.Integer(),
                            sa.ForeignKey("ward.id", ondelete="SET NULL")))

    op.create_table(
        "rate_levy",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(),
                  sa.ForeignKey("council.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("fiscal_year", sa.Integer(), nullable=False, index=True),
        sa.Column("code", sa.String(32), nullable=False),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("applies_to_property_type", sa.String(64)),
        sa.Column("notes", sa.Text()),
        sa.UniqueConstraint("council_id", "fiscal_year", "code", name="uq_rate_levy"),
    )
    op.create_table(
        "rate_instalment",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("account_id", sa.Integer(),
                  sa.ForeignKey("rates_account.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("fiscal_year", sa.Integer(), nullable=False, index=True),
        sa.Column("period_label", sa.String(8), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False, index=True),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("paid_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending", index=True),
        sa.Column("reminder_sent_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "interest_charge",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("account_id", sa.Integer(),
                  sa.ForeignKey("rates_account.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("accrued_from", sa.Date(), nullable=False),
        sa.Column("accrued_to", sa.Date(), nullable=False),
        sa.Column("days", sa.Integer(), nullable=False),
        sa.Column("rate_pct_pa", sa.Float(), nullable=False),
        sa.Column("principal_cents", sa.Integer(), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("waived_at", sa.DateTime(timezone=True)),
        sa.Column("waived_by_user_id", sa.Integer(),
                  sa.ForeignKey("user_account.id", ondelete="SET NULL")),
        sa.Column("waiver_reason", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )
    op.create_table(
        "rates_certificate",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(),
                  sa.ForeignKey("council.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("property_id", sa.Integer(),
                  sa.ForeignKey("property.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("requested_by_user_id", sa.Integer(),
                  sa.ForeignKey("user_account.id", ondelete="SET NULL")),
        sa.Column("reference", sa.String(40), nullable=False, unique=True),
        sa.Column("requester_name", sa.String(200)),
        sa.Column("requester_email", sa.String(200)),
        sa.Column("fee_cents", sa.Integer(), nullable=False, server_default="9500"),
        sa.Column("status", sa.String(16), nullable=False, server_default="requested", index=True),
        sa.Column("issued_at", sa.DateTime(timezone=True)),
        sa.Column("valid_until", sa.Date()),
        sa.Column("snapshot", _jsonb()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()"), index=True),
    )
    op.create_table(
        "hardship_plan",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("account_id", sa.Integer(),
                  sa.ForeignKey("rates_account.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("requested_by_user_id", sa.Integer(),
                  sa.ForeignKey("user_account.id", ondelete="SET NULL")),
        sa.Column("term_months", sa.Integer(), nullable=False),
        sa.Column("monthly_amount_cents", sa.Integer(), nullable=False),
        sa.Column("starts_on", sa.Date(), nullable=False),
        sa.Column("ends_on", sa.Date(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="requested", index=True),
        sa.Column("paid_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )
    op.create_table(
        "concession_claim",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(),
                  sa.ForeignKey("council.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("period_year", sa.Integer(), nullable=False),
        sa.Column("period_half", sa.Integer(), nullable=False),
        sa.Column("pensioner_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_concession_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("state_subsidy_pct", sa.Float(), nullable=False, server_default="55"),
        sa.Column("state_subsidy_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reference", sa.String(40)),
        sa.Column("submitted_at", sa.DateTime(timezone=True)),
        sa.Column("paid_at", sa.DateTime(timezone=True)),
        sa.Column("status", sa.String(16), nullable=False, server_default="draft"),
        sa.UniqueConstraint("council_id", "period_year", "period_half",
                            name="uq_concession_claim"),
    )
    op.create_table(
        "valuation_objection",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("property_id", sa.Integer(),
                  sa.ForeignKey("property.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("user_id", sa.Integer(),
                  sa.ForeignKey("user_account.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("year", sa.Integer(), nullable=False, index=True),
        sa.Column("current_uv_cents", sa.Integer(), nullable=False),
        sa.Column("proposed_uv_cents", sa.Integer(), nullable=False),
        sa.Column("grounds", sa.Text(), nullable=False),
        sa.Column("supporting_url", sa.String(500)),
        sa.Column("status", sa.String(16), nullable=False, server_default="lodged", index=True),
        sa.Column("decided_at", sa.DateTime(timezone=True)),
        sa.Column("decision_note", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()"), index=True),
    )
    op.create_table(
        "property_rate_assignment",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("property_id", sa.Integer(),
                  sa.ForeignKey("property.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("fiscal_year", sa.Integer(), nullable=False, index=True),
        sa.Column("category_id", sa.Integer(),
                  sa.ForeignKey("rate_category.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("percentage", sa.Float(), nullable=False),
        sa.UniqueConstraint("property_id", "fiscal_year", "category_id",
                            name="uq_property_rate_assignment"),
    )


def downgrade() -> None:
    for t in ["property_rate_assignment", "valuation_objection", "concession_claim",
              "hardship_plan", "rates_certificate", "interest_charge",
              "rate_instalment", "rate_levy"]:
        op.drop_table(t)
    op.drop_column("rate_category", "ward_id")
