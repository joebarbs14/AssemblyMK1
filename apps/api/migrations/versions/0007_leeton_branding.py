"""rebrand demo council to Leeton Shire Council

Renames slug demo -> leeton, sets the official name, shire name, logo
URL (served from the web app's /public/councils/), and brand colour.
Safe to run on a fresh deploy (no-op if the demo row was never inserted).

Revision ID: 0007_leeton_branding
Revises: 0006_seed_categories
Create Date: 2026-06-04 16:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007_leeton_branding"
down_revision: str | None = "0006_seed_categories"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


LEETON_LOGO_URL = "/councils/leeton.svg"
LEETON_BRAND = "#1F5D2F"  # eucalypt green — close to Leeton's official livery


def upgrade() -> None:
    bind = op.get_bind()

    # Already on leeton? Skip.
    existing_leeton = bind.execute(
        sa.text("SELECT id FROM council WHERE slug = :s"), {"s": "leeton"}
    ).first()
    if existing_leeton:
        return

    # Try to rebrand the existing demo row first (preserves existing user
    # accounts and FK references).
    demo = bind.execute(
        sa.text("SELECT id FROM council WHERE slug = :s"), {"s": "demo"}
    ).first()

    if demo:
        bind.execute(
            sa.text(
                "UPDATE council SET slug=:slug, name=:name, shire_name=:shire, "
                "logo_url=:logo, brand_color=:colour WHERE id=:id"
            ),
            {
                "slug": "leeton",
                "name": "Leeton Shire Council",
                "shire": "Leeton Shire",
                "logo": LEETON_LOGO_URL,
                "colour": LEETON_BRAND,
                "id": demo[0],
            },
        )
    else:
        # Fresh deploy where the demo seed never ran — insert leeton directly.
        bind.execute(
            sa.text(
                "INSERT INTO council (slug, name, shire_name, timezone, logo_url, brand_color) "
                "VALUES (:slug, :name, :shire, :tz, :logo, :colour)"
            ),
            {
                "slug": "leeton",
                "name": "Leeton Shire Council",
                "shire": "Leeton Shire",
                "tz": "Australia/Sydney",
                "logo": LEETON_LOGO_URL,
                "colour": LEETON_BRAND,
            },
        )


def downgrade() -> None:
    op.get_bind().execute(
        sa.text(
            "UPDATE council SET slug='demo', name='Demo Council', shire_name='Demo Shire', "
            "logo_url=NULL, brand_color='#0B3D2E' WHERE slug='leeton'"
        )
    )
