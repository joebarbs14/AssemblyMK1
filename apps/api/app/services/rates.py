"""Rates service: BPAY CRN generation + demo seeding."""
from __future__ import annotations

import secrets
from datetime import UTC, date, datetime, timedelta

from sqlalchemy.orm import Session

from app.models import (
    BillingSetting,
    BpayCrn,
    Concession,
    Council,
    InvoiceStatus,
    Property,
    PropertyOverlay,
    PropertyOwnership,
    PropertyType,
    RateCharge,
    RatesAccount,
    RatesInvoice,
    User,
    Valuation,
    WasteEntitlement,
)


def _mod10_v01(digits: str) -> str:
    """BPAY Mod 10 v01 check digit. Standard CRN suffix."""
    total = 0
    for i, ch in enumerate(reversed(digits)):
        n = int(ch)
        if i % 2 == 0:
            n *= 2
            if n > 9:
                n -= 9
        total += n
    return str((10 - total % 10) % 10)


def make_crn(account_id: int) -> str:
    """Generate a 12-digit CRN: zero-padded id + 2-digit random + mod10v01."""
    body = f"{account_id:08d}{secrets.randbelow(100):02d}"  # 10 digits
    return body[:9] + _mod10_v01(body[:9])


def ensure_crn(db: Session, *, council: Council, account: RatesAccount) -> BpayCrn:
    existing = (
        db.query(BpayCrn)
        .filter(BpayCrn.account_id == account.id, BpayCrn.council_id == council.id)
        .one_or_none()
    )
    if existing is not None:
        return existing

    if not council.bpay_biller_code:
        # Fall back to a placeholder; admin should configure the biller code per council.
        biller = "000000"
    else:
        biller = council.bpay_biller_code

    # Retry up to 5 times against unique (council_id, crn).
    for _ in range(5):
        crn = make_crn(account.id)
        candidate = BpayCrn(
            council_id=council.id,
            account_id=account.id,
            crn=crn,
            biller_code=biller,
        )
        try:
            db.add(candidate)
            db.commit()
            db.refresh(candidate)
            return candidate
        except Exception:
            db.rollback()
    raise RuntimeError("Could not allocate a unique CRN")


def bpay_deep_link(*, biller_code: str, crn: str, amount_cents: int | None) -> str:
    """bpay:// scheme handled by most AU banking apps; otherwise the resident
    sees the biller + CRN and types it themselves."""
    base = f"bpay://?biller={biller_code}&ref={crn}"
    if amount_cents:
        base += f"&amount={amount_cents / 100:.2f}"
    return base


# --- Demo seed ---


def seed_demo_property_for_user(db: Session, *, council: Council, user: User) -> Property:
    """Idempotent demo seed: gives the user one fully-populated rates property."""
    existing = (
        db.query(Property)
        .join(PropertyOwnership, PropertyOwnership.property_id == Property.id)
        .filter(PropertyOwnership.user_id == user.id, Property.council_id == council.id)
        .first()
    )
    if existing is not None:
        return existing

    today = date.today()
    prop = Property(
        council_id=council.id,
        address="12 Sample Street",
        suburb="Sydney",
        postcode="2000",
        property_type=PropertyType.primary.value,
        lat=-33.8688,
        lng=151.2093,
        land_size_sqm=420,
        zone="R2",
    )
    db.add(prop)
    db.flush()

    db.add(PropertyOwnership(property_id=prop.id, user_id=user.id, role="owner", verified=True, verified_at=datetime.now(UTC)))

    account = RatesAccount(
        property_id=prop.id,
        account_number=f"ACC-{prop.id:06d}",
        balance_cents=145000,  # $1,450
        next_due_date=today + timedelta(days=21),
        ebilling_enabled=True,
    )
    db.add(account)
    db.flush()

    # Seed 3 invoices: oldest paid, middle paid, latest issued + balance.
    for i, (offset_days, amount, status) in enumerate(
        [(-365, 145000, InvoiceStatus.paid), (-180, 145000, InvoiceStatus.paid), (0, 145000, InvoiceStatus.issued)]
    ):
        db.add(
            RatesInvoice(
                account_id=account.id,
                invoice_number=f"INV-{today.year}-{prop.id:04d}-{i+1}",
                issue_date=today + timedelta(days=offset_days),
                due_date=today + timedelta(days=offset_days + 30),
                amount_cents=amount,
                status=status.value,
                line_items=[
                    {"label": "General rate", "amount_cents": 95000},
                    {"label": "Waste service", "amount_cents": 38000},
                    {"label": "Stormwater levy", "amount_cents": 12000},
                ],
            )
        )

    # Valuations: last 3 years.
    for yr_offset, land, capital in [(0, 75000000, 142000000), (-1, 71000000, 135000000), (-2, 68000000, 130000000)]:
        db.add(
            Valuation(
                property_id=prop.id,
                year=today.year + yr_offset,
                land_value_cents=land,
                capital_value_cents=capital,
            )
        )

    # Rate charges for current period.
    for cat, amount in [("general_rate", 95000), ("waste", 38000), ("stormwater", 12000)]:
        db.add(
            RateCharge(
                property_id=prop.id,
                period_start=date(today.year, 7, 1),
                period_end=date(today.year + 1, 6, 30),
                category=cat,
                amount_cents=amount,
            )
        )

    db.add(Concession(property_id=prop.id, type="pensioner", status="inactive", annual_value_cents=25000,
                      link_apply="https://example.gov.au/apply/pensioner"))
    db.add(PropertyOverlay(property_id=prop.id, kind="flood", source="LGA flood study 2023",
                           note="Low risk — overland flow only."))
    db.add(WasteEntitlement(property_id=prop.id, bin_size_l=240, extra_bins=0, collection_day="Tue"))
    db.add(BillingSetting(property_id=prop.id, direct_debit_active=False, ebill_active=True,
                          update_payment_link="https://example.gov.au/update-payment"))

    db.commit()
    db.refresh(prop)

    # v1.x extras — water quarters, waste routes, animals, DAs. Idempotent.
    from app.routers.v1x import seed_demo_extras  # noqa: PLC0415 (circular guard)
    from app.routers.v2_features import seed_v2_demo  # noqa: PLC0415

    seed_demo_extras(db, council_id=council.id, property_id=prop.id)
    seed_v2_demo(db, council_id=council.id)
    return prop
