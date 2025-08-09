# routes/rates.py
from flask import Blueprint, jsonify, request, g
from sqlalchemy import desc
from models import (
    db,
    Resident,
    Property,
    Council,
    RatesAccount,     # <- from your updated models.py
    RatesInvoice,     # <- from your updated models.py
)
from routes.decorators import auth_required

rates_bp = Blueprint('rates', __name__)

def _money_from_cents(v):
    """Return a float dollars value from an integer cents field (or None)."""
    if v is None:
        return None
    try:
        return round(int(v) / 100.0, 2)
    except Exception:
        return None

def _serialize_invoice(inv: RatesInvoice):
    return {
        "id": inv.id,
        "period_start": inv.period_start.isoformat() if inv.period_start else None,
        "period_end": inv.period_end.isoformat() if inv.period_end else None,
        "amount": _money_from_cents(inv.amount_cents),
        "status": inv.status,             # e.g. "paid", "issued", "overdue"
        "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
        "method": inv.method,             # e.g. "Direct Debit", "Card", "BPAY"
        "breakdown": inv.breakdown or {}, # { "general_rate": 123.45, "waste": 78.90, ... } (dollars)
    }

def _serialize_rates_account(acc: RatesAccount):
    if not acc:
        return {
            "balance": None,
            "next_due_date": None,
            "instalment_schedule": [],
            "concessions": {},
            "rebates": {},
            "dd_active": False,
            "ebill_active": False,
            "valuation_history": [],
            "waste_entitlements": {},
            "overlays": [],
            "last_bill": None,
            "recent_invoices": [],
        }

    # Most recent invoice (for “last bill”)
    last_inv = (
        RatesInvoice.query
        .filter_by(property_id=acc.property_id)
        .order_by(desc(RatesInvoice.period_end))
        .first()
    )

    # A few recent invoices for history
    recent_invoices = (
        RatesInvoice.query
        .filter_by(property_id=acc.property_id)
        .order_by(desc(RatesInvoice.period_end))
        .limit(6)
        .all()
    )

    return {
        "balance": _money_from_cents(acc.balance_cents),
        "next_due_date": acc.next_due_date.isoformat() if acc.next_due_date else None,
        "instalment_schedule": acc.instalment_schedule or [],  # list of {due_date, amount}
        "concessions": acc.concessions or {},                  # {eligible: bool, type: "...", link: "..."}
        "rebates": acc.rebates or {},                          # arbitrary structure if needed
        "dd_active": bool(acc.dd_active),
        "ebill_active": bool(acc.ebill_active),
        "valuation_history": acc.valuation_history or [],      # [{year, capital_value, land_value, percent_change}]
        "waste_entitlements": acc.waste_entitlements or {},    # {general, recycling, green: sizes/fees}
        "overlays": acc.overlays or [],                        # ["flood", "bushfire", ...]
        "last_bill": _serialize_invoice(last_inv) if last_inv else None,
        "recent_invoices": [_serialize_invoice(i) for i in recent_invoices],
    }

def _serialize_property(p: Property):
    council: Council = p.council_obj
    acc = RatesAccount.query.filter_by(property_id=p.id).first()

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
        # Rich rates block (new)
        "rates": _serialize_rates_account(acc),
    }

@rates_bp.route('/properties', methods=['GET'])
@auth_required
def get_rates_properties():
    """
    Returns the calling resident's properties with enriched 'rates' details.
    Response:
    {
      "properties": [ { ...property fields..., "rates": {...} }, ... ]
    }
    """
    # The auth_required decorator typically sets g.user_id (or g.user).
    # We support both patterns to be safe.
    resident = None
    if getattr(g, "user_id", None):
        resident = Resident.query.get(int(g.user_id))
    elif getattr(g, "user", None) and isinstance(g.user, Resident):
        resident = g.user

    if not resident:
        # Fallback/defensive — should not happen if auth_required works correctly.
        return jsonify({"error": "Unauthorized"}), 401

    props = (
        Property.query
        .filter_by(resident_id=resident.id)
        .order_by(Property.id.asc())
        .all()
    )

    payload = {
        "properties": [_serialize_property(p) for p in props]
    }
    return jsonify(payload), 200
