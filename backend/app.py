import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from controllers.CertificateController import register_certificate_routes
from controllers.EngineController import register_engine_routes
from utils import Config
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

config = Config()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

app.config["core"] = config

# Register routes
register_certificate_routes(app)
register_engine_routes(app)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'CertBuddy API is running'
    }), 200


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'error': 'Endpoint not found'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {error}")
    return jsonify({
        'error': 'Internal server error'
    }), 500


if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=config.API_PORT,
        debug=config.DEBUG
    )
