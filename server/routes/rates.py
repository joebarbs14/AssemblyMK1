# routes/rates.py
from flask import Blueprint, jsonify, g
from sqlalchemy import desc
from models import (
    db,
    Resident,
    Property,
    Council,
    RatesAccount,
    RatesInvoice,
)
from routes.decorators import auth_required

rates_bp = Blueprint('rates', __name__)

# ---------- helpers ----------

def _money_from_cents(v):
    if v is None:
        return None
    try:
        return round(int(v) / 100.0, 2)
    except Exception:
        return None

def _money_line_items(items):
    """
    Convert line items like [{"label":"General rate","amount_cents":12345}, ...]
    into [{"label":"General rate","amount":123.45}, ...]
    """
    if not items:
        return []
    out = []
    for it in items:
        label = it.get("label") or it.get("code") or "Item"
        amount_cents = it.get("amount_cents")
        out.append({
            "label": label,
            "amount": _money_from_cents(amount_cents),
        })
    return out

def _serialize_invoice(inv: RatesInvoice):
    return {
        "id": inv.id,
        "issue_date": inv.issue_date.isoformat() if inv.issue_date else None,
        "due_date": inv.due_date.isoformat() if inv.due_date else None,
        "amount": _money_from_cents(inv.amount_cents),
        "status": inv.status,  # issued | paid | overdue | cancelled
        "payment_method_suggested": inv.payment_method_suggested,
        "line_items": _money_line_items(inv.line_items),
    }

def _serialize_rates_account(acc: RatesAccount):
    """
    Map the new richer RatesAccount into a frontend-friendly structure.
    Compatible with the new RatesDetails component.
    """
    if not acc:
        return {
            "balance": None,
            "next_due_date": None,
            "instalment_schedule": [],
            "concessions": {},
            "dd_active": False,
            "ebill_active": False,
            "valuation_history": [],
            "waste_entitlements": {},
            "overlays": [],
            "contact_links": {},
            "last_bill": None,
            "recent_invoices": [],
        }

    # last bill = most recent by issue_date (fallback: due_date)
    last = None
    if acc.invoices:
        last = sorted(
            acc.invoices,
            key=lambda x: (x.issue_date or x.due_date or None),
            reverse=True
        )[0]

    # recent invoices (limit 6) ordered by issue_date desc (fallback due_date)
    recent = []
    if acc.invoices:
        recent = sorted(
            acc.invoices,
            key=lambda x: (x.issue_date or x.due_date or None),
            reverse=True
        )[:6]

    # direct debit: accept either boolean or {active: bool, ...}
    dd_active = False
    if isinstance(acc.direct_debit, dict):
        dd_active = bool(acc.direct_debit.get("active"))
    elif isinstance(acc.direct_debit, bool):
        dd_active = acc.direct_debit

    return {
        "balance": _money_from_cents(acc.balance_cents),
        "next_due_date": acc.next_due_date.isoformat() if acc.next_due_date else None,
        "instalment_schedule": acc.instalment_plan or [],         # [{seq, due_date, amount_cents}] (frontend can format)
        "concessions": acc.concessions or {},                      # arbitrary concessions payload
        "dd_active": dd_active,
        "ebill_active": bool(acc.ebilling_enabled),
        "valuation_history": acc.valuation_history or [],          # [{year, land_value_cents, capital_value_cents}]
        "waste_entitlements": acc.waste_entitlements or {},        # {"bin_size_l":240, ...}
        "overlays": acc.overlays or [],                            # ["Flood","Heritage"]
        "contact_links": acc.contact_links or {},                  # {"apply_concession": "...", ...}
        "last_bill": _serialize_invoice(last) if last else None,
        "recent_invoices": [_serialize_invoice(i) for i in recent],
    }

def _serialize_property(p: Property):
    council: Council = p.council_obj
    acc: RatesAccount = RatesAccount.query.filter_by(property_id=p.id).first()

    return {
        "id": p.id,
        "address": p.address,
        "property_type": p.property_type,
        "land_size_sqm": p.land_size_sqm,
        "property_value": p.property_value,
        "land_value": p.land_value,
        "zone": p.zone,
        "gps_coordinates": p.gps_coordinates or None,
        "shape_file_data": p.shape_file_data or None,
        "council_name": council.name if council else None,
        "council_logo_url": council.logo_url if council else None,
        # rich rates block
        "rates": _serialize_rates_account(acc),
    }

# ---------- routes ----------

@rates_bp.route('/properties', methods=['GET'])
@auth_required
def get_rates_properties():
    """
    Returns the authenticated resident's properties with enriched 'rates' details.

    Response:
    {
      "properties": [
        {
          "id": ...,
          "address": "...",
          "council_name": "...",
          "council_logo_url": "...",
          "gps_coordinates": {...} | null,
          "shape_file_data": "...json..." | null,
          ...basic property fields...,
          "rates": {
             "balance": 123.45,
             "next_due_date": "YYYY-MM-DD",
             "instalment_schedule": [...],
             "concessions": {...},
             "dd_active": true/false,
             "ebill_active": true/false,
             "valuation_history": [...],
             "waste_entitlements": {...},
             "overlays": [...],
             "contact_links": {...},
             "last_bill": {...} | null,
             "recent_invoices": [...]
          }
        },
        ...
      ]
    }
    """
    # The auth_required decorator typically sets g.user_id (int) or g.user (Resident)
    resident = None
    if getattr(g, "user_id", None):
        resident = Resident.query.get(int(g.user_id))
    elif getattr(g, "user", None) and isinstance(g.user, Resident):
        resident = g.user

    if not resident:
        return jsonify({"error": "Unauthorized"}), 401

    props = (
        Property.query
        .filter_by(resident_id=resident.id)
        .order_by(Property.id.asc())
        .all()
    )

    return jsonify({"properties": [_serialize_property(p) for p in props]}), 200
