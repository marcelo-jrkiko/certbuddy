import json
import logging
import re
from abc import ABC, abstractmethod
from typing import Any

from engine.models.event_listener import EventListener


class BaseEventHandler(ABC):
    """Base event handler with shared macro rendering helpers."""

    handler_type = ""
    _macro_pattern = re.compile(r"\{\{\s*([^{}\s]+)\s*\}\}")

    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)

    def can_handle(self, listener: EventListener) -> bool:
        return (listener.handler or "").strip().lower() == self.handler_type

    @abstractmethod
    def execute(self, listener: EventListener, event_id: str, user_id: str, payload: dict[str, Any]):
        """Execute handler logic for a matching listener."""

    def parse_event_params(self, listener: EventListener) -> dict[str, Any]:
        raw_params = listener.event_params
        if raw_params is None:
            return {}

        if isinstance(raw_params, dict):
            return raw_params

        if isinstance(raw_params, str):
            trimmed = raw_params.strip()
            if not trimmed:
                return {}
            parsed = json.loads(trimmed)
            if not isinstance(parsed, dict):
                raise ValueError("event_params must be a JSON object")
            return parsed

        raise ValueError("event_params must be a JSON object or string")

    def build_context(
        self,
        *,
        event_id: str,
        user_id: str,
        payload: dict[str, Any],
        listener: EventListener,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        context: dict[str, Any] = {
            "event_id": event_id,
            "user_id": user_id,
            "listener_id": listener.id,
            "payload": payload,
            "handler": listener.handler,
        }

        # Make payload keys directly available as macros (for convenience).
        for key, value in payload.items():
            if key not in context:
                context[key] = value

        if params is not None:
            context["params"] = params
            for key, value in params.items():
                if key not in context:
                    context[key] = value

        return context

    def render_data(self, data: Any, context: dict[str, Any]) -> Any:
        if isinstance(data, str):
            return self.render_template(data, context)
        if isinstance(data, list):
            return [self.render_data(item, context) for item in data]
        if isinstance(data, dict):
            return {key: self.render_data(value, context) for key, value in data.items()}
        return data

    def render_template(self, template: str, context: dict[str, Any]) -> str:
        if not template:
            return template

        def _replace(match: re.Match[str]) -> str:
            expression = match.group(1)
            value = self.resolve_path(context, expression)
            if value is None:
                return ""
            if isinstance(value, (dict, list)):
                return json.dumps(value)
            return str(value)

        return self._macro_pattern.sub(_replace, template)

    def resolve_path(self, context: dict[str, Any], path: str) -> Any:
        current: Any = context
        for part in path.split("."):
            if isinstance(current, dict):
                if part not in current:
                    return None
                current = current.get(part)
            elif isinstance(current, list):
                if not part.isdigit():
                    return None
                index = int(part)
                if index < 0 or index >= len(current):
                    return None
                current = current[index]
            else:
                return None
        return current

    def parse_bool(self, value: Any, *, default: bool) -> bool:
        if isinstance(value, bool):
            return value
        if value is None:
            return default
        if isinstance(value, (int, float)):
            return bool(value)
        if isinstance(value, str):
            return value.strip().lower() in {"1", "true", "yes", "on"}
        return default
