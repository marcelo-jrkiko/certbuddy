


from flask import Blueprint, current_app
import logging
from helpers.Auth import require_bearer_token


tasks_blueprint = Blueprint('tasks', __name__, url_prefix='/tasks')

def register_tasks_routes(app):
    
    @tasks_blueprint.route('/due_now/<name>', methods=['GET'])
    @require_bearer_token
    def due_now(name: str):
        """Trigger a task to run immediately by name
        ---
        tags:
          - tasks
        security:
          - bearerAuth: []
        parameters:
          - name: name
            in: path
            required: true
            schema:
              type: string
            description: Name of the task to run immediately
        responses:
            200:
                description: Task executed successfully
                content:
                application/json:
                    schema:
                    type: object
                    properties:
                        message:
                        type: string
                        description: Confirmation message that the task was executed
            500:
                description: Error executing task
                content:
                application/json:
                    schema:
                    type: object
                    properties:
                        error:
                        type: string
                        description: Error message describing what went wrong
            """
                    
        try:
            app.scheduler.run_task(name)
            return {
                "message": f"Task {name} executed"
            }, 200
        except Exception as e:
            logging.getLogger(__name__).error(f"Error executing task {name}: {e}")
            return {
                "error": f"Error executing task {name}"
            }, 500
        
    app.register_blueprint(tasks_blueprint)