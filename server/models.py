from flask_sqlalchemy import SQLAlchemy
# Import JSONB from SQLAlchemy's PostgreSQL dialects if you intend to use JSONB type in PostgreSQL
from sqlalchemy.dialects.postgresql import JSONB
import datetime # Import datetime if you use datetime.datetime.utcnow() for default values

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
    # FIX: The foreign key references the table name, not the model name.
    # It should be 'resident.id' (lowercase) because __tablename__ = 'resident'
    resident_id = db.Column(db.Integer, db.ForeignKey('resident.id'), nullable=False)
    category = db.Column(db.String(100), nullable=False) # Added length and nullable
    title = db.Column(db.String(200), nullable=False) # Added length and nullable
    # Use JSONB if you installed `sqlalchemy.dialects.postgresql.JSONB`
    form_data = db.Column(JSONB) # Changed from db.JSON to JSONB
    status = db.Column(db.String(50), default='pending', nullable=False) # Added length, default, and nullable
    submitted_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, nullable=False) # Added default and nullable
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False) # Added default, onupdate, and nullable

    def __repr__(self):
        return f'<Process {self.title}>'

# New Property Model (Re-added as it was missing from your provided code)
class Property(db.Model):
    __tablename__ = 'property' # Explicitly define table name
    id = db.Column(db.Integer, primary_key=True)
    resident_id = db.Column(db.Integer, db.ForeignKey('resident.id'), nullable=False)
    address = db.Column(db.String(255), nullable=False)
    council = db.Column(db.String(100), nullable=False)
    gps_coordinates = db.Column(JSONB, nullable=True) # Storing as JSONB for flexibility
    shape_file_data = db.Column(db.Text, nullable=True) # Storing as Text, could be JSON for complex shapes
    land_size_sqm = db.Column(db.Float, nullable=True)
    property_value = db.Column(db.Float, nullable=True)
    land_value = db.Column(db.Float, nullable=True)
    zone = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f'<Property {self.address}>'
