from flask import Blueprint, request, jsonify, current_app
from models import db, Resident
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import logging
from authlib.jose import JsonWebToken # Keep this for encoding method directly
from routes.decorators import jwt_instance # <<< CHANGED THIS LINE - Import jwt_instance

auth = Blueprint('auth', __name__)

@auth.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    if not name or not email or not password:
        return jsonify({"message": "Missing name, email, or password"}), 400

    if Resident.query.filter_by(email=email).first():
        return jsonify({"message": "User with that email already exists"}), 409

    hashed_password = generate_password_hash(password)
    new_resident = Resident(name=name, email=email, password_hash=hashed_password, created_at=datetime.utcnow())

    db.session.add(new_resident)
    db.session.commit()

    logging.info(f"User registered: {email}", flush=True)

    # Manually create JWT using Authlib's jwt_instance
    payload = {
        'sub': new_resident.id, # Subject is the user ID
        'iat': datetime.utcnow(), # Issued at time
        'exp': datetime.utcnow() + timedelta(hours=24), # Expiration time
        'name': new_resident.name # Include name for frontend convenience (optional)
    }
    # Use the shared jwt_instance to encode the token
    token = jwt_instance.encode(payload, current_app.config['JWT_SECRET_KEY'])

    return jsonify({
        "message": "Registration successful.",
        "token": token.decode('utf-8') # Authlib returns bytes, decode to string
    }), 201

@auth.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    resident = Resident.query.filter_by(email=email).first()

    if not resident or not check_password_hash(resident.password_hash, password):
        logging.warning(f"Login failed for email: {email}", flush=True)
        return jsonify({"message": "Invalid credentials"}), 401

    logging.info(f"Login successful for user: {email}", flush=True)

    # Manually create JWT using Authlib's jwt_instance
    payload = {
        'sub': resident.id, # Subject is the user ID
        'iat': datetime.utcnow(), # Issued at time
        'exp': datetime.utcnow() + timedelta(hours=24), # Expiration time
        'name': resident.name # Include name for frontend convenience (optional)
    }
    token = jwt_instance.encode(payload, current_app.config['JWT_SECRET_KEY'])

    print(f"✅ Login successful. Token: {token.decode('utf-8')}", flush=True) # Keep this for debugging
    return jsonify({
        "message": "Login successful.",
        "token": token.decode('utf-8') # Authlib returns bytes, decode to string
    }), 200
