"""council ops: hardship, pets, permits, cemetery, budget, businesses,
donations, grant drafts

Revision ID: 0016_council_ops
Revises: 0015_v2_features
Create Date: 2026-06-05 01:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0016_council_ops"
down_revision: str | None = "0015_v2_features"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _jsonb() -> sa.types.TypeEngine:  # type: ignore[type-arg]
    return postgresql.JSONB(astext_type=sa.Text())


def upgrade() -> None:
    op.create_table(
        "concession_application",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("applicant_user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("property_id", sa.Integer(), sa.ForeignKey("property.id", ondelete="SET NULL"), index=True),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("pensioner_concession_card", sa.String(40)),
        sa.Column("annual_income_aud", sa.Integer()),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("requested_relief", sa.String(120)),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending", index=True),
        sa.Column("staff_notes", sa.Text()),
        sa.Column("decided_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "pet_registration",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("owner_user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("species", sa.String(16), nullable=False),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("breed", sa.String(120)),
        sa.Column("colour", sa.String(80)),
        sa.Column("sex", sa.String(16)),
        sa.Column("desexed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("date_of_birth", sa.Date()),
        sa.Column("microchip_id", sa.String(32), index=True),
        sa.Column("registration_number", sa.String(40), nullable=False, unique=True),
        sa.Column("valid_until", sa.Date(), nullable=False, index=True),
        sa.Column("annual_fee_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(16), nullable=False, server_default="active", index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "permit",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("property_id", sa.Integer(), sa.ForeignKey("property.id", ondelete="SET NULL"), index=True),
        sa.Column("kind", sa.String(32), nullable=False, index=True),
        sa.Column("permit_number", sa.String(32), nullable=False, unique=True),
        sa.Column("plate", sa.String(16)),
        sa.Column("holder_name", sa.String(120), nullable=False),
        sa.Column("valid_from", sa.Date(), nullable=False, index=True),
        sa.Column("valid_until", sa.Date(), nullable=False, index=True),
        sa.Column("zone", sa.String(32)),
        sa.Column("fee_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("qr_payload", sa.String(120), nullable=False, unique=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="active", index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "cemetery_record",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("cemetery_name", sa.String(120), nullable=False, index=True),
        sa.Column("section", sa.String(40)),
        sa.Column("row", sa.String(20)),
        sa.Column("plot", sa.String(20)),
        sa.Column("deceased_full_name", sa.String(200), nullable=False, index=True),
        sa.Column("date_of_birth", sa.Date()),
        sa.Column("date_of_death", sa.Date(), index=True),
        sa.Column("date_of_burial", sa.Date()),
        sa.Column("notes", sa.Text()),
        sa.Column("lat", sa.Float()),
        sa.Column("lng", sa.Float()),
    )

    op.create_table(
        "budget_line",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("fiscal_year", sa.Integer(), nullable=False, index=True),
        sa.Column("category", sa.String(32), nullable=False, index=True),
        sa.Column("label", sa.String(200), nullable=False),
        sa.Column("revenue_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("expense_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("prior_year_expense_cents", sa.Integer()),
        sa.Column("notes", sa.Text()),
    )

    op.create_table(
        "capital_project",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("fiscal_year", sa.Integer(), nullable=False, index=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("category", sa.String(32)),
        sa.Column("budget_cents", sa.Integer(), nullable=False),
        sa.Column("spent_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(16), nullable=False, server_default="planned"),
        sa.Column("progress_pct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("description", sa.Text()),
        sa.Column("expected_completion", sa.Date()),
    )

    op.create_table(
        "business",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False, index=True),
        sa.Column("category", sa.String(64), nullable=False, index=True),
        sa.Column("description", sa.Text()),
        sa.Column("phone", sa.String(32)),
        sa.Column("email", sa.String(120)),
        sa.Column("website", sa.String(255)),
        sa.Column("address", sa.String(300)),
        sa.Column("lat", sa.Float()),
        sa.Column("lng", sa.Float()),
        sa.Column("abn", sa.String(20)),
        sa.Column("verified", sa.Boolean(), nullable=False, server_default=sa.text("false"), index=True),
        sa.Column("listed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "donation_campaign",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("blurb", sa.Text(), nullable=False),
        sa.Column("target_cents", sa.Integer(), nullable=False),
        sa.Column("raised_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("image_r2_key", sa.String(500)),
        sa.Column("status", sa.String(16), nullable=False, server_default="active", index=True),
        sa.Column("closes_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "donation",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("campaign_id", sa.Integer(), sa.ForeignKey("donation_campaign.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("donor_user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="SET NULL"), index=True),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(16), nullable=False, server_default="paypal"),
        sa.Column("provider_ref", sa.String(120)),
        sa.Column("anonymous", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("message", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"), index=True),
    )

    op.create_table(
        "grant_draft",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("grant_name", sa.String(200)),
        sa.Column("project_summary", sa.Text(), nullable=False),
        sa.Column("requested_amount_cents", sa.Integer()),
        sa.Column("draft_markdown", sa.Text(), nullable=False),
        sa.Column("provider", sa.String(16), nullable=False, server_default="local-template"),
        sa.Column("raw_response", _jsonb()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("grant_draft")
    op.drop_table("donation")
    op.drop_table("donation_campaign")
    op.drop_table("business")
    op.drop_table("capital_project")
    op.drop_table("budget_line")
    op.drop_table("cemetery_record")
    op.drop_table("permit")
    op.drop_table("pet_registration")
    op.drop_table("concession_application")
