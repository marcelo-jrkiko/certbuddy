import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from startup import startup
from controllers.CertificateController import register_certificate_routes
from controllers.EngineController import register_engine_routes
from controllers.TasksController import register_tasks_routes
from engine.tasks.Scheduler import Scheduler
from utils import Config
import logging
from flasgger import Swagger

config = startup()
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask("certbuddy-backend")
CORS(app, resources={r"/*": {
    "origins": "*",
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"]
}})
app.config["core"] = config

# Initialize Scheduler
scheduler = Scheduler()
scheduler.init_tasks(config)

app.scheduler = scheduler

# Register routes
register_certificate_routes(app)
register_engine_routes(app)
register_tasks_routes(app)

app.swagger = Swagger(app)

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
    scheduler.start()
    app.run(
        host='0.0.0.0',
        port=config.API_PORT
    )
