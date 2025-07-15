# routes/user.py
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Resident # Import Resident model

user_bp = Blueprint('user_bp', __name__)

@user_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_user_profile():
    # get_jwt_identity() will now return the integer user ID (e.g., 1)
    user_id = get_jwt_identity()
    logging.info(f"Fetching profile for user_id: {user_id}", flush=True) # Added logging

    resident = Resident.query.get(user_id) # Fetch the resident by ID

    if resident:
        logging.info(f"User profile found for {user_id}: {resident.name}", flush=True) # Added logging
        return jsonify({"id": resident.id, "name": resident.name, "email": resident.email}), 200
    else:
        logging.warning(f"User profile not found for user_id: {user_id}", flush=True) # Added logging
        return jsonify({"message": "User not found"}), 404
