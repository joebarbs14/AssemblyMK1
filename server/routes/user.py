from flask import Blueprint, jsonify, request
from models import Resident, Property, Council # Import Property and Council models
import logging
from routes.decorators import auth_required
from sqlalchemy.orm import joinedload # Import joinedload for eager loading

user_bp = Blueprint('user_bp', __name__)

@user_bp.route('/profile', methods=['GET'])
@auth_required # Use the custom authentication decorator
def get_user_profile():
    user_id = request.current_identity
    logging.info(f"Fetching profile for user_id: {user_id}")

    resident = Resident.query.get(user_id)

    if resident:
        logging.info(f"User profile found for {user_id}: {resident.name}")
        
        # Attempt to find a property for the resident and get its council name
        # We'll just take the first property found for simplicity
        user_council_name = None
        first_property = Property.query.filter_by(resident_id=user_id)\
                                    .options(joinedload(Property.council_obj)).first()
        
        if first_property and first_property.council_obj:
            user_council_name = first_property.council_obj.name
            logging.info(f"Found council for user {user_id}: {user_council_name}")
        else:
            logging.info(f"No property found or no council associated for user {user_id}.")

        return jsonify({
            "id": resident.id,
            "name": resident.name,
            "email": resident.email,
            "council": user_council_name # Include the council name
        }), 200
    else:
        logging.warning(f"User profile not found for user_id: {user_id}")
        return jsonify({"message": "User not found"}), 404
