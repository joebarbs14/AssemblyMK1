from flask import Blueprint, jsonify, request # Import request
from models import Resident
import logging
from app import auth_required # Import the custom decorator from app.py

user_bp = Blueprint('user_bp', __name__)

@user_bp.route('/profile', methods=['GET'])
@auth_required # Use the custom authentication decorator
def get_user_profile():
    # Get the identity from request.current_identity set by the auth_required decorator
    user_id = request.current_identity
    logging.info(f"Fetching profile for user_id: {user_id}", flush=True)

    resident = Resident.query.get(user_id)

    if resident:
        logging.info(f"User profile found for {user_id}: {resident.name}", flush=True)
        return jsonify({"id": resident.id, "name": resident.name, "email": resident.email}), 200
    else:
        logging.warning(f"User profile not found for user_id: {user_id}", flush=True)
        return jsonify({"message": "User not found"}), 404
