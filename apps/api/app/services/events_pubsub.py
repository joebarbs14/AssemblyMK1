"""In-process pub/sub for SSE.

Single-worker only. M4+ swaps this for Redis pub/sub so multiple
uvicorn workers and the RQ worker can fan out together.
"""
from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from typing import Any

_subscribers: dict[int, set[asyncio.Queue[str]]] = defaultdict(set)


def subscribe(report_id: int) -> asyncio.Queue[str]:
    q: asyncio.Queue[str] = asyncio.Queue(maxsize=64)
    _subscribers[report_id].add(q)
    return q


def unsubscribe(report_id: int, q: asyncio.Queue[str]) -> None:
    _subscribers[report_id].discard(q)
    if not _subscribers[report_id]:
        _subscribers.pop(report_id, None)


def publish(report_id: int, payload: dict[str, Any]) -> None:
    """Sync wrapper — called from request handlers after commit.

    Drops messages for slow subscribers rather than blocking the writer.
    """
    if report_id not in _subscribers:
        return
    encoded = json.dumps(payload, default=str)
    for q in list(_subscribers[report_id]):
        try:
            q.put_nowait(encoded)
        except asyncio.QueueFull:
            # Subscriber is slow — drop. SSE clients reconnect with Last-Event-ID
            # on the next event to backfill anything they missed.
            pass
