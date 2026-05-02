import datetime
import json
import tempfile

from flask import Blueprint, request

from engine.CertificateRequester import CertificateRequester
from helpers.Auth import require_bearer_token
from helpers.DataBackend import BackendClient


engine_blueprint = Blueprint('engine', __name__, url_prefix='/engine')

def register_engine_routes(app):
    
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
    