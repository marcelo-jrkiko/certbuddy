import os
import subprocess
from typing import Any

from engine.events.handlers.BaseEventHandler import BaseEventHandler
from engine.models.event_listener import EventListener


class ShellScriptEventHandler(BaseEventHandler):
    """Executes a bash script from event_code."""

    handler_type = "shell_script"

    def execute(self, listener: EventListener, event_id: str, user_id: str, payload: dict[str, Any]):
        base_context = self.build_context(
            event_id=event_id,
            user_id=user_id,
            payload=payload,
            listener=listener,
        )

        params = self.render_data(self.parse_event_params(listener), base_context)
        context = self.build_context(
            event_id=event_id,
            user_id=user_id,
            payload=payload,
            listener=listener,
            params=params,
        )

        script = self.render_template(listener.event_code or "", context).strip()
        if not script:
            raise ValueError("event_code is required for shell_script handler")

        executable = str(params.get("executable", "/bin/bash"))
        cwd = params.get("cwd")
        timeout_seconds = float(params.get("timeout_seconds", 60))

        env = os.environ.copy()
        custom_env = params.get("env", {})
        if isinstance(custom_env, dict):
            rendered_env = self.render_data(custom_env, context)
            env.update({str(key): str(value) for key, value in rendered_env.items()})

        result = subprocess.run(
            [executable, "-c", script],
            capture_output=True,
            text=True,
            cwd=cwd,
            env=env,
            timeout=timeout_seconds,
        )

        if result.returncode != 0:
            message = (result.stderr or result.stdout or "unknown error").strip()
            raise RuntimeError(f"Script execution failed (code {result.returncode}): {message[:500]}")

        self.logger.info(
            "Shell script handler executed successfully for listener '%s'",
            listener.id,
        )
