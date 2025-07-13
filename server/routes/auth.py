from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, Resident
import jwt
import datetime
import os

auth = Blueprint('auth', __name__)
SECRET = os.getenv("SECRET_KEY", "changeme")


# ✅ Register (Sign Up)
@auth.route('/auth/register', methods=['POST'])
def register():
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

        token = jwt.encode({
            'id': new_user.id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }, SECRET, algorithm="HS256")

        # Convert token to string if needed
        if isinstance(token, bytes):
            token = token.decode('utf-8')

        print("✅ Registration successful. Token:", token)

        return jsonify({
            "message": "Registered successfully",
            "status": "ok",
            "token": token
        }), 201

    except Exception as e:
        print("❌ Error in /auth/register:", str(e))
        return jsonify({
            "message": "Server error occurred",
            "error": str(e)
        }), 500


# ✅ Login
@auth.route('/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json(force=True)

        if not data or not data.get('email') or not data.get('password'):
            return jsonify({"message": "Missing credentials"}), 400

        user = Resident.query.filter_by(email=data['email']).first()

        if not user or not check_password_hash(user.password_hash, data['password']):
            return jsonify({"message": "Invalid credentials"}), 401

        token = jwt.encode({
            'id': user.id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }, SECRET, algorithm="HS256")

        if isinstance(token, bytes):
            token = token.decode('utf-8')

        print("✅ Login successful. Token:", token)

        return jsonify({
            "token": token,
            "message": "Login successful",
            "status": "ok"
        }), 200

    except Exception as e:
        print("❌ Error in /auth/login:", str(e))
        return jsonify({
            "message": "Login failed",
            "error": str(e)
        }), 500
