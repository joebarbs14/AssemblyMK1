"""Resident water endpoints: dashboard summary, bill estimator,
self-read submission, current restrictions, source levels, quality view,
allocation snapshot, rebate scheme browse + claim lodgement.
"""
from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import (
    Property,
    PropertyOwnership,
    SelfMeterRead,
    SmartMeterReading,
    User,
    WaterAllocation,
    WaterQualitySample,
    WaterRebateClaim,
    WaterRebateScheme,
    WaterSource,
    WaterSourceReading,
)
from app.services.notify import notify
from app.services.water_engine import (
    calc_water_bill,
    current_restriction,
    fiscal_year_for,
)

router = APIRouter(prefix="/water", tags=["water-resident"])


def _owns(db: Session, *, user: User, property_id: int) -> Property:
    p = db.get(Property, property_id)
    if p is None or p.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Property not found")
    is_owner = (
        db.query(PropertyOwnership)
        .filter(PropertyOwnership.property_id == property_id,
                PropertyOwnership.user_id == user.id)
        .first() is not None
    )
    if not is_owner:
        raise HTTPException(status_code=403, detail="Not your property")
    return p


# ============ Dashboard summary ============


@router.get("/dashboard")
def dashboard(user: User = Depends(get_current_user),
              db: Session = Depends(get_db)) -> dict[str, Any]:
    fy = fiscal_year_for()
    owned = (
        db.query(Property)
        .join(PropertyOwnership, PropertyOwnership.property_id == Property.id)
        .filter(PropertyOwnership.user_id == user.id,
                Property.council_id == user.council_id)
        .all()
    )
    properties = []
    for p in owned:
        alloc = (
            db.query(WaterAllocation)
            .filter(WaterAllocation.property_id == p.id,
                    WaterAllocation.season_year == fy)
            .first()
        )
        last_meter = (
            db.query(SmartMeterReading)
            .filter(SmartMeterReading.property_id == p.id)
            .order_by(SmartMeterReading.taken_at.desc())
            .first()
        )
        properties.append({
            "id": p.id, "address": p.address,
            "allocation": ({
                "season_year": alloc.season_year,
                "entitlement_ml": alloc.entitlement_ml,
                "allocation_pct": alloc.allocation_pct,
                "opening_kl": alloc.opening_balance_kl,
                "used_kl": alloc.used_kl,
                "remaining_kl": alloc.opening_balance_kl - alloc.used_kl,
            }) if alloc else None,
            "last_meter_kl": last_meter.cumulative_kl if last_meter else None,
            "last_meter_at": last_meter.taken_at.isoformat() if last_meter else None,
        })
    rest = current_restriction(db, council_id=user.council_id)
    sources = (
        db.query(WaterSource)
        .filter(WaterSource.council_id == user.council_id).all()
    )
    src_out = []
    for src in sources:
        last = (
            db.query(WaterSourceReading)
            .filter(WaterSourceReading.source_id == src.id)
            .order_by(WaterSourceReading.reading_date.desc()).first()
        )
        src_out.append({"id": src.id, "name": src.name, "kind": src.kind,
                        "capacity_pct": last.capacity_pct if last else None,
                        "reading_date": last.reading_date.isoformat() if last else None})
    return {
        "fiscal_year": fy,
        "properties": properties,
        "restriction": ({
            "level": rest.level, "summary": rest.summary, "rules": rest.rules,
            "starts_at": rest.starts_at.isoformat(),
            "ends_at": rest.ends_at.isoformat() if rest.ends_at else None,
        }) if rest else {"level": 0, "summary": "No restrictions", "rules": []},
        "sources": src_out,
    }


# ============ Bill estimator ============


class EstimateIn(BaseModel):
    consumed_kl: float = Field(ge=0)
    customer_type: str = Field(default="residential",
                                pattern="^(residential|commercial|rural)$")
    fiscal_year: int | None = None


@router.post("/estimate")
def estimate(body: EstimateIn, user: User = Depends(get_current_user),
             db: Session = Depends(get_db)) -> dict[str, Any]:
    fy = body.fiscal_year or fiscal_year_for()
    est = calc_water_bill(
        db, council_id=user.council_id, fiscal_year=fy,
        customer_type=body.customer_type, consumed_kl=body.consumed_kl,
    )
    return {
        "fiscal_year": fy,
        "customer_type": body.customer_type,
        "total_kl": est.total_kl,
        "tiers": [
            {"from_kl": t.from_kl, "to_kl": t.to_kl,
             "cents_per_kl": t.cents_per_kl, "kl_in_tier": t.kl_in_tier,
             "amount_cents": t.amount_cents} for t in est.tiers
        ],
        "water_total_cents": est.water_total_cents,
        "sewerage_fixed_cents": est.sewerage_fixed_cents,
        "sewerage_discharge_kl": est.sewerage_discharge_kl,
        "sewerage_discharge_cents": est.sewerage_discharge_cents,
        "grand_total_cents": est.grand_total_cents,
    }


# ============ Self-read submission ============


class SelfReadIn(BaseModel):
    read_on: date
    value_kl: float = Field(ge=0)
    photo_r2_key: str | None = None
    note: str | None = None


@router.post("/properties/{pid}/self-read", status_code=201)
def submit_self_read(pid: int, body: SelfReadIn,
                     user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)) -> dict[str, Any]:
    p = _owns(db, user=user, property_id=pid)
    s = SelfMeterRead(
        property_id=pid, submitted_by_user_id=user.id,
        read_on=body.read_on, value_kl=body.value_kl,
        photo_r2_key=body.photo_r2_key, note=body.note, status="pending",
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    notify(db, user=user, council_id=p.council_id,
           action="water.self_read_submitted",
           title="Meter read submitted",
           body=f"{body.value_kl:.2f} kL on {body.read_on.isoformat()} — "
                f"awaiting verification.",
           url="/water", target_type="self_meter_read", target_id=s.id)
    return {"id": s.id, "status": s.status}


# ============ Quality view (public-ish, same council) ============


@router.get("/quality")
def quality_summary(days: int = 30, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    cutoff = datetime.now(UTC) - timedelta(days=days)
    rows = (
        db.query(WaterQualitySample)
        .filter(WaterQualitySample.council_id == user.council_id,
                WaterQualitySample.taken_at >= cutoff)
        .order_by(WaterQualitySample.taken_at.desc())
        .limit(200).all()
    )
    return [{"id": s.id, "sample_point": s.sample_point,
             "taken_at": s.taken_at.isoformat(),
             "chlorine_mg_per_l": s.chlorine_mg_per_l, "ph": s.ph,
             "turbidity_ntu": s.turbidity_ntu,
             "fluoride_mg_per_l": s.fluoride_mg_per_l,
             "e_coli_per_100ml": s.e_coli_per_100ml,
             "compliance": s.compliance} for s in rows]


# ============ Rebates ============


@router.get("/rebates")
def list_rebate_schemes(user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    rows = (
        db.query(WaterRebateScheme)
        .filter(WaterRebateScheme.council_id == user.council_id,
                WaterRebateScheme.active.is_(True)).all()
    )
    return [{"id": r.id, "code": r.code, "label": r.label,
             "description": r.description,
             "max_amount_cents": r.max_amount_cents,
             "annual_cap_per_household_cents": r.annual_cap_per_household_cents,
             "eligibility": r.eligibility} for r in rows]


class ClaimIn(BaseModel):
    scheme_id: int
    invoice_amount_cents: int = Field(ge=0)
    receipt_url: str | None = None
    notes: str | None = None


@router.post("/properties/{pid}/rebate-claim", status_code=201)
def lodge_rebate_claim(pid: int, body: ClaimIn,
                       user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)) -> dict[str, Any]:
    p = _owns(db, user=user, property_id=pid)
    scheme = db.get(WaterRebateScheme, body.scheme_id)
    if scheme is None or scheme.council_id != p.council_id:
        raise HTTPException(status_code=404, detail="Scheme not found")
    if not scheme.active:
        raise HTTPException(status_code=400, detail="Scheme closed")
    claim_amount = min(body.invoice_amount_cents, scheme.max_amount_cents)
    # Check annual cap per household for this scheme
    paid_this_year = (
        db.query(WaterRebateClaim)
        .filter(WaterRebateClaim.property_id == pid,
                WaterRebateClaim.scheme_id == body.scheme_id,
                WaterRebateClaim.status.in_(("approved", "paid")))
        .all()
    )
    paid_sum = sum(c.claim_amount_cents for c in paid_this_year)
    if paid_sum + claim_amount > scheme.annual_cap_per_household_cents:
        claim_amount = max(0, scheme.annual_cap_per_household_cents - paid_sum)
        if claim_amount == 0:
            raise HTTPException(status_code=400,
                                detail="Annual cap reached for this scheme")
    c = WaterRebateClaim(
        scheme_id=body.scheme_id, property_id=pid, user_id=user.id,
        invoice_amount_cents=body.invoice_amount_cents,
        claim_amount_cents=claim_amount, receipt_url=body.receipt_url,
        notes=body.notes, status="lodged",
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    notify(db, user=user, council_id=p.council_id,
           action="water.rebate_lodged",
           title=f"Rebate lodged — {scheme.label}",
           body=f"Claim of ${claim_amount/100:.2f}. Awaiting review.",
           url="/water", target_type="water_rebate_claim", target_id=c.id)
    return {"id": c.id, "claim_amount_cents": claim_amount, "status": c.status}


@router.get("/rebates/mine")
def my_claims(user: User = Depends(get_current_user),
              db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    rows = (
        db.query(WaterRebateClaim, WaterRebateScheme)
        .join(WaterRebateScheme, WaterRebateScheme.id == WaterRebateClaim.scheme_id)
        .filter(WaterRebateClaim.user_id == user.id)
        .order_by(WaterRebateClaim.created_at.desc())
        .all()
    )
    return [{"id": c.id, "scheme_label": s.label,
             "claim_amount_cents": c.claim_amount_cents,
             "status": c.status, "decision_note": c.decision_note,
             "created_at": c.created_at.isoformat()} for c, s in rows]
