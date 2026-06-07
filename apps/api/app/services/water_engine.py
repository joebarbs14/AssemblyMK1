"""Water engine: tiered tariff calculator, sewerage charges,
trade-waste calc, leak anomaly detection, restriction resolver.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import (
    LeakAlert,
    SewerageCharge,
    SmartMeterReading,
    TradeWasteAgreement,
    TradeWasteSample,
    WaterRestriction,
    WaterTariff,
)


@dataclass(frozen=True)
class WaterBillTier:
    from_kl: int
    to_kl: int | None
    cents_per_kl: int
    kl_in_tier: float
    amount_cents: int


@dataclass(frozen=True)
class WaterBillEstimate:
    total_kl: float
    tiers: list[WaterBillTier]
    water_total_cents: int
    sewerage_fixed_cents: int
    sewerage_discharge_kl: float
    sewerage_discharge_cents: int
    grand_total_cents: int


def fiscal_year_for(d: date | None = None) -> int:
    d = d or date.today()
    return d.year if d.month >= 7 else d.year - 1


def calc_water_bill(
    db: Session, *, council_id: int, fiscal_year: int, customer_type: str,
    consumed_kl: float,
) -> WaterBillEstimate:
    """Apply tiered tariff to consumed volume and add sewerage."""
    rows = (
        db.query(WaterTariff)
        .filter(WaterTariff.council_id == council_id,
                WaterTariff.fiscal_year == fiscal_year,
                WaterTariff.customer_type == customer_type)
        .order_by(WaterTariff.tier_from_kl)
        .all()
    )
    tiers: list[WaterBillTier] = []
    water_total = 0
    remaining = consumed_kl
    for t in rows:
        if remaining <= 0:
            break
        tier_cap = (t.tier_to_kl - t.tier_from_kl) if t.tier_to_kl is not None else remaining
        kl = min(remaining, tier_cap)
        amount = int(round(kl * t.cents_per_kl))
        tiers.append(WaterBillTier(
            from_kl=t.tier_from_kl, to_kl=t.tier_to_kl,
            cents_per_kl=t.cents_per_kl, kl_in_tier=kl, amount_cents=amount,
        ))
        water_total += amount
        remaining -= kl

    sewer = (
        db.query(SewerageCharge)
        .filter(SewerageCharge.council_id == council_id,
                SewerageCharge.fiscal_year == fiscal_year,
                SewerageCharge.applies_to_customer_type == customer_type)
        .first()
    )
    sewer_fixed = 0
    discharge_kl = 0.0
    sewer_discharge = 0
    if sewer is not None:
        sewer_fixed = sewer.fixed_amount_cents
        discharge_kl = consumed_kl * (sewer.discharge_factor_pct / 100)
        if sewer.per_kl_above_threshold_cents > 0 and discharge_kl > sewer.threshold_kl:
            sewer_discharge = int(round(
                (discharge_kl - sewer.threshold_kl) * sewer.per_kl_above_threshold_cents
            ))

    return WaterBillEstimate(
        total_kl=consumed_kl, tiers=tiers, water_total_cents=water_total,
        sewerage_fixed_cents=sewer_fixed, sewerage_discharge_kl=discharge_kl,
        sewerage_discharge_cents=sewer_discharge,
        grand_total_cents=water_total + sewer_fixed + sewer_discharge,
    )


@dataclass(frozen=True)
class TradeWasteCalc:
    bod_kg: float
    ss_kg: float
    fog_kg: float
    bod_cents: int
    ss_cents: int
    fog_cents: int
    admin_cents: int
    total_cents: int


def calc_trade_waste(
    agreement: TradeWasteAgreement, samples: list[TradeWasteSample],
) -> TradeWasteCalc:
    """Sum loads across samples × rates. Each sample contributes
    (mg/L × kL × 1e-3) kg of pollutant."""
    bod_kg = ss_kg = fog_kg = 0.0
    for s in samples:
        bod_kg += s.bod_mg_per_l * s.discharge_kl / 1000.0
        ss_kg += s.ss_mg_per_l * s.discharge_kl / 1000.0
        fog_kg += s.fog_mg_per_l * s.discharge_kl / 1000.0
    bod_c = int(round(bod_kg * agreement.bod_cents_per_kg))
    ss_c = int(round(ss_kg * agreement.ss_cents_per_kg))
    fog_c = int(round(fog_kg * agreement.fog_cents_per_kg))
    admin = agreement.annual_admin_cents
    return TradeWasteCalc(
        bod_kg=bod_kg, ss_kg=ss_kg, fog_kg=fog_kg,
        bod_cents=bod_c, ss_cents=ss_c, fog_cents=fog_c,
        admin_cents=admin, total_cents=bod_c + ss_c + fog_c + admin,
    )


def detect_leaks(
    db: Session, *, council_id: int, baseline_hours: int = 168,
    spike_multiplier: float = 2.5, sustained_hours: int = 24,
) -> list[LeakAlert]:
    """Scan recent smart-meter readings for a property whose flow_lph
    sustained > spike_multiplier × baseline for sustained_hours.

    Returns newly-created LeakAlert rows; does NOT commit.
    """
    from app.models import Property  # noqa: PLC0415
    now = datetime.now(UTC)
    baseline_start = now - timedelta(hours=baseline_hours)
    sustained_start = now - timedelta(hours=sustained_hours)
    pids = [
        p.id for p in
        db.query(Property).filter(Property.council_id == council_id).all()
    ]
    out: list[LeakAlert] = []
    for pid in pids:
        rows = (
            db.query(SmartMeterReading)
            .filter(SmartMeterReading.property_id == pid,
                    SmartMeterReading.taken_at >= baseline_start,
                    SmartMeterReading.flow_lph.isnot(None))
            .all()
        )
        if len(rows) < 12:
            continue
        baseline_flows = [r.flow_lph for r in rows
                          if r.taken_at < sustained_start and r.flow_lph is not None]
        recent_flows = [r.flow_lph for r in rows
                        if r.taken_at >= sustained_start and r.flow_lph is not None]
        if not baseline_flows or len(recent_flows) < 6:
            continue
        baseline = sum(baseline_flows) / len(baseline_flows)
        avg_recent = sum(recent_flows) / len(recent_flows)
        if baseline <= 0:
            continue
        if avg_recent / baseline < spike_multiplier:
            continue
        # Don't double-create: skip if there's an unresolved alert in the last 24h.
        recent_alert = (
            db.query(LeakAlert)
            .filter(LeakAlert.property_id == pid,
                    LeakAlert.detected_at >= sustained_start,
                    LeakAlert.severity != "resolved")
            .first()
        )
        if recent_alert is not None:
            continue
        alert = LeakAlert(
            property_id=pid, flow_lph=avg_recent, baseline_lph=baseline,
            severity="suspected",
            notes=f"Sustained {avg_recent:.0f} L/h vs baseline {baseline:.0f} L/h "
                  f"over {sustained_hours}h.",
        )
        db.add(alert)
        out.append(alert)
    return out


def current_restriction(
    db: Session, *, council_id: int,
) -> WaterRestriction | None:
    now = datetime.now(UTC)
    return (
        db.query(WaterRestriction)
        .filter(WaterRestriction.council_id == council_id,
                WaterRestriction.starts_at <= now,
                or_(WaterRestriction.ends_at.is_(None),
                    WaterRestriction.ends_at >= now))
        .order_by(WaterRestriction.starts_at.desc())
        .first()
    )


__all__ = [
    "TradeWasteCalc",
    "WaterBillEstimate",
    "WaterBillTier",
    "calc_trade_waste",
    "calc_water_bill",
    "current_restriction",
    "detect_leaks",
    "fiscal_year_for",
]
# Quiet "Any imported but unused"
_ = Any
