import flask_jwt_extended # <<< ADDED THIS IMPORT for version check
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from models import db
from routes.auth import auth
from routes.dashboard import dashboard
from routes.process import process
from routes.admin import admin
# Import the new user blueprint
from routes.user import user_bp # Assuming you create routes/user.py with 'user_bp'
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
    # <<< ADDED THIS LINE TO LOG FLASK-JWT-EXTENDED VERSION >>>
    logging.info(f"Flask-JWT-Extended version: {flask_jwt_extended.__version__}")

# --- JWT Identity Loader ---
@jwt.user_identity_loader
def user_identity_lookup(user):
    if isinstance(user, dict) and 'id' in user:
        return user['id']
    return user

# --- REMOVED CUSTOM ERROR HANDLERS FOR JWT EXCEPTIONS ---
# These handlers were causing AttributeError due to Flask-JWT-Extended version mismatch.
# Flask-JWT-Extended will now use its default error responses.
# --- END REMOVED CUSTOM ERROR HANDLERS ---

# --- Register Blueprints ---
app.register_blueprint(auth, url_prefix='/auth')
app.register_blueprint(dashboard, url_prefix='/dashboard')
app.register_blueprint(process, url_prefix='/process')
app.register_blueprint(admin, url_prefix='/admin')
app.register_blueprint(user_bp, url_prefix='/user') # Register the new user blueprint

@app.route('/')
def index():
    return "LocalGov API running!"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
