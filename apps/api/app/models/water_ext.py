"""Water-extension models: allocation, tariffs, sewerage, trade waste,
smart meters, self-read, restrictions, quality samples, source levels,
rebates, leak alerts.

NSW-shaped: ML allocations + seasonal carryover (Murrumbidgee
Irrigation), tiered per-kL tariffs per FY, sect.501 sewerage access
plus discharge factor, trade-waste BOD/SS/FOG schedules, Level 1-5
restrictions with ADWG-aligned quality samples.
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

# --- #1 Allocation ---


class WaterAllocation(Base):
    __tablename__ = "water_allocation"
    __table_args__ = (UniqueConstraint("property_id", "season_year",
                                       name="uq_water_allocation"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    property_id: Mapped[int] = mapped_column(
        ForeignKey("property.id", ondelete="CASCADE"), index=True, nullable=False
    )
    season_year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    entitlement_ml: Mapped[float] = mapped_column(Float, nullable=False)  # megalitres
    allocation_pct: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    carryover_kl: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    opening_balance_kl: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    used_kl: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)


# --- #2 Tariffs ---


class WaterTariff(Base):
    """Tiered per-kL tariff for a fiscal year / customer type.

    Rows for the same (fy, customer_type) must form a contiguous step
    schedule; the calculator orders by tier_from_kl.
    """
    __tablename__ = "water_tariff"
    __table_args__ = (UniqueConstraint("council_id", "fiscal_year", "customer_type",
                                       "tier_from_kl", name="uq_water_tariff"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    customer_type: Mapped[str] = mapped_column(String(16), nullable=False)
    # residential|commercial|rural
    tier_from_kl: Mapped[int] = mapped_column(Integer, nullable=False)
    tier_to_kl: Mapped[int | None] = mapped_column(Integer)  # null = no cap
    cents_per_kl: Mapped[int] = mapped_column(Integer, nullable=False)
    label: Mapped[str | None] = mapped_column(String(120))


# --- #3 Sewerage ---


class SewerageCharge(Base):
    __tablename__ = "sewerage_charge"
    __table_args__ = (UniqueConstraint("council_id", "fiscal_year",
                                       "applies_to_customer_type",
                                       name="uq_sewerage_charge"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    applies_to_customer_type: Mapped[str] = mapped_column(String(16), nullable=False)
    fixed_amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    discharge_factor_pct: Mapped[float] = mapped_column(Float, default=95.0, nullable=False)
    per_kl_above_threshold_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    threshold_kl: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)


# --- #4 Trade waste ---


class TradeWasteAgreement(Base):
    __tablename__ = "trade_waste_agreement"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    property_id: Mapped[int] = mapped_column(
        ForeignKey("property.id", ondelete="CASCADE"), index=True, nullable=False
    )
    business_name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(16), nullable=False)
    # cat1|cat2|cat3 — low/medium/high strength
    pretreatment_device: Mapped[str | None] = mapped_column(String(120))  # grease arrestor, etc
    reference: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    valid_from: Mapped[date] = mapped_column(Date, nullable=False)
    valid_until: Mapped[date | None] = mapped_column(Date)
    bod_cents_per_kg: Mapped[int] = mapped_column(Integer, default=210, nullable=False)
    ss_cents_per_kg: Mapped[int] = mapped_column(Integer, default=120, nullable=False)
    fog_cents_per_kg: Mapped[int] = mapped_column(Integer, default=330, nullable=False)
    annual_admin_cents: Mapped[int] = mapped_column(Integer, default=42000, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="active", nullable=False)


class TradeWasteSample(Base):
    __tablename__ = "trade_waste_sample"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    agreement_id: Mapped[int] = mapped_column(
        ForeignKey("trade_waste_agreement.id", ondelete="CASCADE"), index=True, nullable=False
    )
    sampled_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    bod_mg_per_l: Mapped[float] = mapped_column(Float, nullable=False)
    ss_mg_per_l: Mapped[float] = mapped_column(Float, nullable=False)
    fog_mg_per_l: Mapped[float] = mapped_column(Float, nullable=False)
    discharge_kl: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)


# --- #5 Smart meter + leak alerts ---


class SmartMeterReading(Base):
    __tablename__ = "smart_meter_reading"
    __table_args__ = (UniqueConstraint("property_id", "taken_at",
                                       name="uq_smart_meter_reading"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    property_id: Mapped[int] = mapped_column(
        ForeignKey("property.id", ondelete="CASCADE"), index=True, nullable=False
    )
    taken_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    cumulative_kl: Mapped[float] = mapped_column(Float, nullable=False)
    flow_lph: Mapped[float | None] = mapped_column(Float)
    source: Mapped[str] = mapped_column(String(32), default="lorawan", nullable=False)


class LeakAlert(Base):
    __tablename__ = "leak_alert"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    property_id: Mapped[int] = mapped_column(
        ForeignKey("property.id", ondelete="CASCADE"), index=True, nullable=False
    )
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False, index=True
    )
    flow_lph: Mapped[float] = mapped_column(Float, nullable=False)
    baseline_lph: Mapped[float] = mapped_column(Float, nullable=False)
    severity: Mapped[str] = mapped_column(String(16), default="suspected", nullable=False)
    # suspected|confirmed|resolved|false_positive
    notes: Mapped[str | None] = mapped_column(Text)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


# --- #6 Self reads ---


class SelfMeterRead(Base):
    __tablename__ = "self_meter_read"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    property_id: Mapped[int] = mapped_column(
        ForeignKey("property.id", ondelete="CASCADE"), index=True, nullable=False
    )
    submitted_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False
    )
    read_on: Mapped[date] = mapped_column(Date, nullable=False)
    value_kl: Mapped[float] = mapped_column(Float, nullable=False)
    photo_r2_key: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(16), default="pending", nullable=False, index=True)
    # pending|accepted|disputed
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


# --- #7 Restrictions ---


class WaterRestriction(Base):
    """One row per council per active period. The latest row with
    ends_at >= now is the in-force level."""
    __tablename__ = "water_restriction"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    level: Mapped[int] = mapped_column(Integer, nullable=False)  # 0..5
    summary: Mapped[str] = mapped_column(String(200), nullable=False)
    rules: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    affected_wards: Mapped[list[str] | None] = mapped_column(JSON)


# --- #8 Quality samples ---


class WaterQualitySample(Base):
    __tablename__ = "water_quality_sample"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    sample_point: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    taken_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    chlorine_mg_per_l: Mapped[float | None] = mapped_column(Float)
    ph: Mapped[float | None] = mapped_column(Float)
    turbidity_ntu: Mapped[float | None] = mapped_column(Float)
    fluoride_mg_per_l: Mapped[float | None] = mapped_column(Float)
    e_coli_per_100ml: Mapped[int | None] = mapped_column(Integer)
    compliance: Mapped[str] = mapped_column(String(16), default="pass", nullable=False)
    # pass|borderline|fail
    note: Mapped[str | None] = mapped_column(Text)


# --- #9 Water sources ---


class WaterSource(Base):
    __tablename__ = "water_source"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)  # dam|weir|bore|reservoir|river
    capacity_ml: Mapped[float] = mapped_column(Float, nullable=False)
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)


class WaterSourceReading(Base):
    __tablename__ = "water_source_reading"
    __table_args__ = (UniqueConstraint("source_id", "reading_date",
                                       name="uq_water_source_reading"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_id: Mapped[int] = mapped_column(
        ForeignKey("water_source.id", ondelete="CASCADE"), index=True, nullable=False
    )
    reading_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    capacity_pct: Mapped[float] = mapped_column(Float, nullable=False)
    inflow_ml: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    withdrawal_ml: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)


# --- #10 Rebates ---


class WaterRebateScheme(Base):
    __tablename__ = "water_rebate_scheme"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    council_id: Mapped[int] = mapped_column(
        ForeignKey("council.id", ondelete="CASCADE"), index=True, nullable=False
    )
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    # rainwater_tank|low_flow_shower|dual_flush|drip_irrigation|washing_machine
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    max_amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    annual_cap_per_household_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    eligibility: Mapped[str | None] = mapped_column(Text)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)


class WaterRebateClaim(Base):
    __tablename__ = "water_rebate_claim"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    scheme_id: Mapped[int] = mapped_column(
        ForeignKey("water_rebate_scheme.id", ondelete="CASCADE"), index=True, nullable=False
    )
    property_id: Mapped[int] = mapped_column(
        ForeignKey("property.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    invoice_amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    claim_amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    receipt_url: Mapped[str | None] = mapped_column(String(500))
    notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default="lodged", nullable=False, index=True)
    # lodged|approved|paid|rejected
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decision_note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False, index=True
    )


__all__ = [
    "LeakAlert",
    "SelfMeterRead",
    "SewerageCharge",
    "SmartMeterReading",
    "TradeWasteAgreement",
    "TradeWasteSample",
    "WaterAllocation",
    "WaterQualitySample",
    "WaterRebateClaim",
    "WaterRebateScheme",
    "WaterRestriction",
    "WaterSource",
    "WaterSourceReading",
    "WaterTariff",
]
# Ensure SqlAlchemy sees Any (kept for future JSON payloads)
_ = Any
