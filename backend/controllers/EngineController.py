import datetime
import json
import tempfile

from flask import Blueprint, request

from engine.models.certificate_request import CertificateRequest, CertificateRequestType
from engine.CertificateRequester import CertificateRequester
from helpers.Auth import require_bearer_token
from helpers.DataBackend import BackendClient

requester = CertificateRequester()

engine_blueprint = Blueprint('engine', __name__, url_prefix='/engine')

def register_engine_routes(app):
    
    @engine_blueprint.route('/request_status/<thread_id>', methods=['GET'])
    @require_bearer_token
    def get_request_status(thread_id: str):
        """Get the status of a certificate request thread
        ---
        tags:
          - engine
        security:
          - bearerAuth: []
        parameters:
          - name: thread_id
            in: path
            required: true
            schema:
              type: string
            description: ID of the thread handling the request
        responses:
          200:
            description: Status of the certificate request thread
            content:
              application/json:
                schema:
                  type: object
                  properties:
                    status:
                      type: string
                      description: Status of the certificate request thread
        """
        
        # -
        backendClient = BackendClient()
        
        thread_status = requester.get_request_status(thread_id)        
        request_details = backendClient.get_item("certificate_request", thread_status.get("request_id"))
        
        return {
            "status": thread_status.get("status"),
            "request_details": request_details,
        }
    
    @engine_blueprint.route('/request_certificate', methods=['POST'])
    @require_bearer_token
    def request_certificate():
        """Request a new certificate
        ---
        tags:
          - engine
        security:
          - bearerAuth: []
        requestBody:
          required: true
          content:
            application/json:
              schema:
                type: object
                properties:
                  domain:
                    type: string
                    description: Domain name for the certificate
                  challenge_type:
                    type: string
                    description: get_avaliable_challenges key for the challenge type to use
                  certificate_authority:
                    type: string
                    description: get_avaliable_certificate_authorities key for the CA to use
                  config:
                    type: object
                    description: Configuration data for the request
        responses:
          200:
            description: Certificate request accepted
            content:
              application/json:
                schema:
                  type: object
                  properties:
                    request_id:
                      type: string
                      description: ID of the certificate request
                    thread_id:
                      type: string
                      description: ID of the thread handling the request
        """
        
        # -
        backendClient = BackendClient()
        
        # -
        newRequest = CertificateRequest()  
        
        newRequest.domain = request.json.get("domain")   
        newRequest.issue_to = request.authdata.get("user_id")  
        newRequest.challenge_type = request.json.get("challenge_type")
        newRequest.certificate_authority = request.json.get("certificate_authority")
        newRequest.config = request.json.get("config", {})
        newRequest.status = "pending"
        newRequest.date_created = datetime.datetime.now().isoformat()
        newRequest.type = CertificateRequestType.ISSUER
        
        backendCreated = backendClient.create("certificate_request", newRequest)
        newRequest.id = backendCreated.id
        
        thread_id = requester.start_request_async(newRequest)
        return {
            "request_id": newRequest.id,
            "thread_id": thread_id,
        }
        
    @engine_blueprint.route('/available_challenges', methods=['GET'])
    @require_bearer_token
    def get_available_challenges():
        """
        Get the list of available challenge types
        ---
        tags:
          - engine
        security:
          - bearerAuth: []
        responses:
          200:
            description: List of available challenge types
          401:
            description: Unauthorized
        """
        requester = CertificateRequester()
        
        items = []
        keys = requester.get_avaliable_challenges().keys()
        for key in keys:
            items.append({
                "key": key,
                "name": requester.get_avaliable_challenges()[key]["name"],
            })
        
        return items
    
    @engine_blueprint.route('/available_cas', methods=['GET'])
    @require_bearer_token
    def get_available_certificate_authorities():
        """
        Get the list of available certificate authorities and their compatible challenge types
        ---
        tags:
          - engine
        security:
          - bearerAuth: []
        responses:
          200:
            description: List of available certificate authorities
          401:
            description: Unauthorized
        """
        requester = CertificateRequester()
        items = []
        keys = requester.get_avaliable_certificate_authorities().keys()
        for key in keys:
            items.append({
                "key": key,
                "name": requester.get_avaliable_certificate_authorities()[key]["name"],
            })
        return items
    
    app.register_blueprint(engine_blueprint)
    