from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, Resident
from flask_jwt_extended import create_access_token
import datetime

auth = Blueprint('auth', __name__)


# ✅ Register (Sign Up)
@auth.route('/register', methods=['POST', 'OPTIONS'])
def register():
    if request.method == 'OPTIONS':
        return '', 200  # Handle CORS preflight

    try:
        data = request.get_json(force=True)

        if not data or not data.get('email') or not data.get('password') or not data.get('name'):
            return jsonify({"message": "Missing required fields"}), 400

        if Resident.query.filter_by(email=data['email']).first():
            return jsonify({"message": "Email already exists"}), 409

        hashed = generate_password_hash(data['password'])

        new_user = Resident(
            name=data['name'],
            email=data['email'],
            password_hash=hashed,
            created_at=datetime.datetime.utcnow()
        )
        db.session.add(new_user)
        db.session.commit()

        access_token = create_access_token(identity={"id": new_user.id, "name": new_user.name})

        print("✅ Registration successful. Token:", access_token)

        return jsonify({
            "message": "Registered successfully",
            "status": "ok",
            "token": access_token
        }), 201

    except Exception as e:
        print("❌ Error in /register:", str(e))
        return jsonify({
            "message": "Server error occurred",
            "error": str(e)
        }), 500


# ✅ Login
@auth.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return '', 200  # Handle CORS preflight

    try:
        data = request.get_json(force=True)

        if not data or not data.get('email') or not data.get('password'):
            return jsonify({"message": "Missing credentials"}), 400

        user = Resident.query.filter_by(email=data['email']).first()

        if not user or not check_password_hash(user.password_hash, data['password']):
            return jsonify({"message": "Invalid credentials"}), 401

        access_token = create_access_token(identity={"id": user.id, "name": user.name})

        print("✅ Login successful. Token:", access_token)

        return jsonify({
            "token": access_token,
            "message": "Login successful",
            "status": "ok"
        }), 200

    except Exception as e:
        print("❌ Error in /login:", str(e))
        return jsonify({
            "message": "Login failed",
            "error": str(e)
        }), 500
