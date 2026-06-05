"""switch leeton brand colour to slate navy

Aligns the per-tenant brand colour with the new modern palette
(navy #22303C + off-white #FBFBF9 + gold #C9A24B).

Revision ID: 0012_leeton_navy
Revises: 0011_v1x_modules
Create Date: 2026-06-04 21:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0012_leeton_navy"
down_revision: str | None = "0011_v1x_modules"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.get_bind().execute(
        sa.text("UPDATE council SET brand_color=:colour WHERE slug=:slug"),
        {"colour": "#22303C", "slug": "leeton"},
    )


def downgrade() -> None:
    op.get_bind().execute(
        sa.text("UPDATE council SET brand_color=:colour WHERE slug=:slug"),
        {"colour": "#0F3B7A", "slug": "leeton"},
    )
