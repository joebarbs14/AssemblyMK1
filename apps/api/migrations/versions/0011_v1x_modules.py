"""v1.x: animals, dev applications, water, waste, appointments, signatures

Revision ID: 0011_v1x_modules
Revises: 0010_comms_audit
Create Date: 2026-06-04 20:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0011_v1x_modules"
down_revision: str | None = "0010_comms_audit"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _jsonb() -> sa.types.TypeEngine:  # type: ignore[type-arg]
    return postgresql.JSONB(astext_type=sa.Text())


def upgrade() -> None:
    op.create_table(
        "animal",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("species", sa.String(32), nullable=False),
        sa.Column("breed", sa.String(120)),
        sa.Column("sex", sa.String(16)),
        sa.Column("age_years", sa.Float()),
        sa.Column("temperament", sa.String(200)),
        sa.Column("status", sa.String(16), nullable=False, server_default="available"),
        sa.Column("main_photo_r2_key", sa.String(500)),
        sa.Column("gallery", _jsonb()),
        sa.Column("description", sa.Text()),
        sa.Column("listed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"), index=True),
    )

    op.create_table(
        "development_application",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("applicant_user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="SET NULL"), index=True),
        sa.Column("property_id", sa.Integer(), sa.ForeignKey("property.id", ondelete="SET NULL"), index=True),
        sa.Column("da_number", sa.String(32), nullable=False, unique=True),
        sa.Column("application_type", sa.String(64), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("estimated_cost_cents", sa.Integer()),
        sa.Column("status", sa.String(20), nullable=False, server_default="submitted", index=True),
        sa.Column("submission_date", sa.Date(), nullable=False, index=True),
        sa.Column("decision_date", sa.Date()),
        sa.Column("exhibition_ends_at", sa.Date()),
        sa.Column("documents", _jsonb()),
        sa.Column("public", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )

    op.create_table(
        "water_consumption",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("property_id", sa.Integer(), sa.ForeignKey("property.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("quarter_start", sa.Date(), nullable=False, index=True),
        sa.Column("quarter_end", sa.Date(), nullable=False),
        sa.Column("consumed_litres", sa.Integer(), nullable=False),
        sa.Column("allocated_litres", sa.Integer()),
        sa.Column("amount_owing_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("bill_due_date", sa.Date()),
    )

    op.create_table(
        "waste_collection",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("collection_type", sa.String(32), nullable=False),
        sa.Column("collection_day", sa.String(16), nullable=False),
        sa.Column("frequency", sa.String(16), nullable=False, server_default="weekly"),
        sa.Column("next_collection", sa.Date()),
        sa.Column("route_geojson", _jsonb()),
        sa.Column("notes", sa.Text()),
    )

    op.create_table(
        "report_appointment",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("report_id", sa.Integer(), sa.ForeignKey("report.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("proposed_by_user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("slot_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("slot_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("location_text", sa.String(300)),
        sa.Column("status", sa.String(16), nullable=False, server_default="proposed"),
        sa.Column("confirmed_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("status IN ('proposed','confirmed','cancelled','completed')", name="ck_appointment_status"),
    )

    op.create_table(
        "report_signature",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("report_id", sa.Integer(), sa.ForeignKey("report.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("signer_user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("signed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("attachment_id", sa.Integer(), sa.ForeignKey("report_attachment.id", ondelete="SET NULL")),
        sa.Column("ip_address", sa.String(64)),
        sa.Column("user_agent", sa.String(255)),
    )


def downgrade() -> None:
    op.drop_table("report_signature")
    op.drop_table("report_appointment")
    op.drop_table("waste_collection")
    op.drop_table("water_consumption")
    op.drop_table("development_application")
    op.drop_table("animal")
