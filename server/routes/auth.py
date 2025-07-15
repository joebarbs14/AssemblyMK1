from flask import Blueprint, request, jsonify, current_app
from models import db, Resident
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import logging
from authlib.jose import JsonWebToken
from routes.decorators import jwt_instance

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

    logging.info(f"User registered: {email}")

    payload = {
        'sub': new_resident.id,
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=24),
        'name': new_resident.name
    }
    # <<< FIXED THIS LINE: Added {} for the header argument >>>
    token = jwt_instance.encode({}, payload, current_app.config['JWT_SECRET_KEY'])

    return jsonify({
        "message": "Registration successful.",
        "token": token.decode('utf-8')
    }), 201

@auth.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    resident = Resident.query.filter_by(email=email).first()

    if not resident or not check_password_hash(resident.password_hash, password):
        logging.warning(f"Login failed for email: {email}")
        return jsonify({"message": "Invalid credentials"}), 401

    logging.info(f"Login successful for user: {email}")

    payload = {
        'sub': resident.id,
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=24),
        'name': resident.name
    }
    # <<< FIXED THIS LINE: Added {} for the header argument >>>
    token = jwt_instance.encode({}, payload, current_app.config['JWT_SECRET_KEY'])

    print(f"✅ Login successful. Token: {token.decode('utf-8')}")
    return jsonify({
        "message": "Login successful.",
        "token": token.decode('utf-8')
    }), 200
