"""Predictive analytics for staff — FOSS, rule-based.

Default implementation uses simple heuristics on report data. Plug a
local scikit-learn model trained on historical reports later.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.models import Report, ReportCategory


def predict_sla_risk(db: Session, *, council_id: int) -> list[dict[str, Any]]:
    """Returns reports at risk of SLA breach in the next 48h, ranked."""
    now = datetime.now(UTC)
    soon = now + timedelta(hours=48)
    rows = (
        db.query(Report, ReportCategory)
        .join(ReportCategory, ReportCategory.id == Report.category_id)
        .filter(
            Report.council_id == council_id,
            Report.status.in_(("new", "triaging", "assigned", "in_progress", "awaiting_resident")),
            Report.sla_due_at.isnot(None),
            Report.sla_due_at <= soon,
        )
        .order_by(Report.sla_due_at)
        .limit(50)
        .all()
    )
    out: list[dict[str, Any]] = []
    for r, c in rows:
        hours_left = (r.sla_due_at - now).total_seconds() / 3600
        breached = hours_left < 0
        risk = "high" if hours_left < 12 else ("medium" if hours_left < 24 else "low")
        out.append({
            "report_id": r.id,
            "title": r.title,
            "category": c.label,
            "status": r.status,
            "sla_due_at": r.sla_due_at.isoformat(),
            "hours_left": round(hours_left, 1),
            "risk": "breached" if breached else risk,
            "rationale": (
                "SLA already breached" if breached
                else f"{round(hours_left, 1)} hours left + status='{r.status}'"
            ),
        })
    return out


def predict_dumping_hotspots(db: Session, *, council_id: int) -> list[dict[str, Any]]:
    """Where will illegal dumping happen next? Based on historical clusters."""
    # Simple: aggregate past illegal_dumping reports by lat/lng buckets.
    cat = (
        db.query(ReportCategory)
        .filter(
            ReportCategory.council_id == council_id,
            ReportCategory.key == "illegal_dumping",
        )
        .first()
    )
    if cat is None:
        return []
    reports = (
        db.query(Report)
        .filter(
            Report.council_id == council_id,
            Report.category_id == cat.id,
            Report.lat.isnot(None),
            Report.lng.isnot(None),
        )
        .all()
    )
    buckets: dict[tuple[float, float], int] = {}
    for r in reports:
        if r.lat is None or r.lng is None:
            continue
        key = (round(r.lat, 3), round(r.lng, 3))  # ~100m precision
        buckets[key] = buckets.get(key, 0) + 1
    top = sorted(buckets.items(), key=lambda kv: kv[1], reverse=True)[:10]
    return [
        {"lat": lat, "lng": lng, "incidents": count,
         "prediction": "Likely hotspot — patrol weekly" if count >= 3 else "Monitor"}
        for (lat, lng), count in top
    ]
