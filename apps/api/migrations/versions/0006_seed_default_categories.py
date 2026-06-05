"""seed default report categories for any council without any

Adds a starter set so /reports/new isn't empty. Skips councils that
already have categories (operators may have customised theirs in M8).

Revision ID: 0006_seed_categories
Revises: 0005_seed_demo
Create Date: 2026-06-04 15:00:00

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006_seed_categories"
down_revision: str | None = "0005_seed_demo"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


DEFAULTS: list[dict[str, object]] = [
    {"key": "pothole", "label": "Pothole or road damage", "icon": "road", "sla_hours": 72, "requires_photo": True},
    {"key": "streetlight", "label": "Streetlight out", "icon": "lightbulb", "sla_hours": 120, "requires_photo": False},
    {"key": "illegal_dumping", "label": "Illegal dumping", "icon": "trash", "sla_hours": 48, "requires_photo": True},
    {"key": "graffiti", "label": "Graffiti or vandalism", "icon": "spray", "sla_hours": 168, "requires_photo": True},
    {"key": "tree", "label": "Tree or vegetation", "icon": "tree", "sla_hours": 168, "requires_photo": False},
    {"key": "footpath", "label": "Footpath or kerb damage", "icon": "footprints", "sla_hours": 168, "requires_photo": True},
    {"key": "stormwater", "label": "Stormwater or drainage", "icon": "droplet", "sla_hours": 72, "requires_photo": False},
    {"key": "noise", "label": "Noise complaint", "icon": "volume", "sla_hours": 72, "requires_photo": False},
    {"key": "parking", "label": "Parking or traffic", "icon": "car", "sla_hours": 168, "requires_photo": False},
    {"key": "other", "label": "Something else", "icon": "more", "sla_hours": 168, "requires_photo": False},
]


def upgrade() -> None:
    bind = op.get_bind()
    councils = bind.execute(sa.text("SELECT id, slug FROM council")).all()
    for council_id, _slug in councils:
        existing = bind.execute(
            sa.text("SELECT COUNT(*) FROM report_category WHERE council_id = :cid"),
            {"cid": council_id},
        ).scalar()
        if existing and int(existing) > 0:
            continue
        for cat in DEFAULTS:
            bind.execute(
                sa.text(
                    "INSERT INTO report_category "
                    "(council_id, key, label, icon, sla_hours, requires_photo, is_active) "
                    "VALUES (:cid, :key, :label, :icon, :sla, :photo, true)"
                ),
                {
                    "cid": council_id,
                    "key": cat["key"],
                    "label": cat["label"],
                    "icon": cat["icon"],
                    "sla": cat["sla_hours"],
                    "photo": cat["requires_photo"],
                },
            )


def downgrade() -> None:
    op.get_bind().execute(
        sa.text(
            "DELETE FROM report_category WHERE key = ANY(:keys)"
        ),
        {"keys": [c["key"] for c in DEFAULTS]},
    )
