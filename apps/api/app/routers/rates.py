"""Resident-facing rates endpoints. Scoped by property ownership."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import (
    BillingSetting,
    Concession,
    Council,
    InvoiceStatus,
    Property,
    PropertyOverlay,
    PropertyOwnership,
    RateCharge,
    RatesAccount,
    RatesInvoice,
    User,
    Valuation,
    WasteEntitlement,
)
from app.schemas.rates import (
    AccountOut,
    BillingSettingOut,
    BpayOut,
    ConcessionOut,
    InvoiceOut,
    OverlayOut,
    PropertyDetail,
    PropertyListItem,
    RateChargeOut,
    ValuationOut,
    WasteEntitlementOut,
)
from app.services import r2
from app.services.rates import (
    bpay_deep_link,
    ensure_crn,
    seed_demo_property_for_user,
)

router = APIRouter(prefix="/rates", tags=["rates"])


def _owned_properties(db: Session, user: User) -> list[Property]:
    return (
        db.query(Property)
        .join(PropertyOwnership, PropertyOwnership.property_id == Property.id)
        .filter(
            PropertyOwnership.user_id == user.id,
            Property.council_id == user.council_id,
        )
        .order_by(Property.id)
        .all()
    )


def _owned_property(db: Session, *, user: User, property_id: int) -> Property:
    prop = db.get(Property, property_id)
    if prop is None or prop.council_id != user.council_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")
    own = (
        db.query(PropertyOwnership)
        .filter(PropertyOwnership.property_id == prop.id, PropertyOwnership.user_id == user.id)
        .first()
    )
    if own is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")
    return prop


def _account_overdue(account: RatesAccount | None) -> bool:
    if account is None or account.balance_cents <= 0 or account.next_due_date is None:
        return False
    return account.next_due_date < date.today()


def _serialize_account(acc: RatesAccount | None) -> AccountOut | None:
    if acc is None:
        return None
    return AccountOut(
        id=acc.id,
        account_number=acc.account_number,
        balance_cents=acc.balance_cents,
        next_due_date=acc.next_due_date,
        ebilling_enabled=acc.ebilling_enabled,
    )


@router.get("/properties", response_model=list[PropertyListItem])
def list_properties(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[PropertyListItem]:
    out: list[PropertyListItem] = []
    for prop in _owned_properties(db, user):
        out.append(
            PropertyListItem(
                id=prop.id,
                address=prop.address,
                suburb=prop.suburb,
                postcode=prop.postcode,
                property_type=prop.property_type,
                account=_serialize_account(prop.account),
                overdue=_account_overdue(prop.account),
            )
        )
    return out


@router.post("/demo-seed", response_model=PropertyListItem, status_code=status.HTTP_201_CREATED)
def demo_seed(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PropertyListItem:
    """Dev/demo only — gives the caller one fully-populated rates property.

    Idempotent: returns the existing seeded property if the user already owns
    one. Disabled in production via env in M8 hardening.
    """
    council = db.get(Council, user.council_id)
    if council is None:
        raise HTTPException(status_code=400, detail="No council")
    prop = seed_demo_property_for_user(db, council=council, user=user)
    return PropertyListItem(
        id=prop.id,
        address=prop.address,
        suburb=prop.suburb,
        postcode=prop.postcode,
        property_type=prop.property_type,
        account=_serialize_account(prop.account),
        overdue=_account_overdue(prop.account),
    )


@router.get("/properties/{property_id}", response_model=PropertyDetail)
def get_property(
    property_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PropertyDetail:
    prop = _owned_property(db, user=user, property_id=property_id)
    council = db.get(Council, prop.council_id)

    valuations = (
        db.query(Valuation)
        .filter(Valuation.property_id == prop.id)
        .order_by(Valuation.year.desc())
        .all()
    )
    charges = (
        db.query(RateCharge)
        .filter(RateCharge.property_id == prop.id)
        .order_by(RateCharge.period_start.desc(), RateCharge.category)
        .all()
    )
    concessions = db.query(Concession).filter(Concession.property_id == prop.id).all()
    overlays = db.query(PropertyOverlay).filter(PropertyOverlay.property_id == prop.id).all()
    waste = db.query(WasteEntitlement).filter(WasteEntitlement.property_id == prop.id).first()
    billing = db.query(BillingSetting).filter(BillingSetting.property_id == prop.id).first()

    return PropertyDetail(
        id=prop.id,
        address=prop.address,
        suburb=prop.suburb,
        postcode=prop.postcode,
        property_type=prop.property_type,
        lat=prop.lat,
        lng=prop.lng,
        zone=prop.zone,
        land_size_sqm=prop.land_size_sqm,
        account=_serialize_account(prop.account),
        valuations=[
            ValuationOut(year=v.year, land_value_cents=v.land_value_cents, capital_value_cents=v.capital_value_cents)
            for v in valuations
        ],
        rate_charges=[
            RateChargeOut(
                period_start=c.period_start,
                period_end=c.period_end,
                category=c.category,
                amount_cents=c.amount_cents,
                note=c.note,
            )
            for c in charges
        ],
        concessions=[
            ConcessionOut(
                type=c.type, status=c.status, annual_value_cents=c.annual_value_cents, link_apply=c.link_apply
            )
            for c in concessions
        ],
        overlays=[OverlayOut(kind=o.kind, source=o.source, note=o.note) for o in overlays],
        waste_entitlement=(
            WasteEntitlementOut(
                bin_size_l=waste.bin_size_l,
                extra_bins=waste.extra_bins,
                collection_day=waste.collection_day,
                notes=waste.notes,
            )
            if waste
            else None
        ),
        billing_setting=(
            BillingSettingOut(
                direct_debit_active=billing.direct_debit_active,
                ebill_active=billing.ebill_active,
                update_payment_link=billing.update_payment_link,
            )
            if billing
            else None
        ),
        council_contact={
            "council_name": council.name if council else None,
            "logo_url": council.logo_url if council else None,
        },
    )


@router.get("/properties/{property_id}/invoices", response_model=list[InvoiceOut])
def list_invoices(
    property_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[InvoiceOut]:
    prop = _owned_property(db, user=user, property_id=property_id)
    if prop.account is None:
        return []
    rows = (
        db.query(RatesInvoice)
        .filter(RatesInvoice.account_id == prop.account.id)
        .order_by(RatesInvoice.issue_date.desc())
        .all()
    )
    return [
        InvoiceOut(
            id=inv.id,
            invoice_number=inv.invoice_number,
            issue_date=inv.issue_date,
            due_date=inv.due_date,
            amount_cents=inv.amount_cents,
            status=inv.status,
            pdf_url=(r2.presign_get(inv.pdf_r2_key) if inv.pdf_r2_key else None),
            line_items=inv.line_items,
        )
        for inv in rows
    ]


@router.get("/invoices/{invoice_id}", response_model=InvoiceOut)
def get_invoice(
    invoice_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvoiceOut:
    inv = db.get(RatesInvoice, invoice_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    # Ownership check via account -> property -> ownership.
    account = db.get(RatesAccount, inv.account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    prop = _owned_property(db, user=user, property_id=account.property_id)
    if prop.id != account.property_id:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return InvoiceOut(
        id=inv.id,
        invoice_number=inv.invoice_number,
        issue_date=inv.issue_date,
        due_date=inv.due_date,
        amount_cents=inv.amount_cents,
        status=inv.status,
        pdf_url=(r2.presign_get(inv.pdf_r2_key) if inv.pdf_r2_key else None),
        line_items=inv.line_items,
    )


@router.get("/properties/{property_id}/bpay", response_model=BpayOut)
def get_bpay(
    property_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BpayOut:
    prop = _owned_property(db, user=user, property_id=property_id)
    if prop.account is None:
        raise HTTPException(status_code=404, detail="No rates account for this property")
    council = db.get(Council, prop.council_id)
    if council is None:
        raise HTTPException(status_code=500, detail="Council missing")
    crn = ensure_crn(db, council=council, account=prop.account)
    return BpayOut(
        biller_code=crn.biller_code,
        crn=crn.crn,
        deep_link=bpay_deep_link(
            biller_code=crn.biller_code, crn=crn.crn, amount_cents=prop.account.balance_cents
        ),
    )


# Suppress unused-import warnings — kept so re-exports are obvious to readers.
_ = InvoiceStatus
