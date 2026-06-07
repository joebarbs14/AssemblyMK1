"""water extension: allocation, tariffs, sewerage, trade waste, smart
meters, self-reads, restrictions, quality samples, sources, rebates,
leak alerts

Revision ID: 0023_water_ext
Revises: 0022_rates_ext
Create Date: 2026-06-06 08:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0023_water_ext"
down_revision: str | None = "0022_rates_ext"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _jsonb() -> sa.types.TypeEngine:  # type: ignore[type-arg]
    return postgresql.JSONB(astext_type=sa.Text())


def upgrade() -> None:
    op.create_table(
        "water_allocation",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("property_id", sa.Integer(),
                  sa.ForeignKey("property.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("season_year", sa.Integer(), nullable=False, index=True),
        sa.Column("entitlement_ml", sa.Float(), nullable=False),
        sa.Column("allocation_pct", sa.Float(), nullable=False, server_default="100"),
        sa.Column("carryover_kl", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("opening_balance_kl", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("used_kl", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text()),
        sa.UniqueConstraint("property_id", "season_year", name="uq_water_allocation"),
    )
    op.create_table(
        "water_tariff",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(),
                  sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("fiscal_year", sa.Integer(), nullable=False, index=True),
        sa.Column("customer_type", sa.String(16), nullable=False),
        sa.Column("tier_from_kl", sa.Integer(), nullable=False),
        sa.Column("tier_to_kl", sa.Integer()),
        sa.Column("cents_per_kl", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(120)),
        sa.UniqueConstraint("council_id", "fiscal_year", "customer_type",
                            "tier_from_kl", name="uq_water_tariff"),
    )
    op.create_table(
        "sewerage_charge",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(),
                  sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("fiscal_year", sa.Integer(), nullable=False, index=True),
        sa.Column("applies_to_customer_type", sa.String(16), nullable=False),
        sa.Column("fixed_amount_cents", sa.Integer(), nullable=False),
        sa.Column("discharge_factor_pct", sa.Float(), nullable=False, server_default="95"),
        sa.Column("per_kl_above_threshold_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("threshold_kl", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text()),
        sa.UniqueConstraint("council_id", "fiscal_year", "applies_to_customer_type",
                            name="uq_sewerage_charge"),
    )
    op.create_table(
        "trade_waste_agreement",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(),
                  sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("property_id", sa.Integer(),
                  sa.ForeignKey("property.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("business_name", sa.String(200), nullable=False),
        sa.Column("category", sa.String(16), nullable=False),
        sa.Column("pretreatment_device", sa.String(120)),
        sa.Column("reference", sa.String(40), nullable=False, unique=True),
        sa.Column("valid_from", sa.Date(), nullable=False),
        sa.Column("valid_until", sa.Date()),
        sa.Column("bod_cents_per_kg", sa.Integer(), nullable=False, server_default="210"),
        sa.Column("ss_cents_per_kg", sa.Integer(), nullable=False, server_default="120"),
        sa.Column("fog_cents_per_kg", sa.Integer(), nullable=False, server_default="330"),
        sa.Column("annual_admin_cents", sa.Integer(), nullable=False, server_default="42000"),
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
    )
    op.create_table(
        "trade_waste_sample",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("agreement_id", sa.Integer(),
                  sa.ForeignKey("trade_waste_agreement.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("sampled_on", sa.Date(), nullable=False, index=True),
        sa.Column("bod_mg_per_l", sa.Float(), nullable=False),
        sa.Column("ss_mg_per_l", sa.Float(), nullable=False),
        sa.Column("fog_mg_per_l", sa.Float(), nullable=False),
        sa.Column("discharge_kl", sa.Float(), nullable=False),
        sa.Column("notes", sa.Text()),
    )
    op.create_table(
        "smart_meter_reading",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("property_id", sa.Integer(),
                  sa.ForeignKey("property.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("taken_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("cumulative_kl", sa.Float(), nullable=False),
        sa.Column("flow_lph", sa.Float()),
        sa.Column("source", sa.String(32), nullable=False, server_default="lorawan"),
        sa.UniqueConstraint("property_id", "taken_at", name="uq_smart_meter_reading"),
    )
    op.create_table(
        "leak_alert",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("property_id", sa.Integer(),
                  sa.ForeignKey("property.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()"), index=True),
        sa.Column("flow_lph", sa.Float(), nullable=False),
        sa.Column("baseline_lph", sa.Float(), nullable=False),
        sa.Column("severity", sa.String(16), nullable=False, server_default="suspected"),
        sa.Column("notes", sa.Text()),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "self_meter_read",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("property_id", sa.Integer(),
                  sa.ForeignKey("property.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("submitted_by_user_id", sa.Integer(),
                  sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False),
        sa.Column("read_on", sa.Date(), nullable=False),
        sa.Column("value_kl", sa.Float(), nullable=False),
        sa.Column("photo_r2_key", sa.String(255)),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending", index=True),
        sa.Column("note", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )
    op.create_table(
        "water_restriction",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(),
                  sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("summary", sa.String(200), nullable=False),
        sa.Column("rules", _jsonb(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), index=True),
        sa.Column("affected_wards", _jsonb()),
    )
    op.create_table(
        "water_quality_sample",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(),
                  sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("sample_point", sa.String(120), nullable=False, index=True),
        sa.Column("taken_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("chlorine_mg_per_l", sa.Float()),
        sa.Column("ph", sa.Float()),
        sa.Column("turbidity_ntu", sa.Float()),
        sa.Column("fluoride_mg_per_l", sa.Float()),
        sa.Column("e_coli_per_100ml", sa.Integer()),
        sa.Column("compliance", sa.String(16), nullable=False, server_default="pass"),
        sa.Column("note", sa.Text()),
    )
    op.create_table(
        "water_source",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(),
                  sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("capacity_ml", sa.Float(), nullable=False),
        sa.Column("lat", sa.Float()),
        sa.Column("lng", sa.Float()),
    )
    op.create_table(
        "water_source_reading",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source_id", sa.Integer(),
                  sa.ForeignKey("water_source.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("reading_date", sa.Date(), nullable=False, index=True),
        sa.Column("capacity_pct", sa.Float(), nullable=False),
        sa.Column("inflow_ml", sa.Float(), nullable=False, server_default="0"),
        sa.Column("withdrawal_ml", sa.Float(), nullable=False, server_default="0"),
        sa.UniqueConstraint("source_id", "reading_date", name="uq_water_source_reading"),
    )
    op.create_table(
        "water_rebate_scheme",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(),
                  sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("code", sa.String(32), nullable=False),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("max_amount_cents", sa.Integer(), nullable=False),
        sa.Column("annual_cap_per_household_cents", sa.Integer(), nullable=False),
        sa.Column("eligibility", sa.Text()),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true"), index=True),
    )
    op.create_table(
        "water_rebate_claim",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scheme_id", sa.Integer(),
                  sa.ForeignKey("water_rebate_scheme.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("property_id", sa.Integer(),
                  sa.ForeignKey("property.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(),
                  sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("invoice_amount_cents", sa.Integer(), nullable=False),
        sa.Column("claim_amount_cents", sa.Integer(), nullable=False),
        sa.Column("receipt_url", sa.String(500)),
        sa.Column("notes", sa.Text()),
        sa.Column("status", sa.String(16), nullable=False, server_default="lodged", index=True),
        sa.Column("decided_at", sa.DateTime(timezone=True)),
        sa.Column("decision_note", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()"), index=True),
    )


def downgrade() -> None:
    for t in [
        "water_rebate_claim", "water_rebate_scheme",
        "water_source_reading", "water_source",
        "water_quality_sample", "water_restriction",
        "self_meter_read", "leak_alert", "smart_meter_reading",
        "trade_waste_sample", "trade_waste_agreement",
        "sewerage_charge", "water_tariff", "water_allocation",
    ]:
        op.drop_table(t)
