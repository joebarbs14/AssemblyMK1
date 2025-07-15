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

class Policy(db.Model):
    __tablename__ = 'policies'
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(100), nullable=False) # Added length and nullable
    title = db.Column(db.String(200), nullable=False) # Added length and nullable
    document_url = db.Column(db.String(500)) # Added length

class Process(db.Model):
    __tablename__ = 'processes'
    id = db.Column(db.Integer, primary_key=True)
    # FIX: The foreign key references the table name, not the model name.
    # It should be 'resident.id' (lowercase) because __tablename__ = 'resident'
    # Also added nullable=False as usually a process must belong to a resident
    resident_id = db.Column(db.Integer, db.ForeignKey('resident.id'), nullable=False)
    category = db.Column(db.String(100), nullable=False) # Added length and nullable
    title = db.Column(db.String(200), nullable=False) # Added length and nullable
    # Use JSONB if you installed `sqlalchemy.dialects.postgresql.JSONB`
    # Otherwise, db.JSON (which maps to TEXT in most cases) is a fallback.
    # Given our previous discussion, JSONB is recommended for structured data.
    form_data = db.Column(JSONB) # Changed from db.JSON to JSONB
    status = db.Column(db.String(50), default='pending', nullable=False) # Added length, default, and nullable
    submitted_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, nullable=False) # Added default and nullable
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False) # Added default, onupdate, and nullable
