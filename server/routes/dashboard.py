from flask import Blueprint, jsonify
from models import Process # Assuming 'Process' is correctly imported from your models
from flask_jwt_extended import jwt_required, get_jwt_identity # UNCOMMENTED THIS
import traceback # Import traceback for detailed error logging

dashboard = Blueprint('dashboard', __name__)

@dashboard.route('/', methods=['GET'])
@jwt_required() # <--- UNCOMMENTED THIS LINE
def get_dashboard():
    try:
        identity = get_jwt_identity() # <--- UNCOMMENTED THIS LINE
        print(f"[dashboard] Raw JWT identity: {identity} (Type: {type(identity)})", flush=True)

        user_id = None # <--- REVERTED TO NONE
        # UNCOMMENTED the entire try-except block for user_id extraction
        try:
            if isinstance(identity, dict):
                # If identity is a dictionary, first check for 'id' directly at the top level
                if 'id' in identity:
                    user_id = int(identity['id'])
                # Then check if 'sub' exists and is a dictionary, and if 'id' is within 'sub'
                elif 'sub' in identity and isinstance(identity['sub'], dict) and 'id' in identity['sub']:
                    user_id = int(identity['sub']['id'])
                else:
                    # If it's a dictionary but 'id' or 'sub.id' is not found, log a warning
                    print(f"[dashboard] WARNING: JWT identity is a dict but no 'id' or 'sub.id' found: {identity}", flush=True)
            else:
                # If identity is not a dict, assume it's the user ID directly (int or string representation)
                user_id = int(identity)
            print(f"[dashboard] Parsed user_id: {user_id} (Type: {type(user_id)})", flush=True)
        except (ValueError, TypeError) as e:
            print(f"[dashboard] ERROR: Could not convert JWT identity '{identity}' to an integer user_id. Error: {e}", flush=True)
            traceback.print_exc() # Print traceback for detailed error logging
            # If identity cannot be converted, it's an authentication/token issue
            return jsonify({
                "error": "Invalid user identity in token",
                "details": f"Could not parse user ID from JWT: {e}"
            }), 401 # Use 401 Unauthorized for token-related issues

        # Ensure user_id was successfully extracted and is a valid integer
        if user_id is None or not isinstance(user_id, int) or user_id <= 0:
            print(f"[dashboard] ERROR: user_id is invalid or None after parsing: {user_id}.", flush=True)
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
            print(f"[dashboard] Querying for resident_id={user_id}, category={category}", flush=True)
            # Add a try-except around the database query specifically
            try:
                processes = Process.query.filter_by(resident_id=user_id, category=category).all()
                print(f"[dashboard] Found {len(processes)} processes for category '{category}' for user {user_id}.", flush=True)
                data[category] = [p.title for p in processes]
            except Exception as db_e:
                print(f"[dashboard] ERROR: Database query failed for category '{category}' and user {user_id}. Error: {db_e}", flush=True)
                traceback.print_exc() # Print traceback for database errors
                raise db_e


        return jsonify(data), 200

    except Exception as e:
        # This catches any remaining unexpected errors, including those re-raised from db_e
        print(f"[dashboard] UNEXPECTED SERVER ERROR in get_dashboard: {str(e)}", flush=True)
        traceback.print_exc() # This will print the full stack trace to your Render logs
        return jsonify({
            "error": "Unable to load dashboard due to server error",
            "details": str(e)
        }), 500
