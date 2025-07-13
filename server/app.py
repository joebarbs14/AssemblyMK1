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

load_dotenv()

app = Flask(__name__)

# ✅ Basic Config
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'changeme')

# ✅ JWT Config (Required by flask_jwt_extended)
app.config['JWT_SECRET_KEY'] = app.config['SECRET_KEY']
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'

# ✅ CORS: Allow deployed + local dev frontends
CORS(app, resources={r"/*": {"origins": [
    "https://assemblymk1.onrender.com",
    "http://localhost:3000"
]}}, supports_credentials=True)

# ✅ Initialize Extensions
JWTManager(app)
db.init_app(app)

# ✅ Register Blueprints
app.register_blueprint(auth, url_prefix='/auth')
app.register_blueprint(dashboard, url_prefix='/dashboard')  # Make sure the route inside dashboard.py is @dashboard.route('/', ...)
app.register_blueprint(process, url_prefix='/process')
app.register_blueprint(admin, url_prefix='/admin')

@app.route('/')
def index():
    return "LocalGov API running!"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
