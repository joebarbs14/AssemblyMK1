"""v4 council features

Revision ID: 0018_council_v4
Revises: 0017_council_v3
Create Date: 2026-06-06 03:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0018_council_v4"
down_revision: str | None = "0017_council_v3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _jsonb() -> sa.types.TypeEngine:  # type: ignore[type-arg]
    return postgresql.JSONB(astext_type=sa.Text())


def upgrade() -> None:
    op.create_table(
        "disaster_alert",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("kind", sa.String(32), nullable=False, index=True),
        sa.Column("severity", sa.String(16), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("source", sa.String(64), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("ends_at", sa.DateTime(timezone=True)),
        sa.Column("affected_wards", _jsonb()),
    )
    op.create_table(
        "evac_centre",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("address", sa.String(300), nullable=False),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lng", sa.Float(), nullable=False),
        sa.Column("capacity", sa.Integer()),
        sa.Column("facilities", _jsonb()),
        sa.Column("status", sa.String(16), nullable=False, server_default="standby", index=True),
    )
    op.create_table(
        "sandbag_depot",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("address", sa.String(300), nullable=False),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lng", sa.Float(), nullable=False),
        sa.Column("bags_available", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("self_serve", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("hours", sa.String(120)),
    )
    op.create_table(
        "pb_round",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("pool_cents", sa.Integer(), nullable=False),
        sa.Column("tokens_per_voter", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("opens_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("closes_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="open"),
    )
    op.create_table(
        "pb_project",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("round_id", sa.Integer(), sa.ForeignKey("pb_round.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("requested_cents", sa.Integer(), nullable=False),
        sa.Column("ward_id", sa.Integer(), sa.ForeignKey("ward.id", ondelete="SET NULL")),
        sa.Column("image_url", sa.String(500)),
    )
    op.create_table(
        "pb_vote",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("pb_project.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("tokens", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "project_id", name="uq_pb_vote"),
    )
    op.create_table(
        "volunteer_opportunity",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("skills_needed", _jsonb(), nullable=False),
        sa.Column("location", sa.String(200)),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("capacity", sa.Integer()),
        sa.Column("status", sa.String(16), nullable=False, server_default="open"),
    )
    op.create_table(
        "volunteer_profile",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("skills", _jsonb(), nullable=False),
        sa.Column("hours_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "volunteer_signup",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("opportunity_id", sa.Integer(), sa.ForeignKey("volunteer_opportunity.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="confirmed"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "opportunity_id", name="uq_vol_signup"),
    )
    op.create_table(
        "tree",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("species_common", sa.String(120), nullable=False),
        sa.Column("species_botanical", sa.String(160)),
        sa.Column("qr_payload", sa.String(60), nullable=False, unique=True),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lng", sa.Float(), nullable=False),
        sa.Column("planted_on", sa.Date()),
        sa.Column("last_pruned_on", sa.Date()),
        sa.Column("canopy_m", sa.Float()),
        sa.Column("height_m", sa.Float()),
        sa.Column("status", sa.String(16), nullable=False, server_default="healthy", index=True),
    )
    op.create_table(
        "tree_adoption",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("tree_id", sa.Integer(), sa.ForeignKey("tree.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("nickname", sa.String(120)),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "tree_id", name="uq_tree_adoption"),
    )
    op.create_table(
        "food_premises",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("address", sa.String(300), nullable=False),
        sa.Column("lat", sa.Float()),
        sa.Column("lng", sa.Float()),
        sa.Column("licence_no", sa.String(40), nullable=False, unique=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="active", index=True),
    )
    op.create_table(
        "food_inspection",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("premises_id", sa.Integer(), sa.ForeignKey("food_premises.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("inspected_on", sa.Date(), nullable=False, index=True),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("grade", sa.String(2), nullable=False),
        sa.Column("issues", _jsonb()),
        sa.Column("report_url", sa.String(500)),
    )
    op.create_table(
        "ranger_patrol",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("officer_user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="SET NULL"), index=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("ends_at", sa.DateTime(timezone=True)),
        sa.Column("route", _jsonb()),
        sa.Column("notes", sa.Text()),
    )
    op.create_table(
        "infringement",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("patrol_id", sa.Integer(), sa.ForeignKey("ranger_patrol.id", ondelete="SET NULL"), index=True),
        sa.Column("officer_user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="SET NULL")),
        sa.Column("kind", sa.String(32), nullable=False, index=True),
        sa.Column("code", sa.String(16), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("plate", sa.String(16), index=True),
        sa.Column("lat", sa.Float()),
        sa.Column("lng", sa.Float()),
        sa.Column("fee_cents", sa.Integer(), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("status", sa.String(16), nullable=False, server_default="issued"),
        sa.Column("photo_r2_key", sa.String(255)),
    )
    op.create_table(
        "infringement_appeal",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("infringement_id", sa.Integer(), sa.ForeignKey("infringement.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("submitted_by_user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="SET NULL")),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("outcome", sa.String(16)),
        sa.Column("decided_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "fleet_vehicle",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("rego", sa.String(16), nullable=False, unique=True),
        sa.Column("make", sa.String(60), nullable=False),
        sa.Column("model", sa.String(60), nullable=False),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("fuel", sa.String(16), nullable=False),
        sa.Column("year", sa.Integer()),
        sa.Column("odometer_km", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_service_on", sa.Date()),
        sa.Column("next_service_due", sa.Date(), index=True),
        sa.Column("co2_kg_per_km", sa.Float(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
    )
    op.create_table(
        "fleet_service_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("vehicle_id", sa.Integer(), sa.ForeignKey("fleet_vehicle.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("serviced_on", sa.Date(), nullable=False, index=True),
        sa.Column("odometer_km", sa.Integer(), nullable=False),
        sa.Column("work", sa.Text(), nullable=False),
        sa.Column("cost_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("invoice_ref", sa.String(64)),
    )
    op.create_table(
        "library_item",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(300), nullable=False, index=True),
        sa.Column("author", sa.String(200)),
        sa.Column("isbn", sa.String(20), index=True),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("copies_total", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("copies_available", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("cover_url", sa.String(500)),
        sa.Column("blurb", sa.Text()),
    )
    op.create_table(
        "library_hold",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("item_id", sa.Integer(), sa.ForeignKey("library_item.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="queued"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("ready_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "tourism_listing",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("kind", sa.String(16), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("blurb", sa.Text(), nullable=False),
        sa.Column("image_url", sa.String(500)),
        sa.Column("lat", sa.Float()),
        sa.Column("lng", sa.Float()),
        sa.Column("address", sa.String(300)),
        sa.Column("url", sa.String(500)),
        sa.Column("starts_at", sa.DateTime(timezone=True), index=True),
        sa.Column("ends_at", sa.DateTime(timezone=True)),
        sa.Column("tags", _jsonb()),
    )


def downgrade() -> None:
    for t in [
        "tourism_listing", "library_hold", "library_item",
        "fleet_service_log", "fleet_vehicle",
        "infringement_appeal", "infringement", "ranger_patrol",
        "food_inspection", "food_premises",
        "tree_adoption", "tree",
        "volunteer_signup", "volunteer_profile", "volunteer_opportunity",
        "pb_vote", "pb_project", "pb_round",
        "sandbag_depot", "evac_centre", "disaster_alert",
    ]:
        op.drop_table(t)
