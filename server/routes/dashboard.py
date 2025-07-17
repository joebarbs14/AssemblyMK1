from flask import Blueprint, jsonify, request
from models import Process, Property # Import Property model
import traceback
import logging
from routes.decorators import auth_required

dashboard = Blueprint('dashboard', __name__)

@dashboard.route('/', methods=['GET'])
@auth_required
def get_dashboard():
    try:
        user_id = request.current_identity
        logging.info(f"[dashboard] Authenticated user_id: {user_id} (Type: {type(user_id)})")

        if user_id is None or not isinstance(user_id, int) or user_id <= 0:
            logging.error(f"[dashboard] ERROR: user_id is invalid or None after authentication: {user_id}.")
            return jsonify({
                "error": "Authentication required",
                "details": "User ID could not be determined or is invalid from the provided token."
            }), 401

        categories = [
            "Rates", "Water", "Development", "Community",
            "Roads", "Waste", "Animals", "Public Health", "Environment"
        ]

        data = {}

        for category in categories:
            logging.info(f"[dashboard] Querying for resident_id={user_id}, category={category}")
            try:
                if category == "Rates":
                    # Fetch properties for the 'Rates' category
                    items = Property.query.filter_by(resident_id=user_id).all()
                    logging.info(f"[dashboard] Found {len(items)} properties for 'Rates' for user {user_id}.")
                    data[category] = [{
                        'id': item.id,
                        'address': item.address,
                        'council': item.council,
                        'gps_coordinates': item.gps_coordinates,
                        'shape_file_data': item.shape_file_data,
                        'land_size_sqm': item.land_size_sqm,
                        'property_value': item.property_value,
                        'land_value': item.land_value,
                        'zone': item.zone,
                        'created_at': item.created_at.isoformat() if item.created_at else None,
                        'updated_at': item.updated_at.isoformat() if item.updated_at else None,
                        'type': 'property' # Add a type identifier for frontend
                    } for item in items]
                else:
                    # Fetch processes for other categories
                    items = Process.query.filter_by(resident_id=user_id, category=category).all()
                    logging.info(f"[dashboard] Found {len(items)} processes for category '{category}' for user {user_id}.")
                    data[category] = [{
                        'id': item.id,
                        'title': item.title,
                        'status': item.status,
                        'submitted_at': item.submitted_at.isoformat() if item.submitted_at else None,
                        'updated_at': item.updated_at.isoformat() if item.updated_at else None,
                        'form_data': item.form_data,
                        'type': 'process' # Add a type identifier for frontend
                    } for item in items]

            except Exception as db_e:
                logging.error(f"[dashboard] ERROR: Database query failed for category '{category}' and user {user_id}. Error: {db_e}", exc_info=True)
                raise db_e

        return jsonify(data), 200

    except Exception as e:
        logging.error(f"[dashboard] UNEXPECTED SERVER ERROR in get_dashboard: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Unable to load dashboard due to server error",
            "details": str(e)
        }), 500
