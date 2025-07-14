from flask import Blueprint, jsonify
from models import Process
from flask_jwt_extended import jwt_required, get_jwt_identity

dashboard = Blueprint('dashboard', __name__)

@dashboard.route('/', methods=['GET'])
@jwt_required()
def get_dashboard():
    try:
        identity = get_jwt_identity()
        print(f"[dashboard] Raw JWT identity: {identity}")

        # ✅ Extract user_id safely whether it's a dict or a raw id
        user_id = int(identity['id']) if isinstance(identity, dict) and 'id' in identity else int(identity)

        print(f"[dashboard] Parsed user_id: {user_id} ({type(user_id)})")

        # ✅ Consistent categories
        categories = [
            "Rates", "Water", "Development", "Community",
            "Roads", "Waste", "Animals", "Public Health", "Environment"
        ]

        data = {}

        for category in categories:
            processes = Process.query.filter_by(resident_id=user_id, category=category).all()
            print(f"[dashboard] Found {len(processes)} processes for category: {category}")
            data[category] = [p.title for p in processes]

        return jsonify(data), 200

    except Exception as e:
        print(f"[dashboard] Error: {str(e)}")
        return jsonify({
            "error": "Unable to load dashboard",
            "details": str(e)
        }), 500
