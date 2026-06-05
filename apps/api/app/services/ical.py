"""iCalendar (RFC 5545) generation — pure stdlib, no deps."""
from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any

_PRODID = "-//Assembly//Council//EN"


def _fmt_dt(dt: datetime) -> str:
    return dt.astimezone(UTC).strftime("%Y%m%dT%H%M%SZ")


def _fmt_date(d: date) -> str:
    return d.strftime("%Y%m%d")


def _escape(s: str) -> str:
    return (
        s.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
    )


def render(*, title: str, events: list[dict[str, Any]]) -> str:
    """Each event dict: uid, summary, description?, location?, dtstart, dtend?,
    all_day? (bool), url?"""
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        f"PRODID:{_PRODID}",
        f"X-WR-CALNAME:{_escape(title)}",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ]
    for e in events:
        lines.append("BEGIN:VEVENT")
        lines.append(f"UID:{e['uid']}")
        lines.append(f"DTSTAMP:{_fmt_dt(datetime.now(UTC))}")
        if e.get("all_day"):
            lines.append(f"DTSTART;VALUE=DATE:{_fmt_date(e['dtstart'])}")
            if e.get("dtend"):
                lines.append(f"DTEND;VALUE=DATE:{_fmt_date(e['dtend'])}")
        else:
            lines.append(f"DTSTART:{_fmt_dt(e['dtstart'])}")
            if e.get("dtend"):
                lines.append(f"DTEND:{_fmt_dt(e['dtend'])}")
        lines.append(f"SUMMARY:{_escape(e['summary'])}")
        if e.get("description"):
            lines.append(f"DESCRIPTION:{_escape(e['description'])}")
        if e.get("location"):
            lines.append(f"LOCATION:{_escape(e['location'])}")
        if e.get("url"):
            lines.append(f"URL:{e['url']}")
        lines.append("END:VEVENT")
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"
