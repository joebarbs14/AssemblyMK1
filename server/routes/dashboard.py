from flask import Blueprint, jsonify, request
from models import Process, Property, Council # Import Property and Council models
import traceback
import logging
from routes.decorators import auth_required
from sqlalchemy.orm import joinedload # Import joinedload for eager loading

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
                    # Fetch properties for the 'Rates' category, joining with Council for logo/name
                    items = Property.query.filter_by(resident_id=user_id)\
                                  .options(joinedload(Property.council_obj)).all()
                    logging.info(f"[dashboard] Found {len(items)} properties for 'Rates' for user {user_id}.")
                    data[category] = [{
                        'id': item.id,
                        'address': item.address,
                        'council_name': item.council_obj.name if item.council_obj else None, # Get council name
                        'council_logo_url': item.council_obj.logo_url if item.council_obj else None, # Get council logo
                        'gps_coordinates': item.gps_coordinates,
                        'shape_file_data': item.shape_file_data,
                        'land_size_sqm': item.land_size_sqm,
                        'property_value': item.property_value,
                        'land_value': item.land_value,
                        'zone': item.zone,
                        'property_type': item.property_type, # Include property_type
                        'created_at': item.created_at.isoformat() if item.created_at else None,
                        'updated_at': item.updated_at.isoformat() if item.updated_at else None,
                        'type': 'property' # Add a type identifier for frontend
                    } for item in items]
                elif category == "Water":
                    # Fetch properties for 'Water' category, eager-loading WaterConsumption and Council
                    items = Property.query.filter_by(resident_id=user_id)\
                                  .options(joinedload(Property.water_consumptions))\
                                  .options(joinedload(Property.council_obj)).all()
                    logging.info(f"[dashboard] Found {len(items)} properties for 'Water' for user {user_id}.")
                    data[category] = [{
                        'id': item.id,
                        'address': item.address,
                        'council_name': item.council_obj.name if item.council_obj else None, # Get council name
                        'council_logo_url': item.council_obj.logo_url if item.council_obj else None, # Get council logo
                        'property_type': item.property_type, # Include property_type
                        'land_size_sqm': item.land_size_sqm, # Include land size for water details
                        'water_consumptions': [{
                            'id': wc.id,
                            'quarter_start_date': wc.quarter_start_date.isoformat(),
                            'consumed_litres': wc.consumed_litres,
                            'allocated_litres': wc.allocated_litres,
                            'amount_owing': wc.amount_owing,
                            'bill_due_date': wc.bill_due_date.isoformat() if wc.bill_due_date else None,
                        } for wc in item.water_consumptions],
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
