# routes/rates.py
from flask import Blueprint, jsonify, g
from sqlalchemy import desc
from models import (
    db,
    Resident,
    Property,
    Council,
    RatesAccount,
    RatesBill,            # <-- matches your models.py
    Valuation,
    RateCharge,
    WasteEntitlement,
    Concession,
    PropertyOverlay,
    BillingSetting,
    CouncilContact,
)

from routes.decorators import auth_required

rates_bp = Blueprint("rates", __name__)

# ---------- helpers ----------

def _money_from_cents(v):
    if v is None:
        return None
    try:
        return round(int(v) / 100.0, 2)
    except Exception:
        return None


def _current_resident():
    """
    Find the current resident using the same fallbacks your /dashboard/ route effectively allows.
    Avoids spurious 401 -> frontend logout.
    """
    # Decorator might have placed ORM object
    if getattr(g, "user", None) and isinstance(g.user, Resident):
        return g.user

    # Or just the id
    if getattr(g, "user_id", None):
        try:
            rid = int(g.user_id)
            r = Resident.query.get(rid)
            if r:
                return r
        except Exception:
            pass

    # Some stacks expose email on g
    if getattr(g, "user_email", None):
        r = Resident.query.filter_by(email=g.user_email).first()
        if r:
            return r

    # Or raw JWT claims as dict
    payload = getattr(g, "jwt_claims", None) or getattr(g, "token_payload", None)
    if isinstance(payload, dict):
        rid = payload.get("user_id") or payload.get("sub") or payload.get("id")
        email = payload.get("email")
        if rid:
            try:
                r = Resident.query.get(int(rid))
                if r:
                    return r
            except Exception:
                pass
        if email:
            r = Resident.query.filter_by(email=email).first()
            if r:
                return r

    return None


def _serialize_bill(b: RatesBill):
    if not b:
        return None
    return {
        "id": b.id,
        "bill_date": b.bill_date.isoformat() if b.bill_date else None,
        "amount": _money_from_cents(b.amount_cents),
        "payment_status": b.payment_status,        # 'paid' | 'due' | 'overdue' | ...
        "payment_method": b.payment_method,        # 'direct_debit' | 'card' | 'bpay' ...
        "ebill_active": bool(b.ebill_active),
        "pdf_url": b.pdf_url,
    }


def _serialize_rates_block(prop: Property, council: Council):
    """
    Build the richer 'rates' payload using your current schema.
    - Account basics from RatesAccount (1:1 with property)
    - Last / recent bills from RatesBill (many:1 property)
    - Settings from BillingSetting
    - Valuations / entitlements / overlays / concessions from their tables
    - Contact links from CouncilContact
    """
    acc = RatesAccount.query.filter_by(property_id=prop.id).first()
    settings = BillingSetting.query.filter_by(property_id=prop.id).first()
    waste = WasteEntitlement.query.filter_by(property_id=prop.id).first()
    concessions = Concession.query.filter_by(property_id=prop.id).all()
    overlays = PropertyOverlay.query.filter_by(property_id=prop.id).all()
    vals = (
        Valuation.query.filter_by(property_id=prop.id)
        .order_by(Valuation.year.desc())
        .all()
    )
    contact = CouncilContact.query.filter_by(council_id=prop.council_id).first()

    # Bills (newest = last bill)
    last_bill = (
        RatesBill.query.filter_by(property_id=prop.id)
        .order_by(desc(RatesBill.bill_date))
        .first()
    )
    recent_bills = (
        RatesBill.query.filter_by(property_id=prop.id)
        .order_by(desc(RatesBill.bill_date))
        .limit(6)
        .all()
    )

    # Compose
    return {
        # Account/basics (tolerate None)
        "balance": _money_from_cents(getattr(acc, "balance_cents", None)),
        "next_due_date": getattr(acc, "next_due_date", None).isoformat()
        if getattr(acc, "next_due_date", None)
        else None,
        "instalment_schedule": getattr(acc, "instalment_plan", None) or [],

        # Settings
        "dd_active": bool(getattr(settings, "direct_debit_active", False)),
        "ebill_active": bool(getattr(settings, "ebill_active", False)),

        # Concessions
        "concessions": [
            {
                "type": c.type,
                "status": c.status,
                "link_apply": c.link_apply,
            }
            for c in concessions
        ],

        # Valuation history
        "valuation_history": [
            {
                "year": v.year,
                "land_value": _money_from_cents(v.land_value_cents),
                "capital_value": _money_from_cents(v.capital_value_cents),
            }
            for v in vals
        ],

        # Waste entitlement
        "waste_entitlements": {
            "bin_size_l": getattr(waste, "bin_size_l", None),
            "extra_bins": getattr(waste, "extra_bins", 0),
            "collection_day": getattr(waste, "collection_day", None),
            "service_notes": getattr(waste, "service_notes", None),
        }
        if waste
        else {},

        # Overlays
        "overlays": [
            {"kind": o.kind, "source": o.source, "note": o.note} for o in overlays
        ],

        # Council contact links
        "contact_links": {
            "query_valuation": getattr(contact, "query_valuation_url", None),
            "apply_concession": getattr(contact, "apply_concession_url", None),
            "change_address": getattr(contact, "change_address_url", None),
        }
        if contact
        else {},

        # Bills
        "last_bill": _serialize_bill(last_bill) if last_bill else None,
        "recent_invoices": [_serialize_bill(b) for b in recent_bills],
    }


def _serialize_property(p: Property):
    council: Council = p.council_obj
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
        # Rich rates block
        "rates": _serialize_rates_block(p, council),
    }


# ---------- routes ----------

@rates_bp.route("/properties", methods=["GET"])
@auth_required
def get_rates_properties():
    """
    Return the authenticated resident's properties with enriched 'rates' details.
    """
    resident = _current_resident()
    if not resident:
        return jsonify({"error": "Unauthorized"}), 401

    props = (
        Property.query.filter_by(resident_id=resident.id)
        .order_by(Property.id.asc())
        .all()
    )
    return jsonify({"properties": [_serialize_property(p) for p in props]}), 200
