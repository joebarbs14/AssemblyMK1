from flask import Blueprint, jsonify, request # Import request
from models import Process, db # Ensure db is imported if used for session
import traceback
import logging
from routes.decorators import auth_required # Import the custom decorator from decorators.py

process = Blueprint('process', __name__)

# Example: A route to get all processes (protected)
@process.route('/', methods=['GET'])
@auth_required # Use the custom authentication decorator
def get_all_processes():
    try:
        user_id = request.current_identity # Get the identity from request.current_identity
        logging.info(f"[process] Authenticated user_id: {user_id} for getting all processes.", flush=True)

        # Example: Fetch processes specific to the authenticated user
        # Adjust query based on your actual Process model and relationships
        all_processes = Process.query.filter_by(resident_id=user_id).all()

        processes_data = []
        for p in all_processes:
            processes_data.append({
                'id': p.id,
                'title': p.title,
                'description': p.description,
                'category': p.category,
                'status': p.status,
                'created_at': p.created_at.isoformat(),
                'updated_at': p.updated_at.isoformat() if p.updated_at else None,
                'form_data': p.form_data # Include form_data
            })
        
        return jsonify(processes_data), 200

    except Exception as e:
        logging.error(f"[process] UNEXPECTED SERVER ERROR in get_all_processes: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Unable to load processes due to server error",
            "details": str(e)
        }), 500

# Example: A route to create a new process (protected)
@process.route('/', methods=['POST'])
@auth_required
def create_process():
    try:
        user_id = request.current_identity
        logging.info(f"[process] Authenticated user_id: {user_id} for creating a process.", flush=True)

        data = request.get_json()
        title = data.get('title')
        description = data.get('description')
        category = data.get('category')
        status = data.get('status')
        form_data = data.get('form_data') # Get form_data from request

        if not all([title, description, category, status]):
            return jsonify({"message": "Missing required fields"}), 400

        new_process = Process(
            resident_id=user_id,
            title=title,
            description=description,
            category=category,
            status=status,
            form_data=form_data # Assign form_data
        )
        db.session.add(new_process)
        db.session.commit()

        logging.info(f"[process] New process created by user {user_id}: {title}", flush=True)
        return jsonify({"message": "Process created successfully", "process_id": new_process.id}), 201

    except Exception as e:
        logging.error(f"[process] UNEXPECTED SERVER ERROR in create_process: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Unable to create process due to server error",
            "details": str(e)
        }), 500

# Example: A route to get a single process by ID (protected)
@process.route('/<int:process_id>', methods=['GET'])
@auth_required
def get_process_by_id(process_id):
    try:
        user_id = request.current_identity
        logging.info(f"[process] Authenticated user_id: {user_id} for getting process {process_id}.", flush=True)

        # Ensure user can only access their own processes
        process_item = Process.query.filter_by(id=process_id, resident_id=user_id).first()

        if not process_item:
            return jsonify({"message": "Process not found or not authorized"}), 404

        return jsonify({
            'id': process_item.id,
            'title': process_item.title,
            'description': process_item.description,
            'category': process_item.category,
            'status': process_item.status,
            'created_at': process_item.created_at.isoformat(),
            'updated_at': process_item.updated_at.isoformat() if process_item.updated_at else None,
            'form_data': process_item.form_data
        }), 200

    except Exception as e:
        logging.error(f"[process] UNEXPECTED SERVER ERROR in get_process_by_id: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Unable to retrieve process due to server error",
            "details": str(e)
        }), 500

# Example: A route to update a process (protected)
@process.route('/<int:process_id>', methods=['PUT'])
@auth_required
def update_process(process_id):
    try:
        user_id = request.current_identity
        logging.info(f"[process] Authenticated user_id: {user_id} for updating process {process_id}.", flush=True)

        process_item = Process.query.filter_by(id=process_id, resident_id=user_id).first()

        if not process_item:
            return jsonify({"message": "Process not found or not authorized"}), 404

        data = request.get_json()
        process_item.title = data.get('title', process_item.title)
        process_item.description = data.get('description', process_item.description)
        process_item.category = data.get('category', process_item.category)
        process_item.status = data.get('status', process_item.status)
        process_item.form_data = data.get('form_data', process_item.form_data) # Update form_data
        process_item.updated_at = datetime.utcnow()

        db.session.commit()
        logging.info(f"[process] Process {process_id} updated by user {user_id}.", flush=True)
        return jsonify({"message": "Process updated successfully"}), 200

    except Exception as e:
        logging.error(f"[process] UNEXPECTED SERVER ERROR in update_process: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Unable to update process due to server error",
            "details": str(e)
        }), 500

# Example: A route to delete a process (protected)
@process.route('/<int:process_id>', methods=['DELETE'])
@auth_required
def delete_process(process_id):
    try:
        user_id = request.current_identity
        logging.info(f"[process] Authenticated user_id: {user_id} for deleting process {process_id}.", flush=True)

        process_item = Process.query.filter_by(id=process_id, resident_id=user_id).first()

        if not process_item:
            return jsonify({"message": "Process not found or not authorized"}), 404

        db.session.delete(process_item)
        db.session.commit()
        logging.info(f"[process] Process {process_id} deleted by user {user_id}.", flush=True)
        return jsonify({"message": "Process deleted successfully"}), 200

    except Exception as e:
        logging.error(f"[process] UNEXPECTED SERVER ERROR in delete_process: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Unable to delete process due to server error",
            "details": str(e)
        }), 500
