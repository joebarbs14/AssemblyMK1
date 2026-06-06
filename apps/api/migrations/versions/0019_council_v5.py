"""v5 council features + meeting transcript column

Revision ID: 0019_council_v5
Revises: 0018_council_v4
Create Date: 2026-06-06 04:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0019_council_v5"
down_revision: str | None = "0018_council_v4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _jsonb() -> sa.types.TypeEngine:  # type: ignore[type-arg]
    return postgresql.JSONB(astext_type=sa.Text())


def upgrade() -> None:
    op.add_column("council_meeting", sa.Column("transcript_text", sa.Text()))

    op.create_table(
        "childcare_centre",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("address", sa.String(300), nullable=False),
        sa.Column("lat", sa.Float()),
        sa.Column("lng", sa.Float()),
        sa.Column("phone", sa.String(32)),
        sa.Column("website", sa.String(255)),
        sa.Column("age_min_months", sa.Integer(), nullable=False, server_default="6"),
        sa.Column("age_max_months", sa.Integer(), nullable=False, server_default="72"),
        sa.Column("daily_fee_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("vacancies", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rating", sa.String(32)),
        sa.Column("notes", sa.Text()),
    )
    op.create_table(
        "childcare_waitlist",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("centre_id", sa.Integer(), sa.ForeignKey("childcare_centre.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("child_first_name", sa.String(80), nullable=False),
        sa.Column("child_dob", sa.Date(), nullable=False),
        sa.Column("needed_from", sa.Date(), nullable=False),
        sa.Column("days_per_week", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("status", sa.String(16), nullable=False, server_default="waiting"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "ev_charger",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("operator", sa.String(80), nullable=False),
        sa.Column("plug_type", sa.String(32), nullable=False),
        sa.Column("kw", sa.Float(), nullable=False),
        sa.Column("address", sa.String(300), nullable=False),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lng", sa.Float(), nullable=False),
        sa.Column("cents_per_kwh", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("available", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("bookable", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_table(
        "ev_booking",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("charger_id", sa.Integer(), sa.ForeignKey("ev_charger.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="confirmed"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "swim_site",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lng", sa.Float(), nullable=False),
        sa.Column("address", sa.String(300)),
        sa.Column("facilities", _jsonb()),
        sa.Column("status", sa.String(16), nullable=False, server_default="open"),
    )
    op.create_table(
        "swim_reading",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("site_id", sa.Integer(), sa.ForeignKey("swim_site.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("taken_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("water_temp_c", sa.Float()),
        sa.Column("enterococci_per_100ml", sa.Integer()),
        sa.Column("turbidity_ntu", sa.Float()),
        sa.Column("grade", sa.String(16), nullable=False),
        sa.Column("note", sa.Text()),
    )
    op.create_table(
        "burn_permit",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("permit_no", sa.String(40), nullable=False, unique=True),
        sa.Column("property_address", sa.String(300), nullable=False),
        sa.Column("lat", sa.Float()),
        sa.Column("lng", sa.Float()),
        sa.Column("burn_kind", sa.String(32), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="approved"),
        sa.Column("conditions", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "fire_ban",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("declared_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("rating", sa.String(32), nullable=False),
        sa.Column("source", sa.String(32), nullable=False, server_default="rfs"),
        sa.Column("note", sa.Text()),
    )
    op.create_table(
        "lot_item",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False, index=True),
        sa.Column("kind", sa.String(32), nullable=False, index=True),
        sa.Column("description", sa.Text()),
        sa.Column("image_url", sa.String(500)),
        sa.Column("deposit_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_loan_days", sa.Integer(), nullable=False, server_default="14"),
        sa.Column("available", sa.Boolean(), nullable=False, server_default=sa.text("true"), index=True),
    )
    op.create_table(
        "lot_loan",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("item_id", sa.Integer(), sa.ForeignKey("lot_item.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("borrowed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("returned_at", sa.DateTime(timezone=True)),
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
    )
    op.create_table(
        "lost_found_item",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("reporter_user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="SET NULL")),
        sa.Column("kind", sa.String(16), nullable=False, index=True),
        sa.Column("direction", sa.String(8), nullable=False, index=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("image_r2_key", sa.String(255)),
        sa.Column("phash", sa.String(32), index=True),
        sa.Column("lat", sa.Float()),
        sa.Column("lng", sa.Float()),
        sa.Column("contact", sa.String(120)),
        sa.Column("status", sa.String(16), nullable=False, server_default="open", index=True),
        sa.Column("reunited_with_id", sa.Integer(), sa.ForeignKey("lost_found_item.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"), index=True),
    )
    op.create_table(
        "citizen_panel",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("target_size", sa.Integer(), nullable=False, server_default="24"),
        sa.Column("strata", _jsonb()),
        sa.Column("opens_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deliberates_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="recruiting"),
    )
    op.create_table(
        "panel_expression",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("panel_id", sa.Integer(), sa.ForeignKey("citizen_panel.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("selected", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("panel_id", "user_id", name="uq_panel_expression"),
    )
    op.create_table(
        "footpath_audit",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("reporter_user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="SET NULL")),
        sa.Column("lat", sa.Float(), nullable=False, index=True),
        sa.Column("lng", sa.Float(), nullable=False, index=True),
        sa.Column("issue", sa.String(32), nullable=False),
        sa.Column("grade", sa.String(16), nullable=False),
        sa.Column("notes", sa.Text()),
        sa.Column("image_r2_key", sa.String(255)),
        sa.Column("verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"), index=True),
    )
    op.create_table(
        "heritage_site",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("traditional_name", sa.String(200)),
        sa.Column("country", sa.String(120)),
        sa.Column("language_group", sa.String(120)),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("significance", sa.Text(), nullable=False),
        sa.Column("address", sa.String(300)),
        sa.Column("lat", sa.Float()),
        sa.Column("lng", sa.Float()),
        sa.Column("image_url", sa.String(500)),
        sa.Column("audio_url", sa.String(500)),
        sa.Column("consent_holder", sa.String(200)),
        sa.Column("public", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )


def downgrade() -> None:
    for t in [
        "heritage_site", "footpath_audit",
        "panel_expression", "citizen_panel",
        "lost_found_item",
        "lot_loan", "lot_item",
        "fire_ban", "burn_permit",
        "swim_reading", "swim_site",
        "ev_booking", "ev_charger",
        "childcare_waitlist", "childcare_centre",
    ]:
        op.drop_table(t)
    op.drop_column("council_meeting", "transcript_text")
