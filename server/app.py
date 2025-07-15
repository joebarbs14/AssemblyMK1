from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, exceptions # Import exceptions
from models import db
from routes.auth import auth
from routes.dashboard import dashboard
from routes.process import process
from routes.admin import admin
from dotenv import load_dotenv
import os
from datetime import timedelta
import logging

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
app.config['SECRET_KEY'] = secret_key
app.config['JWT_SECRET_KEY'] = app.config['SECRET_KEY']

app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'

app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)
app.config["JWT_ALGORITHM"] = "HS256"

app.config["JWT_FRESH_TOKEN_REQUIRED"] = False


# CORS: Allow deployed + local dev frontends
CORS(app, resources={r"/*": {"origins": [
    "https://assemblymk1.onrender.com",
    "http://localhost:3000"
]}}, supports_credentials=True)

# --- Initialize Extensions ---
jwt = JWTManager(app)
db.init_app(app)

# --- Database Table Creation (runs when app is loaded by WSGI server) ---
with app.app_context():
    logging.info("Attempting to create all database tables if they don't exist...")
    db.create_all()
    logging.info("Database table creation process completed.")

# --- JWT Identity Loader ---
@jwt.user_identity_loader
def user_identity_lookup(user):
    if isinstance(user, dict) and 'id' in user:
        return user['id']
    return user

# --- ADD CUSTOM ERROR HANDLERS FOR JWT EXCEPTIONS (ADJUSTED FOR OLDER FLASK-JWT-EXTENDED) ---
# We are keeping only the most fundamental ones that are likely to exist
@app.errorhandler(exceptions.NoAuthorizationError)
def handle_no_authorization_error(e): # Renamed function for clarity
    logging.error(f"No Authorization Error: {e.args[0]}", exc_info=True)
    return jsonify({"message": e.args[0]}), 401

@app.errorhandler(exceptions.InvalidHeaderError)
def handle_invalid_header_error(e):
    logging.error(f"Invalid Header Error: {e.args[0]}", exc_info=True)
    return jsonify({"message": e.args[0]}), 422

@app.errorhandler(exceptions.DecodeError)
def handle_decode_error(e):
    logging.error(f"Decode Error: {e.args[0]}", exc_info=True)
    return jsonify({"message": "Token could not be decoded"}), 422

# Removed ExpiredSignatureError, InvalidTokenError, WrongTokenError, RevokedTokenError, FreshTokenRequired
# as they seem to cause AttributeError in your current Flask-JWT-Extended version.
# If a 422/401 still occurs, it will fall through to a generic Flask error or the default JWT response,
# but at least the app should start.

# --- END CUSTOM ERROR HANDLERS ---

# --- Register Blueprints ---
app.register_blueprint(auth, url_prefix='/auth')
app.register_blueprint(dashboard, url_prefix='/dashboard')
app.register_blueprint(process, url_prefix='/process')
app.register_blueprint(admin, url_prefix='/admin')

@app.route('/')
def index():
    return "LocalGov API running!"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
