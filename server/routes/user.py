from flask import Blueprint, jsonify, request
from models import Resident, Property, Council # Import Property and Council models
import logging
from routes.decorators import auth_required
from sqlalchemy.orm import joinedload # Import joinedload for eager loading

user_bp = Blueprint('user_bp', __name__)

@user_bp.route('/profile', methods=['GET'])
@auth_required
def get_user_profile():
    user_id = request.current_identity
    logging.info(f"Fetching profile for user_id: {user_id}")

    resident = Resident.query.get(user_id)

    if not resident:
        logging.warning(f"User profile not found for user_id: {user_id}")
        return jsonify({"message": "User not found"}), 404

    council_name = None
    council_logo_url = None

    # Attempt to find a property for the resident to get their council details
    # We'll just take the first property found for simplicity for the dashboard header
    user_property = Property.query.filter_by(resident_id=user_id)\
                                  .options(joinedload(Property.council_obj))\
                                  .first()

    if user_property and user_property.council_obj:
        council_name = user_property.council_obj.name
        council_logo_url = user_property.council_obj.logo_url
        logging.info(f"Found council for user {user_id}: {council_name} with logo {council_logo_url}")
    else:
        logging.info(f"No property or council found for user {user_id}. Council info will be null.")

    return jsonify({
        "id": resident.id,
        "name": resident.name,
        "email": resident.email,
        "council_name": council_name,        # Include council name
        "council_logo_url": council_logo_url # Include council logo URL
    }), 200
