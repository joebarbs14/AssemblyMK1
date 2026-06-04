"""Resolve the active council (tenant) per request.

Order of resolution:
1. X-Council-Slug header (dev / testing override)
2. Subdomain of Host (e.g. parramatta.assembly.app -> "parramatta")

The resolved slug is attached to request.state.council_slug. Routes
that need the Council row use the get_current_council dependency.
"""
from __future__ import annotations

from fastapi import Request

RESERVED_SUBDOMAINS = {"www", "app", "api", "admin", "staging", "dev", "localhost", ""}


def slug_from_request(request: Request) -> str | None:
    header = request.headers.get("x-council-slug")
    if header:
        return header.strip().lower() or None

    host = request.headers.get("host", "").split(":", 1)[0].lower()
    if not host or host in RESERVED_SUBDOMAINS:
        return None

    parts = host.split(".")
    if len(parts) < 3:
        return None
    sub = parts[0]
    if sub in RESERVED_SUBDOMAINS:
        return None
    return sub
