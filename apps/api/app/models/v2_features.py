"""High-impact v2 features: meetings, noticeboard, climate, programs,
SMS threads, AI triage hints, direct-debit authorisations.

Kept thin — one table per feature with the fields a resident actually
sees. Heavier business logic (e.g. real SMS routing via Twilio, AI
vision categorisation, recurring PayPal subscriptions) sits in service
modules that mock when creds are absent.
"""
from __future__ import annotations

import enum
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

# --- Council meetings (idea #7) ---


class MeetingStatus(enum.StrEnum):
    scheduled = "scheduled"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class CouncilMeeting(Base):
    __tablename__ = "council_meeting"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=90, nullable=False)
    location: Mapped[str | None] = mapped_column(String(200))
    agenda_url: Mapped[str | None] = mapped_column(String(500))
    minutes_url: Mapped[str | None] = mapped_column(String(500))
    livestream_url: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(
        String(16), default=MeetingStatus.scheduled.value, nullable=False, index=True
    )
    notes: Mapped[str | None] = mapped_column(Text)


class MeetingAgendaItem(Base):
    __tablename__ = "meeting_agenda_item"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("council_meeting.id", ondelete="CASCADE"), index=True, nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    outcome: Mapped[str | None] = mapped_column(String(64))  # carried|defeated|noted|deferred
    votes_for: Mapped[int | None] = mapped_column(Integer)
    votes_against: Mapped[int | None] = mapped_column(Integer)
    votes_abstain: Mapped[int | None] = mapped_column(Integer)


# --- Community noticeboard (idea #8) ---


class PostStatus(enum.StrEnum):
    pending = "pending"  # awaiting moderation
    published = "published"
    removed = "removed"


class CommunityPost(Base):
    __tablename__ = "community_post"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    author_user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False)  # event|lost_found|garage_sale|community
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    event_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    location_text: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(
        String(16), default=PostStatus.pending.value, nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False, index=True
    )


# --- Climate / sustainability metrics (idea #9) ---


class ClimateMetric(Base):
    __tablename__ = "climate_metric"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    metric_key: Mapped[str] = mapped_column(String(64), nullable=False, index=True)  # emissions_t / waste_diverted_pct / water_kL / trees_planted
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    unit: Mapped[str] = mapped_column(String(32), nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    value_num: Mapped[float] = mapped_column(Float, nullable=False)
    target_num: Mapped[float | None] = mapped_column(Float)
    target_year: Mapped[int | None] = mapped_column(Integer)


# --- Programs + bookings (idea #10) ---


class ProgramKind(enum.StrEnum):
    volunteer = "volunteer"
    booking = "booking"  # hall, oval, BBQ etc
    class_ = "class"  # library reading, swim lessons etc


class Program(Base):
    __tablename__ = "program"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    capacity: Mapped[int | None] = mapped_column(Integer)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    location: Mapped[str | None] = mapped_column(String(200))
    fee_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    bookings_open: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class ProgramBooking(Base):
    __tablename__ = "program_booking"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    program_id: Mapped[int] = mapped_column(
        ForeignKey("program.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    status: Mapped[str] = mapped_column(String(16), default="confirmed", nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


# --- SMS threads (idea #3) ---


class SmsMessage(Base):
    __tablename__ = "sms_message"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL"), index=True
    )
    report_id: Mapped[int | None] = mapped_column(
        ForeignKey("report.id", ondelete="SET NULL"), index=True
    )
    phone: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    direction: Mapped[str] = mapped_column(String(8), nullable=False)  # in|out
    body: Mapped[str] = mapped_column(Text, nullable=False)
    provider: Mapped[str] = mapped_column(String(16), default="twilio", nullable=False)
    provider_sid: Mapped[str | None] = mapped_column(String(120), index=True)
    status: Mapped[str] = mapped_column(String(16), default="sent", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False, index=True
    )


# --- Direct debit authorisations (idea #5) ---


class DirectDebitAuth(Base):
    __tablename__ = "direct_debit_auth"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("rates_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    provider: Mapped[str] = mapped_column(String(16), default="paypal", nullable=False)  # paypal|bank_dd
    provider_ref: Mapped[str | None] = mapped_column(String(120))  # PayPal Subscription ID
    cadence: Mapped[str] = mapped_column(String(16), default="monthly", nullable=False)  # weekly|fortnightly|monthly|quarterly
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    starts_on: Mapped[date] = mapped_column(Date, nullable=False)
    next_charge_on: Mapped[date | None] = mapped_column(Date, index=True)
    status: Mapped[str] = mapped_column(String(16), default="active", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


# --- AI triage hint (idea #2) ---


class AiTriageHint(Base):
    __tablename__ = "ai_triage_hint"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    report_id: Mapped[int] = mapped_column(
        ForeignKey("report.id", ondelete="CASCADE"), index=True, nullable=False, unique=True
    )
    suggested_category_key: Mapped[str | None] = mapped_column(String(64))
    suggested_priority: Mapped[str | None] = mapped_column(String(16))
    confidence: Mapped[float | None] = mapped_column(Float)
    rationale: Mapped[str | None] = mapped_column(Text)
    provider: Mapped[str] = mapped_column(String(16), default="mock", nullable=False)
    raw_response: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
