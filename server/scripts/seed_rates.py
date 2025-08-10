# server/scripts/seed_rates.py
import datetime as dt
import json
from app import app
from models import (
    db, Resident, Council, Property,
    RatesAccount, RatesBill, Valuation, RateCharge,
    WasteEntitlement, Concession, PropertyOverlay, BillingSetting, CouncilContact
)

def cents(x):  # convenience
    return int(round(float(x) * 100))

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
    # add simple contacts
    cc = CouncilContact.query.filter_by(council_id=c.id).first()
    if not cc:
        cc = CouncilContact(
            council_id=c.id,
            query_valuation_url="https://example.gov/query-valuation",
            apply_concession_url="https://example.gov/apply-concession",
            change_address_url="https://example.gov/change-address",
        )
        db.session.add(cc)
    return c

def ensure_property(resident_id, council_id, address, lat, lon, prop_type="primary", zone="Residential"):
    p = Property.query.filter_by(resident_id=resident_id, address=address).first()
    if not p:
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
                    "coordinates": [[[lon,lat],[lon+0.001,lat],[lon+0.001,lat+0.001],[lon,lat+0.001],[lon,lat]]]
                },
                "properties": {}
            })
        )
        db.session.add(p)
        db.session.flush()
    return p

def seed_rates_for_property(p: Property):
    # Account + instalments
    acc = RatesAccount.query.filter_by(property_id=p.id).first()
    if not acc:
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
    bs = BillingSetting.query.filter_by(property_id=p.id).first()
    if not bs:
        bs = BillingSetting(
            property_id=p.id,
            direct_debit_active=True,
            ebill_active=True,
            update_payment_link="https://example.gov/update-payment",
            update_notice_link="https://example.gov/enotice-settings",
        )
        db.session.add(bs)

    # Waste entitlements
    we = WasteEntitlement.query.filter_by(property_id=p.id).first()
    if not we:
        we = WasteEntitlement(
            property_id=p.id,
            bin_size_l=240,
            extra_bins=1 if p.property_type == "investment" else 0,
            collection_day="Tue",
            service_notes="Standard weekly garbage, fortnightly recycling.",
        )
        db.session.add(we)

    # Concession (not eligible for demo)
    if not Concession.query.filter_by(property_id=p.id).first():
        db.session.add(Concession(property_id=p.id, type="pensioner", status="ineligible"))

    # Overlays
    if not PropertyOverlay.query.filter_by(property_id=p.id).first():
        db.session.add(PropertyOverlay(property_id=p.id, kind="flood"))
        db.session.add(PropertyOverlay(property_id=p.id, kind="heritage"))

    # Valuation history (last 3 years)
    year = dt.date.today().year
    vals = {year-2: (680000, 280000), year-1: (720000, 300000), year: (750000, 310000)}
    for y, (cv, lv) in vals.items():
        if not Valuation.query.filter_by(property_id=p.id, year=y).first():
            db.session.add(Valuation(
                property_id=p.id, year=y,
                capital_value_cents=cents(cv), land_value_cents=cents(lv)
            ))

    # Charges (current period)
    if not RateCharge.query.filter_by(property_id=p.id, category="general_rate").first():
        period_start = dt.date(year, 7, 1)
        period_end = dt.date(year+1, 6, 30)
        db.session.add(RateCharge(property_id=p.id, period_start=period_start, period_end=period_end,
                                  category="general_rate", description="General rate", amount_cents=cents(1200)))
        db.session.add(RateCharge(property_id=p.id, period_start=period_start, period_end=period_end,
                                  category="waste", description="Waste service", amount_cents=cents(420)))
        db.session.add(RateCharge(property_id=p.id, period_start=period_start, period_end=period_end,
                                  category="stormwater", description="Stormwater mgmt", amount_cents=cents(35)))
        db.session.add(RateCharge(property_id=p.id, period_start=period_start, period_end=period_end,
                                  category="levy", description="Environmental levy", amount_cents=cents(18)))

    # Bills (create a few; newest becomes "last bill")
    if not RatesBill.query.filter_by(property_id=p.id).first():
        db.session.add(RatesBill(property_id=p.id, bill_date=dt.date.today()-dt.timedelta(days=120),
                                 amount_cents=cents(380.00), payment_status="paid",
                                 payment_method="card", ebill_active=True,
                                 pdf_url="https://example.gov/bill-1.pdf"))
        db.session.add(RatesBill(property_id=p.id, bill_date=dt.date.today()-dt.timedelta(days=60),
                                 amount_cents=cents(395.00), payment_status="paid",
                                 payment_method="direct_debit", ebill_active=True,
                                 pdf_url="https://example.gov/bill-2.pdf"))
        db.session.add(RatesBill(property_id=p.id, bill_date=dt.date.today()-dt.timedelta(days=5),
                                 amount_cents=cents(410.50), payment_status="due",
                                 payment_method="direct_debit", ebill_active=True,
                                 pdf_url="https://example.gov/bill-3.pdf"))

def run():
    with app.app_context():
        db.create_all()

        # Councils
        cos = ensure_council("City of Sydney", logo_url="https://upload.wikimedia.org/wikipedia/commons/2/20/City_of_Sydney_Logo.png")
        nb  = ensure_council("Northern Beaches Council", logo_url="https://upload.wikimedia.org/wikipedia/commons/2/2a/Northern_Beaches_Council_logo.png")

        # Resident + properties
        res = ensure_resident()
        p1 = ensure_property(res.id, cos.id, "123 Main Street", -33.8688, 151.2093, "primary", "Residential")
        p2 = ensure_property(res.id, nb.id,  "45 Elm Avenue",   -33.7475, 151.2890, "investment", "Commercial")

        # Seed rates domain
        seed_rates_for_property(p1)
        seed_rates_for_property(p2)

        db.session.commit()
        print("✅ Seed complete. Try the app and open the Rates tab.")

if __name__ == "__main__":
    run()
