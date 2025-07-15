# routes/decorators.py
from flask import request, jsonify, current_app
from datetime import datetime
import logging
from authlib.jose import JsonWebToken, util

# Initialize Authlib's JsonWebToken instance once with supported algorithms
# This instance will be used for encoding (signing) and decoding (verifying) JWTs
jwt_instance = JsonWebToken(['HS256']) # <<< FIXED THIS LINE: Added algorithms argument

# Custom Decorator for JWT Protection (replaces @jwt_required)
# This decorator will manually validate the JWT from the Authorization header.
def auth_required(f):
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
            # Decode and verify the token using the secret key from current_app.config
            # The 'claims' object will contain the decoded payload
            claims = jwt_instance.decode(token, current_app.config['JWT_SECRET_KEY'])

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
