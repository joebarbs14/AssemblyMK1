"""announcements + audit log

Revision ID: 0010_comms_audit
Revises: 0009_payments
Create Date: 2026-06-04 19:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0010_comms_audit"
down_revision: str | None = "0009_payments"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _jsonb() -> sa.types.TypeEngine:  # type: ignore[type-arg]
    return postgresql.JSONB(astext_type=sa.Text())


def upgrade() -> None:
    op.create_table(
        "announcement",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("author_user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body_markdown", sa.Text(), nullable=False),
        sa.Column("hero_image_r2_key", sa.String(500)),
        sa.Column("audience", sa.String(16), nullable=False, server_default="council"),
        sa.Column("ward_id", sa.Integer(), sa.ForeignKey("ward.id", ondelete="SET NULL")),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("report_category.id", ondelete="SET NULL")),
        sa.Column("status", sa.String(16), nullable=False, server_default="draft", index=True),
        sa.Column("publish_at", sa.DateTime(timezone=True), index=True),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("audience IN ('council','ward','category')", name="ck_announcement_audience"),
        sa.CheckConstraint(
            "status IN ('draft','scheduled','published','archived')", name="ck_announcement_status"
        ),
    )

    op.create_table(
        "audit_event",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="SET NULL"), index=True),
        sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="SET NULL")),
        sa.Column("action", sa.String(64), nullable=False, index=True),
        sa.Column("target_type", sa.String(64)),
        sa.Column("target_id", sa.String(64)),
        sa.Column("metadata", _jsonb()),
        sa.Column("ip_address", sa.String(64)),
        sa.Column("user_agent", sa.String(255)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"), index=True),
    )


def downgrade() -> None:
    op.drop_table("audit_event")
    op.drop_table("announcement")
