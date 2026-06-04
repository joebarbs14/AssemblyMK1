"""Seed login credentials for the legacy Flask app.

Creates one or more Resident accounts with random strong passwords and
prints them to stdout ONCE. Passwords are never written to the repo or
the database in plaintext.

Usage (Render shell):

    cd server
    python scripts/seed_credentials.py alice@example.com bob@example.com

Optional flags:
    --name "Alice Example"     # only valid with a single email
    --length 20                # password length (default 16, min 12)
    --force                    # if the email already exists, reset the
                               # password instead of skipping

Exit codes:
    0  all requested users seeded (or reset with --force)
    1  one or more failures (printed to stderr)
"""
from __future__ import annotations

import argparse
import secrets
import string
import sys
from datetime import datetime

# Make sibling modules importable when run as `python scripts/seed_credentials.py`
sys.path.insert(0, ".")

from app import app  # noqa: E402  (Flask app context)
from models import Resident, db  # noqa: E402
from werkzeug.security import generate_password_hash  # noqa: E402

PASSWORD_ALPHABET = string.ascii_letters + string.digits + "!@#$%^&*-_=+?"


def generate_password(length: int = 16) -> str:
    """Cryptographically random password with at least one of each class."""
    if length < 12:
        raise ValueError("password length must be >= 12")
    while True:
        candidate = "".join(secrets.choice(PASSWORD_ALPHABET) for _ in range(length))
        if (
            any(c.islower() for c in candidate)
            and any(c.isupper() for c in candidate)
            and any(c.isdigit() for c in candidate)
            and any(c in "!@#$%^&*-_=+?" for c in candidate)
        ):
            return candidate


def seed_one(email: str, name: str | None, password: str, force: bool) -> tuple[bool, str]:
    existing = Resident.query.filter_by(email=email).first()
    if existing and not force:
        return False, f"{email}: already exists (use --force to reset password)"

    if existing:
        existing.password_hash = generate_password_hash(password)
        db.session.commit()
        return True, f"{email}: password reset"

    user = Resident(
        name=name or email.split("@", 1)[0],
        email=email,
        password_hash=generate_password_hash(password),
        created_at=datetime.utcnow(),
    )
    db.session.add(user)
    db.session.commit()
    return True, f"{email}: created"


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed legacy Resident login credentials.")
    parser.add_argument("emails", nargs="+", help="One or more emails to seed.")
    parser.add_argument("--name", help="Display name (only valid with a single email).")
    parser.add_argument("--length", type=int, default=16, help="Password length (default 16).")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Reset password if the email already exists.",
    )
    args = parser.parse_args()

    if args.name and len(args.emails) > 1:
        parser.error("--name is only valid with a single email")

    print()
    print("=" * 72)
    print("Seeded credentials (shown ONCE — copy them now)")
    print("=" * 72)

    failures: list[str] = []
    with app.app_context():
        for email in args.emails:
            password = generate_password(args.length)
            ok, msg = seed_one(email, args.name, password, args.force)
            if not ok:
                failures.append(msg)
                print(f"  [skip] {msg}", file=sys.stderr)
                continue
            print(f"  email:    {email}")
            print(f"  password: {password}")
            print(f"  status:   {msg}")
            print("-" * 72)

    print()
    if failures:
        print(f"{len(failures)} failure(s). Re-run with --force to reset existing users.")
        return 1
    print("Done. Store the passwords in your password manager.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
