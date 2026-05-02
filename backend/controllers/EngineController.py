from flask import Blueprint

from helpers.Auth import require_bearer_token
from engine.CertificateRequester import CertificateRequester


engine_blueprint = Blueprint('engine', __name__, url_prefix='/engine')


def register_engine_routes(app):

    @engine_blueprint.route('/available_challenges', methods=['GET'])
    @require_bearer_token
    def available_challenges():
        requester = CertificateRequester()
        items = requester.get_avaliable_challenges()
        return {
            key: {"name": value.get("name"), "type": value.get("type")}
            for key, value in items.items()
        }, 200

    @engine_blueprint.route('/available_cas', methods=['GET'])
    @require_bearer_token
    def available_cas():
        requester = CertificateRequester()
        items = requester.get_avaliable_certificate_authorities()
        return {
            key: {"name": value.get("name")}
            for key, value in items.items()
        }, 200

    app.register_blueprint(engine_blueprint)
