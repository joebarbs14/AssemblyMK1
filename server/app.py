from flask import Flask
from flask_cors import CORS
from models import db
from routes.auth import auth
from routes.dashboard import dashboard
from routes.process import process
from routes.admin import admin
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'changeme')

# ✅ Updated CORS config to allow frontend origin
CORS(app, origins=["https://assemblymk1.onrender.com"], supports_credentials=True)

db.init_app(app)

app.register_blueprint(auth, url_prefix='/auth')
app.register_blueprint(dashboard, url_prefix='/dashboard')
app.register_blueprint(process, url_prefix='/process')
app.register_blueprint(admin, url_prefix='/admin')

@app.route('/')
def index():
    return "LocalGov API running!"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
