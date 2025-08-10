from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSONB
import datetime

db = SQLAlchemy()

# =========================
# Core / Existing Models
# =========================

class Resident(db.Model):
    __tablename__ = 'resident'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    # Relationships
    processes = db.relationship('Process', backref='resident', lazy=True)
    properties = db.relationship('Property', backref='owner', lazy=True)
    development_applications = db.relationship('DevelopmentApplication', backref='applicant', lazy=True)

    def __repr__(self):
        return f'<Resident {self.email}>'


class Policy(db.Model):
    __tablename__ = 'policies'
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    document_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f'<Policy {self.title}>'


class Process(db.Model):
    __tablename__ = 'processes'
    id = db.Column(db.Integer, primary_key=True)
    resident_id = db.Column(db.Integer, db.ForeignKey('resident.id'), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    form_data = db.Column(JSONB)
    status = db.Column(db.String(50), default='pending', nullable=False)
    submitted_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    def __repr__(self):
        return f'<Process {self.title}>'


class Council(db.Model):
    __tablename__ = 'council'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), unique=True, nullable=False)  # e.g. "City of Sydney"
    shire_name = db.Column(db.String(200), nullable=True)
    logo_url = db.Column(db.String(500), nullable=True)
    population = db.Column(db.Integer, nullable=True)
    lga_shape_file = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)

    # Relationships
    properties = db.relationship('Property', backref='council_obj', lazy=True)
    animals = db.relationship('Animal', backref='council_obj', lazy=True)
    waste_collections = db.relationship('WasteCollection', backref='council', lazy=True)
    development_applications = db.relationship('DevelopmentApplication', backref='council', lazy=True)
    contacts = db.relationship('CouncilContact', backref='council', lazy=True, uselist=True)

    def __repr__(self):
        return f'<Council {self.name}>'


class Property(db.Model):
    __tablename__ = 'property'
    id = db.Column(db.Integer, primary_key=True)
    resident_id = db.Column(db.Integer, db.ForeignKey('resident.id'), nullable=False)
    council_id = db.Column(db.Integer, db.ForeignKey('council.id'), nullable=False)
    address = db.Column(db.String(255), nullable=False)
    property_type = db.Column(db.String(50), nullable=False, default='investment')  # 'primary' | 'investment'
    gps_coordinates = db.Column(JSONB, nullable=True)  # {"lat": ..., "lon": ...}
    shape_file_data = db.Column(db.Text, nullable=True)  # GeoJSON as text
    land_size_sqm = db.Column(db.Float, nullable=True)
    property_value = db.Column(db.Float, nullable=True)
    land_value = db.Column(db.Float, nullable=True)
    zone = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)

    # Existing relationships
    water_consumptions = db.relationship('WaterConsumption', backref='property', lazy=True)
    development_applications = db.relationship('DevelopmentApplication', backref='property', lazy=True)

    # NEW: Rates domain relationships
    rates_account = db.relationship('RatesAccount', backref='property', uselist=False, lazy=True)     # 1‑to‑1
    rates_bills = db.relationship('RatesBill', backref='property', lazy=True)                         # legacy 1‑to‑many
    valuations = db.relationship('Valuation', backref='property', lazy=True)                          # 1‑to‑many
    rate_charges = db.relationship('RateCharge', backref='property', lazy=True)                       # 1‑to‑many
    waste_entitlement = db.relationship('WasteEntitlement', backref='property', uselist=False, lazy=True)  # 1‑to‑1
    concessions = db.relationship('Concession', backref='property', lazy=True)                        # 1‑to‑many
    overlays = db.relationship('PropertyOverlay', backref='property', lazy=True)                      # 1‑to‑many
    billing_setting = db.relationship('BillingSetting', backref='property', uselist=False, lazy=True) # 1‑to‑1

    def __repr__(self):
        return f'<Property {self.address}>'


class WaterConsumption(db.Model):
    __tablename__ = 'water_consumption'
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('property.id'), nullable=False)
    quarter_start_date = db.Column(db.Date, nullable=False)
    consumed_litres = db.Column(db.Float, nullable=False)
    allocated_litres = db.Column(db.Float, nullable=False)
    amount_owing = db.Column(db.Float, nullable=True)
    bill_due_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        q = 1 + (self.quarter_start_date.month - 1) // 3 if self.quarter_start_date else '?'
        y = self.quarter_start_date.year if self.quarter_start_date else '????'
        return f'<WaterConsumption Property:{self.property_id} {y}-Q{q}>'


class Animal(db.Model):
    __tablename__ = 'animal'
    id = db.Column(db.Integer, primary_key=True)
    council_id = db.Column(db.Integer, db.ForeignKey('council.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # e.g., Dog, Cat
    breed = db.Column(db.String(100), nullable=True)
    mixed = db.Column(db.Boolean, default=False, nullable=False)
    sex = db.Column(db.String(10), nullable=True)
    age = db.Column(db.String(50), nullable=True)
    temperament = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), default='available_for_adoption', nullable=False)
    main_photo_url = db.Column(db.String(500), nullable=True)
    gallery_urls = db.Column(JSONB, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f'<Animal {self.name} ({self.type})>'


class WasteCollection(db.Model):
    __tablename__ = 'waste_collection'
    id = db.Column(db.Integer, primary_key=True)
    council_id = db.Column(db.Integer, db.ForeignKey('council.id'), nullable=False)
    collection_type = db.Column(db.String(50), nullable=False)  # 'Garbage','Recycling',...
    collection_day = db.Column(db.String(20), nullable=True)
    collection_frequency = db.Column(db.String(50), nullable=True)  # 'weekly','fortnightly'
    next_collection_date = db.Column(db.DateTime, nullable=True)
    route_geojson = db.Column(JSONB, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f'<WasteCollection {self.collection_type} Council {self.council_id}>'


class DevelopmentApplication(db.Model):
    __tablename__ = 'development_application'
    id = db.Column(db.Integer, primary_key=True)
    resident_id = db.Column(db.Integer, db.ForeignKey('resident.id'), nullable=False)
    property_id = db.Column(db.Integer, db.ForeignKey('property.id'), nullable=False)
    council_id = db.Column(db.Integer, db.ForeignKey('council.id'), nullable=False)
    application_type = db.Column(db.String(100), nullable=False)  # 'DA','CDC',...
    status = db.Column(db.String(50), default='Submitted', nullable=False)
    submission_date = db.Column(db.DateTime, default=datetime.datetime.utcnow, nullable=False)
    approval_date = db.Column(db.DateTime, nullable=True)
    estimated_cost = db.Column(db.Float, nullable=True)
    description = db.Column(db.Text, nullable=True)
    documents_url = db.Column(JSONB, nullable=True)  # array of URLs
    gps_coordinates = db.Column(JSONB, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f'<DevelopmentApplication {self.application_type} - {self.status}>'


# =========================
# NEW: Rates Domain Models
# =========================

class RatesAccount(db.Model):
    __tablename__ = 'rates_account'
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('property.id'), nullable=False, unique=True)  # 1:1
    account_number = db.Column(db.String(64), unique=True, nullable=True)

    # Core balances & schedules
    balance_cents = db.Column(db.BigInteger, nullable=False, default=0)
    next_due_date = db.Column(db.Date, nullable=True)
    instalment_plan = db.Column(JSONB, nullable=True)  # [{seq, due_date, amount_cents}, ...]

    # Concessions / settings / overlays / links
    concessions = db.Column(JSONB, nullable=True)       # {"pensioner": true, ...}
    ebilling_enabled = db.Column(db.Boolean, default=False, nullable=False)
    direct_debit = db.Column(JSONB, nullable=True)      # {"active": true, "bsb":"", "last4":""}
    valuation_history = db.Column(JSONB, nullable=True) # [{year, land_value_cents, capital_value_cents}]
    charge_breakdown = db.Column(JSONB, nullable=True)  # [{code, label, amount_cents}]
    waste_entitlements = db.Column(JSONB, nullable=True)# {"red_bin":"140L",...}
    overlays = db.Column(JSONB, nullable=True)          # ["Flood","Heritage"]
    contact_links = db.Column(JSONB, nullable=True)     # {"apply_concession": "...", ...}

    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)

    # NEW: invoices relationship (for new endpoint/logic)
    invoices = db.relationship(
        'RatesInvoice',
        backref='account',
        lazy=True,
        cascade='all, delete-orphan'
    )

    def __repr__(self):
        return f'<RatesAccount prop={self.property_id} bal_cents={self.balance_cents}>'


# Legacy bills table kept for backward-compat
class RatesBill(db.Model):
    __tablename__ = 'rates_bill'
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('property.id'), nullable=False, index=True)
    bill_date = db.Column(db.Date, nullable=False)
    amount_cents = db.Column(db.BigInteger, nullable=False)
    payment_status = db.Column(db.String(20), nullable=False, default='due')  # 'paid','overdue','due','cancelled'
    payment_method = db.Column(db.String(30), nullable=True)  # 'direct_debit','card','bpay',...
    ebill_active = db.Column(db.Boolean, default=False, nullable=False)
    pdf_url = db.Column(db.String(500), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)

    __table_args__ = (
        db.Index('ix_rates_bill_prop_date_desc', 'property_id', 'bill_date'),
    )

    def __repr__(self):
        return f'<RatesBill prop={self.property_id} {self.bill_date} {self.amount_cents}>'


# NEW: invoice model used by /rates/properties
class RatesInvoice(db.Model):
    __tablename__ = 'rates_invoice'
    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey('rates_account.id'), nullable=False)

    issue_date = db.Column(db.Date, nullable=False)
    due_date = db.Column(db.Date, nullable=True)
    amount_cents = db.Column(db.BigInteger, nullable=False, default=0)
    status = db.Column(db.String(32), nullable=False, default='issued')  # issued | paid | overdue | cancelled
    line_items = db.Column(JSONB, nullable=True)         # [{label, amount_cents}, ...]
    payment_method_suggested = db.Column(db.String(32), nullable=True)  # 'direct_debit','bpay','card'

    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f'<RatesInvoice account_id={self.account_id} amount_cents={self.amount_cents} status={self.status}>'


class Valuation(db.Model):
    __tablename__ = 'valuation'
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('property.id'), nullable=False, index=True)
    year = db.Column(db.Integer, nullable=False)
    land_value_cents = db.Column(db.BigInteger, nullable=True)
    capital_value_cents = db.Column(db.BigInteger, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('property_id', 'year', name='uq_valuation_property_year'),
    )

    def __repr__(self):
        return f'<Valuation prop={self.property_id} {self.year}>'


class RateCharge(db.Model):
    __tablename__ = 'rate_charge'
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('property.id'), nullable=False, index=True)
    period_start = db.Column(db.Date, nullable=True)
    period_end = db.Column(db.Date, nullable=True)
    category = db.Column(db.String(50), nullable=False)  # 'general_rate','waste','stormwater','levy'
    description = db.Column(db.String(255), nullable=True)
    amount_cents = db.Column(db.BigInteger, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f'<RateCharge prop={self.property_id} {self.category} {self.amount_cents}>'


class WasteEntitlement(db.Model):
    __tablename__ = 'waste_entitlement'
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('property.id'), nullable=False, unique=True)  # 1:1
    bin_size_l = db.Column(db.Integer, nullable=True)       # 120,140,240
    extra_bins = db.Column(db.Integer, default=0, nullable=False)
    service_notes = db.Column(db.Text, nullable=True)
    collection_day = db.Column(db.String(10), nullable=True)  # 'Mon','Tue',...

    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f'<WasteEntitlement prop={self.property_id} {self.bin_size_l}L x{self.extra_bins}>'


class Concession(db.Model):
    __tablename__ = 'concession'
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('property.id'), nullable=False, index=True)
    type = db.Column(db.String(50), nullable=False)  # 'pensioner','hardship','other'
    status = db.Column(db.String(20), nullable=False, default='ineligible')  # 'eligible','ineligible','applied','approved','expired'
    link_apply = db.Column(db.String(500), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f'<Concession prop={self.property_id} {self.type}:{self.status}>'


class PropertyOverlay(db.Model):
    __tablename__ = 'property_overlay'
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('property.id'), nullable=False, index=True)
    kind = db.Column(db.String(50), nullable=False)   # 'flood','bushfire','heritage', ...
    source = db.Column(db.String(200), nullable=True)
    note = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f'<PropertyOverlay prop={self.property_id} {self.kind}>'


class BillingSetting(db.Model):
    __tablename__ = 'billing_setting'
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('property.id'), nullable=False, unique=True)  # 1:1
    direct_debit_active = db.Column(db.Boolean, default=False, nullable=False)
    ebill_active = db.Column(db.Boolean, default=False, nullable=False)
    update_payment_link = db.Column(db.String(500), nullable=True)
    update_notice_link = db.Column(db.String(500), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f'<BillingSetting prop={self.property_id} dd={self.direct_debit_active} ebill={self.ebill_active}>'


class CouncilContact(db.Model):
    __tablename__ = 'council_contact'
    id = db.Column(db.Integer, primary_key=True)
    council_id = db.Column(db.Integer, db.ForeignKey('council.id'), nullable=False, unique=True)  # one row per council
    query_valuation_url = db.Column(db.String(500), nullable=True)
    apply_concession_url = db.Column(db.String(500), nullable=True)
    change_address_url = db.Column(db.String(500), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f'<CouncilContact council={self.council_id}>'
