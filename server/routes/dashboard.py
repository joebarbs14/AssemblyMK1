from flask import Blueprint, jsonify, request
from models import Process, Policy
from flask_jwt_extended import jwt_required, get_jwt_identity

dashboard = Blueprint('dashboard', __name__)

@dashboard.route('/', methods=['GET'])
@jwt_required()
def get_dashboard():
    user_id = get_jwt_identity()
    categories = ["Rates", "Water", "Development", "Community", "Roads", "Waste", "Animals", "Public Health", "Environment"]
    data = {}
    for category in categories:
        processes = Process.query.filter_by(resident_id=user_id, category=category).all()
        data[category] = [p.title for p in processes]
    return jsonify(data)