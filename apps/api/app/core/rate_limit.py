"""Per-IP rate limiting using slowapi.

Limits applied per-endpoint via decorators. In-memory storage is fine for
v1 with a single uvicorn worker; bump to Redis-backed storage when we
scale out (config one-liner change).
"""
from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=[])
