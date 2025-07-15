from flask import Blueprint, request, jsonify
from models import db, Resident
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import logging
from authlib.jose import JsonWebToken # Import JsonWebToken for encoding
from flask import current_app # To access app.config and jwt_instance

auth = Blueprint('auth', __name__)

# Initialize Authlib's JsonWebToken instance for encoding
# This needs to be done where the app context is available, or passed in.
# For simplicity, we'll get it from current_app (which holds the 'jwt_instance' from app.py)
# Or, if you prefer, you can re-initialize it here using the secret key.
# For now, let's assume jwt_instance is accessible via current_app.extensions if registered there.
# A cleaner way is to pass it from app.py or use a global if app.py makes it global.
# Let's make it simple for now and assume current_app can get it.

# In app.py, we set jwt_instance = JsonWebToken(), so we can access it via current_app.extensions
# For this to work, we need to add jwt_instance to app.extensions in app.py
# For now, let's just re-initialize it for encoding purposes within this module.
# This is less efficient but simpler for a quick refactor.
# A better way would be to pass it from app.py or use Flask's current_app.extensions.

# Let's use current_app.config['JWT_SECRET_KEY'] directly for encoding here
# and rely on the jwt_instance in app.py for decoding.

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

    # Manually create JWT using Authlib
    # Payload should contain claims like 'sub' (subject/identity) and 'exp' (expiration)
    payload = {
        'sub': new_resident.id, # Subject is the user ID
        'iat': datetime.utcnow(), # Issued at time
        'exp': datetime.utcnow() + timedelta(hours=24), # Expiration time
        'name': new_resident.name # Include name for frontend convenience (optional)
    }
    # Get the secret key from current_app.config
    token = JsonWebToken(['HS256']).encode(payload, current_app.config['JWT_SECRET_KEY'])

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

    # Manually create JWT using Authlib
    payload = {
        'sub': resident.id, # Subject is the user ID
        'iat': datetime.utcnow(), # Issued at time
        'exp': datetime.utcnow() + timedelta(hours=24), # Expiration time
        'name': resident.name # Include name for frontend convenience (optional)
    }
    token = JsonWebToken(['HS256']).encode(payload, current_app.config['JWT_SECRET_KEY'])

    print(f"✅ Login successful. Token: {token.decode('utf-8')}", flush=True) # Keep this for debugging
    return jsonify({
        "message": "Login successful.",
        "token": token.decode('utf-8') # Authlib returns bytes, decode to string
    }), 200
