from flask import Blueprint, request

from backend.helpers.Auth import require_bearer_token
from backend.helpers.DataBackend import BackendClient
import uuid

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
    def add_certificate(user_id: str, common_name: str):
        try:
            # Check if certificate and key files are provided
            if 'certificate_file' not in request.files:
                return {
                    "error": "Missing 'certificate_file' in request"
                }, 400
            
            if 'certificate_key' not in request.files:
                return {
                    "error": "Missing 'certificate_key' in request"
                }, 400
            
            cert_file = request.files['certificate_file']
            key_file = request.files['certificate_key']
            
            if cert_file.filename == '':
                return {
                    "error": "Certificate file is empty"
                }, 400
            
            if key_file.filename == '':
                return {
                    "error": "Key file is empty"
                }, 400
            
            client = BackendClient(app.config["core"], request.authdata['token'])
            
            # Generete a unique id for the certificate file name
            cert_filename = f"{common_name}_{user_id}_{uuid.uuid4()}"
            
            # Upload certificate and key files to Directus
            cert_data = client.upload_file(cert_file, f"{cert_filename}.crt")
            key_data = client.upload_file(key_file, f"{cert_filename}.key")
            
            cert_file_id = cert_data.get('id')
            key_file_id = key_data.get('id')
            
            if not cert_file_id or not key_file_id:
                return {
                    "error": "Failed to upload certificate files"
                }, 500
            
            # Get tags from JSON body if provided
            tags = request.get_json().get('tags', []) if request.is_json else []
            
            # Create a new certificate record in Directus with file references
            new_certificate = client.create("Certificates", {
                "issued_to": user_id,
                "common_name": common_name,
                "certificate_file": cert_file_id,
                "certificate_key": key_file_id,
                "tags": tags,
                "is_active": True
            })
            
            return new_certificate, 201
        except Exception as e:
            return {
                "error": "Failed to create certificate",
                "details": str(e)
            }, 500
    
    
    @certificates_blueprint.route('/<certificate_id>', methods=['DELETE'])
    @require_bearer_token
    def delete_certificate(certificate_id: str):
        try:
            client = BackendClient(app.config["core"], request.authdata['token'])
            
            # Delete the certificate by ID
            client.delete("Certificates", certificate_id)
            
            return {
                "success": True,
                "message": f"Certificate {certificate_id} deleted successfully"
            }, 200
        except Exception as e:
            return {
                "error": "Failed to delete certificate",
                "details": str(e)
            }, 500
    
    
    @certificates_blueprint.route('/<certificate_id>/activate', methods=['PATCH'])
    @require_bearer_token
    def activate_certificate(certificate_id: str):
        try:
            client = BackendClient(app.config["core"], request.authdata['token'])
            
            # Get the certificate to retrieve its common_name
            certificate = client.search("Certificates", {"id": {"_eq": certificate_id}})
            
            if not certificate:
                return {
                    "error": f"Certificate {certificate_id} not found"
                }, 404
            
            cert_data = certificate[0]
            common_name = cert_data.get("common_name")
            
            # Get all certificates with the same common_name
            same_name_certs = client.search("Certificates", {
                "common_name": {"_eq": common_name}
            }, fields=["id"])
            
            # Mark all other certificates with same common_name as inactive
            for cert in same_name_certs:
                if cert.get("id") != certificate_id:
                    client.update("Certificates", cert.get("id"), {"is_active": False})
            
            # Mark the target certificate as active
            updated_certificate = client.update("Certificates", certificate_id, {"is_active": True})
            
            return {
                "success": True,
                "message": f"Certificate {certificate_id} activated successfully",
                "data": updated_certificate
            }, 200
        except Exception as e:
            return {
                "error": "Failed to activate certificate",
                "details": str(e)
            }, 500
    
    app.register_blueprint(certificates_blueprint)