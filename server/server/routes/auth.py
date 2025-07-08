from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, Resident
import jwt, datetime, os

auth = Blueprint('auth', __name__)
SECRET = os.getenv("SECRET_KEY", "changeme")

@auth.route('/register', methods=['POST'])
def register():
    data = request.json
    if Resident.query.filter_by(email=data['email']).first():
        return jsonify({"message": "Email already exists"}), 409

    hashed = generate_password_hash(data['password'])
    resident = Resident(name=data['name'], email=data['email'], password_hash=hashed)
    db.session.add(resident)
    db.session.commit()
    return jsonify({"message": "Registered successfully"})

@auth.route('/login', methods=['POST'])
def login():
    data = request.json
    user = Resident.query.filter_by(email=data['email']).first()
    if not user or not check_password_hash(user.password_hash, data['password']):
        return jsonify({"message": "Invalid credentials"}), 401

    token = jwt.encode({
        'id': user.id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }, SECRET, algorithm="HS256")
    return jsonify({"token": token})