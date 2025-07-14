from flask import Blueprint, jsonify
from models import Process
from flask_jwt_extended import jwt_required, get_jwt_identity

dashboard = Blueprint('dashboard', __name__)

@dashboard.route('/', methods=['GET'])
@jwt_required()
def get_dashboard():
    try:
        user_id = get_jwt_identity()
        print(f"[dashboard] JWT user_id: {user_id}")

        categories = [
            "Rates", "Water", "Development", "Community",
            "Roads", "Waste", "Animals", "Public Health", "Environment"
        ]

        data = {}
        for category in categories:
            processes = Process.query.filter_by(resident_id=user_id, category=category).all()
            data[category] = [p.title for p in processes] if processes else []

        return jsonify(data), 200

    except Exception as e:
        print(f"[dashboard] Error: {e}")
        return jsonify({"error": "Unable to load dashboard"}), 500
