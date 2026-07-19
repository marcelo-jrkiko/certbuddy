"""
Bearer token authentication for API routes
"""

import logging
from functools import wraps
from flask import request, jsonify, current_app

from helpers.DataBackend import BackendClient


def _resolve_role_name(backend: BackendClient, user_data: dict) -> str:
    """Resolve the user role name from the user payload, with id fallback lookup."""
    role = user_data.get("role")

    if isinstance(role, dict):
        return role.get("name") or ""

    if isinstance(role, str):
        try:
            role_data = backend.get_item("directus_roles", role)
            if isinstance(role_data, dict):
                return role_data.get("name") or ""
        except Exception as e:
            logging.warning(f"Could not resolve role name for role id {role}: {e}")

    roles = user_data.get("roles")
    if isinstance(roles, list):
        for role_item in roles:
            if isinstance(role_item, dict) and role_item.get("name"):
                return role_item.get("name")

    return ""


def _is_admin_role(backend: BackendClient, user_data: dict) -> bool:
    role_name = _resolve_role_name(backend, user_data)
    return role_name.strip().lower() == "administrator"


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
            'user_data': user_data,
            'admin': _is_admin_role(backend, user_data)
        }        
        
        # Token is valid, proceed to the route handler
        return f(*args, **kwargs)
    
    return decorated_function


def canhave_bearer_token(f):
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
            request.authdata = None
            return f(*args, **kwargs)
        
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            logging.warning(f"Invalid Authorization header format: {auth_header.split()[0] if parts else 'empty'}")
            request.authdata = None
            return f(*args, **kwargs)
        
        token = parts[1]
        
        # Recover user data from backend
        backend = BackendClient(current_app.config["core"], token)
        user_data = backend.get_user_info()
        
        if not user_data:
            logging.warning("Invalid token provided, no user data found")
            request.authdata = None
            return f(*args, **kwargs)
        
        request.authdata = {
            'token': token,
            'user_data': user_data,
            'admin': _is_admin_role(backend, user_data)
        }        
        
        # Token is valid, proceed to the route handler
        return f(*args, **kwargs)
    
    return decorated_function
