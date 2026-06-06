"""Staff-side rates module: rate categories, ad valorem calculator,
property roll, strike-the-rate, KPIs."""
from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import (
    Concession,
    Property,
    RateCategory,
    RateCharge,
    RatesAccount,
    User,
    UserRole,
    Valuation,
)
from app.services.rates_calc import calculate

router = APIRouter(prefix="/staff/rates", tags=["staff-rates"])


def _staff(user: User) -> None:
    if user.role not in (UserRole.staff.value, UserRole.admin.value):
        raise HTTPException(status_code=403, detail="Staff only")


# ============ Rate categories ============


class CategoryIn(BaseModel):
    fiscal_year: int = Field(ge=2000, le=2100)
    code: str = Field(min_length=2, max_length=32)
    label: str = Field(min_length=2, max_length=120)
    ad_valorem_cents_per_dollar: float = Field(ge=0, le=1)
    base_amount_cents: int = Field(default=0, ge=0)
    minimum_cents: int = Field(default=0, ge=0)
    notes: str | None = None


class CategoryOut(BaseModel):
    id: int
    fiscal_year: int
    code: str
    label: str
    ad_valorem_cents_per_dollar: float
    base_amount_cents: int
    minimum_cents: int
    notes: str | None
    is_active: bool


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(fiscal_year: int | None = None,
                    user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> list[CategoryOut]:
    _staff(user)
    q = db.query(RateCategory).filter(RateCategory.council_id == user.council_id)
    if fiscal_year is not None:
        q = q.filter(RateCategory.fiscal_year == fiscal_year)
    rows = q.order_by(RateCategory.fiscal_year.desc(), RateCategory.code).all()
    return [CategoryOut(
        id=c.id, fiscal_year=c.fiscal_year, code=c.code, label=c.label,
        ad_valorem_cents_per_dollar=c.ad_valorem_cents_per_dollar,
        base_amount_cents=c.base_amount_cents, minimum_cents=c.minimum_cents,
        notes=c.notes, is_active=c.is_active,
    ) for c in rows]


@router.post("/categories", response_model=CategoryOut, status_code=201)
def create_category(body: CategoryIn,
                    user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> CategoryOut:
    _staff(user)
    existing = (
        db.query(RateCategory)
        .filter(RateCategory.council_id == user.council_id,
                RateCategory.fiscal_year == body.fiscal_year,
                RateCategory.code == body.code)
        .first()
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="Category already exists for that year")
    c = RateCategory(council_id=user.council_id, **body.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return CategoryOut(
        id=c.id, fiscal_year=c.fiscal_year, code=c.code, label=c.label,
        ad_valorem_cents_per_dollar=c.ad_valorem_cents_per_dollar,
        base_amount_cents=c.base_amount_cents, minimum_cents=c.minimum_cents,
        notes=c.notes, is_active=c.is_active,
    )


@router.put("/categories/{cid}", response_model=CategoryOut)
def update_category(cid: int, body: CategoryIn,
                    user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> CategoryOut:
    _staff(user)
    c = db.get(RateCategory, cid)
    if c is None or c.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in body.model_dump().items():
        setattr(c, k, v)
    db.commit()
    return CategoryOut(
        id=c.id, fiscal_year=c.fiscal_year, code=c.code, label=c.label,
        ad_valorem_cents_per_dollar=c.ad_valorem_cents_per_dollar,
        base_amount_cents=c.base_amount_cents, minimum_cents=c.minimum_cents,
        notes=c.notes, is_active=c.is_active,
    )


@router.delete("/categories/{cid}", status_code=204)
def delete_category(cid: int, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> None:
    _staff(user)
    c = db.get(RateCategory, cid)
    if c is None or c.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(c)
    db.commit()


# ============ Calculator ============


class CalcIn(BaseModel):
    fiscal_year: int
    category_code: str
    land_value_cents: int = Field(ge=0)
    apply_concessions: list[str] | None = None  # ["pensioner", "hardship"]


class CalcOut(BaseModel):
    category: CategoryOut
    breakdown: dict[str, Any]


@router.post("/calculate", response_model=CalcOut)
def calculate_rate(body: CalcIn, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)) -> CalcOut:
    _staff(user)
    cat = (
        db.query(RateCategory)
        .filter(RateCategory.council_id == user.council_id,
                RateCategory.fiscal_year == body.fiscal_year,
                RateCategory.code == body.category_code,
                RateCategory.is_active.is_(True))
        .first()
    )
    if cat is None:
        raise HTTPException(status_code=404,
                            detail=f"No active '{body.category_code}' category for FY{body.fiscal_year}")
    mock_concessions: list[Concession] = []
    if body.apply_concessions:
        for c_type in body.apply_concessions:
            mock_concessions.append(Concession(
                property_id=0, type=c_type, status="active",
                annual_value_cents=25000 if c_type == "pensioner" else 15000,
            ))
    calc = calculate(category=cat, land_value_cents=body.land_value_cents,
                     concessions=mock_concessions)
    return CalcOut(
        category=CategoryOut(
            id=cat.id, fiscal_year=cat.fiscal_year, code=cat.code, label=cat.label,
            ad_valorem_cents_per_dollar=cat.ad_valorem_cents_per_dollar,
            base_amount_cents=cat.base_amount_cents, minimum_cents=cat.minimum_cents,
            notes=cat.notes, is_active=cat.is_active,
        ),
        breakdown=calc.to_dict(),
    )


# ============ Property roll ============


class PropertyRollRow(BaseModel):
    id: int
    address: str
    suburb: str | None
    property_type: str
    land_size_sqm: int | None
    zone: str | None
    latest_uv_cents: int | None
    account_number: str | None
    balance_cents: int
    overdue: bool


@router.get("/properties", response_model=list[PropertyRollRow])
def property_roll(search: str | None = None,
                  overdue: bool | None = None,
                  user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)) -> list[PropertyRollRow]:
    _staff(user)
    q = db.query(Property).filter(Property.council_id == user.council_id)
    if search:
        like = f"%{search}%"
        q = q.filter(Property.address.ilike(like))
    rows = q.order_by(Property.address).limit(500).all()
    today = date.today()

    # Pre-fetch latest UV per property
    pids = [p.id for p in rows]
    latest_uv: dict[int, int] = {}
    if pids:
        for pid, uv in (
            db.query(Valuation.property_id, Valuation.land_value_cents)
            .filter(Valuation.property_id.in_(pids))
            .order_by(Valuation.property_id, Valuation.year.desc())
            .all()
        ):
            latest_uv.setdefault(pid, uv)

    out: list[PropertyRollRow] = []
    for p in rows:
        acct = p.account
        is_overdue = (
            acct is not None
            and acct.next_due_date is not None
            and acct.next_due_date < today
            and acct.balance_cents > 0
        )
        if overdue is True and not is_overdue:
            continue
        if overdue is False and is_overdue:
            continue
        out.append(PropertyRollRow(
            id=p.id, address=p.address, suburb=p.suburb,
            property_type=p.property_type, land_size_sqm=p.land_size_sqm,
            zone=p.zone,
            latest_uv_cents=latest_uv.get(p.id),
            account_number=acct.account_number if acct else None,
            balance_cents=acct.balance_cents if acct else 0,
            overdue=is_overdue,
        ))
    return out


class PropertyForStaff(BaseModel):
    id: int
    address: str
    suburb: str | None
    property_type: str
    land_size_sqm: int | None
    zone: str | None
    lat: float | None
    lng: float | None
    valuations: list[dict[str, Any]]
    rate_charges: list[dict[str, Any]]
    concessions: list[dict[str, Any]]
    account_number: str | None
    balance_cents: int
    next_due_date: date | None
    suggested_calc: dict[str, Any] | None
    suggested_category: CategoryOut | None


@router.get("/properties/{pid}", response_model=PropertyForStaff)
def property_for_staff(pid: int, user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)) -> PropertyForStaff:
    _staff(user)
    p = db.get(Property, pid)
    if p is None or p.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    latest_uv = max(p.valuations, key=lambda v: v.year, default=None)
    current_fy = (datetime.now(UTC).year if datetime.now(UTC).month >= 7
                  else datetime.now(UTC).year - 1)
    cat_code = "residential" if p.property_type == "primary" else "residential"
    if p.property_type == "commercial":
        cat_code = "business"
    cat = (
        db.query(RateCategory)
        .filter(RateCategory.council_id == user.council_id,
                RateCategory.fiscal_year == current_fy,
                RateCategory.code == cat_code,
                RateCategory.is_active.is_(True))
        .first()
    )
    suggested_calc = None
    suggested_cat = None
    if cat is not None and latest_uv is not None:
        calc = calculate(category=cat, land_value_cents=latest_uv.land_value_cents,
                         concessions=list(p.concessions))
        suggested_calc = calc.to_dict()
        suggested_cat = CategoryOut(
            id=cat.id, fiscal_year=cat.fiscal_year, code=cat.code, label=cat.label,
            ad_valorem_cents_per_dollar=cat.ad_valorem_cents_per_dollar,
            base_amount_cents=cat.base_amount_cents, minimum_cents=cat.minimum_cents,
            notes=cat.notes, is_active=cat.is_active,
        )
    acct = p.account
    return PropertyForStaff(
        id=p.id, address=p.address, suburb=p.suburb,
        property_type=p.property_type, land_size_sqm=p.land_size_sqm,
        zone=p.zone, lat=p.lat, lng=p.lng,
        valuations=[{"year": v.year, "land_value_cents": v.land_value_cents,
                     "capital_value_cents": v.capital_value_cents}
                    for v in sorted(p.valuations, key=lambda x: x.year, reverse=True)],
        rate_charges=[{"period_start": rc.period_start.isoformat(),
                       "period_end": rc.period_end.isoformat(),
                       "category": rc.category, "amount_cents": rc.amount_cents,
                       "note": rc.note}
                      for rc in p.rate_charges],
        concessions=[{"type": c.type, "status": c.status,
                       "annual_value_cents": c.annual_value_cents}
                      for c in p.concessions],
        account_number=acct.account_number if acct else None,
        balance_cents=acct.balance_cents if acct else 0,
        next_due_date=acct.next_due_date if acct else None,
        suggested_calc=suggested_calc,
        suggested_category=suggested_cat,
    )


# ============ Strike the rate ============


class StrikeIn(BaseModel):
    fiscal_year: int
    category_code: str


@router.post("/properties/{pid}/strike", status_code=201)
def strike_rate(pid: int, body: StrikeIn,
                user: User = Depends(get_current_user),
                db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    p = db.get(Property, pid)
    if p is None or p.council_id != user.council_id:
        raise HTTPException(status_code=404, detail="Not found")
    cat = (
        db.query(RateCategory)
        .filter(RateCategory.council_id == user.council_id,
                RateCategory.fiscal_year == body.fiscal_year,
                RateCategory.code == body.category_code,
                RateCategory.is_active.is_(True))
        .first()
    )
    if cat is None:
        raise HTTPException(status_code=404, detail="Category not found")
    uv = next((v for v in sorted(p.valuations, key=lambda x: x.year, reverse=True)
               if v.year <= body.fiscal_year), None)
    if uv is None:
        raise HTTPException(status_code=400,
                            detail="No valuation on file for that FY or earlier")
    calc = calculate(category=cat, land_value_cents=uv.land_value_cents,
                     concessions=list(p.concessions))
    period_start = date(body.fiscal_year, 7, 1)
    period_end = date(body.fiscal_year + 1, 6, 30)
    existing = (
        db.query(RateCharge)
        .filter(RateCharge.property_id == pid,
                RateCharge.period_start == period_start,
                RateCharge.category == "general_rate")
        .first()
    )
    if existing is not None:
        existing.amount_cents = calc.total_cents
        existing.note = (f"Restruck under {cat.code} FY{cat.fiscal_year} "
                          f"(UV ${uv.land_value_cents/100:,.0f})")
    else:
        db.add(RateCharge(
            property_id=pid,
            period_start=period_start, period_end=period_end,
            category="general_rate",
            amount_cents=calc.total_cents,
            note=(f"Struck under {cat.code} FY{cat.fiscal_year} "
                   f"(UV ${uv.land_value_cents/100:,.0f})"),
        ))
    db.commit()
    return {"ok": True, "amount_cents": calc.total_cents,
            "breakdown": calc.to_dict()}


# ============ KPIs ============


@router.get("/kpis")
def rates_kpis(user: User = Depends(get_current_user),
               db: Session = Depends(get_db)) -> dict[str, Any]:
    _staff(user)
    today = date.today()
    total_props = (
        db.query(func.count(Property.id))
        .filter(Property.council_id == user.council_id).scalar()
    ) or 0
    total_balance = (
        db.query(func.coalesce(func.sum(RatesAccount.balance_cents), 0))
        .join(Property, Property.id == RatesAccount.property_id)
        .filter(Property.council_id == user.council_id).scalar()
    ) or 0
    overdue_count = (
        db.query(func.count(RatesAccount.id))
        .join(Property, Property.id == RatesAccount.property_id)
        .filter(Property.council_id == user.council_id,
                RatesAccount.next_due_date < today,
                RatesAccount.balance_cents > 0).scalar()
    ) or 0
    current_fy = (datetime.now(UTC).year if datetime.now(UTC).month >= 7
                  else datetime.now(UTC).year - 1)
    cat_count = (
        db.query(func.count(RateCategory.id))
        .filter(RateCategory.council_id == user.council_id,
                RateCategory.fiscal_year == current_fy,
                RateCategory.is_active.is_(True)).scalar()
    ) or 0
    return {
        "properties": int(total_props),
        "outstanding_cents": int(total_balance),
        "overdue_accounts": int(overdue_count),
        "active_categories_current_fy": int(cat_count),
        "current_fy": current_fy,
    }


# ============ Demo seed ============


def seed_demo_rate_categories(db: Session, *, council_id: int) -> int:
    """Seed default NSW-style ad valorem categories. Idempotent."""
    if db.query(RateCategory).filter(RateCategory.council_id == council_id).first():
        return 0
    current_fy = (datetime.now(UTC).year if datetime.now(UTC).month >= 7
                  else datetime.now(UTC).year - 1)
    rows = [
        (current_fy, "residential", "Residential",
         0.003421, 0, 73500,
         "Rate-in-the-$ × UV, with $735 minimum (NSW typical)."),
        (current_fy, "business", "Business",
         0.005842, 0, 95000,
         "Higher rate-in-the-$ for commercial properties."),
        (current_fy, "farmland", "Farmland",
         0.001923, 0, 73500,
         "Concessional rate for farms (Local Govt Act sect. 515)."),
        (current_fy, "mining", "Mining",
         0.012500, 0, 95000,
         "Highest category."),
    ]
    for fy, code, label, ad, base, mn, notes in rows:
        db.add(RateCategory(
            council_id=council_id, fiscal_year=fy, code=code, label=label,
            ad_valorem_cents_per_dollar=ad, base_amount_cents=base,
            minimum_cents=mn, notes=notes, is_active=True,
        ))
    db.commit()
    return len(rows)
