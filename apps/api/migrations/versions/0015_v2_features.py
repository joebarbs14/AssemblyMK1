"""v2 features: meetings, noticeboard, climate, programs, SMS, direct
debit, AI triage hint

Revision ID: 0015_v2_features
Revises: 0014_devices_waste_link
Create Date: 2026-06-05 00:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0015_v2_features"
down_revision: str | None = "0014_devices_waste_link"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _jsonb() -> sa.types.TypeEngine:  # type: ignore[type-arg]
    return postgresql.JSONB(astext_type=sa.Text())


def upgrade() -> None:
    op.create_table(
        "council_meeting",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="90"),
        sa.Column("location", sa.String(200)),
        sa.Column("agenda_url", sa.String(500)),
        sa.Column("minutes_url", sa.String(500)),
        sa.Column("livestream_url", sa.String(500)),
        sa.Column("status", sa.String(16), nullable=False, server_default="scheduled", index=True),
        sa.Column("notes", sa.Text()),
    )

    op.create_table(
        "meeting_agenda_item",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("meeting_id", sa.Integer(), sa.ForeignKey("council_meeting.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("outcome", sa.String(64)),
        sa.Column("votes_for", sa.Integer()),
        sa.Column("votes_against", sa.Integer()),
        sa.Column("votes_abstain", sa.Integer()),
    )

    op.create_table(
        "community_post",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("author_user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body_markdown", sa.Text(), nullable=False),
        sa.Column("event_at", sa.DateTime(timezone=True)),
        sa.Column("location_text", sa.String(200)),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending", index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"), index=True),
        sa.CheckConstraint("status IN ('pending','published','removed')", name="ck_post_status"),
    )

    op.create_table(
        "climate_metric",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("metric_key", sa.String(64), nullable=False, index=True),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("unit", sa.String(32), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False, index=True),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("value_num", sa.Float(), nullable=False),
        sa.Column("target_num", sa.Float()),
        sa.Column("target_year", sa.Integer()),
    )

    op.create_table(
        "program",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("capacity", sa.Integer()),
        sa.Column("starts_at", sa.DateTime(timezone=True), index=True),
        sa.Column("ends_at", sa.DateTime(timezone=True)),
        sa.Column("location", sa.String(200)),
        sa.Column("fee_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("bookings_open", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )

    op.create_table(
        "program_booking",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("program_id", sa.Integer(), sa.ForeignKey("program.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="confirmed"),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "sms_message",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="SET NULL"), index=True),
        sa.Column("report_id", sa.Integer(), sa.ForeignKey("report.id", ondelete="SET NULL"), index=True),
        sa.Column("phone", sa.String(32), nullable=False, index=True),
        sa.Column("direction", sa.String(8), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("provider", sa.String(16), nullable=False, server_default="twilio"),
        sa.Column("provider_sid", sa.String(120), index=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="sent"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"), index=True),
        sa.CheckConstraint("direction IN ('in','out')", name="ck_sms_direction"),
    )

    op.create_table(
        "direct_debit_auth",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("account_id", sa.Integer(), sa.ForeignKey("rates_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("provider", sa.String(16), nullable=False, server_default="paypal"),
        sa.Column("provider_ref", sa.String(120)),
        sa.Column("cadence", sa.String(16), nullable=False, server_default="monthly"),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("starts_on", sa.Date(), nullable=False),
        sa.Column("next_charge_on", sa.Date(), index=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="active", index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "ai_triage_hint",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("report_id", sa.Integer(), sa.ForeignKey("report.id", ondelete="CASCADE"), nullable=False, unique=True, index=True),
        sa.Column("suggested_category_key", sa.String(64)),
        sa.Column("suggested_priority", sa.String(16)),
        sa.Column("confidence", sa.Float()),
        sa.Column("rationale", sa.Text()),
        sa.Column("provider", sa.String(16), nullable=False, server_default="mock"),
        sa.Column("raw_response", _jsonb()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("ai_triage_hint")
    op.drop_table("direct_debit_auth")
    op.drop_table("sms_message")
    op.drop_table("program_booking")
    op.drop_table("program")
    op.drop_table("climate_metric")
    op.drop_table("community_post")
    op.drop_table("meeting_agenda_item")
    op.drop_table("council_meeting")
