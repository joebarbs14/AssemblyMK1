"""v3 council features

Revision ID: 0017_council_v3
Revises: 0016_council_ops
Create Date: 2026-06-05 02:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0017_council_v3"
down_revision: str | None = "0016_council_ops"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _jsonb() -> sa.types.TypeEngine:  # type: ignore[type-arg]
    return postgresql.JSONB(astext_type=sa.Text())


def upgrade() -> None:
    op.create_table(
        "webhook_subscription",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("secret", sa.String(64), nullable=False),
        sa.Column("event_types", _jsonb(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true"), index=True),
        sa.Column("last_status", sa.Integer()),
        sa.Column("last_delivered_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "webhook_delivery",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("subscription_id", sa.Integer(), sa.ForeignKey("webhook_subscription.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("event_type", sa.String(64), nullable=False, index=True),
        sa.Column("payload", _jsonb(), nullable=False),
        sa.Column("status_code", sa.Integer()),
        sa.Column("error", sa.Text()),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"), index=True),
    )
    op.create_table(
        "grant_opportunity",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), index=True),
        sa.Column("source", sa.String(32), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("min_amount_cents", sa.Integer()),
        sa.Column("max_amount_cents", sa.Integer()),
        sa.Column("opens_at", sa.Date()),
        sa.Column("closes_at", sa.Date(), index=True),
        sa.Column("url", sa.String(500)),
        sa.Column("eligibility", sa.Text()),
        sa.Column("tags", _jsonb()),
    )
    op.create_table(
        "asset",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("kind", sa.String(32), nullable=False, index=True),
        sa.Column("label", sa.String(200), nullable=False),
        sa.Column("qr_payload", sa.String(60), nullable=False, unique=True),
        sa.Column("lat", sa.Float()),
        sa.Column("lng", sa.Float()),
        sa.Column("address_text", sa.String(300)),
        sa.Column("status", sa.String(16), nullable=False, server_default="active", index=True),
        sa.Column("last_inspected_at", sa.Date()),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "road_closure",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("lat_from", sa.Float(), nullable=False),
        sa.Column("lng_from", sa.Float(), nullable=False),
        sa.Column("lat_to", sa.Float()),
        sa.Column("lng_to", sa.Float()),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("severity", sa.String(16), nullable=False, server_default="planned"),
        sa.Column("detour", sa.Text()),
    )
    op.create_table(
        "identity_verification",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("provider", sa.String(32), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="verified"),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("raw_claims", _jsonb()),
        sa.UniqueConstraint("user_id", "provider", name="uq_identity_provider"),
    )
    op.create_table(
        "user_preference",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("language", sa.String(8), nullable=False, server_default="en"),
        sa.Column("high_contrast", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("dyslexia_font", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("larger_text", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("reduced_motion", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "land_hire_resource",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("capacity", sa.Integer()),
        sa.Column("fee_cents_per_unit", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("fee_unit", sa.String(16), nullable=False, server_default="hour"),
        sa.Column("location", sa.String(200)),
        sa.Column("lat", sa.Float()),
        sa.Column("lng", sa.Float()),
        sa.Column("available", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.create_table(
        "land_hire_booking",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("resource_id", sa.Integer(), sa.ForeignKey("land_hire_resource.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="confirmed"),
        sa.Column("total_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("purpose", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "sensor_reading",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("contributor_user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="SET NULL")),
        sa.Column("kind", sa.String(32), nullable=False, index=True),
        sa.Column("source", sa.String(64), nullable=False),
        sa.Column("value_num", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(16), nullable=False),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lng", sa.Float(), nullable=False),
        sa.Column("taken_at", sa.DateTime(timezone=True), nullable=False, index=True),
    )


def downgrade() -> None:
    for t in ["sensor_reading", "land_hire_booking", "land_hire_resource",
              "user_preference", "identity_verification", "road_closure",
              "asset", "grant_opportunity", "webhook_delivery", "webhook_subscription"]:
        op.drop_table(t)
