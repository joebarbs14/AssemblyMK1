"""rate_category table for ad valorem rates strikes

Revision ID: 0021_rate_category
Revises: 0020_council_v6
Create Date: 2026-06-06 06:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0021_rate_category"
down_revision: str | None = "0020_council_v6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "rate_category",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("council_id", sa.Integer(),
                  sa.ForeignKey("council.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("fiscal_year", sa.Integer(), nullable=False, index=True),
        sa.Column("code", sa.String(32), nullable=False),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("ad_valorem_cents_per_dollar", sa.Float(), nullable=False),
        sa.Column("base_amount_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("minimum_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text()),
        sa.Column("is_active", sa.Boolean(), nullable=False,
                  server_default=sa.text("true"), index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.UniqueConstraint("council_id", "fiscal_year", "code",
                            name="uq_rate_category"),
    )


def downgrade() -> None:
    op.drop_table("rate_category")
