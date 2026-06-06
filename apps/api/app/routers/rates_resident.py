"""Resident-side rates extensions: section 603 certificate requests,
valuation objections, hardship plan requests, instalment view, viewable
rates notice."""
from __future__ import annotations

import secrets
from datetime import UTC, date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import (
    Council,
    HardshipPlan,
    Property,
    PropertyOwnership,
    RateCategory,
    RateInstalment,
    RatesAccount,
    RatesCertificate,
    User,
    ValuationObjection,
)
from app.services.notify import notify
from app.services.rates_calc import calculate
from app.services.rates_engine import (
    fiscal_year_for,
    latest_uv,
    levy_total_for_property,
)
from app.services.rates_notice import render_rates_notice

router = APIRouter(prefix="/rates", tags=["rates-resident"])


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


# ============ Certificate requests ============


class CertRequestIn(BaseModel):
    requester_name: str | None = None
    requester_email: str | None = None


@router.post("/properties/{pid}/certificate-request", status_code=201)
def request_certificate(pid: int, body: CertRequestIn,
                        user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)) -> dict[str, Any]:
    p = _owns(db, user=user, property_id=pid)
    now = datetime.now(UTC)
    c = RatesCertificate(
        council_id=p.council_id, property_id=pid,
        requested_by_user_id=user.id,
        reference=f"C603-{now.strftime('%Y%m')}-{secrets.token_hex(3).upper()}",
        requester_name=body.requester_name, requester_email=body.requester_email,
        fee_cents=9500, status="requested",
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    notify(db, user=user, council_id=p.council_id,
           action="rates_cert.requested",
           title="Certificate request lodged",
           body=f"Reference {c.reference}. We'll email when it's ready.",
           url="/rates", target_type="rates_certificate", target_id=c.id)
    return {"id": c.id, "reference": c.reference, "fee_cents": c.fee_cents}


# ============ Valuation objections ============


class ObjectionIn(BaseModel):
    year: int = Field(ge=2000, le=2100)
    current_uv_cents: int = Field(ge=0)
    proposed_uv_cents: int = Field(ge=0)
    grounds: str = Field(min_length=20, max_length=4000)
    supporting_url: str | None = None


@router.post("/properties/{pid}/objections", status_code=201)
def lodge_objection(pid: int, body: ObjectionIn,
                    user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> dict[str, Any]:
    p = _owns(db, user=user, property_id=pid)
    o = ValuationObjection(
        property_id=pid, user_id=user.id, year=body.year,
        current_uv_cents=body.current_uv_cents,
        proposed_uv_cents=body.proposed_uv_cents,
        grounds=body.grounds, supporting_url=body.supporting_url,
        status="lodged",
    )
    db.add(o)
    db.commit()
    db.refresh(o)
    notify(db, user=user, council_id=p.council_id,
           action="valuation_objection.lodged",
           title="Objection lodged",
           body=f"Objection #{o.id} for FY{body.year} received.",
           url="/rates", target_type="valuation_objection", target_id=o.id)
    return {"id": o.id, "status": o.status}


@router.get("/objections/mine")
def my_objections(user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    rows = (
        db.query(ValuationObjection)
        .filter(ValuationObjection.user_id == user.id)
        .order_by(ValuationObjection.created_at.desc())
        .all()
    )
    return [{"id": o.id, "property_id": o.property_id, "year": o.year,
             "current_uv_cents": o.current_uv_cents,
             "proposed_uv_cents": o.proposed_uv_cents,
             "status": o.status, "decision_note": o.decision_note,
             "created_at": o.created_at.isoformat()} for o in rows]


# ============ Hardship payment plan requests ============


class HardshipRequest(BaseModel):
    term_months: int = Field(ge=3, le=12)
    notes: str | None = Field(default=None, max_length=2000)


@router.post("/properties/{pid}/hardship-request", status_code=201)
def request_hardship_plan(pid: int, body: HardshipRequest,
                          user: User = Depends(get_current_user),
                          db: Session = Depends(get_db)) -> dict[str, Any]:
    p = _owns(db, user=user, property_id=pid)
    if p.account is None or p.account.balance_cents <= 0:
        raise HTTPException(status_code=400, detail="No outstanding balance")
    monthly = max(2500, int(round(p.account.balance_cents / body.term_months)))
    today = date.today()
    plan = HardshipPlan(
        account_id=p.account.id, requested_by_user_id=user.id,
        term_months=body.term_months, monthly_amount_cents=monthly,
        starts_on=today,
        ends_on=today + timedelta(days=30 * body.term_months),
        status="requested", notes=body.notes,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    notify(db, user=user, council_id=p.council_id,
           action="hardship_plan.requested",
           title="Payment plan requested",
           body=f"{body.term_months}-month plan, ${monthly/100:.2f}/month. "
                f"Awaiting approval.",
           url="/rates", target_type="hardship_plan", target_id=plan.id,
           webhook_event="hardship_plan.requested")
    return {"id": plan.id, "monthly_amount_cents": monthly, "status": plan.status}


# ============ Instalments view ============


@router.get("/properties/{pid}/instalments")
def my_instalments(pid: int, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    p = _owns(db, user=user, property_id=pid)
    if p.account is None:
        return []
    rows = (
        db.query(RateInstalment)
        .filter(RateInstalment.account_id == p.account.id)
        .order_by(RateInstalment.due_date.desc())
        .limit(12).all()
    )
    return [{"id": i.id, "fiscal_year": i.fiscal_year,
             "period_label": i.period_label,
             "due_date": i.due_date.isoformat(),
             "amount_cents": i.amount_cents,
             "paid_cents": i.paid_cents, "status": i.status} for i in rows]


# ============ Notice viewer ============


@router.get("/properties/{pid}/notice", response_class=HTMLResponse)
def my_notice(pid: int, fiscal_year: int | None = None,
              user: User = Depends(get_current_user),
              db: Session = Depends(get_db)) -> HTMLResponse:
    p = _owns(db, user=user, property_id=pid)
    fy = fiscal_year or fiscal_year_for()
    council = db.get(Council, p.council_id)
    if council is None:
        raise HTTPException(status_code=404, detail="Council missing")
    uv = latest_uv(p)
    if uv is None:
        raise HTTPException(status_code=400, detail="No valuation on file")
    cat = (
        db.query(RateCategory)
        .filter(RateCategory.council_id == p.council_id,
                RateCategory.fiscal_year == fy,
                RateCategory.code == ("business" if p.property_type == "commercial"
                                      else "residential"),
                RateCategory.is_active.is_(True))
        .first()
    )
    if cat is None:
        raise HTTPException(status_code=400, detail="No category for FY")
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
            {"period_label": i.period_label, "due_date": i.due_date.isoformat(),
             "amount_cents": i.amount_cents, "status": i.status}
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


# Local imports for symbols not used elsewhere here
_ = RatesAccount
