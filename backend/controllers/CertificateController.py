from flask import Blueprint, request

from backend.helpers.Auth import require_bearer_token
from backend.helpers.DataBackend import BackendClient

certificates_blueprint = Blueprint('certificates', __name__, url_prefix='/certificates')

def register_certificate_routes(app):
    
    
    @certificates_blueprint.route('/<user_id>', methods=['GET'])
    @require_bearer_token
    def get_certificates(user_id: str):        
        try:
            # Get the list of certificates for the user from Directus
            client = BackendClient(app.config["core"], request.authdata['token'])
            
            # Get the certificates for the user
            certificates = client.search("Certificates", 
                {
                    "issued_to": user_id
                }, 
                fields=["id", "common_name", "tags", "is_active", "date_updated", "date_created"]
            )
            
            return certificates, 200            
        except Exception as e:
            return {
                "error": "Failed to retrieve certificates",
            }, 500
    
    
    @certificates_blueprint.route('/<user_id>/<common_name>', methods=['POST'])
    @require_bearer_token
    def add_certificate(user_id: str, common_name: str, tags: list):
        try:
            client = BackendClient(app.config["core"], request.authdata['token'])
            
            # Create a new certificate record in Directus
            new_certificate = client.create("Certificates", {
                "issued_to": user_id,
                "common_name": common_name,
                "tags": tags,
                "is_active": True
            })
            
            return new_certificate, 201
        except Exception as e:
            return {
                "error": "Failed to create certificate",
            }, 500
    
    app.register_blueprint(certificates_blueprint)