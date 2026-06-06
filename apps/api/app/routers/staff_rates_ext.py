"""Staff rates extensions: levies CRUD, instalments, interest, sect.603
certificates, hardship plans, concession claims, valuation objections,
mixed-use apportionment, printable rates notice.

Resident-facing endpoints (request a cert, lodge an objection, request a
hardship plan, get the notice) live in rates_resident.py.
"""
from __future__ import annotations

import secrets
from datetime import UTC, date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import (
    ConcessionClaim,
    Council,
    HardshipPlan,
    InterestCharge,
    Property,
    PropertyRateAssignment,
    RateCategory,
    RateCharge,
    RateInstalment,
    RateLevy,
    RatesAccount,
    RatesCertificate,
    User,
    UserRole,
    ValuationObjection,
)
from app.services.notify import notify
from app.services.rates_calc import calculate
from app.services.rates_engine import (
    accrue_interest,
    certificate_snapshot,
    fiscal_year_for,
    generate_instalments,
    latest_uv,
    levy_total_for_property,
)
from app.services.rates_notice import render_certificate, render_rates_notice

router = APIRouter(prefix="/staff/rates", tags=["staff-rates-ext"])


def _staff(user: User) -> None:
    if user.role not in (UserRole.staff.value, UserRole.admin.value):
        raise HTTPException(status_code=403, detail="Staff only")


# ============ Levies (stormwater, DWM, special rate) ============


class LevyIn(BaseModel):
    fiscal_year: int
    code: str = Field(min_length=2, max_length=32)
    label: str
    kind: str = Field(pattern="^(fixed|per_bin|per_sqm)$")
    amount_cents: int = Field(ge=0)
    applies_to_property_type: str | None = None
    notes: str | None = None


class LevyOut(BaseModel):
    id: int
    fiscal_year: int
    code: str
    label: str
    kind: str
    amount_cents: int
    applies_to_property_type: str | None
    notes: str | None


@router.get("/levies", response_model=list[LevyOut])
def list_levies(fiscal_year: int | None = None,
                user: User = Depends(get_current_user),
                db: Session = Depends(get_db)) -> list[LevyOut]:
    _staff(user)
    q = db.query(RateLevy).filter(RateLevy.council_id == user.council_id)
    if fiscal_year is not None:
        q = q.filter(RateLevy.fiscal_year == fiscal_year)
    rows = q.order_by(RateLevy.fiscal_year.desc(), RateLevy.code).all()
    return [LevyOut(id=lv.id, fiscal_year=lv.fiscal_year, code=lv.code, label=lv.label,
                    kind=lv.kind, amount_cents=lv.amount_cents,
                    applies_to_property_type=lv.applies_to_property_type,
                    notes=lv.notes) for lv in rows]


@router.post("/levies", response_model=LevyOut, status_code=201)
def create_levy(body: LevyIn, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)) -> LevyOut:
    _staff(user)
    if db.query(RateLevy).filter(
        RateLevy.council_id == user.council_id,
        RateLevy.fiscal_year == body.fiscal_year, RateLevy.code == body.code,
    ).first():
        raise HTTPException(status_code=409, detail="Levy already exists for that year")
    lv = RateLevy(council_id=user.council_id, **body.model_dump())
    db.add(lv)
    db.commit()
    db.refresh(lv)
    return LevyOut(id=lv.id, fiscal_year=lv.fiscal_year, code=lv.code, label=lv.label,
                   kind=lv.kind, amount_cents=lv.amount_cents,
                   applies_to_property_type=lv.applies_to_property_type, notes=lv.notes)


@router.delete("/levies/{lid}", status_code=204)
def delete_levy(lid: int, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)) -> None:
    _staff(user)
    lv = db.get(RateLevy, lid)
    if lv is None or lv.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(lv)
    db.commit()


# ============ Instalments ============


class InstalmentOut(BaseModel):
    id: int
    fiscal_year: int
    period_label: str
    due_date: date
    amount_cents: int
    paid_cents: int
    status: str


@router.get("/properties/{pid}/instalments", response_model=list[InstalmentOut])
def list_instalments(pid: int, user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)) -> list[InstalmentOut]:
    _staff(user)
    p = db.get(Property, pid)
    if p is None or p.council_id != user.council_id or p.account is None:
        raise HTTPException(status_code=404, detail="Not found")
    rows = (
        db.query(RateInstalment)
        .filter(RateInstalment.account_id == p.account.id)
        .order_by(RateInstalment.due_date)
        .all()
    )
    return [InstalmentOut(
        id=i.id, fiscal_year=i.fiscal_year, period_label=i.period_label,
        due_date=i.due_date, amount_cents=i.amount_cents, paid_cents=i.paid_cents,
        status=i.status,
    ) for i in rows]


@router.post("/properties/{pid}/instalments/regenerate")
def regenerate_instalments(pid: int, fiscal_year: int | None = None,
                           user: User = Depends(get_current_user),
                           db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    p = db.get(Property, pid)
    if p is None or p.council_id != user.council_id or p.account is None:
        raise HTTPException(status_code=404, detail="Not found")
    fy = fiscal_year or fiscal_year_for()
    fy_charges = [c for c in p.rate_charges
                  if c.period_start.year == fy or
                  (c.period_start.month >= 7 and c.period_start.year == fy)]
    total = sum(c.amount_cents for c in fy_charges)
    if total == 0:
        raise HTTPException(status_code=400, detail="No charges struck for that FY")
    rows = generate_instalments(db, account=p.account, fiscal_year=fy, total_cents=total)
    db.commit()
    return {"ok": True, "count": len(rows), "total_cents": total}


# ============ Interest ============


class InterestRowOut(BaseModel):
    id: int
    accrued_from: date
    accrued_to: date
    days: int
    rate_pct_pa: float
    principal_cents: int
    amount_cents: int
    waived_at: datetime | None
    waiver_reason: str | None


@router.get("/properties/{pid}/interest", response_model=list[InterestRowOut])
def list_interest(pid: int, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)) -> list[InterestRowOut]:
    _staff(user)
    p = db.get(Property, pid)
    if p is None or p.council_id != user.council_id or p.account is None:
        raise HTTPException(status_code=404, detail="Not found")
    rows = (
        db.query(InterestCharge)
        .filter(InterestCharge.account_id == p.account.id)
        .order_by(InterestCharge.accrued_to.desc())
        .all()
    )
    return [InterestRowOut(
        id=c.id, accrued_from=c.accrued_from, accrued_to=c.accrued_to,
        days=c.days, rate_pct_pa=c.rate_pct_pa, principal_cents=c.principal_cents,
        amount_cents=c.amount_cents, waived_at=c.waived_at,
        waiver_reason=c.waiver_reason,
    ) for c in rows]


@router.post("/properties/{pid}/interest/accrue")
def accrue_now(pid: int, user: User = Depends(get_current_user),
               db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    p = db.get(Property, pid)
    if p is None or p.council_id != user.council_id or p.account is None:
        raise HTTPException(status_code=404, detail="Not found")
    charge = accrue_interest(db, account=p.account)
    db.commit()
    if charge is None:
        return {"ok": True, "accrued_cents": 0}
    return {"ok": True, "accrued_cents": charge.amount_cents,
            "days": charge.days, "id": charge.id}


class WaiverIn(BaseModel):
    reason: str = Field(min_length=4, max_length=500)


@router.post("/interest/{cid}/waive")
def waive_interest(cid: int, body: WaiverIn,
                   user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    c = db.get(InterestCharge, cid)
    if c is None:
        raise HTTPException(status_code=404, detail="Not found")
    acct = db.get(RatesAccount, c.account_id)
    if acct is None:
        raise HTTPException(status_code=404, detail="Account not found")
    p = db.get(Property, acct.property_id)
    if p is None or p.council_id != user.council_id:
        raise HTTPException(status_code=403, detail="Not your council")
    if c.waived_at is not None:
        return {"ok": True, "already": True}
    c.waived_at = datetime.now(UTC)
    c.waived_by_user_id = user.id
    c.waiver_reason = body.reason
    acct.balance_cents -= c.amount_cents
    db.commit()
    return {"ok": True, "waived_cents": c.amount_cents}


# ============ Certificates (sect.603) ============


class CertOut(BaseModel):
    id: int
    reference: str
    property_id: int
    status: str
    fee_cents: int
    requester_name: str | None
    requester_email: str | None
    issued_at: datetime | None
    valid_until: date | None
    created_at: datetime


@router.get("/certificates", response_model=list[CertOut])
def list_certificates(status: str | None = None,
                      user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)) -> list[CertOut]:
    _staff(user)
    q = db.query(RatesCertificate).filter(RatesCertificate.council_id == user.council_id)
    if status:
        q = q.filter(RatesCertificate.status == status)
    rows = q.order_by(RatesCertificate.created_at.desc()).limit(200).all()
    return [CertOut(id=c.id, reference=c.reference, property_id=c.property_id,
                    status=c.status, fee_cents=c.fee_cents,
                    requester_name=c.requester_name, requester_email=c.requester_email,
                    issued_at=c.issued_at, valid_until=c.valid_until,
                    created_at=c.created_at) for c in rows]


@router.post("/certificates/{cid}/issue")
def issue_certificate(cid: int, user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    c = db.get(RatesCertificate, cid)
    if c is None or c.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    p = db.get(Property, c.property_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Property gone")
    c.snapshot = certificate_snapshot(db, property_obj=p)
    c.status = "issued"
    c.issued_at = datetime.now(UTC)
    c.valid_until = date.today() + timedelta(days=90)
    db.commit()
    if c.requested_by_user_id is not None:
        requester = db.get(User, c.requested_by_user_id)
        if requester is not None:
            notify(db, user=requester, council_id=user.council_id,
                   action="rates_cert.issued",
                   title=f"Certificate {c.reference} ready",
                   body="Your section 603 certificate has been issued.",
                   url=f"/rates/certificate/{c.id}",
                   target_type="rates_certificate", target_id=c.id)
    return {"ok": True}


@router.get("/certificates/{cid}/preview", response_class=HTMLResponse)
def preview_certificate(cid: int, user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)) -> HTMLResponse:
    _staff(user)
    c = db.get(RatesCertificate, cid)
    if c is None or c.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    council = db.get(Council, user.council_id)
    p = db.get(Property, c.property_id)
    if p is None or council is None:
        raise HTTPException(status_code=404, detail="Not found")
    snapshot = c.snapshot or certificate_snapshot(db, property_obj=p)
    html = render_certificate(
        council_name=council.name, council_brand=council.brand_color,
        reference=c.reference, snapshot=snapshot,
        requester_name=c.requester_name, fee_cents=c.fee_cents,
        valid_until=c.valid_until, issued_on=date.today(),
    )
    return HTMLResponse(html)


# ============ Hardship plans ============


class PlanOut(BaseModel):
    id: int
    account_id: int
    term_months: int
    monthly_amount_cents: int
    starts_on: date
    ends_on: date
    status: str
    paid_count: int
    notes: str | None


@router.get("/plans", response_model=list[PlanOut])
def list_plans(status: str | None = None,
               user: User = Depends(get_current_user),
               db: Session = Depends(get_db)) -> list[PlanOut]:
    _staff(user)
    q = (
        db.query(HardshipPlan, RatesAccount, Property)
        .join(RatesAccount, RatesAccount.id == HardshipPlan.account_id)
        .join(Property, Property.id == RatesAccount.property_id)
        .filter(Property.council_id == user.council_id)
    )
    if status:
        q = q.filter(HardshipPlan.status == status)
    rows = q.order_by(HardshipPlan.created_at.desc()).limit(200).all()
    return [PlanOut(id=plan.id, account_id=plan.account_id,
                    term_months=plan.term_months,
                    monthly_amount_cents=plan.monthly_amount_cents,
                    starts_on=plan.starts_on, ends_on=plan.ends_on,
                    status=plan.status, paid_count=plan.paid_count,
                    notes=plan.notes) for plan, _, _ in rows]


@router.post("/plans/{pid}/approve")
def approve_plan(pid: int, user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    plan = db.get(HardshipPlan, pid)
    if plan is None:
        raise HTTPException(status_code=404, detail="Not found")
    acct = db.get(RatesAccount, plan.account_id)
    if acct is None:
        raise HTTPException(status_code=404, detail="Account gone")
    p = db.get(Property, acct.property_id)
    if p is None or p.council_id != user.council_id:
        raise HTTPException(status_code=403, detail="Not your council")
    plan.status = "active"
    db.commit()
    if plan.requested_by_user_id is not None:
        requester = db.get(User, plan.requested_by_user_id)
        if requester is not None:
            notify(db, user=requester, council_id=user.council_id,
                   action="hardship_plan.approved",
                   title="Payment plan approved",
                   body=f"{plan.term_months}-month plan, "
                        f"${plan.monthly_amount_cents/100:.2f}/month.",
                   url="/rates", target_type="hardship_plan", target_id=plan.id)
    return {"ok": True}


# ============ Concession claims (state subsidy reconciliation) ============


class ClaimOut(BaseModel):
    id: int
    period_year: int
    period_half: int
    pensioner_count: int
    total_concession_cents: int
    state_subsidy_pct: float
    state_subsidy_cents: int
    reference: str | None
    status: str
    submitted_at: datetime | None
    paid_at: datetime | None


@router.get("/concession-claims", response_model=list[ClaimOut])
def list_claims(user: User = Depends(get_current_user),
                db: Session = Depends(get_db)) -> list[ClaimOut]:
    _staff(user)
    rows = (
        db.query(ConcessionClaim)
        .filter(ConcessionClaim.council_id == user.council_id)
        .order_by(ConcessionClaim.period_year.desc(),
                  ConcessionClaim.period_half.desc())
        .all()
    )
    return [ClaimOut(
        id=c.id, period_year=c.period_year, period_half=c.period_half,
        pensioner_count=c.pensioner_count,
        total_concession_cents=c.total_concession_cents,
        state_subsidy_pct=c.state_subsidy_pct,
        state_subsidy_cents=c.state_subsidy_cents,
        reference=c.reference, status=c.status,
        submitted_at=c.submitted_at, paid_at=c.paid_at,
    ) for c in rows]


@router.post("/concession-claims/draft")
def draft_claim(period_year: int, period_half: int,
                user: User = Depends(get_current_user),
                db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    if period_half not in (1, 2):
        raise HTTPException(status_code=400, detail="period_half must be 1 or 2")
    existing = (
        db.query(ConcessionClaim)
        .filter(ConcessionClaim.council_id == user.council_id,
                ConcessionClaim.period_year == period_year,
                ConcessionClaim.period_half == period_half)
        .first()
    )
    # Pensioner-concession totals — aggregate from active concessions in
    # the period. (In production: ledger of concession events.)
    from app.models import Concession  # noqa: PLC0415
    total = (
        db.query(func.coalesce(func.sum(Concession.annual_value_cents), 0))
        .join(Property, Property.id == Concession.property_id)
        .filter(Property.council_id == user.council_id,
                Concession.type == "pensioner",
                Concession.status == "active")
        .scalar()
    ) or 0
    count = (
        db.query(func.count(Concession.id))
        .join(Property, Property.id == Concession.property_id)
        .filter(Property.council_id == user.council_id,
                Concession.type == "pensioner",
                Concession.status == "active")
        .scalar()
    ) or 0
    half_total = int(total) // 2
    subsidy = int(round(half_total * 0.55))
    if existing is None:
        existing = ConcessionClaim(
            council_id=user.council_id, period_year=period_year,
            period_half=period_half, pensioner_count=int(count),
            total_concession_cents=half_total,
            state_subsidy_cents=subsidy, status="draft",
        )
        db.add(existing)
    else:
        existing.pensioner_count = int(count)
        existing.total_concession_cents = half_total
        existing.state_subsidy_cents = subsidy
    db.commit()
    return {"ok": True, "total_cents": half_total,
            "state_subsidy_cents": subsidy, "pensioner_count": int(count)}


@router.post("/concession-claims/{cid}/submit")
def submit_claim(cid: int, user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    c = db.get(ConcessionClaim, cid)
    if c is None or c.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    c.status = "submitted"
    c.submitted_at = datetime.now(UTC)
    c.reference = f"PCC-{c.period_year}H{c.period_half}-{secrets.token_hex(3).upper()}"
    db.commit()
    return {"ok": True, "reference": c.reference}


# ============ Valuation objections (staff side) ============


class ObjectionOut(BaseModel):
    id: int
    property_id: int
    user_id: int
    year: int
    current_uv_cents: int
    proposed_uv_cents: int
    grounds: str
    status: str
    created_at: datetime


@router.get("/objections", response_model=list[ObjectionOut])
def list_objections(status: str | None = None,
                    user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> list[ObjectionOut]:
    _staff(user)
    q = (
        db.query(ValuationObjection, Property)
        .join(Property, Property.id == ValuationObjection.property_id)
        .filter(Property.council_id == user.council_id)
    )
    if status:
        q = q.filter(ValuationObjection.status == status)
    rows = q.order_by(ValuationObjection.created_at.desc()).limit(200).all()
    return [ObjectionOut(
        id=o.id, property_id=o.property_id, user_id=o.user_id, year=o.year,
        current_uv_cents=o.current_uv_cents, proposed_uv_cents=o.proposed_uv_cents,
        grounds=o.grounds, status=o.status, created_at=o.created_at,
    ) for o, _ in rows]


class ObjectionDecision(BaseModel):
    status: str = Field(pattern="^(review|upheld|dismissed)$")
    decision_note: str | None = None


@router.patch("/objections/{oid}")
def decide_objection(oid: int, body: ObjectionDecision,
                     user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    o = db.get(ValuationObjection, oid)
    if o is None:
        raise HTTPException(status_code=404, detail="Not found")
    p = db.get(Property, o.property_id)
    if p is None or p.council_id != user.council_id:
        raise HTTPException(status_code=403, detail="Not your council")
    o.status = body.status
    o.decision_note = body.decision_note
    if body.status in ("upheld", "dismissed"):
        o.decided_at = datetime.now(UTC)
    db.commit()
    requester = db.get(User, o.user_id)
    if requester is not None:
        notify(db, user=requester, council_id=user.council_id,
               action="valuation_objection.decided",
               title=f"Valuation objection: {body.status}",
               body=(body.decision_note or "")[:120] or "See your account for details.",
               url="/rates", target_type="valuation_objection", target_id=o.id)
    return {"ok": True}


# ============ Mixed-use apportionment ============


class AssignmentIn(BaseModel):
    fiscal_year: int
    category_id: int
    percentage: float = Field(ge=0, le=100)


@router.get("/properties/{pid}/assignments")
def list_assignments(pid: int, user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    _staff(user)
    p = db.get(Property, pid)
    if p is None or p.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    rows = (
        db.query(PropertyRateAssignment, RateCategory)
        .join(RateCategory, RateCategory.id == PropertyRateAssignment.category_id)
        .filter(PropertyRateAssignment.property_id == pid)
        .all()
    )
    return [{"id": a.id, "fiscal_year": a.fiscal_year,
             "category_id": a.category_id, "category_label": c.label,
             "category_code": c.code, "percentage": a.percentage}
            for a, c in rows]


@router.put("/properties/{pid}/assignments")
def set_assignments(pid: int, body: list[AssignmentIn],
                    user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    p = db.get(Property, pid)
    if p is None or p.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    if body and abs(sum(a.percentage for a in body) - 100.0) > 0.01:
        raise HTTPException(status_code=400, detail="Percentages must sum to 100")
    fy_set = {a.fiscal_year for a in body}
    db.query(PropertyRateAssignment).filter(
        PropertyRateAssignment.property_id == pid,
        PropertyRateAssignment.fiscal_year.in_(fy_set),
    ).delete()
    for a in body:
        db.add(PropertyRateAssignment(
            property_id=pid, fiscal_year=a.fiscal_year,
            category_id=a.category_id, percentage=a.percentage,
        ))
    db.commit()
    return {"ok": True, "count": len(body)}


# ============ Rates notice (HTML) ============


@router.get("/properties/{pid}/notice", response_class=HTMLResponse)
def render_notice(pid: int, fiscal_year: int | None = None,
                  user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)) -> HTMLResponse:
    _staff(user)
    p = db.get(Property, pid)
    if p is None or p.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    fy = fiscal_year or fiscal_year_for()
    council = db.get(Council, user.council_id)
    if council is None:
        raise HTTPException(status_code=404, detail="Council missing")
    uv = latest_uv(p)
    if uv is None:
        raise HTTPException(status_code=400, detail="No valuation on file")
    cat = (
        db.query(RateCategory)
        .filter(RateCategory.council_id == user.council_id,
                RateCategory.fiscal_year == fy,
                RateCategory.code == ("business" if p.property_type == "commercial"
                                      else "residential"),
                RateCategory.is_active.is_(True))
        .first()
    )
    if cat is None:
        raise HTTPException(status_code=400, detail="No category struck for FY")
    calc = calculate(category=cat, land_value_cents=uv.land_value_cents,
                     concessions=list(p.concessions))
    levy_total, levy_breakdown = levy_total_for_property(
        db, property_obj=p, fiscal_year=fy,
    )
    grand_total = calc.total_cents + levy_total
    from app.models import BpayCrn  # noqa: PLC0415
    instalments_data: list[dict[str, Any]] = []
    bpay = None
    if p.account is not None:
        instalments_data = [
            {"period_label": i.period_label,
             "due_date": i.due_date.isoformat(),
             "amount_cents": i.amount_cents,
             "status": i.status}
            for i in db.query(RateInstalment).filter(
                RateInstalment.account_id == p.account.id,
                RateInstalment.fiscal_year == fy,
            ).order_by(RateInstalment.due_date).all()
        ]
        bpay = (
            db.query(BpayCrn)
            .filter(BpayCrn.account_id == p.account.id)
            .first()
        )
    html = render_rates_notice(
        council_name=council.name, council_brand=council.brand_color,
        property_data={"address": p.address, "suburb": p.suburb,
                       "property_type": p.property_type,
                       "land_size_sqm": p.land_size_sqm, "zone": p.zone},
        account={"number": p.account.account_number if p.account else None,
                 "balance_cents": p.account.balance_cents if p.account else 0},
        valuation={"year": uv.year, "land_value_cents": uv.land_value_cents},
        category_label=cat.label,
        ad_valorem_component_cents=calc.ad_valorem_component_cents,
        base_cents=calc.base_amount_cents, minimum_cents=calc.minimum_cents,
        minimum_applied=calc.minimum_applied, gross_cents=calc.gross_cents,
        levies=levy_breakdown, concession_cents=calc.concession_cents,
        total_cents=grand_total, instalments=instalments_data,
        payment_methods={
            "bpay_crn": bpay.crn if bpay else None,
            "bpay_biller": "00000",
            "online_url": "/rates",
        },
        fiscal_year=fy, issued_on=date.today(),
    )
    return HTMLResponse(html)


# ============ KPI extension (overrides v1 KPIs to include levies) ============


@router.get("/kpis-ext")
def rates_kpis_ext(user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    fy = fiscal_year_for()
    levy_count = (
        db.query(func.count(RateLevy.id))
        .filter(RateLevy.council_id == user.council_id,
                RateLevy.fiscal_year == fy).scalar()
    ) or 0
    pending_certs = (
        db.query(func.count(RatesCertificate.id))
        .filter(RatesCertificate.council_id == user.council_id,
                RatesCertificate.status.in_(("requested", "paid"))).scalar()
    ) or 0
    open_objections = (
        db.query(func.count(ValuationObjection.id))
        .join(Property, Property.id == ValuationObjection.property_id)
        .filter(Property.council_id == user.council_id,
                ValuationObjection.status.in_(("lodged", "review"))).scalar()
    ) or 0
    active_plans = (
        db.query(func.count(HardshipPlan.id))
        .join(RatesAccount, RatesAccount.id == HardshipPlan.account_id)
        .join(Property, Property.id == RatesAccount.property_id)
        .filter(Property.council_id == user.council_id,
                HardshipPlan.status == "active").scalar()
    ) or 0
    return {
        "active_levies": int(levy_count),
        "pending_certificates": int(pending_certs),
        "open_objections": int(open_objections),
        "active_plans": int(active_plans),
    }


# ============ Demo seed ============


def seed_rates_ext_demo(db: Session, *, council_id: int) -> dict[str, int]:
    counts = {"levies": 0}
    if db.query(RateLevy).filter(RateLevy.council_id == council_id).first():
        return counts
    fy = fiscal_year_for()
    seeds = [
        (fy, "stormwater", "Stormwater management charge",
         "fixed", 2500, None, "Sect.496A NSW LGA."),
        (fy, "dwm", "Domestic waste management",
         "per_bin", 38500, "primary", "Per 240L bin under sect.496."),
        (fy, "environmental_levy", "Environmental levy",
         "fixed", 5000, None, "SRV approved 2023."),
    ]
    for fy_, code, label, kind, amt, propt, notes in seeds:
        db.add(RateLevy(council_id=council_id, fiscal_year=fy_, code=code,
                        label=label, kind=kind, amount_cents=amt,
                        applies_to_property_type=propt, notes=notes))
        counts["levies"] += 1
    db.commit()
    return counts


# Local import to keep top-of-file clean
_ = RateCharge
