from flask import Flask, jsonify, request
from flask_cors import CORS
from models import db
from routes.auth import auth
from routes.dashboard import dashboard
from routes.process import process
from routes.admin import admin
from routes.user import user_bp # Assuming you create routes/user.py with 'user_bp'
from dotenv import load_dotenv
import os
from datetime import timedelta, datetime # Import datetime for Authlib JWT expiry
import logging
from authlib.integrations.flask_client import OAuth # Authlib for OAuth/JWT client
from authlib.jose import JsonWebToken, util # Authlib for JWT encoding/decoding

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

load_dotenv()

app = Flask(__name__)

# --- Configuration Section ---
secret_key = os.getenv('SECRET_KEY')
if secret_key is None or secret_key == 'changeme':
    logging.warning("WARNING: 'SECRET_KEY' environment variable is not set or is set to 'changeme'. "
                    "This is INSECURE for production and will cause JWT validation failures. "
                    "Please set a strong, unique SECRET_KEY in your Render environment variables.")
    secret_key = 'changeme_insecure_default'

app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
app.config['SECRET_KEY'] = secret_key # Used by Flask itself
app.config['JWT_SECRET_KEY'] = app.config['SECRET_KEY'] # Used by Authlib for JWT signing

# --- Authlib JWT Configuration ---
# Authlib's JWT doesn't use these specific app.config keys like Flask-JWT-Extended did.
# We will pass the secret key directly to the JsonWebToken instance.
# For algorithms, 'HS256' is default for symmetric keys.

# CORS: Allow deployed + local dev frontends
CORS(app, resources={r"/*": {"origins": [
    "https://assemblymk1.onrender.com",
    "http://localhost:3000"
]}}, supports_credentials=True)

# --- Initialize Extensions ---
db.init_app(app)

# Initialize Authlib's JsonWebToken for manual JWT operations
# This instance will be used for encoding (signing) and decoding (verifying) JWTs
jwt_instance = JsonWebToken()

# --- Database Table Creation (runs when app is loaded by WSGI server) ---
with app.app_context():
    logging.info("Attempting to create all database tables if they don't exist...")
    db.create_all()
    logging.info("Database table creation process completed.")
    # Log Authlib version instead of Flask-JWT-Extended
    logging.info(f"Authlib version: {Authlib.__version__}")

# --- Custom Decorator for JWT Protection (replaces @jwt_required) ---
# This decorator will manually validate the JWT from the Authorization header.
def auth_required(f):
    @app.before_request
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            logging.warning("Authlib: No Authorization header provided.")
            return jsonify({"message": "Authorization header is missing"}), 401

        try:
            token_type, token = auth_header.split(' ', 1)
        except ValueError:
            logging.warning("Authlib: Invalid Authorization header format.")
            return jsonify({"message": "Invalid Authorization header format. Expected 'Bearer <token>'"}), 401

        if token_type.lower() != 'bearer':
            logging.warning(f"Authlib: Invalid token type: {token_type}")
            return jsonify({"message": "Invalid token type. Only 'Bearer' is supported"}), 401

        try:
            # Decode and verify the token using the secret key
            # Authlib's decode method handles signature verification and expiry
            # The 'claims' object will contain the decoded payload
            claims = jwt_instance.decode(token, app.config['JWT_SECRET_KEY'])

            # Check if the token has expired manually (Authlib's decode does this too, but for clarity)
            if claims.get('exp') and datetime.utcfromtimestamp(claims['exp']) < datetime.utcnow():
                logging.warning("Authlib: Token has expired.")
                return jsonify({"message": "Token has expired"}), 401

            # Store the identity in Flask's g object for easy access in routes
            # The 'sub' claim contains the identity (e.g., user ID)
            request.current_identity = claims.get('sub')
            logging.info(f"Authlib: Token validated. Identity: {request.current_identity}")

        except util.errors.JoseError as e:
            # Catch all Authlib JWT related errors (signature, invalid claims, etc.)
            logging.error(f"Authlib: JWT validation failed: {e}", exc_info=True)
            return jsonify({"message": f"Invalid token: {e}"}), 401
        except Exception as e:
            logging.error(f"Authlib: Unexpected error during token validation: {e}", exc_info=True)
            return jsonify({"message": f"Server error during token validation: {e}"}), 500

        return f(*args, **kwargs) # Proceed to the decorated route
    return wrapper

# --- Register Blueprints ---
app.register_blueprint(auth, url_prefix='/auth')
app.register_blueprint(dashboard, url_prefix='/dashboard')
app.register_blueprint(process, url_prefix='/process')
app.register_blueprint(admin, url_prefix='/admin')
app.register_blueprint(user_bp, url_prefix='/user')

@app.route('/')
def index():
    return "LocalGov API running!"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
