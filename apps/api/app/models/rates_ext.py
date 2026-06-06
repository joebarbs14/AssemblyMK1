"""Rates extension models for the v9 rates pass.

Covers: quarterly instalments, interest on overdue, sect.603 certificates,
hardship payment plans, pensioner-concession reconciliation, valuation
objections, mixed-use apportionment, stormwater/DWM levies. Ward-based
sub-categorisation is on RateCategory via the ward_id column.
"""
from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import (
    JSON,
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


class RateLevy(Base):
    """Non-ad-valorem rate component struck per FY.

    Covers stormwater management charge (sect.496A), domestic waste
    management (sect.496) and any council-set special-rate flat amount.
    """
    __tablename__ = "rate_levy"
    __table_args__ = (UniqueConstraint("council_id", "fiscal_year", "code",
                                       name="uq_rate_levy"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    # stormwater|dwm|special_rate|environmental_levy|...
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)  # fixed|per_bin|per_sqm
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    applies_to_property_type: Mapped[str | None] = mapped_column(String(64))
    notes: Mapped[str | None] = mapped_column(Text)


class RateInstalment(Base):
    """One quarterly instalment for an account in a fiscal year.

    NSW LGA Act sect.562 default due dates: 31 Aug, 30 Nov, 28 Feb, 31 May.
    """
    __tablename__ = "rate_instalment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("rates_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    period_label: Mapped[str] = mapped_column(String(8), nullable=False)  # Q1..Q4
    due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    paid_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="pending", nullable=False, index=True)
    # pending|paid|overdue|written_off
    reminder_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class InterestCharge(Base):
    """Daily-accrual interest on an overdue balance.

    Computed by the lifecycle worker; staff can waive any single row.
    """
    __tablename__ = "interest_charge"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("rates_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    accrued_from: Mapped[date] = mapped_column(Date, nullable=False)
    accrued_to: Mapped[date] = mapped_column(Date, nullable=False)
    days: Mapped[int] = mapped_column(Integer, nullable=False)
    rate_pct_pa: Mapped[float] = mapped_column(Float, nullable=False)
    principal_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    waived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    waived_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL")
    )
    waiver_reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class RatesCertificate(Base):
    """Section 603 / 735A certificate for property settlements."""
    __tablename__ = "rates_certificate"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    property_id: Mapped[int] = mapped_column(
        ForeignKey("property.id", ondelete="CASCADE"), index=True, nullable=False
    )
    requested_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL")
    )
    reference: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    requester_name: Mapped[str | None] = mapped_column(String(200))
    requester_email: Mapped[str | None] = mapped_column(String(200))
    fee_cents: Mapped[int] = mapped_column(Integer, default=9500, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="requested", nullable=False, index=True)
    # requested|paid|issued|cancelled
    issued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    valid_until: Mapped[date | None] = mapped_column(Date)
    snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False, index=True
    )


class HardshipPlan(Base):
    """Sect.564 instalment arrangement when a ratepayer can't pay on time."""
    __tablename__ = "hardship_plan"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("rates_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    requested_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL")
    )
    term_months: Mapped[int] = mapped_column(Integer, nullable=False)
    monthly_amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    starts_on: Mapped[date] = mapped_column(Date, nullable=False)
    ends_on: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="requested", nullable=False, index=True)
    # requested|active|completed|defaulted|cancelled
    paid_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class ConcessionClaim(Base):
    """Half-yearly batch for state pensioner-rebate subsidy reconciliation."""
    __tablename__ = "concession_claim"
    __table_args__ = (UniqueConstraint("council_id", "period_year", "period_half",
                                       name="uq_concession_claim"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period_half: Mapped[int] = mapped_column(Integer, nullable=False)  # 1 or 2
    pensioner_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_concession_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    state_subsidy_pct: Mapped[float] = mapped_column(Float, default=55.0, nullable=False)
    state_subsidy_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reference: Mapped[str | None] = mapped_column(String(40))
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(16), default="draft", nullable=False)
    # draft|submitted|paid


class ValuationObjection(Base):
    """Resident objection to the Valuer General UV."""
    __tablename__ = "valuation_objection"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    property_id: Mapped[int] = mapped_column(
        ForeignKey("property.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    current_uv_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    proposed_uv_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    grounds: Mapped[str] = mapped_column(Text, nullable=False)
    supporting_url: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(16), default="lodged", nullable=False, index=True)
    # lodged|review|upheld|dismissed|withdrawn
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decision_note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False, index=True
    )


class PropertyRateAssignment(Base):
    """Mixed-use apportionment: e.g. 70% residential + 30% business."""
    __tablename__ = "property_rate_assignment"
    __table_args__ = (UniqueConstraint("property_id", "fiscal_year", "category_id",
                                       name="uq_property_rate_assignment"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    property_id: Mapped[int] = mapped_column(
        ForeignKey("property.id", ondelete="CASCADE"), index=True, nullable=False
    )
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("rate_category.id", ondelete="CASCADE"), index=True, nullable=False
    )
    percentage: Mapped[float] = mapped_column(Float, nullable=False)  # 0-100
