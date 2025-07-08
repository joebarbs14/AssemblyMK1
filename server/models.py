from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Resident(db.Model):
    __tablename__ = 'residents'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String)
    email = db.Column(db.String, unique=True)
    password_hash = db.Column(db.String)
    created_at = db.Column(db.DateTime)

class Policy(db.Model):
    __tablename__ = 'policies'
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String)
    title = db.Column(db.String)
    document_url = db.Column(db.String)

class Process(db.Model):
    __tablename__ = 'processes'
    id = db.Column(db.Integer, primary_key=True)
    resident_id = db.Column(db.Integer, db.ForeignKey('residents.id'))
    category = db.Column(db.String)
    title = db.Column(db.String)
    form_data = db.Column(db.JSON)
    status = db.Column(db.String)
    submitted_at = db.Column(db.DateTime)
    updated_at = db.Column(db.DateTime)