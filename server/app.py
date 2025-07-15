from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from models import db
from routes.auth import auth
from routes.dashboard import dashboard
from routes.process import process
from routes.admin import admin
from dotenv import load_dotenv
import os
from datetime import timedelta
import logging # Import logging for better output management

# Configure basic logging to stdout. Render captures stdout.
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

load_dotenv()

app = Flask(__name__)

# --- Configuration Section ---
# Get SECRET_KEY from environment, with a strong warning if using default
secret_key = os.getenv('SECRET_KEY')
if secret_key is None or secret_key == 'changeme':
    logging.warning("WARNING: 'SECRET_KEY' environment variable is not set or is set to 'changeme'. "
                    "This is INSECURE for production and will cause JWT validation failures. "
                    "Please set a strong, unique SECRET_KEY in your Render environment variables.")
    secret_key = 'changeme_insecure_default' # Make the default visibly insecure

app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
app.config['SECRET_KEY'] = secret_key
app.config['JWT_SECRET_KEY'] = app.config['SECRET_KEY'] # JWT uses the same secret key

# JWT Config (Required by flask_jwt_extended)
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'

# --- JWT Expiry and Algorithm ---
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24) # Increased to 24 hours for testing
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30) # Good practice to set refresh token expiry
app.config["JWT_ALGORITHM"] = "HS256" # Explicitly define algorithm, though HS256 is default

# This tells Flask-JWT-Extended to allow non-fresh tokens on @jwt_required() by default.
# Remove this in production if you want to enforce fresh logins for certain actions.
app.config["JWT_FRESH_TOKEN_REQUIRED"] = False


# CORS: Allow deployed + local dev frontends
CORS(app, resources={r"/*": {"origins": [
    "https://assemblymk1.onrender.com",
    "http://localhost:3000"
]}}, supports_credentials=True)

# --- Initialize Extensions ---
jwt = JWTManager(app) # Assign the JWTManager instance to a variable 'jwt'
db.init_app(app)

# --- Database Table Creation (runs when app is loaded by WSGI server) ---
# This block ensures that database tables are created if they do not exist.
# It runs within the application context when the 'app' object is loaded by Gunicorn.
# IMPORTANT: This does NOT perform database migrations (e.g., adding columns to existing tables).
# For schema changes on existing tables, you MUST use Flask-Migrate (Alembic) or manual SQL.
with app.app_context():
    logging.info("Attempting to create all database tables if they don't exist...")
    db.create_all() # This creates tables based on models.py if they don't exist
    logging.info("Database table creation process completed.")

# --- JWT Identity Loader ---
# This tells Flask-JWT-Extended how to extract the identity from the 'sub' claim.
# Your 'sub' claim is a dictionary like {"id": 15, "name": "jb1234"}
@jwt.user_identity_loader # Use the 'jwt' instance from JWTManager(app)
def user_identity_lookup(user):
    # 'user' here is the dictionary that was passed to create_access_token
    if isinstance(user, dict) and 'id' in user:
        return user['id'] # Return just the ID as the identity
    return user # Fallback for other cases or simpler identities if ever used

# --- Register Blueprints ---
app.register_blueprint(auth, url_prefix='/auth')
app.register_blueprint(dashboard, url_prefix='/dashboard')
app.register_blueprint(process, url_prefix='/process')
app.register_blueprint(admin, url_prefix='/admin')

@app.route('/')
def index():
    return "LocalGov API running!"

# This 'if __name__ == "__main__":' block is typically for local development only.
# For Render deployment, a WSGI server like Gunicorn will load the 'app' instance directly.
# If you run locally with 'python app.py', this block will execute.
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
