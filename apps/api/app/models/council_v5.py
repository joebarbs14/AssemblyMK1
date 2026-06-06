"""V5 council features: childcare, EV chargers, swim sites, burn permits,
library of things, lost & found, citizen panels, meeting transcripts,
footpath audits, heritage / First Nations placenames."""
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

# --- #1 Childcare directory & waitlists ---


class ChildcareCentre(Base):
    __tablename__ = "childcare_centre"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)  # long_day|family_day|preschool|oshc|vacation
    address: Mapped[str] = mapped_column(String(300), nullable=False)
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    phone: Mapped[str | None] = mapped_column(String(32))
    website: Mapped[str | None] = mapped_column(String(255))
    age_min_months: Mapped[int] = mapped_column(Integer, default=6, nullable=False)
    age_max_months: Mapped[int] = mapped_column(Integer, default=72, nullable=False)
    daily_fee_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    vacancies: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rating: Mapped[str | None] = mapped_column(String(32))  # NQF: exceeding|meeting|working_towards
    notes: Mapped[str | None] = mapped_column(Text)


class ChildcareWaitlist(Base):
    __tablename__ = "childcare_waitlist"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    centre_id: Mapped[int] = mapped_column(
        ForeignKey("childcare_centre.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    child_first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    child_dob: Mapped[date] = mapped_column(Date, nullable=False)
    needed_from: Mapped[date] = mapped_column(Date, nullable=False)
    days_per_week: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="waiting", nullable=False)  # waiting|offered|enrolled|cancelled
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


# --- #2 EV chargers ---


class EvCharger(Base):
    __tablename__ = "ev_charger"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    operator: Mapped[str] = mapped_column(String(80), nullable=False)  # council|chargefox|evie|nrma
    plug_type: Mapped[str] = mapped_column(String(32), nullable=False)  # ccs2|chademo|type2|tesla
    kw: Mapped[float] = mapped_column(Float, nullable=False)
    address: Mapped[str] = mapped_column(String(300), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    cents_per_kwh: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    bookable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class EvBooking(Base):
    __tablename__ = "ev_booking"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    charger_id: Mapped[int] = mapped_column(
        ForeignKey("ev_charger.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="confirmed", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


# --- #3 Swim sites ---


class SwimSite(Base):
    __tablename__ = "swim_site"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)  # beach|pool|river|lake|creek
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    address: Mapped[str | None] = mapped_column(String(300))
    facilities: Mapped[list[str] | None] = mapped_column(JSON)  # toilets|kiosk|lifeguard|shower|bbq
    status: Mapped[str] = mapped_column(String(16), default="open", nullable=False)  # open|caution|closed


class SwimReading(Base):
    __tablename__ = "swim_reading"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    site_id: Mapped[int] = mapped_column(
        ForeignKey("swim_site.id", ondelete="CASCADE"), index=True, nullable=False
    )
    taken_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    water_temp_c: Mapped[float | None] = mapped_column(Float)
    enterococci_per_100ml: Mapped[int | None] = mapped_column(Integer)
    turbidity_ntu: Mapped[float | None] = mapped_column(Float)
    grade: Mapped[str] = mapped_column(String(16), nullable=False)  # good|fair|poor|closed
    note: Mapped[str | None] = mapped_column(Text)


# --- #4 Burn permits & fire bans ---


class BurnPermit(Base):
    __tablename__ = "burn_permit"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    permit_no: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    property_address: Mapped[str] = mapped_column(String(300), nullable=False)
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    burn_kind: Mapped[str] = mapped_column(String(32), nullable=False)  # pile|stubble|hazard_reduction
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="approved", nullable=False)  # approved|active|cancelled|expired
    conditions: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class FireBan(Base):
    __tablename__ = "fire_ban"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    declared_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    rating: Mapped[str] = mapped_column(String(32), nullable=False)  # moderate|high|extreme|catastrophic
    source: Mapped[str] = mapped_column(String(32), default="rfs", nullable=False)
    note: Mapped[str | None] = mapped_column(Text)


# --- #5 Library of Things ---


class LotItem(Base):
    __tablename__ = "lot_item"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(32), nullable=False, index=True)  # tool|kitchen|garden|sewing|tech|sport|craft
    description: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(String(500))
    deposit_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_loan_days: Mapped[int] = mapped_column(Integer, default=14, nullable=False)
    available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)


class LotLoan(Base):
    __tablename__ = "lot_loan"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_id: Mapped[int] = mapped_column(
        ForeignKey("lot_item.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    borrowed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    returned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(16), default="active", nullable=False)


# --- #6 Lost & found ---


class LostFoundItem(Base):
    __tablename__ = "lost_found_item"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    reporter_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL")
    )
    kind: Mapped[str] = mapped_column(String(16), nullable=False, index=True)  # pet|item
    direction: Mapped[str] = mapped_column(String(8), nullable=False, index=True)  # lost|found
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    image_r2_key: Mapped[str | None] = mapped_column(String(255))
    phash: Mapped[str | None] = mapped_column(String(32), index=True)  # perceptual hash for matching
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    contact: Mapped[str | None] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(16), default="open", nullable=False, index=True)  # open|matched|reunited|closed
    reunited_with_id: Mapped[int | None] = mapped_column(ForeignKey("lost_found_item.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False, index=True
    )


# --- #7 Citizen juries ---


class CitizenPanel(Base):
    __tablename__ = "citizen_panel"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    target_size: Mapped[int] = mapped_column(Integer, default=24, nullable=False)
    strata: Mapped[dict[str, Any] | None] = mapped_column(JSON)  # {"by_ward": true, "age_bands": [...]}
    opens_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    deliberates_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="recruiting", nullable=False)  # recruiting|selected|sitting|reported


class PanelExpression(Base):
    """Resident expression of interest — pool from which jury is drawn."""
    __tablename__ = "panel_expression"
    __table_args__ = (UniqueConstraint("panel_id", "user_id", name="uq_panel_expression"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    panel_id: Mapped[int] = mapped_column(
        ForeignKey("citizen_panel.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    selected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


# --- #9 Footpath accessibility ---


class FootpathAudit(Base):
    __tablename__ = "footpath_audit"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    reporter_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL")
    )
    lat: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    lng: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    issue: Mapped[str] = mapped_column(String(32), nullable=False)  # cracked|raised|missing|narrow|no_kerb_ramp|obstructed
    grade: Mapped[str] = mapped_column(String(16), nullable=False)  # good|fair|poor|impassable
    notes: Mapped[str | None] = mapped_column(Text)
    image_r2_key: Mapped[str | None] = mapped_column(String(255))
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False, index=True
    )


# --- #10 Heritage / First Nations ---


class HeritageSite(Base):
    __tablename__ = "heritage_site"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    traditional_name: Mapped[str | None] = mapped_column(String(200))  # First Nations placename
    country: Mapped[str | None] = mapped_column(String(120))  # Traditional Owner group(s)
    language_group: Mapped[str | None] = mapped_column(String(120))
    kind: Mapped[str] = mapped_column(String(32), nullable=False)  # built|natural|cultural|story_place|walking_trail
    significance: Mapped[str] = mapped_column(Text, nullable=False)
    address: Mapped[str | None] = mapped_column(String(300))
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    image_url: Mapped[str | None] = mapped_column(String(500))
    audio_url: Mapped[str | None] = mapped_column(String(500))  # oral history snippet
    consent_holder: Mapped[str | None] = mapped_column(String(200))  # who approved publication
    public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
