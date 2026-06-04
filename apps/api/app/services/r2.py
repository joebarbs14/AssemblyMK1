"""Cloudflare R2 (S3-compatible) upload signing.

In dev (no R2 creds), returns a mock URL pointing at /api/dev/upload
so the upload flow is exercisable end-to-end without real R2.
"""
from __future__ import annotations

import logging
import secrets
from datetime import UTC, datetime

from app.core.config import settings

_log = logging.getLogger(__name__)

# Lazy-imported boto3 so dev installs don't need it eagerly.
_s3_client = None


def _get_client() -> object:
    global _s3_client
    if _s3_client is not None:
        return _s3_client
    import boto3  # noqa: PLC0415
    from botocore.config import Config  # noqa: PLC0415

    if not all([settings.r2_account_id, settings.r2_access_key, settings.r2_secret_key]):
        raise RuntimeError("R2 credentials not configured")

    _s3_client = boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key,
        aws_secret_access_key=settings.r2_secret_key,
        config=Config(signature_version="s3v4", region_name="auto"),
    )
    return _s3_client


def is_configured() -> bool:
    return bool(
        settings.r2_account_id and settings.r2_access_key and settings.r2_secret_key
    )


def make_object_key(*, council_id: int, user_id: int, kind: str, mime: str) -> str:
    """Deterministic-ish path: council/year/month/user/uuid.ext"""
    ext = (mime.split("/", 1)[1] if "/" in mime else "bin").replace("+", "-")
    if ext == "jpeg":
        ext = "jpg"
    now = datetime.now(UTC)
    nonce = secrets.token_urlsafe(8)
    return f"c{council_id}/{now:%Y/%m}/u{user_id}/{nonce}.{ext}"


def presign_put(*, key: str, mime: str, expires_seconds: int = 600) -> dict[str, str]:
    """Returns a dict the client uses to PUT directly.

    Shape: {"url": ..., "method": "PUT", "headers": {"Content-Type": "..."}}.
    """
    if not is_configured():
        # Dev fallback — the client uploads to our local stub.
        return {
            "url": f"/api/dev/upload/{key}",
            "method": "PUT",
            "headers_json": '{"Content-Type":"' + mime + '"}',
        }

    client = _get_client()
    url: str = client.generate_presigned_url(  # type: ignore[attr-defined]
        "put_object",
        Params={
            "Bucket": settings.r2_bucket_media,
            "Key": key,
            "ContentType": mime,
        },
        ExpiresIn=expires_seconds,
        HttpMethod="PUT",
    )
    return {
        "url": url,
        "method": "PUT",
        "headers_json": '{"Content-Type":"' + mime + '"}',
    }


def presign_get(key: str, *, expires_seconds: int = 600) -> str:
    if not is_configured():
        return f"/api/dev/upload/{key}"
    client = _get_client()
    url: str = client.generate_presigned_url(  # type: ignore[attr-defined]
        "get_object",
        Params={"Bucket": settings.r2_bucket_media, "Key": key},
        ExpiresIn=expires_seconds,
    )
    return url
