"""V3 council features: webhooks, grants browser, asset register,
road closures, identity verification, accessibility settings,
languages, land hire, citizen sensors, predictive analytics.

FOSS-first. Every external integration has a mock-mode default so
councils without budget for paid providers still get full functionality.
"""
from __future__ import annotations

import enum
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

# --- #1 Webhooks ---


class WebhookSubscription(Base):
    __tablename__ = "webhook_subscription"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    secret: Mapped[str] = mapped_column(String(64), nullable=False)
    event_types: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    last_status: Mapped[int | None] = mapped_column(Integer)
    last_delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class WebhookDelivery(Base):
    __tablename__ = "webhook_delivery"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    subscription_id: Mapped[int] = mapped_column(
        ForeignKey("webhook_subscription.id", ondelete="CASCADE"), index=True, nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    status_code: Mapped[int | None] = mapped_column(Integer)
    error: Mapped[str | None] = mapped_column(Text)
    delivered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False, index=True
    )


# --- #2 Grants browser ---


class GrantOpportunity(Base):
    """Open grant opportunities — federal (GrantConnect), state, council."""
    __tablename__ = "grant_opportunity"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int | None] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True
    )  # null = federal/state, shown to all councils
    source: Mapped[str] = mapped_column(String(32), nullable=False)  # federal|state_nsw|council
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    min_amount_cents: Mapped[int | None] = mapped_column(Integer)
    max_amount_cents: Mapped[int | None] = mapped_column(Integer)
    opens_at: Mapped[date | None] = mapped_column(Date)
    closes_at: Mapped[date | None] = mapped_column(Date, index=True)
    url: Mapped[str | None] = mapped_column(String(500))
    eligibility: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[list[str] | None] = mapped_column(JSON)


# --- #3 Asset register ---


class AssetKind(enum.StrEnum):
    playground = "playground"
    streetlight = "streetlight"
    sign = "sign"
    bbq = "bbq"
    bin = "bin"
    bench = "bench"
    drinking_fountain = "drinking_fountain"
    sportsfield = "sportsfield"
    tree = "tree"
    other = "other"


class Asset(Base):
    __tablename__ = "asset"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    qr_payload: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    address_text: Mapped[str | None] = mapped_column(String(300))
    status: Mapped[str] = mapped_column(String(16), default="active", nullable=False, index=True)
    last_inspected_at: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


# --- #4 Road closures / works ---


class RoadClosure(Base):
    __tablename__ = "road_closure"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    lat_from: Mapped[float] = mapped_column(Float, nullable=False)
    lng_from: Mapped[float] = mapped_column(Float, nullable=False)
    lat_to: Mapped[float | None] = mapped_column(Float)
    lng_to: Mapped[float | None] = mapped_column(Float)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(16), default="planned", nullable=False)  # planned|works|closure|emergency
    detour: Mapped[str | None] = mapped_column(Text)


# --- #5 Identity verification ---


class IdentityVerification(Base):
    __tablename__ = "identity_verification"
    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_identity_provider"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    provider: Mapped[str] = mapped_column(String(32), nullable=False)  # service_nsw|auspost_digital_id|local
    status: Mapped[str] = mapped_column(String(16), default="verified", nullable=False)
    verified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    raw_claims: Mapped[dict[str, Any] | None] = mapped_column(JSON)


# --- #6 + #7 Accessibility + language preferences ---


class UserPreference(Base):
    __tablename__ = "user_preference"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    language: Mapped[str] = mapped_column(String(8), default="en", nullable=False)
    high_contrast: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    dyslexia_font: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    larger_text: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reduced_motion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC), nullable=False,
    )


# --- #8 Council-managed land hire ---


class LandHireResource(Base):
    __tablename__ = "land_hire_resource"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)  # campsite|field|hall|kiosk|oval|bbq_area
    description: Mapped[str | None] = mapped_column(Text)
    capacity: Mapped[int | None] = mapped_column(Integer)
    fee_cents_per_unit: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    fee_unit: Mapped[str] = mapped_column(String(16), default="hour", nullable=False)  # hour|day|night
    location: Mapped[str | None] = mapped_column(String(200))
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class LandHireBooking(Base):
    __tablename__ = "land_hire_booking"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    resource_id: Mapped[int] = mapped_column(
        ForeignKey("land_hire_resource.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="confirmed", nullable=False)
    total_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    purpose: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


# --- #9 Citizen sensor readings ---


class SensorReading(Base):
    __tablename__ = "sensor_reading"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    contributor_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL")
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False, index=True)  # air_pm25|air_pm10|noise_db|water_ph|water_turbidity|temp_c
    source: Mapped[str] = mapped_column(String(64), nullable=False)  # purpleair|sensorcommunity|openaq|self
    value_num: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(16), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    taken_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)


# --- #10 Predictive analytics is a service, not a table ---
