# server/scripts/seed_rates.py
import datetime as dt
import json
from sqlalchemy import text

from app import app
from models import (
    db,
    Resident, Council, Property,
    RatesAccount, RatesBill, Valuation, RateCharge,
    WasteEntitlement, Concession, PropertyOverlay, BillingSetting, CouncilContact
)

# -----------------------------
# Helpers
# -----------------------------
def cents(x) -> int:
    """Convert dollars to integer cents."""
    return int(round(float(x) * 100))


def truncate_rates_and_properties():
    """
    Hard reset of rates domain tables + property.
    Runs each time so the seed is deterministic and repeatable.
    """
    db.session.execute(text("""
        TRUNCATE TABLE
            rates_bill,
            rates_account,
            valuation,
            rate_charge,
            waste_entitlement,
            concession,
            property_overlay,
            billing_setting,
            property
        RESTART IDENTITY CASCADE;
    """))
    db.session.commit()
    print("🧹 Truncated rates tables and property (restart identity).")


def ensure_resident(email="demo@resident.test", name="Joe Barbaro"):
    r = Resident.query.filter_by(email=email).first()
    if not r:
        r = Resident(email=email, name=name, password_hash="demo")
        db.session.add(r)
        db.session.flush()
    return r


def ensure_council(name, logo_url=None):
    c = Council.query.filter_by(name=name).first()
    if not c:
        c = Council(name=name, logo_url=logo_url)
        db.session.add(c)
        db.session.flush()

    # one contact row per council (models enforce unique=True on council_id)
    cc = CouncilContact.query.filter_by(council_id=c.id).first()
    if not cc:
        cc = CouncilContact(
            council_id=c.id,
            query_valuation_url="https://example.gov/query-valuation",
            apply_concession_url="https://example.gov/apply-concession",
            change_address_url="https://example.gov/change-address",
        )
        db.session.add(cc)
        db.session.flush()
    return c


def create_property(resident_id, council_id, address, lat, lon, prop_type="primary", zone="Residential"):
    """
    Always create a new property (we truncate before),
    so no need to check for existing.
    """
    p = Property(
        resident_id=resident_id,
        council_id=council_id,
        address=address,
        property_type=prop_type,
        zone=zone,
        land_size_sqm=500.5 if prop_type == "primary" else 800.0,
        land_value=300000 if prop_type == "primary" else 500000,
        property_value=750000 if prop_type == "primary" else 1200000,
        gps_coordinates={"lat": lat, "lon": lon},
        shape_file_data=json.dumps({
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [lon, lat],
                        [lon + 0.001, lat],
                        [lon + 0.001, lat + 0.001],
                        [lon, lat + 0.001],
                        [lon, lat]
                    ]
                ]
            },
            "properties": {}
        })
    )
    db.session.add(p)
    db.session.flush()
    return p


def seed_rates_for_property(p: Property):
    # Account + instalment plan
    acc = RatesAccount(
        property_id=p.id,
        account_number=f"RA{p.id:06d}",
        balance_cents=cents(432.10),
        next_due_date=dt.date.today() + dt.timedelta(days=30),
        instalment_plan=[
            {"seq": 1, "due_date": (dt.date.today() - dt.timedelta(days=60)).isoformat(), "amount": 400.00},
            {"seq": 2, "due_date": (dt.date.today() - dt.timedelta(days=30)).isoformat(), "amount": 400.00},
            {"seq": 3, "due_date": (dt.date.today() + dt.timedelta(days=30)).isoformat(), "amount": 400.00},
            {"seq": 4, "due_date": (dt.date.today() + dt.timedelta(days=60)).isoformat(), "amount": 400.00},
        ],
    )
    db.session.add(acc)

    # Payment/eNotice settings
    bs = BillingSetting(
        property_id=p.id,
        direct_debit_active=True,
        ebill_active=True,
        update_payment_link="https://example.gov/update-payment",
        update_notice_link="https://example.gov/enotice-settings",
    )
    db.session.add(bs)

    # Waste entitlements
    we = WasteEntitlement(
        property_id=p.id,
        bin_size_l=240,
        extra_bins=1 if p.property_type == "investment" else 0,
        collection_day="Tue",
        service_notes="Standard weekly garbage, fortnightly recycling.",
    )
    db.session.add(we)

    # Concession (demo: ineligible)
    db.session.add(Concession(property_id=p.id, type="pensioner", status="ineligible"))

    # Overlays (badges)
    db.session.add(PropertyOverlay(property_id=p.id, kind="flood"))
    db.session.add(PropertyOverlay(property_id=p.id, kind="heritage"))

    # Valuation history (last 3 years)
    year = dt.date.today().year
    vals = {year - 2: (680000, 280000), year - 1: (720000, 300000), year: (750000, 310000)}
    for y, (cv, lv) in vals.items():
        db.session.add(Valuation(
            property_id=p.id,
            year=y,
            capital_value_cents=cents(cv),
            land_value_cents=cents(lv),
        ))

    # Charges (current period)
    period_start = dt.date(year, 7, 1)
    period_end = dt.date(year + 1, 6, 30)
    db.session.add(RateCharge(property_id=p.id, period_start=period_start, period_end=period_end,
                              category="general_rate", description="General rate", amount_cents=cents(1200)))
    db.session.add(RateCharge(property_id=p.id, period_start=period_start, period_end=period_end,
                              category="waste", description="Waste service", amount_cents=cents(420)))
    db.session.add(RateCharge(property_id=p.id, period_start=period_start, period_end=period_end,
                              category="stormwater", description="Stormwater mgmt", amount_cents=cents(35)))
    db.session.add(RateCharge(property_id=p.id, period_start=period_start, period_end=period_end,
                              category="levy", description="Environmental levy", amount_cents=cents(18)))

    # Bills (newest = "last bill")
    db.session.add(RatesBill(property_id=p.id, bill_date=dt.date.today() - dt.timedelta(days=120),
                             amount_cents=cents(380.00), payment_status="paid",
                             payment_method="card", ebill_active=True,
                             pdf_url="https://example.gov/bill-1.pdf"))
    db.session.add(RatesBill(property_id=p.id, bill_date=dt.date.today() - dt.timedelta(days=60),
                             amount_cents=cents(395.00), payment_status="paid",
                             payment_method="direct_debit", ebill_active=True,
                             pdf_url="https://example.gov/bill-2.pdf"))
    db.session.add(RatesBill(property_id=p.id, bill_date=dt.date.today() - dt.timedelta(days=5),
                             amount_cents=cents(410.50), payment_status="due",
                             payment_method="direct_debit", ebill_active=True,
                             pdf_url="https://example.gov/bill-3.pdf"))


# -----------------------------
# Entry point
# -----------------------------
def run():
    with app.app_context():
        # Make sure tables exist first (first ever run), then hard reset
        db.create_all()
        truncate_rates_and_properties()

        # Councils
        cos = ensure_council(
            "City of Sydney",
            logo_url="https://upload.wikimedia.org/wikipedia/commons/2/20/City_of_Sydney_Logo.png"
        )
        nb = ensure_council(
            "Northern Beaches Council",
            logo_url="https://upload.wikimedia.org/wikipedia/commons/2/2a/Northern_Beaches_Council_logo.png"
        )

        # Resident
        res = ensure_resident()

        # Properties (fresh each run because we truncated)
        p1 = create_property(res.id, cos.id, "123 Main Street", -33.8688, 151.2093, "primary", "Residential")
        p2 = create_property(res.id, nb.id,  "45 Elm Avenue",   -33.7475, 151.2890, "investment", "Commercial")

        # Seed rates domain for each property
        seed_rates_for_property(p1)
        seed_rates_for_property(p2)

        db.session.commit()
        print("✅ Seed complete. Open the app and check the Rates tab.")


if __name__ == "__main__":
    run()
