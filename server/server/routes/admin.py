from flask import Blueprint, jsonify, request
from models import Process, db

admin = Blueprint('admin', __name__)

@admin.route('/all', methods=['GET'])
def all_processes():
    processes = Process.query.all()
    return jsonify([{
        "id": p.id,
        "resident_id": p.resident_id,
        "title": p.title,
        "category": p.category,
        "status": p.status,
        "submitted_at": p.submitted_at
    } for p in processes])

@admin.route('/update_status/<int:process_id>', methods=['POST'])
def update_status(process_id):
    data = request.json
    process = Process.query.get(process_id)
    if process:
        process.status = data.get("status", process.status)
        db.session.commit()
        return jsonify({"message": "Status updated"})
    return jsonify({"message": "Process not found"}), 404