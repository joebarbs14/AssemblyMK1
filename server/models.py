from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSONB # For JSONB type
import datetime # For datetime.datetime.utcnow()

db = SQLAlchemy()

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
    # New: Link Resident to a Council (optional, if a resident belongs to one council)
    # You might add a foreign key here if a resident is tied to a specific council.
    # For now, we'll assume the link is primarily through Property.

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

class Property(db.Model):
    __tablename__ = 'property'
    id = db.Column(db.Integer, primary_key=True)
    resident_id = db.Column(db.Integer, db.ForeignKey('resident.id'), nullable=False)
    # New: Link Property to a Council
    council_id = db.Column(db.Integer, db.ForeignKey('council.id'), nullable=False) # Foreign key to Council
    address = db.Column(db.String(255), nullable=False)
    # Removed direct 'council' string as it will come from the relationship
    gps_coordinates = db.Column(JSONB, nullable=True)
    shape_file_data = db.Column(db.Text, nullable=True) # Could be JSONB for complex geoJSON
    land_size_sqm = db.Column(db.Float, nullable=True)
    property_value = db.Column(db.Float, nullable=True)
    land_value = db.Column(db.Float, nullable=True)
    zone = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)

    # Relationship to Council
    council_obj = db.relationship('Council', backref='properties', lazy=True)

    def __repr__(self):
        return f'<Property {self.address}>'

# New Council Model
class Council(db.Model):
    __tablename__ = 'council'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), unique=True, nullable=False) # e.g., "City of Sydney"
    shire_name = db.Column(db.String(200), nullable=True) # e.g., "Sydney" (if different from name)
    logo_url = db.Column(db.String(500), nullable=True)
    population = db.Column(db.Integer, nullable=True)
    # Storing shape file as TEXT for simplicity. For complex GeoJSON, JSONB might be better.
    lga_shape_file = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f'<Council {self.name}>'
