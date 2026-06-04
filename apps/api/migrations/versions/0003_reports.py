"""reports + teams + events

Revision ID: 0003_reports
Revises: 0002_tenancy_and_users
Create Date: 2026-06-04 12:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_reports"
down_revision: str | None = "0002_tenancy_and_users"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _jsonb() -> sa.types.TypeEngine:  # type: ignore[type-arg]
    return postgresql.JSONB(astext_type=sa.Text())


def upgrade() -> None:
    op.create_table(
        "staff_team",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("council_id", "name", name="uq_team_council_name"),
    )

    op.create_table(
        "staff_team_member",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("team_id", sa.Integer(), sa.ForeignKey("staff_team.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("role", sa.String(16), nullable=False, server_default="member"),
        sa.UniqueConstraint("team_id", "user_id", name="uq_team_member"),
    )

    op.create_table(
        "report_category",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("key", sa.String(64), nullable=False),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("icon", sa.String(32)),
        sa.Column("sla_hours", sa.Integer(), nullable=False, server_default="72"),
        sa.Column("default_team_id", sa.Integer(), sa.ForeignKey("staff_team.id", ondelete="SET NULL")),
        sa.Column("requires_photo", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("custom_fields_schema", _jsonb()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.UniqueConstraint("council_id", "key", name="uq_category_council_key"),
    )

    op.create_table(
        "report",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("ward_id", sa.Integer(), sa.ForeignKey("ward.id", ondelete="SET NULL")),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("report_category.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("reporter_user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("lat", sa.Float()),
        sa.Column("lng", sa.Float()),
        sa.Column("address_text", sa.String(300)),
        sa.Column("status", sa.String(24), nullable=False, server_default="new", index=True),
        sa.Column("priority", sa.String(16), nullable=False, server_default="normal"),
        sa.Column("assignee_user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="SET NULL"), index=True),
        sa.Column("team_id", sa.Integer(), sa.ForeignKey("staff_team.id", ondelete="SET NULL"), index=True),
        sa.Column("sla_due_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"), index=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
        sa.Column("custom_fields", _jsonb()),
        sa.Column("public", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.CheckConstraint(
            "status IN ('new','triaging','assigned','in_progress','awaiting_resident',"
            "'resolved','closed','duplicate','rejected')",
            name="ck_report_status",
        ),
        sa.CheckConstraint(
            "priority IN ('low','normal','high','urgent')", name="ck_report_priority"
        ),
    )

    op.create_table(
        "report_event",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("report_id", sa.Integer(), sa.ForeignKey("report.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="SET NULL")),
        sa.Column("kind", sa.String(32), nullable=False, index=True),
        sa.Column("body", sa.Text()),
        sa.Column("internal", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("metadata", _jsonb()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"), index=True),
    )

    op.create_table(
        "report_attachment",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("report_id", sa.Integer(), sa.ForeignKey("report.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("kind", sa.String(16), nullable=False, server_default="photo"),
        sa.Column("r2_key", sa.String(500), nullable=False),
        sa.Column("mime", sa.String(120)),
        sa.Column("width", sa.Integer()),
        sa.Column("height", sa.Integer()),
        sa.Column("exif", _jsonb()),
        sa.Column("uploaded_by_user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("in_response_to_event_id", sa.Integer(), sa.ForeignKey("report_event.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "report_subscription",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("report_id", sa.Integer(), sa.ForeignKey("report.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("report_id", "user_id", name="uq_subscription"),
    )


def downgrade() -> None:
    op.drop_table("report_subscription")
    op.drop_table("report_attachment")
    op.drop_table("report_event")
    op.drop_table("report")
    op.drop_table("report_category")
    op.drop_table("staff_team_member")
    op.drop_table("staff_team")
