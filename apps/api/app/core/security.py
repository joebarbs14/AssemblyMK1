"""Password hashing (argon2id) + JWT signing (RS256).

The RS256 keypair is read from settings; if blank (dev), a fresh
ephemeral keypair is generated at process start so the app can boot
without configuration. Production MUST provide JWT_PRIVATE_KEY and
JWT_PUBLIC_KEY env vars.
"""
from __future__ import annotations

import logging
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.core.config import settings

_log = logging.getLogger(__name__)
_ph = PasswordHasher()


def _generate_dev_keypair() -> tuple[str, str]:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    public_pem = (
        key.public_key()
        .public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        .decode()
    )
    return private_pem, public_pem


_private_key = settings.jwt_private_key
_public_key = settings.jwt_public_key

if not _private_key or not _public_key:
    if settings.env == "production":
        _log.error(
            "PRODUCTION WARNING: JWT_PRIVATE_KEY/JWT_PUBLIC_KEY not set. "
            "Generating an ephemeral keypair so the service can boot — but every "
            "process restart invalidates all sessions and residents must sign in "
            "again. Set both env vars to stable PEM-formatted RS256 keys before "
            "going live. Generate locally with:\n"
            "  openssl genrsa -out jwt_private.pem 2048 && "
            "openssl rsa -in jwt_private.pem -pubout -out jwt_public.pem"
        )
    else:
        _log.warning("No JWT keys configured — generating ephemeral dev keypair.")
    _private_key, _public_key = _generate_dev_keypair()


# ---------- Passwords ----------


def hash_password(plain: str) -> str:
    return _ph.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        _ph.verify(hashed, plain)
        return True
    except VerifyMismatchError:
        return False


def password_needs_rehash(hashed: str) -> bool:
    return _ph.check_needs_rehash(hashed)


# ---------- JWT ----------


def issue_access_token(
    *,
    subject: str,
    council_id: int,
    role: str,
    extra: dict[str, Any] | None = None,
    ttl_seconds: int | None = None,
) -> str:
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "iss": settings.jwt_issuer,
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=ttl_seconds or settings.jwt_access_ttl_seconds)).timestamp()),
        "council_id": council_id,
        "role": role,
        "jti": secrets.token_urlsafe(12),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, _private_key, algorithm="RS256")


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, _public_key, algorithms=["RS256"], issuer=settings.jwt_issuer)


# ---------- Magic-link tokens (signed, opaque, time-limited) ----------

_serializer = URLSafeTimedSerializer(settings.magic_link_secret, salt="magic-link")


def issue_magic_link_token(payload: dict[str, Any]) -> str:
    return _serializer.dumps(payload)


def consume_magic_link_token(token: str, max_age_seconds: int | None = None) -> dict[str, Any]:
    """Returns the original payload or raises ValueError."""
    try:
        payload: dict[str, Any] = _serializer.loads(
            token, max_age=max_age_seconds or settings.magic_link_ttl_seconds
        )
        return payload
    except SignatureExpired as exc:
        raise ValueError("expired") from exc
    except BadSignature as exc:
        raise ValueError("invalid") from exc
