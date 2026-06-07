"""Idempotent test-account seeder for the staff portal.

Gated by the SEED_DEMO_STAFF env var so it never runs in production
without explicit opt-in. Creates two known accounts per active council:

    demo-staff@<council_slug>.test  /  StaffDemo2026!   (role=staff)
    demo-admin@<council_slug>.test  /  StaffDemo2026!   (role=admin)

Safe to leave on indefinitely — every call short-circuits when the rows
already exist with the right role.
"""
from __future__ import annotations

import logging

from app.core.db import SessionLocal
from app.core.security import hash_password
from app.models import Council, User, UserRole, UserStatus

_log = logging.getLogger(__name__)

DEMO_PASSWORD = "StaffDemo2026!"  # noqa: S105  (test fixture, not a real secret)


def seed_demo_staff() -> dict[str, int]:
    counts = {"created": 0, "promoted": 0}
    db = SessionLocal()
    try:
        councils = db.query(Council).all()
        for council in councils:
            for role, label in ((UserRole.staff, "staff"), (UserRole.admin, "admin")):
                email = f"demo-{label}@{council.slug}.test"
                existing = (
                    db.query(User)
                    .filter(User.council_id == council.id, User.email == email)
                    .first()
                )
                if existing is None:
                    db.add(User(
                        council_id=council.id,
                        email=email,
                        name=f"Demo {label.title()}",
                        password_hash=hash_password(DEMO_PASSWORD),
                        role=role.value,
                        status=UserStatus.active.value,
                    ))
                    counts["created"] += 1
                    _log.info("[seed-demo-staff] created %s for council %s",
                              email, council.slug)
                elif existing.role != role.value or existing.status != UserStatus.active.value:
                    existing.role = role.value
                    existing.status = UserStatus.active.value
                    counts["promoted"] += 1
        db.commit()
        return counts
    finally:
        db.close()
