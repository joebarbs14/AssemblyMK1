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
from datetime import timedelta # Import timedelta

load_dotenv()

app = Flask(__name__)

# --- Configuration Section ---

# Get SECRET_KEY from environment, with a strong warning if using default
secret_key = os.getenv('SECRET_KEY')
if secret_key is None or secret_key == 'changeme':
    print("WARNING: 'SECRET_KEY' environment variable is not set or is set to 'changeme'.")
    print("         This is INSECURE for production and will cause JWT validation failures.")
    print("         Please set a strong, unique SECRET_KEY in your Render environment variables.")
    # For development, you might still want a fallback, but in production, this should ideally crash
    # if a proper key isn't provided. For now, we'll let it proceed with 'changeme' if unset.
    secret_key = 'changeme_insecure_default' # Make the default visibly insecure

app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
app.config['SECRET_KEY'] = secret_key # Use the determined secret_key
app.config['JWT_SECRET_KEY'] = app.config['SECRET_KEY'] # JWT uses the same secret key

# JWT Config (Required by flask_jwt_extended)
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'

# --- ADDED/MODIFIED FOR DEBUGGING JWT VALIDATION ---
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1) # Ensure a reasonable expiry
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30) # Good practice to set refresh token expiry
app.config["JWT_ALGORITHM"] = "HS256" # Explicitly define algorithm, though HS256 is default

# THIS IS THE KEY CHANGE FOR DEBUGGING 422s with valid signatures:
# It tells Flask-JWT-Extended to allow non-fresh tokens on @jwt_required() by default.
# Remove this in production if you want to enforce fresh logins for certain actions.
app.config["JWT_FRESH_TOKEN_REQUIRED"] = False
# --- END ADDED/MODIFIED ---


# CORS: Allow deployed + local dev frontends
CORS(app, resources={r"/*": {"origins": [
    "https://assemblymk1.onrender.com",
    "http://localhost:3000"
]}}, supports_credentials=True)

# --- Initialize Extensions ---
JWTManager(app)
db.init_app(app)

# --- Register Blueprints ---
app.register_blueprint(auth, url_prefix='/auth')
app.register_blueprint(dashboard, url_prefix='/dashboard')
app.register_blueprint(process, url_prefix='/process')
app.register_blueprint(admin, url_prefix='/admin')

@app.route('/')
def index():
    return "LocalGov API running!"

if __name__ == '__main__':
    # When running locally, set debug=True. Render handles production debugging.
    app.run(host='0.0.0.0', port=5000, debug=True)
