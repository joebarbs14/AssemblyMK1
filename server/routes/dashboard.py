from flask import Blueprint, jsonify, request # Import request to get current_identity
from models import Process
import traceback
import logging
from app import auth_required # Import the custom decorator from app.py

dashboard = Blueprint('dashboard', __name__)

@dashboard.route('/', methods=['GET'])
@auth_required # Use the custom authentication decorator
def get_dashboard():
    try:
        # Get the identity from request.current_identity set by the auth_required decorator
        user_id = request.current_identity
        logging.info(f"[dashboard] Authenticated user_id: {user_id} (Type: {type(user_id)})", flush=True)

        # Ensure user_id was successfully extracted and is a valid integer
        if user_id is None or not isinstance(user_id, int) or user_id <= 0:
            logging.error(f"[dashboard] ERROR: user_id is invalid or None after authentication: {user_id}.", flush=True)
            return jsonify({
                "error": "Authentication required",
                "details": "User ID could not be determined or is invalid from the provided token."
            }), 401

        # Consistent categories
        categories = [
            "Rates", "Water", "Development", "Community",
            "Roads", "Waste", "Animals", "Public Health", "Environment"
        ]

        data = {}

        for category in categories:
            logging.info(f"[dashboard] Querying for resident_id={user_id}, category={category}", flush=True)
            try:
                processes = Process.query.filter_by(resident_id=user_id, category=category).all()
                logging.info(f"[dashboard] Found {len(processes)} processes for category '{category}' for user {user_id}.", flush=True)
                data[category] = [p.title for p in processes]
            except Exception as db_e:
                logging.error(f"[dashboard] ERROR: Database query failed for category '{category}' and user {user_id}. Error: {db_e}", exc_info=True)
                raise db_e # Re-raise to hit the main exception handler

        return jsonify(data), 200

    except Exception as e:
        logging.error(f"[dashboard] UNEXPECTED SERVER ERROR in get_dashboard: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Unable to load dashboard due to server error",
            "details": str(e)
        }), 500
