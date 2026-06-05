"""Council ops features: hardship/concession applications, pet registration,
permits, cemetery records, budget transparency, local businesses,
community donations, grant drafts, volunteer hours (derived).

Covers TechnologyOne / Authority / Pathway modules — see
COUNCIL_CRM_COVERAGE.md for the mapping.
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

# --- Hardship / concession applications ---


class ConcessionApplicationStatus(enum.StrEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    info_required = "info_required"


class ConcessionApplication(Base):
    __tablename__ = "concession_application"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    applicant_user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    property_id: Mapped[int | None] = mapped_column(
        ForeignKey("property.id", ondelete="SET NULL"), index=True
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False)  # pensioner|hardship|disability|veteran|other
    pensioner_concession_card: Mapped[str | None] = mapped_column(String(40))
    annual_income_aud: Mapped[int | None] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    requested_relief: Mapped[str | None] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(
        String(16), default=ConcessionApplicationStatus.pending.value, nullable=False, index=True
    )
    staff_notes: Mapped[str | None] = mapped_column(Text)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


# --- Pet registration ---


class PetSpecies(enum.StrEnum):
    dog = "dog"
    cat = "cat"
    other = "other"


class PetRegistration(Base):
    __tablename__ = "pet_registration"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    owner_user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    species: Mapped[str] = mapped_column(String(16), nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    breed: Mapped[str | None] = mapped_column(String(120))
    colour: Mapped[str | None] = mapped_column(String(80))
    sex: Mapped[str | None] = mapped_column(String(16))
    desexed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    microchip_id: Mapped[str | None] = mapped_column(String(32), index=True)
    registration_number: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    valid_until: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    annual_fee_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="active", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


# --- Permits (parking, visitor, beach, trade) ---


class Permit(Base):
    __tablename__ = "permit"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    property_id: Mapped[int | None] = mapped_column(
        ForeignKey("property.id", ondelete="SET NULL"), index=True
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False, index=True)  # resident_parking|visitor_parking|beach|trade_day|skip_bin
    permit_number: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    plate: Mapped[str | None] = mapped_column(String(16))
    holder_name: Mapped[str] = mapped_column(String(120), nullable=False)
    valid_from: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    valid_until: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    zone: Mapped[str | None] = mapped_column(String(32))
    fee_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    qr_payload: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="active", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


# --- Cemetery records (public search) ---


class CemeteryRecord(Base):
    __tablename__ = "cemetery_record"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    cemetery_name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    section: Mapped[str | None] = mapped_column(String(40))
    row: Mapped[str | None] = mapped_column(String(20))
    plot: Mapped[str | None] = mapped_column(String(20))
    deceased_full_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    date_of_death: Mapped[date | None] = mapped_column(Date, index=True)
    date_of_burial: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)


# --- Council budget transparency ---


class BudgetCategory(enum.StrEnum):
    roads = "roads"
    waste = "waste"
    parks = "parks"
    libraries = "libraries"
    governance = "governance"
    community = "community"
    planning = "planning"
    environment = "environment"
    water = "water"
    other = "other"


class BudgetLine(Base):
    __tablename__ = "budget_line"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    revenue_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    expense_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    prior_year_expense_cents: Mapped[int | None] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(Text)


class CapitalProject(Base):
    __tablename__ = "capital_project"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str | None] = mapped_column(String(32))
    budget_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    spent_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="planned", nullable=False)  # planned|in_progress|completed|on_hold
    progress_pct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    expected_completion: Mapped[date | None] = mapped_column(Date)


# --- Local business directory ---


class Business(Base):
    __tablename__ = "business"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False, index=True)  # plumber|electrician|cafe|retail|...
    description: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(String(32))
    email: Mapped[str | None] = mapped_column(String(120))
    website: Mapped[str | None] = mapped_column(String(255))
    address: Mapped[str | None] = mapped_column(String(300))
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    abn: Mapped[str | None] = mapped_column(String(20))
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    listed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


# --- Community donation campaigns ---


class DonationCampaign(Base):
    __tablename__ = "donation_campaign"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    blurb: Mapped[str] = mapped_column(Text, nullable=False)
    target_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    raised_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    image_r2_key: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(16), default="active", nullable=False, index=True)  # active|funded|closed
    closes_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class Donation(Base):
    __tablename__ = "donation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    campaign_id: Mapped[int] = mapped_column(
        ForeignKey("donation_campaign.id", ondelete="CASCADE"), index=True, nullable=False
    )
    donor_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL"), index=True
    )
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    provider: Mapped[str] = mapped_column(String(16), default="paypal", nullable=False)
    provider_ref: Mapped[str | None] = mapped_column(String(120))
    anonymous: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False, index=True
    )


# --- AI grant-writing drafts ---


class GrantDraft(Base):
    __tablename__ = "grant_draft"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    grant_name: Mapped[str | None] = mapped_column(String(200))
    project_summary: Mapped[str] = mapped_column(Text, nullable=False)
    requested_amount_cents: Mapped[int | None] = mapped_column(Integer)
    draft_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    provider: Mapped[str] = mapped_column(String(16), default="local-template", nullable=False)
    raw_response: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )


# --- Verified resident link (Service NSW / address verification) ---
# Future extension: link verifiable credentials. Out of scope here.


__table_args_unique__ = (
    UniqueConstraint("council_id", "fiscal_year", "label", name="uq_budget_line_year_label"),
)
