"""
Bearer token authentication for API routes
"""

import logging
from functools import wraps
from flask import request, jsonify, current_app

from helpers.DataBackend import BackendClient


def require_bearer_token(f):
    """
    Decorator to require bearer token authentication for protected routes.
    
    Expects the Authorization header in the format: "Bearer <token>"
    Compares the token with the API_TOKEN configuration.
    
    Returns:
        401 Unauthorized if no token is provided or token is invalid
        401 Unauthorized if API_TOKEN is not configured
        403 Forbidden if the token doesn't match
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        
        auth_header = request.headers.get('Authorization', '')
        
        if not auth_header:
            logging.warning("Missing Authorization header")
            return {
                'authenticated': False,
                'message': 'Missing Authorization header'
            }
        
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            logging.warning(f"Invalid Authorization header format: {auth_header.split()[0] if parts else 'empty'}")
            return {
                'authenticated': False,
                'message': 'Invalid Authorization header format. Expected: Bearer <token>'
            }
        
        token = parts[1]
        
        # Recover user data from backend
        backend = BackendClient(current_app.config["core"], token)
        user_data = backend.get_user_info()
        
        if not user_data:
            logging.warning("Invalid token provided, no user data found")
            return {
                'authenticated': False,
                'message': 'Invalid token'
            }, 401
        
        request.authdata = {
            'token': token,
            'user_data': user_data
        }        
        
        # Token is valid, proceed to the route handler
        return f(*args, **kwargs)
    
    return decorated_function
