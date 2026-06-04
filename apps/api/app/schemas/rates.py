from __future__ import annotations

from datetime import date
from typing import Any

from pydantic import BaseModel


class ValuationOut(BaseModel):
    year: int
    land_value_cents: int
    capital_value_cents: int


class ConcessionOut(BaseModel):
    type: str
    status: str
    annual_value_cents: int | None
    link_apply: str | None


class OverlayOut(BaseModel):
    kind: str
    source: str | None
    note: str | None


class WasteEntitlementOut(BaseModel):
    bin_size_l: int | None
    extra_bins: int
    collection_day: str | None
    notes: str | None


class RateChargeOut(BaseModel):
    period_start: date
    period_end: date
    category: str
    amount_cents: int
    note: str | None


class InvoiceOut(BaseModel):
    id: int
    invoice_number: str
    issue_date: date
    due_date: date
    amount_cents: int
    status: str
    pdf_url: str | None
    line_items: list[dict[str, Any]] | None


class BillingSettingOut(BaseModel):
    direct_debit_active: bool
    ebill_active: bool
    update_payment_link: str | None


class AccountOut(BaseModel):
    id: int
    account_number: str
    balance_cents: int
    next_due_date: date | None
    ebilling_enabled: bool


class BpayOut(BaseModel):
    biller_code: str
    crn: str
    deep_link: str  # bpay:// or fallback instructions URL


class PropertyListItem(BaseModel):
    id: int
    address: str
    suburb: str | None
    postcode: str | None
    property_type: str
    account: AccountOut | None
    overdue: bool


class PropertyDetail(BaseModel):
    id: int
    address: str
    suburb: str | None
    postcode: str | None
    property_type: str
    lat: float | None
    lng: float | None
    zone: str | None
    land_size_sqm: int | None

    account: AccountOut | None
    valuations: list[ValuationOut]
    rate_charges: list[RateChargeOut]
    concessions: list[ConcessionOut]
    overlays: list[OverlayOut]
    waste_entitlement: WasteEntitlementOut | None
    billing_setting: BillingSettingOut | None
    council_contact: dict[str, str | None]
