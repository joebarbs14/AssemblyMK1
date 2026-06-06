"""V4 council features: disaster dashboard, open data, participatory
budgeting, volunteer matching, tree register, food premises, rangers
dispatch, fleet management, library integration, tourism.

FOSS-first. Mock providers default; real integrations behind env vars.
"""
from __future__ import annotations

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

# --- #1 Disaster dashboard ---


class DisasterAlert(Base):
    __tablename__ = "disaster_alert"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False, index=True)  # bushfire|flood|storm|heatwave|cyclone
    severity: Mapped[str] = mapped_column(String(16), nullable=False)  # advice|watch|emergency
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(64), nullable=False)  # rfs|ses|bom|council
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    affected_wards: Mapped[list[str] | None] = mapped_column(JSON)


class EvacCentre(Base):
    __tablename__ = "evac_centre"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str] = mapped_column(String(300), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    capacity: Mapped[int | None] = mapped_column(Integer)
    facilities: Mapped[list[str] | None] = mapped_column(JSON)  # pets|kitchen|shower|wheelchair|generator
    status: Mapped[str] = mapped_column(String(16), default="standby", nullable=False, index=True)  # standby|open|full|closed


class SandbagDepot(Base):
    __tablename__ = "sandbag_depot"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str] = mapped_column(String(300), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    bags_available: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    self_serve: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    hours: Mapped[str | None] = mapped_column(String(120))


# --- #3 Participatory budgeting ---


class PbRound(Base):
    __tablename__ = "pb_round"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    pool_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    tokens_per_voter: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    opens_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    closes_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(16), default="open", nullable=False)  # draft|open|closed|awarded


class PbProject(Base):
    __tablename__ = "pb_project"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    round_id: Mapped[int] = mapped_column(
        ForeignKey("pb_round.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    requested_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    ward_id: Mapped[int | None] = mapped_column(ForeignKey("ward.id", ondelete="SET NULL"))
    image_url: Mapped[str | None] = mapped_column(String(500))


class PbVote(Base):
    __tablename__ = "pb_vote"
    __table_args__ = (UniqueConstraint("user_id", "project_id", name="uq_pb_vote"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    project_id: Mapped[int] = mapped_column(
        ForeignKey("pb_project.id", ondelete="CASCADE"), index=True, nullable=False
    )
    tokens: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


# --- #4 Volunteer matching ---


class VolunteerOpportunity(Base):
    __tablename__ = "volunteer_opportunity"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    skills_needed: Mapped[list[str]] = mapped_column(JSON, nullable=False)  # tags: first_aid|electrician|rfs|drone|cooking
    location: Mapped[str | None] = mapped_column(String(200))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    capacity: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(16), default="open", nullable=False)  # open|full|cancelled|done


class VolunteerProfile(Base):
    """User-tagged skill register."""
    __tablename__ = "volunteer_profile"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    skills: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    hours_total: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC), nullable=False,
    )


class VolunteerSignup(Base):
    __tablename__ = "volunteer_signup"
    __table_args__ = (UniqueConstraint("user_id", "opportunity_id", name="uq_vol_signup"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    opportunity_id: Mapped[int] = mapped_column(
        ForeignKey("volunteer_opportunity.id", ondelete="CASCADE"), index=True, nullable=False
    )
    status: Mapped[str] = mapped_column(String(16), default="confirmed", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


# --- #5 Tree & canopy register ---


class Tree(Base):
    __tablename__ = "tree"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    species_common: Mapped[str] = mapped_column(String(120), nullable=False)
    species_botanical: Mapped[str | None] = mapped_column(String(160))
    qr_payload: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    planted_on: Mapped[date | None] = mapped_column(Date)
    last_pruned_on: Mapped[date | None] = mapped_column(Date)
    canopy_m: Mapped[float | None] = mapped_column(Float)
    height_m: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(16), default="healthy", nullable=False, index=True)  # healthy|stressed|dead|removed


class TreeAdoption(Base):
    __tablename__ = "tree_adoption"
    __table_args__ = (UniqueConstraint("user_id", "tree_id", name="uq_tree_adoption"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    tree_id: Mapped[int] = mapped_column(
        ForeignKey("tree.id", ondelete="CASCADE"), index=True, nullable=False
    )
    nickname: Mapped[str | None] = mapped_column(String(120))
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


# --- #6 Food premises & health register ---


class FoodPremises(Base):
    __tablename__ = "food_premises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)  # restaurant|cafe|takeaway|mobile|grocer
    address: Mapped[str] = mapped_column(String(300), nullable=False)
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    licence_no: Mapped[str] = mapped_column(String(40), nullable=False, unique=True)
    status: Mapped[str] = mapped_column(String(16), default="active", nullable=False, index=True)


class FoodInspection(Base):
    __tablename__ = "food_inspection"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    premises_id: Mapped[int] = mapped_column(
        ForeignKey("food_premises.id", ondelete="CASCADE"), index=True, nullable=False
    )
    inspected_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    score: Mapped[int] = mapped_column(Integer, nullable=False)  # 0-100
    grade: Mapped[str] = mapped_column(String(2), nullable=False)  # A|B|C|F
    issues: Mapped[list[str] | None] = mapped_column(JSON)
    report_url: Mapped[str | None] = mapped_column(String(500))


# --- #7 Rangers dispatch + infringements ---


class RangerPatrol(Base):
    __tablename__ = "ranger_patrol"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    officer_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL"), index=True
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    route: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON)  # GPS breadcrumbs
    notes: Mapped[str | None] = mapped_column(Text)


class Infringement(Base):
    __tablename__ = "infringement"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    patrol_id: Mapped[int | None] = mapped_column(
        ForeignKey("ranger_patrol.id", ondelete="SET NULL"), index=True
    )
    officer_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL")
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False, index=True)  # parking|animal|litter|signage
    code: Mapped[str] = mapped_column(String(16), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    plate: Mapped[str | None] = mapped_column(String(16), index=True)
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    fee_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    status: Mapped[str] = mapped_column(String(16), default="issued", nullable=False)  # issued|appealed|withdrawn|paid|court
    photo_r2_key: Mapped[str | None] = mapped_column(String(255))


class InfringementAppeal(Base):
    __tablename__ = "infringement_appeal"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    infringement_id: Mapped[int] = mapped_column(
        ForeignKey("infringement.id", ondelete="CASCADE"), index=True, nullable=False
    )
    submitted_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL")
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    outcome: Mapped[str | None] = mapped_column(String(16))  # upheld|withdrawn|reduced|court
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


# --- #8 Fleet & plant management ---


class FleetVehicle(Base):
    __tablename__ = "fleet_vehicle"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    rego: Mapped[str] = mapped_column(String(16), nullable=False, unique=True)
    make: Mapped[str] = mapped_column(String(60), nullable=False)
    model: Mapped[str] = mapped_column(String(60), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)  # truck|car|tractor|mower|excavator
    fuel: Mapped[str] = mapped_column(String(16), nullable=False)  # diesel|petrol|ev|hybrid
    year: Mapped[int | None] = mapped_column(Integer)
    odometer_km: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_service_on: Mapped[date | None] = mapped_column(Date)
    next_service_due: Mapped[date | None] = mapped_column(Date, index=True)
    co2_kg_per_km: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="active", nullable=False)  # active|service|retired


class FleetServiceLog(Base):
    __tablename__ = "fleet_service_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("fleet_vehicle.id", ondelete="CASCADE"), index=True, nullable=False
    )
    serviced_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    odometer_km: Mapped[int] = mapped_column(Integer, nullable=False)
    work: Mapped[str] = mapped_column(Text, nullable=False)
    cost_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    invoice_ref: Mapped[str | None] = mapped_column(String(64))


# --- #9 Library integration ---


class LibraryItem(Base):
    __tablename__ = "library_item"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    author: Mapped[str | None] = mapped_column(String(200))
    isbn: Mapped[str | None] = mapped_column(String(20), index=True)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)  # book|dvd|audio|magazine|game
    copies_total: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    copies_available: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    cover_url: Mapped[str | None] = mapped_column(String(500))
    blurb: Mapped[str | None] = mapped_column(Text)


class LibraryHold(Base):
    __tablename__ = "library_hold"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    item_id: Mapped[int] = mapped_column(
        ForeignKey("library_item.id", ondelete="CASCADE"), index=True, nullable=False
    )
    status: Mapped[str] = mapped_column(String(16), default="queued", nullable=False)  # queued|ready|collected|expired
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    ready_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


# --- #10 Tourism / What's on ---


class TourismListing(Base):
    __tablename__ = "tourism_listing"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    kind: Mapped[str] = mapped_column(String(16), nullable=False, index=True)  # lodging|event|trail|attraction|food
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    blurb: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500))
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    address: Mapped[str | None] = mapped_column(String(300))
    url: Mapped[str | None] = mapped_column(String(500))
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    tags: Mapped[list[str] | None] = mapped_column(JSON)
