"""switch leeton brand colour to council blue

Aligns the per-tenant brand colour with the new system palette
(white + blue + gold + black accents). The logo SVG is updated in
the same commit but lives in the web service, not the DB.

Revision ID: 0008_leeton_palette
Revises: 0007_leeton_branding
Create Date: 2026-06-04 17:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008_leeton_palette"
down_revision: str | None = "0007_leeton_branding"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.get_bind().execute(
        sa.text("UPDATE council SET brand_color=:colour WHERE slug=:slug"),
        {"colour": "#0F3B7A", "slug": "leeton"},
    )


def downgrade() -> None:
    op.get_bind().execute(
        sa.text("UPDATE council SET brand_color=:colour WHERE slug=:slug"),
        {"colour": "#1F5D2F", "slug": "leeton"},
    )
