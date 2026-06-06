"""Higher-level rates operations: levies, instalment generation, interest
accrual, sect.603 snapshot, payment-plan helpers.

Pure functions where possible — caller commits the session.
"""
from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.models import (
    InterestCharge,
    Property,
    RateCharge,
    RateInstalment,
    RateLevy,
    RatesAccount,
    Valuation,
)

# NSW gazetted interest rate on overdue rates (Local Govt Act sect.566).
DEFAULT_INTEREST_PCT_PA = 9.0

# Default NSW instalment due dates (sect.562)
INSTALMENT_DUE = [(8, 31), (11, 30), (2, 28), (5, 31)]


def applicable_levies(
    db: Session, *, council_id: int, fiscal_year: int,
    property_type: str | None = None,
) -> list[RateLevy]:
    rows = (
        db.query(RateLevy)
        .filter(RateLevy.council_id == council_id,
                RateLevy.fiscal_year == fiscal_year)
        .all()
    )
    out: list[RateLevy] = []
    for r in rows:
        if r.applies_to_property_type:
            allowed = {x.strip() for x in r.applies_to_property_type.split(",") if x.strip()}
            if property_type and property_type not in allowed:
                continue
        out.append(r)
    return out


def levy_total_for_property(
    db: Session, *, property_obj: Property, fiscal_year: int,
) -> tuple[int, list[dict[str, Any]]]:
    """Sum of all non-ad-valorem levies for a property in a FY.

    Returns (total_cents, breakdown). For per-bin levies we multiply by
    waste entitlement; per-sqm by land_size_sqm; fixed is fixed.
    """
    levies = applicable_levies(
        db, council_id=property_obj.council_id, fiscal_year=fiscal_year,
        property_type=property_obj.property_type,
    )
    breakdown: list[dict[str, Any]] = []
    total = 0
    for lv in levies:
        if lv.kind == "fixed":
            amt = lv.amount_cents
        elif lv.kind == "per_bin":
            bins = 1 + (property_obj.waste_entitlement.extra_bins
                        if property_obj.waste_entitlement else 0)
            amt = lv.amount_cents * bins
        elif lv.kind == "per_sqm":
            sqm = property_obj.land_size_sqm or 0
            amt = int(round(lv.amount_cents * sqm))
        else:
            amt = lv.amount_cents
        breakdown.append({"code": lv.code, "label": lv.label, "kind": lv.kind,
                          "amount_cents": amt})
        total += amt
    return total, breakdown


def generate_instalments(
    db: Session, *, account: RatesAccount, fiscal_year: int,
    total_cents: int, due_dates: list[tuple[int, int]] | None = None,
) -> list[RateInstalment]:
    """Create 4 quarterly instalments for the account/year.

    Idempotent: existing rows for the same (account, FY) are deleted first.
    """
    db.query(RateInstalment).filter(
        RateInstalment.account_id == account.id,
        RateInstalment.fiscal_year == fiscal_year,
    ).delete()
    dues = due_dates or INSTALMENT_DUE
    # First three quarters rounded down; last absorbs the remainder.
    quarter = total_cents // 4
    remainder = total_cents - quarter * 4
    amounts = [quarter, quarter, quarter, quarter + remainder]
    out: list[RateInstalment] = []
    for i, (m, d) in enumerate(dues):
        # Q1 (Aug) and Q2 (Nov) fall in FY-start year; Q3 (Feb) and Q4 (May) in FY+1
        year = fiscal_year if m >= 7 else fiscal_year + 1
        try:
            due = date(year, m, d)
        except ValueError:
            # 28 Feb on a non-leap year
            due = date(year, m, 28)
        inst = RateInstalment(
            account_id=account.id, fiscal_year=fiscal_year,
            period_label=f"Q{i + 1}", due_date=due,
            amount_cents=amounts[i], paid_cents=0, status="pending",
        )
        db.add(inst)
        out.append(inst)
    return out


def accrue_interest(
    db: Session, *, account: RatesAccount, today: date | None = None,
    rate_pct_pa: float = DEFAULT_INTEREST_PCT_PA,
) -> InterestCharge | None:
    """Accrue interest from the last computed date up to today on the
    overdue balance. Returns the new charge row, or None if nothing to do.
    """
    if account.balance_cents <= 0 or account.next_due_date is None:
        return None
    today = today or date.today()
    if account.next_due_date >= today:
        return None
    overdue_since = account.next_due_date
    # Resume from the last interest accrual end_date, if any.
    last = (
        db.query(InterestCharge)
        .filter(InterestCharge.account_id == account.id,
                InterestCharge.waived_at.is_(None))
        .order_by(InterestCharge.accrued_to.desc())
        .first()
    )
    if last is not None and last.accrued_to >= overdue_since:
        overdue_since = last.accrued_to + timedelta(days=1)
    days = (today - overdue_since).days
    if days <= 0:
        return None
    daily = rate_pct_pa / 100.0 / 365.0
    amount = int(round(account.balance_cents * daily * days))
    if amount <= 0:
        return None
    charge = InterestCharge(
        account_id=account.id,
        accrued_from=overdue_since, accrued_to=today, days=days,
        rate_pct_pa=rate_pct_pa, principal_cents=account.balance_cents,
        amount_cents=amount,
    )
    db.add(charge)
    account.balance_cents += amount
    return charge


def certificate_snapshot(
    db: Session, *, property_obj: Property,
) -> dict[str, Any]:
    """Generate the data block for a sect.603 certificate."""
    acct = property_obj.account
    latest_val = max(property_obj.valuations, key=lambda v: v.year, default=None)
    outstanding_interest: list[InterestCharge] = []
    if acct is not None:
        outstanding_interest = (
            db.query(InterestCharge)
            .filter(InterestCharge.account_id == acct.id,
                    InterestCharge.waived_at.is_(None))
            .all()
        )
    return {
        "property": {
            "id": property_obj.id, "address": property_obj.address,
            "suburb": property_obj.suburb, "postcode": property_obj.postcode,
            "property_type": property_obj.property_type,
            "land_size_sqm": property_obj.land_size_sqm,
            "zone": property_obj.zone,
        },
        "valuation": {
            "year": latest_val.year if latest_val else None,
            "land_value_cents": latest_val.land_value_cents if latest_val else None,
            "capital_value_cents": latest_val.capital_value_cents if latest_val else None,
        },
        "account": {
            "number": acct.account_number if acct else None,
            "balance_cents": acct.balance_cents if acct else 0,
            "next_due_date": (acct.next_due_date.isoformat()
                              if acct and acct.next_due_date else None),
        },
        "outstanding_interest_cents": sum(c.amount_cents for c in outstanding_interest),
        "rate_charges": [
            {"period_start": rc.period_start.isoformat(),
             "period_end": rc.period_end.isoformat(),
             "category": rc.category, "amount_cents": rc.amount_cents}
            for rc in (property_obj.rate_charges or [])
        ],
        "issued_at": datetime.now(UTC).isoformat(),
    }


def latest_uv(property_obj: Property) -> Valuation | None:
    return max(property_obj.valuations, key=lambda v: v.year, default=None)


def fiscal_year_for(d: date | None = None) -> int:
    d = d or date.today()
    return d.year if d.month >= 7 else d.year - 1


__all__ = [
    "DEFAULT_INTEREST_PCT_PA",
    "INSTALMENT_DUE",
    "accrue_interest",
    "applicable_levies",
    "certificate_snapshot",
    "fiscal_year_for",
    "generate_instalments",
    "latest_uv",
    "levy_total_for_property",
]
# Re-export RateCharge so the strike-rate path stays in one module's deps.
_ = RateCharge
