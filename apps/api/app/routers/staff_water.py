"""Staff water module: tariffs CRUD, sewerage charges, trade waste,
quality samples, source levels, restrictions level, leak alerts queue,
self-read approvals, rebate scheme + claim management.
"""
from __future__ import annotations

import secrets
from datetime import UTC, date, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import (
    LeakAlert,
    Property,
    SelfMeterRead,
    SewerageCharge,
    TradeWasteAgreement,
    TradeWasteSample,
    User,
    UserRole,
    WaterAllocation,
    WaterQualitySample,
    WaterRebateClaim,
    WaterRebateScheme,
    WaterRestriction,
    WaterSource,
    WaterSourceReading,
    WaterTariff,
)
from app.services.notify import notify
from app.services.water_engine import (
    calc_trade_waste,
    detect_leaks,
    fiscal_year_for,
)

router = APIRouter(prefix="/staff/water", tags=["staff-water"])


def _staff(user: User) -> None:
    if user.role not in (UserRole.staff.value, UserRole.admin.value):
        raise HTTPException(status_code=403, detail="Staff only")


# ============ Tariffs ============


class TariffIn(BaseModel):
    fiscal_year: int
    customer_type: str = Field(pattern="^(residential|commercial|rural)$")
    tier_from_kl: int = Field(ge=0)
    tier_to_kl: int | None = None
    cents_per_kl: int = Field(ge=0)
    label: str | None = None


class TariffOut(BaseModel):
    id: int
    fiscal_year: int
    customer_type: str
    tier_from_kl: int
    tier_to_kl: int | None
    cents_per_kl: int
    label: str | None


@router.get("/tariffs", response_model=list[TariffOut])
def list_tariffs(fiscal_year: int | None = None,
                 user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)) -> list[TariffOut]:
    _staff(user)
    q = db.query(WaterTariff).filter(WaterTariff.council_id == user.council_id)
    if fiscal_year is not None:
        q = q.filter(WaterTariff.fiscal_year == fiscal_year)
    rows = q.order_by(WaterTariff.fiscal_year.desc(),
                       WaterTariff.customer_type, WaterTariff.tier_from_kl).all()
    return [TariffOut(id=t.id, fiscal_year=t.fiscal_year,
                      customer_type=t.customer_type, tier_from_kl=t.tier_from_kl,
                      tier_to_kl=t.tier_to_kl, cents_per_kl=t.cents_per_kl,
                      label=t.label) for t in rows]


@router.post("/tariffs", response_model=TariffOut, status_code=201)
def create_tariff(body: TariffIn, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)) -> TariffOut:
    _staff(user)
    if db.query(WaterTariff).filter(
        WaterTariff.council_id == user.council_id,
        WaterTariff.fiscal_year == body.fiscal_year,
        WaterTariff.customer_type == body.customer_type,
        WaterTariff.tier_from_kl == body.tier_from_kl,
    ).first():
        raise HTTPException(status_code=409, detail="Tier already exists")
    t = WaterTariff(council_id=user.council_id, **body.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return TariffOut(id=t.id, fiscal_year=t.fiscal_year,
                     customer_type=t.customer_type, tier_from_kl=t.tier_from_kl,
                     tier_to_kl=t.tier_to_kl, cents_per_kl=t.cents_per_kl,
                     label=t.label)


@router.delete("/tariffs/{tid}", status_code=204)
def delete_tariff(tid: int, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)) -> None:
    _staff(user)
    t = db.get(WaterTariff, tid)
    if t is None or t.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(t)
    db.commit()


# ============ Sewerage ============


class SewerageIn(BaseModel):
    fiscal_year: int
    applies_to_customer_type: str = Field(pattern="^(residential|commercial|rural)$")
    fixed_amount_cents: int = Field(ge=0)
    discharge_factor_pct: float = Field(default=95.0, ge=0, le=100)
    per_kl_above_threshold_cents: int = Field(default=0, ge=0)
    threshold_kl: int = Field(default=0, ge=0)
    notes: str | None = None


@router.get("/sewerage")
def list_sewerage(fiscal_year: int | None = None,
                  user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    _staff(user)
    q = db.query(SewerageCharge).filter(SewerageCharge.council_id == user.council_id)
    if fiscal_year is not None:
        q = q.filter(SewerageCharge.fiscal_year == fiscal_year)
    rows = q.order_by(SewerageCharge.fiscal_year.desc()).all()
    return [{"id": s.id, "fiscal_year": s.fiscal_year,
             "applies_to_customer_type": s.applies_to_customer_type,
             "fixed_amount_cents": s.fixed_amount_cents,
             "discharge_factor_pct": s.discharge_factor_pct,
             "per_kl_above_threshold_cents": s.per_kl_above_threshold_cents,
             "threshold_kl": s.threshold_kl, "notes": s.notes} for s in rows]


@router.post("/sewerage", status_code=201)
def create_sewerage(body: SewerageIn, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    existing = db.query(SewerageCharge).filter(
        SewerageCharge.council_id == user.council_id,
        SewerageCharge.fiscal_year == body.fiscal_year,
        SewerageCharge.applies_to_customer_type == body.applies_to_customer_type,
    ).first()
    if existing is not None:
        for k, v in body.model_dump().items():
            setattr(existing, k, v)
        db.commit()
        return {"id": existing.id, "updated": True}
    s = SewerageCharge(council_id=user.council_id, **body.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return {"id": s.id, "updated": False}


# ============ Trade waste ============


class TradeWasteIn(BaseModel):
    property_id: int
    business_name: str
    category: str = Field(pattern="^(cat1|cat2|cat3)$")
    pretreatment_device: str | None = None
    valid_from: date
    valid_until: date | None = None


@router.get("/trade-waste")
def list_trade_waste(user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    _staff(user)
    rows = (
        db.query(TradeWasteAgreement)
        .filter(TradeWasteAgreement.council_id == user.council_id)
        .order_by(TradeWasteAgreement.valid_from.desc()).all()
    )
    return [{"id": a.id, "reference": a.reference,
             "business_name": a.business_name, "category": a.category,
             "pretreatment_device": a.pretreatment_device,
             "valid_from": a.valid_from.isoformat(),
             "valid_until": a.valid_until.isoformat() if a.valid_until else None,
             "status": a.status, "property_id": a.property_id} for a in rows]


@router.post("/trade-waste", status_code=201)
def create_trade_waste(body: TradeWasteIn,
                       user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    now = datetime.now(UTC)
    a = TradeWasteAgreement(
        council_id=user.council_id,
        reference=f"TW-{now.strftime('%Y%m')}-{secrets.token_hex(3).upper()}",
        **body.model_dump(),
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return {"id": a.id, "reference": a.reference}


@router.get("/trade-waste/{aid}/calc")
def trade_waste_calc(aid: int, user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    a = db.get(TradeWasteAgreement, aid)
    if a is None or a.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    samples = db.query(TradeWasteSample).filter(
        TradeWasteSample.agreement_id == aid
    ).all()
    c = calc_trade_waste(a, samples)
    return {"bod_kg": c.bod_kg, "ss_kg": c.ss_kg, "fog_kg": c.fog_kg,
            "bod_cents": c.bod_cents, "ss_cents": c.ss_cents,
            "fog_cents": c.fog_cents, "admin_cents": c.admin_cents,
            "total_cents": c.total_cents}


# ============ Quality ============


class QualityIn(BaseModel):
    sample_point: str
    taken_at: datetime
    chlorine_mg_per_l: float | None = None
    ph: float | None = None
    turbidity_ntu: float | None = None
    fluoride_mg_per_l: float | None = None
    e_coli_per_100ml: int | None = None
    note: str | None = None


def _quality_compliance(s: WaterQualitySample) -> str:
    # ADWG rough cuts: free Cl 0.2-5, pH 6.5-8.5, turbidity <5 NTU,
    # fluoride 0.6-1.5, e.coli == 0.
    if s.e_coli_per_100ml is not None and s.e_coli_per_100ml > 0:
        return "fail"
    bad = False
    border = False
    if s.chlorine_mg_per_l is not None and not (0.2 <= s.chlorine_mg_per_l <= 5):
        border = True
    if s.ph is not None and not (6.5 <= s.ph <= 8.5):
        border = True
    if s.turbidity_ntu is not None and s.turbidity_ntu > 5:
        bad = True
    if s.fluoride_mg_per_l is not None and (s.fluoride_mg_per_l < 0.6
                                            or s.fluoride_mg_per_l > 1.5):
        border = True
    return "fail" if bad else ("borderline" if border else "pass")


@router.get("/quality")
def list_quality(days: int = 30, user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    _staff(user)
    from datetime import timedelta  # noqa: PLC0415
    cutoff = datetime.now(UTC) - timedelta(days=days)
    rows = (
        db.query(WaterQualitySample)
        .filter(WaterQualitySample.council_id == user.council_id,
                WaterQualitySample.taken_at >= cutoff)
        .order_by(WaterQualitySample.taken_at.desc()).all()
    )
    return [{"id": s.id, "sample_point": s.sample_point,
             "taken_at": s.taken_at.isoformat(),
             "chlorine_mg_per_l": s.chlorine_mg_per_l, "ph": s.ph,
             "turbidity_ntu": s.turbidity_ntu,
             "fluoride_mg_per_l": s.fluoride_mg_per_l,
             "e_coli_per_100ml": s.e_coli_per_100ml,
             "compliance": s.compliance, "note": s.note} for s in rows]


@router.post("/quality", status_code=201)
def add_quality(body: QualityIn, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    s = WaterQualitySample(council_id=user.council_id, **body.model_dump())
    s.compliance = _quality_compliance(s)
    db.add(s)
    db.commit()
    db.refresh(s)
    return {"id": s.id, "compliance": s.compliance}


# ============ Sources ============


class SourceIn(BaseModel):
    name: str
    kind: str = Field(pattern="^(dam|weir|bore|reservoir|river)$")
    capacity_ml: float = Field(gt=0)
    lat: float | None = None
    lng: float | None = None


@router.get("/sources")
def list_sources(user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    _staff(user)
    rows = (
        db.query(WaterSource)
        .filter(WaterSource.council_id == user.council_id)
        .order_by(WaterSource.name).all()
    )
    out: list[dict[str, Any]] = []
    for src in rows:
        last = (
            db.query(WaterSourceReading)
            .filter(WaterSourceReading.source_id == src.id)
            .order_by(WaterSourceReading.reading_date.desc())
            .first()
        )
        out.append({"id": src.id, "name": src.name, "kind": src.kind,
                    "capacity_ml": src.capacity_ml,
                    "latest_pct": last.capacity_pct if last else None,
                    "latest_date": last.reading_date.isoformat() if last else None,
                    "lat": src.lat, "lng": src.lng})
    return out


@router.post("/sources", status_code=201)
def create_source(body: SourceIn, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    src = WaterSource(council_id=user.council_id, **body.model_dump())
    db.add(src)
    db.commit()
    db.refresh(src)
    return {"id": src.id}


class ReadingIn(BaseModel):
    reading_date: date
    capacity_pct: float = Field(ge=0, le=200)
    inflow_ml: float = 0.0
    withdrawal_ml: float = 0.0


@router.post("/sources/{sid}/readings", status_code=201)
def add_source_reading(sid: int, body: ReadingIn,
                       user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    src = db.get(WaterSource, sid)
    if src is None or src.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    existing = (
        db.query(WaterSourceReading)
        .filter(WaterSourceReading.source_id == sid,
                WaterSourceReading.reading_date == body.reading_date)
        .first()
    )
    if existing is not None:
        for k, v in body.model_dump().items():
            setattr(existing, k, v)
        db.commit()
        return {"id": existing.id, "updated": True}
    r = WaterSourceReading(source_id=sid, **body.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    return {"id": r.id, "updated": False}


# ============ Restrictions ============


LEVEL_RULES = {
    0: ["Normal — no restrictions."],
    1: ["Sprinklers and irrigation between 6pm and 10am only.",
        "Hand-held hoses with trigger nozzles allowed any time."],
    2: ["Sprinklers banned. Drip irrigation 6pm-10am only.",
        "Trigger-nozzle hose any time. No washing hard surfaces."],
    3: ["All sprinklers and irrigation banned.",
        "Trigger-nozzle hose for gardens before 9am or after 6pm."],
    4: ["No outdoor watering of gardens, lawns or pools.",
        "Bucket-only car washing for safety reasons."],
    5: ["Indoor use essential only. No outdoor water use at all.",
        "Filling pools or topping up prohibited."],
}


class RestrictionIn(BaseModel):
    level: int = Field(ge=0, le=5)
    starts_at: datetime
    ends_at: datetime | None = None
    summary: str | None = None
    affected_wards: list[str] | None = None


@router.get("/restrictions")
def list_restrictions(user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    _staff(user)
    rows = (
        db.query(WaterRestriction)
        .filter(WaterRestriction.council_id == user.council_id)
        .order_by(WaterRestriction.starts_at.desc()).all()
    )
    return [{"id": r.id, "level": r.level, "summary": r.summary,
             "rules": r.rules, "starts_at": r.starts_at.isoformat(),
             "ends_at": r.ends_at.isoformat() if r.ends_at else None,
             "affected_wards": r.affected_wards} for r in rows]


@router.post("/restrictions", status_code=201)
def set_restriction(body: RestrictionIn, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    rules = LEVEL_RULES.get(body.level, [])
    r = WaterRestriction(
        council_id=user.council_id, level=body.level,
        summary=body.summary or f"Level {body.level} water restrictions",
        rules=rules, starts_at=body.starts_at, ends_at=body.ends_at,
        affected_wards=body.affected_wards,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return {"id": r.id}


# ============ Leak alerts ============


@router.get("/leaks")
def list_leaks(severity: str | None = None,
               user: User = Depends(get_current_user),
               db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    _staff(user)
    q = (
        db.query(LeakAlert, Property)
        .join(Property, Property.id == LeakAlert.property_id)
        .filter(Property.council_id == user.council_id)
    )
    if severity:
        q = q.filter(LeakAlert.severity == severity)
    rows = q.order_by(LeakAlert.detected_at.desc()).limit(200).all()
    return [{"id": a.id, "property_id": a.property_id,
             "address": p.address, "flow_lph": a.flow_lph,
             "baseline_lph": a.baseline_lph, "severity": a.severity,
             "detected_at": a.detected_at.isoformat(),
             "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
             "notes": a.notes} for a, p in rows]


@router.post("/leaks/scan")
def run_scan(user: User = Depends(get_current_user),
             db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    new_alerts = detect_leaks(db, council_id=user.council_id)
    db.commit()
    # Notify owners
    from app.models import PropertyOwnership  # noqa: PLC0415
    for a in new_alerts:
        owners = (
            db.query(PropertyOwnership)
            .filter(PropertyOwnership.property_id == a.property_id).all()
        )
        for o in owners:
            owner = db.get(User, o.user_id)
            if owner is not None:
                notify(db, user=owner, council_id=user.council_id,
                       action="water.leak_suspected",
                       title="Possible water leak detected",
                       body=f"Sustained {a.flow_lph:.0f} L/h vs your usual "
                            f"{a.baseline_lph:.0f} L/h.",
                       url="/water", target_type="leak_alert", target_id=a.id,
                       webhook_event="water.leak_suspected")
    return {"new_alerts": len(new_alerts)}


@router.post("/leaks/{aid}/resolve")
def resolve_leak(aid: int, user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    a = db.get(LeakAlert, aid)
    if a is None:
        raise HTTPException(status_code=404, detail="Not found")
    p = db.get(Property, a.property_id)
    if p is None or p.council_id != user.council_id:
        raise HTTPException(status_code=403, detail="Not your council")
    a.severity = "resolved"
    a.resolved_at = datetime.now(UTC)
    db.commit()
    return {"ok": True}


# ============ Self reads (approval) ============


@router.get("/self-reads")
def list_self_reads(status: str | None = None,
                    user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    _staff(user)
    q = (
        db.query(SelfMeterRead, Property)
        .join(Property, Property.id == SelfMeterRead.property_id)
        .filter(Property.council_id == user.council_id)
    )
    if status:
        q = q.filter(SelfMeterRead.status == status)
    rows = q.order_by(SelfMeterRead.created_at.desc()).limit(200).all()
    return [{"id": s.id, "property_id": s.property_id,
             "address": p.address, "read_on": s.read_on.isoformat(),
             "value_kl": s.value_kl, "status": s.status,
             "photo_r2_key": s.photo_r2_key,
             "submitted_by_user_id": s.submitted_by_user_id,
             "note": s.note,
             "created_at": s.created_at.isoformat()} for s, p in rows]


class SelfReadDecision(BaseModel):
    status: str = Field(pattern="^(accepted|disputed)$")
    note: str | None = None


@router.patch("/self-reads/{sid}")
def decide_self_read(sid: int, body: SelfReadDecision,
                     user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    s = db.get(SelfMeterRead, sid)
    if s is None:
        raise HTTPException(status_code=404, detail="Not found")
    p = db.get(Property, s.property_id)
    if p is None or p.council_id != user.council_id:
        raise HTTPException(status_code=403, detail="Not your council")
    s.status = body.status
    s.note = body.note
    db.commit()
    submitter = db.get(User, s.submitted_by_user_id)
    if submitter is not None:
        notify(db, user=submitter, council_id=user.council_id,
               action="water.self_read_decided",
               title=f"Meter read {body.status}",
               body=f"Your read of {s.value_kl:.2f} kL on "
                    f"{s.read_on.isoformat()} was {body.status}.",
               url="/water", target_type="self_meter_read", target_id=s.id)
    return {"ok": True}


# ============ Rebate scheme + claims ============


class RebateSchemeIn(BaseModel):
    code: str
    label: str
    description: str
    max_amount_cents: int = Field(ge=0)
    annual_cap_per_household_cents: int = Field(ge=0)
    eligibility: str | None = None


@router.get("/rebates/schemes")
def list_rebate_schemes(user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    _staff(user)
    rows = (
        db.query(WaterRebateScheme)
        .filter(WaterRebateScheme.council_id == user.council_id).all()
    )
    return [{"id": r.id, "code": r.code, "label": r.label,
             "description": r.description,
             "max_amount_cents": r.max_amount_cents,
             "annual_cap_per_household_cents": r.annual_cap_per_household_cents,
             "eligibility": r.eligibility, "active": r.active} for r in rows]


@router.post("/rebates/schemes", status_code=201)
def create_rebate_scheme(body: RebateSchemeIn,
                         user: User = Depends(get_current_user),
                         db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    r = WaterRebateScheme(council_id=user.council_id, **body.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    return {"id": r.id}


@router.get("/rebates/claims")
def list_rebate_claims(status: str | None = None,
                       user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    _staff(user)
    q = (
        db.query(WaterRebateClaim, WaterRebateScheme, Property)
        .join(WaterRebateScheme, WaterRebateScheme.id == WaterRebateClaim.scheme_id)
        .join(Property, Property.id == WaterRebateClaim.property_id)
        .filter(Property.council_id == user.council_id)
    )
    if status:
        q = q.filter(WaterRebateClaim.status == status)
    rows = q.order_by(WaterRebateClaim.created_at.desc()).limit(200).all()
    return [{"id": c.id, "scheme_label": s.label,
             "property_id": c.property_id, "address": p.address,
             "invoice_amount_cents": c.invoice_amount_cents,
             "claim_amount_cents": c.claim_amount_cents,
             "status": c.status, "receipt_url": c.receipt_url,
             "created_at": c.created_at.isoformat(),
             "decision_note": c.decision_note} for c, s, p in rows]


class ClaimDecision(BaseModel):
    status: str = Field(pattern="^(approved|paid|rejected)$")
    decision_note: str | None = None


@router.patch("/rebates/claims/{cid}")
def decide_claim(cid: int, body: ClaimDecision,
                 user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    c = db.get(WaterRebateClaim, cid)
    if c is None:
        raise HTTPException(status_code=404, detail="Not found")
    p = db.get(Property, c.property_id)
    if p is None or p.council_id != user.council_id:
        raise HTTPException(status_code=403, detail="Not your council")
    c.status = body.status
    c.decision_note = body.decision_note
    c.decided_at = datetime.now(UTC)
    db.commit()
    user_ = db.get(User, c.user_id)
    if user_ is not None:
        notify(db, user=user_, council_id=user.council_id,
               action="water.rebate_decided",
               title=f"Water rebate {body.status}",
               body=(body.decision_note or "")[:120] or "See your account.",
               url="/water", target_type="water_rebate_claim", target_id=c.id)
    return {"ok": True}


# ============ KPIs ============


@router.get("/kpis")
def water_kpis(user: User = Depends(get_current_user),
               db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    fy = fiscal_year_for()
    tariff_count = db.query(func.count(WaterTariff.id)).filter(
        WaterTariff.council_id == user.council_id,
        WaterTariff.fiscal_year == fy,
    ).scalar() or 0
    open_leaks = db.query(func.count(LeakAlert.id)).join(
        Property, Property.id == LeakAlert.property_id,
    ).filter(Property.council_id == user.council_id,
             LeakAlert.severity != "resolved").scalar() or 0
    pending_reads = db.query(func.count(SelfMeterRead.id)).join(
        Property, Property.id == SelfMeterRead.property_id,
    ).filter(Property.council_id == user.council_id,
             SelfMeterRead.status == "pending").scalar() or 0
    pending_claims = db.query(func.count(WaterRebateClaim.id)).join(
        Property, Property.id == WaterRebateClaim.property_id,
    ).filter(Property.council_id == user.council_id,
             WaterRebateClaim.status == "lodged").scalar() or 0
    fail_samples = db.query(func.count(WaterQualitySample.id)).filter(
        WaterQualitySample.council_id == user.council_id,
        WaterQualitySample.compliance == "fail",
    ).scalar() or 0
    return {
        "active_tariff_tiers_current_fy": int(tariff_count),
        "open_leaks": int(open_leaks),
        "pending_self_reads": int(pending_reads),
        "pending_rebate_claims": int(pending_claims),
        "fail_samples_total": int(fail_samples),
        "current_fy": fy,
    }


# ============ Allocation (staff CRUD) ============


class AllocationIn(BaseModel):
    property_id: int
    season_year: int
    entitlement_ml: float = Field(ge=0)
    allocation_pct: float = Field(default=100.0, ge=0, le=300)
    carryover_kl: int = Field(default=0, ge=0)


@router.post("/allocations", status_code=201)
def set_allocation(body: AllocationIn, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    p = db.get(Property, body.property_id)
    if p is None or p.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Property not found")
    existing = db.query(WaterAllocation).filter(
        WaterAllocation.property_id == body.property_id,
        WaterAllocation.season_year == body.season_year,
    ).first()
    opening = int(body.entitlement_ml * 1000 * body.allocation_pct / 100) + body.carryover_kl
    if existing is not None:
        existing.entitlement_ml = body.entitlement_ml
        existing.allocation_pct = body.allocation_pct
        existing.carryover_kl = body.carryover_kl
        existing.opening_balance_kl = opening
        db.commit()
        return {"id": existing.id, "updated": True}
    a = WaterAllocation(
        property_id=body.property_id, season_year=body.season_year,
        entitlement_ml=body.entitlement_ml, allocation_pct=body.allocation_pct,
        carryover_kl=body.carryover_kl, opening_balance_kl=opening,
        used_kl=0,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return {"id": a.id, "updated": False}


# ============ Demo seed ============


def seed_water_demo(db: Session, *, council_id: int, property_id: int) -> dict[str, int]:
    counts = {"tariffs": 0, "sewerage": 0, "restrictions": 0,
              "quality": 0, "sources": 0, "rebates": 0, "allocations": 0}
    fy = fiscal_year_for()

    if not db.query(WaterTariff).filter(WaterTariff.council_id == council_id,
                                        WaterTariff.fiscal_year == fy).first():
        # Residential tiered tariff
        for ct, tiers in [
            ("residential", [
                (0, 200, 120, "Step 1"),
                (200, 500, 180, "Step 2"),
                (500, None, 240, "Step 3 (high-use)"),
            ]),
            ("commercial", [
                (0, 1000, 150, "Step 1"),
                (1000, None, 280, "Step 2"),
            ]),
        ]:
            for f, t_, c, lbl in tiers:
                db.add(WaterTariff(
                    council_id=council_id, fiscal_year=fy,
                    customer_type=ct, tier_from_kl=f, tier_to_kl=t_,
                    cents_per_kl=c, label=lbl,
                ))
                counts["tariffs"] += 1
    if not db.query(SewerageCharge).filter(SewerageCharge.council_id == council_id,
                                           SewerageCharge.fiscal_year == fy).first():
        db.add(SewerageCharge(
            council_id=council_id, fiscal_year=fy,
            applies_to_customer_type="residential",
            fixed_amount_cents=78000, discharge_factor_pct=95.0,
            per_kl_above_threshold_cents=0, threshold_kl=0,
            notes="Sect.501 access charge.",
        ))
        db.add(SewerageCharge(
            council_id=council_id, fiscal_year=fy,
            applies_to_customer_type="commercial",
            fixed_amount_cents=145000, discharge_factor_pct=95.0,
            per_kl_above_threshold_cents=210, threshold_kl=1000,
            notes="Volume-based above 1,000 kL.",
        ))
        counts["sewerage"] = 2

    if not db.query(WaterRestriction).filter(
        WaterRestriction.council_id == council_id,
    ).first():
        from datetime import timedelta  # noqa: PLC0415
        now = datetime.now(UTC)
        db.add(WaterRestriction(
            council_id=council_id, level=1,
            summary="Level 1 — wise water use in force",
            rules=LEVEL_RULES[1], starts_at=now - timedelta(days=7),
        ))
        counts["restrictions"] = 1

    if not db.query(WaterQualitySample).filter(
        WaterQualitySample.council_id == council_id,
    ).first():
        from datetime import timedelta  # noqa: PLC0415
        now = datetime.now(UTC)
        samples = [
            ("Leeton WTP", 0.8, 7.3, 0.6, 1.0, 0),
            ("Yanco reservoir", 1.1, 7.1, 0.4, 1.0, 0),
            ("Whitton reservoir", 0.4, 7.6, 1.2, 0.9, 0),
        ]
        for i, (pt, cl, ph, tu, fl, ec) in enumerate(samples):
            s = WaterQualitySample(
                council_id=council_id, sample_point=pt,
                taken_at=now - timedelta(days=i),
                chlorine_mg_per_l=cl, ph=ph, turbidity_ntu=tu,
                fluoride_mg_per_l=fl, e_coli_per_100ml=ec,
            )
            s.compliance = _quality_compliance(s)
            db.add(s)
            counts["quality"] += 1

    if not db.query(WaterSource).filter(WaterSource.council_id == council_id).first():
        from datetime import timedelta  # noqa: PLC0415
        today = date.today()
        for name, kind, cap, pct in [
            ("Burrinjuck Dam (allocation)", "dam", 1026000.0, 74.0),
            ("Leeton bore field", "bore", 8500.0, 92.0),
            ("Murrumbidgee weir", "weir", 14000.0, 68.0),
        ]:
            src = WaterSource(council_id=council_id, name=name, kind=kind,
                              capacity_ml=cap)
            db.add(src)
            db.flush()
            for d in range(7):
                db.add(WaterSourceReading(
                    source_id=src.id,
                    reading_date=today - timedelta(days=d),
                    capacity_pct=pct + (d * 0.3),
                    inflow_ml=120, withdrawal_ml=85,
                ))
            counts["sources"] += 1

    if not db.query(WaterRebateScheme).filter(
        WaterRebateScheme.council_id == council_id,
    ).first():
        rebates = [
            ("rainwater_tank", "Rainwater tank rebate",
             "$500 on a 5,000 L+ rainwater tank plumbed to garden or toilet.",
             50000, 50000, "Detached dwelling, council water connection."),
            ("low_flow_shower", "Low-flow shower head",
             "$50 rebate on a 4-star or better WELS-rated shower.",
             5000, 10000, None),
            ("dual_flush", "Dual-flush toilet swap",
             "$200 rebate on replacement of a single-flush with 4-star dual.",
             20000, 40000, None),
            ("drip_irrigation", "Drip irrigation system",
             "$150 rebate on a controller + drip-line garden install.",
             15000, 15000, None),
            ("washing_machine", "Front-loader washing machine",
             "$250 on a 4.5-star or better WELS-rated front-loader.",
             25000, 25000, None),
        ]
        for code, lbl, desc, mx, cap, elig in rebates:
            db.add(WaterRebateScheme(
                council_id=council_id, code=code, label=lbl,
                description=desc, max_amount_cents=mx,
                annual_cap_per_household_cents=cap, eligibility=elig,
                active=True,
            ))
            counts["rebates"] += 1

    if not db.query(WaterAllocation).filter(
        WaterAllocation.property_id == property_id,
    ).first():
        db.add(WaterAllocation(
            property_id=property_id, season_year=fy,
            entitlement_ml=1.5, allocation_pct=80.0,
            carryover_kl=100,
            opening_balance_kl=int(1.5 * 1000 * 0.8) + 100, used_kl=380,
        ))
        counts["allocations"] = 1

    db.commit()
    return counts
