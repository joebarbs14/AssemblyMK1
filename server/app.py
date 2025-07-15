# REMOVED: import flask_jwt_extended # <<< REMOVE THIS LINE
from flask import Flask, jsonify
from flask_cors import CORS
# REMOVED: from flask_jwt_extended import JWTManager # REMOVE THIS LINE
from models import db
from routes.auth import auth
from routes.dashboard import dashboard
from routes.process import process
from routes.admin import admin
from routes.user import user_bp
from dotenv import load_dotenv
import os
from datetime import timedelta, datetime # Import datetime for Authlib JWT expiry
import logging
# ADDED: from authlib.integrations.flask_client import OAuth # Authlib for OAuth/JWT client
from authlib.jose import JsonWebToken, util # Authlib for JWT encoding/decoding
from routes.decorators import auth_required, jwt_instance # Import auth_required and jwt_instance

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

# CORS: Allow deployed + local dev frontends
CORS(app, resources={r"/*": {"origins": [
    "https://assemblymk1.onrender.com",
    "http://localhost:3000"
]}}, supports_credentials=True)

# --- Initialize Extensions ---
# REMOVED: jwt = JWTManager(app) # REMOVE THIS LINE
db.init_app(app)

# --- Database Table Creation (runs when app is loaded by WSGI server) ---
with app.app_context():
    logging.info("Attempting to create all database tables if they don't exist...")
    db.create_all()
    logging.info("Database table creation process completed.")
    import Authlib # Import Authlib here to get its version
    logging.info(f"Authlib version: {Authlib.__version__}")
    # REMOVED: logging.info(f"Flask-JWT-Extended version: {flask_jwt_extended.__version__}") # REMOVE THIS LINE

# --- REMOVED Custom Decorator for JWT Protection (it's now in routes/decorators.py) ---
# --- END REMOVED ---

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
