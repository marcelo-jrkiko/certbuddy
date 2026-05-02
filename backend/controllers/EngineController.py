import datetime
import json
import tempfile

from flask import Blueprint, request

from engine.CertificateRequester import CertificateRequester
from helpers.Auth import require_bearer_token
from helpers.DataBackend import BackendClient


engine_blueprint = Blueprint('engine', __name__, url_prefix='/engine')

def register_engine_routes(app):
    
    @engine_blueprint.route('/avaliable_challenges', methods=['GET'])
    @require_bearer_token
    def get_available_challenges():
        requester = CertificateRequester()
        return requester.get_avaliable_challenges().keys()
    
    @engine_blueprint.route('/avaliable_CAs', methods=['GET'])
    @require_bearer_token
    def get_available_certificate_authorities():
        requester = CertificateRequester()
        return requester.get_avaliable_certificate_authorities().keys()
    
    app.register_blueprint(engine_blueprint)
    