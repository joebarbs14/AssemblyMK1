"""APScheduler-driven periodic worker.

Runs the same lifecycle transitions that the on-read paths fire, on a
schedule, so transitions happen even when no resident has visited the
page. Single in-process worker is fine for the current footprint —
when scaling out, move to a dedicated worker process.
"""
from __future__ import annotations

import logging
from datetime import UTC, date, datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler

from app.core.db import SessionLocal
from app.models import (
    BurnPermit,
    CitizenPanel,
    JobListing,
    LibraryHold,
    LostFoundItem,
    Petition,
    Survey,
    Tender,
)

_log = logging.getLogger(__name__)
_scheduler: BackgroundScheduler | None = None


def run_lifecycle() -> dict[str, int]:
    """All on-read transitions, fired against every council."""
    now = datetime.now(UTC)
    today = date.today()
    counts: dict[str, int] = {
        "surveys": 0, "petitions": 0, "tenders": 0, "jobs": 0,
        "burns": 0, "panels": 0, "lost_found": 0, "library_holds": 0,
    }
    db = SessionLocal()
    try:
        for s in db.query(Survey).filter(
            Survey.status == "open",
            Survey.closes_at.isnot(None), Survey.closes_at < now,
        ).all():
            s.status = "closed"
            counts["surveys"] += 1
        for p in db.query(Petition).filter(
            Petition.status == "open",
            Petition.closes_at.isnot(None), Petition.closes_at < now,
        ).all():
            p.status = "closed"
            counts["petitions"] += 1
        for t in db.query(Tender).filter(
            Tender.status == "open", Tender.closes_at < today,
        ).all():
            t.status = "closed"
            counts["tenders"] += 1
        for j in db.query(JobListing).filter(
            JobListing.status == "open",
            JobListing.closes_at.isnot(None), JobListing.closes_at < today,
        ).all():
            j.status = "closed"
            counts["jobs"] += 1
        for b in db.query(BurnPermit).filter(
            BurnPermit.status == "approved", BurnPermit.ends_at < now,
        ).all():
            b.status = "expired"
            counts["burns"] += 1
        for panel in db.query(CitizenPanel).filter(
            CitizenPanel.status == "recruiting",
            CitizenPanel.deliberates_at < now,
        ).all():
            panel.status = "sitting"
            counts["panels"] += 1

        stale = now - timedelta(days=90)
        for lf in db.query(LostFoundItem).filter(
            LostFoundItem.status.in_(("open", "matched")),
            LostFoundItem.created_at < stale,
        ).all():
            lf.status = "closed"
            counts["lost_found"] += 1

        hold_cutoff = now - timedelta(days=7)
        for h in db.query(LibraryHold).filter(
            LibraryHold.status == "ready",
            LibraryHold.ready_at.isnot(None), LibraryHold.ready_at < hold_cutoff,
        ).all():
            h.status = "expired"
            counts["library_holds"] += 1

        db.commit()
        total = sum(counts.values())
        if total:
            _log.info("[scheduler] lifecycle transitions: %s", counts)
        return counts
    except Exception:
        db.rollback()
        _log.exception("[scheduler] lifecycle failed")
        return counts
    finally:
        db.close()


def start() -> None:
    """Boot the background scheduler. Idempotent."""
    global _scheduler
    if _scheduler is not None:
        return
    _scheduler = BackgroundScheduler(daemon=True, timezone="UTC")
    _scheduler.add_job(run_lifecycle, "interval", minutes=60,
                       id="lifecycle", replace_existing=True,
                       next_run_time=datetime.now(UTC) + timedelta(minutes=2))
    _scheduler.start()
    _log.info("[scheduler] started — lifecycle every 60m")


def shutdown() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
