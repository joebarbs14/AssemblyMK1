"""seed demo council

So a fresh deploy is usable out of the box. Idempotent — won't run twice
because Alembic tracks revision. Operators can add more councils later
via /api/admin (M8) or psql.

Revision ID: 0005_seed_demo
Revises: 0004_rates
Create Date: 2026-06-04 14:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_seed_demo"
down_revision: str | None = "0004_rates"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    # Insert only if no council with slug='demo' exists.
    existing = bind.execute(
        sa.text("SELECT id FROM council WHERE slug = :slug"), {"slug": "demo"}
    ).first()
    if existing is None:
        bind.execute(
            sa.text(
                "INSERT INTO council (slug, name, shire_name, timezone, brand_color) "
                "VALUES (:slug, :name, :shire, :tz, :colour)"
            ),
            {
                "slug": "demo",
                "name": "Demo Council",
                "shire": "Demo Shire",
                "tz": "Australia/Sydney",
                "colour": "#0B3D2E",
            },
        )


def downgrade() -> None:
    op.get_bind().execute(
        sa.text("DELETE FROM council WHERE slug = :slug"), {"slug": "demo"}
    )
