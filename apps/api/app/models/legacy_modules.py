"""v1.x legacy module ports: animals, development applications,
water consumption, waste schedules, and M3.5 appointments + signatures.

Kept thin on purpose — full CRUD/business logic lands per-module as use
cases come in. The point of M9-M12 is to take the dashboard from "Soon"
tiles to live data; each module is one read endpoint deep.
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
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

# --- M9 Animals (adoptions) ---


class Animal(Base):
    __tablename__ = "animal"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    species: Mapped[str] = mapped_column(String(32), nullable=False)  # dog|cat|other
    breed: Mapped[str | None] = mapped_column(String(120))
    sex: Mapped[str | None] = mapped_column(String(16))
    age_years: Mapped[float | None] = mapped_column()
    temperament: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(16), default="available", nullable=False)  # available|adopted|hold
    main_photo_r2_key: Mapped[str | None] = mapped_column(String(500))
    gallery: Mapped[list[str] | None] = mapped_column(JSON)
    description: Mapped[str | None] = mapped_column(Text)
    listed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False, index=True
    )


# --- M10 Development applications ---


class DAStatus(enum.StrEnum):
    submitted = "submitted"
    under_review = "under_review"
    on_exhibition = "on_exhibition"
    approved = "approved"
    rejected = "rejected"
    withdrawn = "withdrawn"


class DevelopmentApplication(Base):
    __tablename__ = "development_application"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    applicant_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL"), index=True
    )
    property_id: Mapped[int | None] = mapped_column(
        ForeignKey("property.id", ondelete="SET NULL"), index=True
    )

    da_number: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    application_type: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    estimated_cost_cents: Mapped[int | None] = mapped_column(Integer)

    status: Mapped[str] = mapped_column(String(20), default=DAStatus.submitted.value, nullable=False, index=True)
    submission_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    decision_date: Mapped[date | None] = mapped_column(Date)
    exhibition_ends_at: Mapped[date | None] = mapped_column(Date)

    documents: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON)
    public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


# --- M11 Water consumption ---


class WaterConsumption(Base):
    __tablename__ = "water_consumption"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    property_id: Mapped[int] = mapped_column(
        ForeignKey("property.id", ondelete="CASCADE"), index=True, nullable=False
    )
    quarter_start: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    quarter_end: Mapped[date] = mapped_column(Date, nullable=False)
    consumed_litres: Mapped[int] = mapped_column(Integer, nullable=False)
    allocated_litres: Mapped[int | None] = mapped_column(Integer)
    amount_owing_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    bill_due_date: Mapped[date | None] = mapped_column(Date)


# --- M12 Waste collection (per-council schedule) ---


class WasteCollection(Base):
    __tablename__ = "waste_collection"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(64), nullable=False)  # "Tuesday route", etc.
    collection_type: Mapped[str] = mapped_column(String(32), nullable=False)  # general|recycling|green|hard
    collection_day: Mapped[str] = mapped_column(String(16), nullable=False)  # Mon..Sun
    frequency: Mapped[str] = mapped_column(String(16), default="weekly", nullable=False)  # weekly|fortnightly|monthly
    next_collection: Mapped[date | None] = mapped_column(Date)
    route_geojson: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    notes: Mapped[str | None] = mapped_column(Text)


# --- M3.5 Appointments + signatures ---


class AppointmentStatus(enum.StrEnum):
    proposed = "proposed"
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"


class ReportAppointment(Base):
    __tablename__ = "report_appointment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    report_id: Mapped[int] = mapped_column(
        ForeignKey("report.id", ondelete="CASCADE"), index=True, nullable=False
    )
    proposed_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="RESTRICT"), nullable=False
    )
    slot_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    slot_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    location_text: Mapped[str | None] = mapped_column(String(300))
    status: Mapped[str] = mapped_column(
        String(16), default=AppointmentStatus.proposed.value, nullable=False
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class ReportSignature(Base):
    __tablename__ = "report_signature"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    report_id: Mapped[int] = mapped_column(
        ForeignKey("report.id", ondelete="CASCADE"), index=True, nullable=False
    )
    signer_user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="RESTRICT"), nullable=False
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False)  # resident_acknowledge|staff_completion
    signed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    attachment_id: Mapped[int | None] = mapped_column(
        ForeignKey("report_attachment.id", ondelete="SET NULL")
    )
    ip_address: Mapped[str | None] = mapped_column(String(64))
    user_agent: Mapped[str | None] = mapped_column(String(255))


# --- M9.x: Adoption applications ---


class AdoptionStatus(enum.StrEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    withdrawn = "withdrawn"


class AdoptionApplication(Base):
    __tablename__ = "adoption_application"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    animal_id: Mapped[int] = mapped_column(
        ForeignKey("animal.id", ondelete="CASCADE"), index=True, nullable=False
    )
    applicant_user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    phone: Mapped[str | None] = mapped_column(String(32))
    has_other_pets: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    home_type: Mapped[str | None] = mapped_column(String(32))  # house|apartment|other
    why_this_animal: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(16), default=AdoptionStatus.pending.value, nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
