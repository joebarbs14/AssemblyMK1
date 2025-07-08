from flask import Blueprint, request, jsonify
from models import db, Process
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

process = Blueprint('process', __name__)

@process.route('/submit', methods=['POST'])
@jwt_required()
def submit_process():
    data = request.json
    user_id = get_jwt_identity()

    new_process = Process(
        resident_id=user_id,
        category=data['category'],
        title=data['title'],
        form_data=data['form_data'],
        submitted_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.session.add(new_process)
    db.session.commit()

    return jsonify({"message": "Process submitted successfully"})

@process.route('/my', methods=['GET'])
@jwt_required()
def get_my_processes():
    user_id = get_jwt_identity()
    processes = Process.query.filter_by(resident_id=user_id).all()
    return jsonify([{
        "id": p.id,
        "title": p.title,
        "category": p.category,
        "status": p.status,
        "submitted_at": p.submitted_at
    } for p in processes])