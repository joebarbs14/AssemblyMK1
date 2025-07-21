from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSONB # For JSONB type
import datetime # For datetime.datetime.utcnow()

db = SQLAlchemy()

class Resident(db.Model):
    __tablename__ = 'resident'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100)) # Added length for String
    email = db.Column(db.String(100), unique=True, nullable=False) # Added length and nullable
    password_hash = db.Column(db.String(255), nullable=False) # Added length and nullable
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow) # Added default
    # Relationships to other models
    processes = db.relationship('Process', backref='resident', lazy=True)
    properties = db.relationship('Property', backref='owner', lazy=True) # Relationship to Property

    def __repr__(self):
        return f'<Resident {self.email}>'

class Policy(db.Model):
    __tablename__ = 'policies'
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(100), nullable=False) # Added length and nullable
    title = db.Column(db.String(200), nullable=False) # Added length and nullable
    document_url = db.Column(db.String(500)) # Added length
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow) # Ensure created_at is here if needed
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow) # Ensure updated_at is here if needed

    def __repr__(self):
        return f'<Policy {self.title}>'

class Process(db.Model):
    __tablename__ = 'processes'
    id = db.Column(db.Integer, primary_key=True)
    resident_id = db.Column(db.Integer, db.ForeignKey('resident.id'), nullable=False)
    category = db.Column(db.String(100), nullable=False) # Added length and nullable
    title = db.Column(db.String(200), nullable=False) # Added length and nullable
    form_data = db.Column(JSONB) # Changed from db.JSON to JSONB
    status = db.Column(db.String(50), default='pending', nullable=False) # Added length, default, and nullable
    submitted_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, nullable=False) # Added default and nullable
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False) # Added default, onupdate, and nullable

    def __repr__(self):
        return f'<Process {self.title}>'

class Council(db.Model):
    __tablename__ = 'council'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), unique=True, nullable=False) # e.g., "City of Sydney"
    shire_name = db.Column(db.String(200), nullable=True) # e.g., "Sydney" (if different from name)
    logo_url = db.Column(db.String(500), nullable=True)
    population = db.Column(db.Integer, nullable=True)
    lga_shape_file = db.Column(db.Text, nullable=True) # Could be JSONB for complex GeoJSON
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)
    # Relationship to properties and animals
    properties = db.relationship('Property', backref='council_obj', lazy=True)
    animals = db.relationship('Animal', backref='council_obj', lazy=True) # New relationship to Animal
    # New relationship for WasteCollection
    waste_collections = db.relationship('WasteCollection', backref='council', lazy=True)


    def __repr__(self):
        return f'<Council {self.name}>'

# Property Model (Updated to include relationship to WaterConsumption)
class Property(db.Model):
    __tablename__ = 'property' # Explicitly define table name
    id = db.Column(db.Integer, primary_key=True)
    resident_id = db.Column(db.Integer, db.ForeignKey('resident.id'), nullable=False)
    council_id = db.Column(db.Integer, db.ForeignKey('council.id'), nullable=False) # Foreign key to Council
    address = db.Column(db.String(255), nullable=False)
    gps_coordinates = db.Column(JSONB, nullable=True) # Storing as JSONB for flexibility
    shape_file_data = db.Column(db.Text, nullable=True) # Storing as Text, could be JSON for complex shapes
    land_size_sqm = db.Column(db.Float, nullable=True)
    property_value = db.Column(db.Float, nullable=True)
    land_value = db.Column(db.Float, nullable=True)
    zone = db.Column(db.String(100), nullable=True)
    property_type = db.Column(db.String(50), nullable=True) # Added property_type
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)
    
    # New relationship to WaterConsumption
    water_consumptions = db.relationship('WaterConsumption', backref='property', lazy=True)

    def __repr__(self):
        return f'<Property {self.address}>'

# WaterConsumption Model
class WaterConsumption(db.Model):
    __tablename__ = 'water_consumption'
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('property.id'), nullable=False)
    quarter_start_date = db.Column(db.Date, nullable=False) # Start of the calendar quarter
    consumed_litres = db.Column(db.Float, nullable=False)
    allocated_litres = db.Column(db.Float, nullable=False)
    amount_owing = db.Column(db.Float, nullable=True)
    bill_due_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f'<WaterConsumption Property:{self.property_id} Quarter:{self.quarter_start_date.year}-Q{((self.quarter_start_date.month-1)//3)+1}>'

# New Animal Model
class Animal(db.Model):
    __tablename__ = 'animal'
    id = db.Column(db.Integer, primary_key=True)
    council_id = db.Column(db.Integer, db.ForeignKey('council.id'), nullable=False) # Link to Council
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(50), nullable=False) # e.g., Dog, Cat, Rabbit
    breed = db.Column(db.String(100), nullable=True)
    mixed = db.Column(db.Boolean, default=False, nullable=False)
    sex = db.Column(db.String(10), nullable=True) # e.g., Male, Female
    age = db.Column(db.String(50), nullable=True) # e.g., "2 years", "6 months"
    temperament = db.Column(db.Text, nullable=True) # Short blurb
    status = db.Column(db.String(50), default='available_for_adoption', nullable=False) # e.g., 'available_for_adoption', 'adopted', 'lost', 'found'
    main_photo_url = db.Column(db.String(500), nullable=True)
    gallery_urls = db.Column(JSONB, nullable=True) # Store as JSONB for list of photo URLs
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f'<Animal {self.name} ({self.type})>'

# WasteCollection Model (Ensuring this is present)
class WasteCollection(db.Model):
    __tablename__ = 'waste_collection'
    id = db.Column(db.Integer, primary_key=True)
    council_id = db.Column(db.Integer, db.ForeignKey('council.id'), nullable=False)
    collection_type = db.Column(db.String(50), nullable=False) # e.g., 'Garbage', 'Recycling', 'Greenwaste', 'Repurpose'
    collection_day = db.Column(db.String(20), nullable=True) # e.g., 'Monday', 'Tuesday'
    collection_frequency = db.Column(db.String(50), nullable=True) # e.g., 'weekly', 'fortnightly'
    next_collection_date = db.Column(db.DateTime, nullable=True)
    route_geojson = db.Column(JSONB, nullable=True) # GeoJSON for the truck route
    notes = db.Column(db.Text, nullable=True) # General notes or specific instructions
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f'<WasteCollection {self.collection_type} for Council {self.council_id}>'
