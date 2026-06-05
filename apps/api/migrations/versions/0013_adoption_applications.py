"""adoption applications

Revision ID: 0013_adoption_applications
Revises: 0012_leeton_navy
Create Date: 2026-06-04 22:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0013_adoption_applications"
down_revision: str | None = "0012_leeton_navy"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "adoption_application",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(), sa.ForeignKey("council.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("animal_id", sa.Integer(), sa.ForeignKey("animal.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("applicant_user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("phone", sa.String(32)),
        sa.Column("has_other_pets", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("home_type", sa.String(32)),
        sa.Column("why_this_animal", sa.Text(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending", index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint(
            "status IN ('pending','approved','rejected','withdrawn')", name="ck_adoption_status"
        ),
    )


def downgrade() -> None:
    op.drop_table("adoption_application")
