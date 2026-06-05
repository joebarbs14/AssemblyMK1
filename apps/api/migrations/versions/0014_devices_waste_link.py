"""web push device + property->waste route link

Revision ID: 0014_devices_waste_link
Revises: 0013_adoption_applications
Create Date: 2026-06-04 23:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0014_devices_waste_link"
down_revision: str | None = "0013_adoption_applications"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _jsonb() -> sa.types.TypeEngine:  # type: ignore[type-arg]
    return postgresql.JSONB(astext_type=sa.Text())


def upgrade() -> None:
    op.create_table(
        "device",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("endpoint", sa.String(1024), nullable=False),
        sa.Column("p256dh", sa.String(255), nullable=False),
        sa.Column("auth_key", sa.String(64), nullable=False),
        sa.Column("user_agent", sa.String(255)),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("metadata", _jsonb()),
        sa.UniqueConstraint("endpoint", name="uq_device_endpoint"),
    )
    op.add_column(
        "property",
        sa.Column(
            "waste_route_id",
            sa.Integer(),
            sa.ForeignKey("waste_collection.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("property", "waste_route_id")
    op.drop_table("device")
