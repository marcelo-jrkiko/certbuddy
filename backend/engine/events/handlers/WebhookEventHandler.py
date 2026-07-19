import json
from typing import Any

import requests

from engine.events.handlers.BaseEventHandler import BaseEventHandler
from engine.models.event_listener import EventListener


class WebhookEventHandler(BaseEventHandler):
    """Calls an HTTP webhook configured in event_params."""

    handler_type = "webhook"

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

        url = self.render_template(str(params.get("url", "")).strip(), context)
        if not url:
            raise ValueError("event_params.url is required for webhook handler")

        method = str(params.get("method", "POST")).upper()
        headers = params.get("headers", {})
        query = params.get("query")
        timeout_seconds = float(params.get("timeout_seconds", 10))
        verify_ssl = self.parse_bool(params.get("verify_ssl"), default=True)

        if not isinstance(headers, dict):
            raise ValueError("event_params.headers must be a JSON object")

        body_template = listener.event_code or ""
        rendered_body = self.render_template(body_template, context)

        body_format = str(params.get("body_format", "json")).lower()
        request_kwargs: dict[str, Any] = {
            "method": method,
            "url": url,
            "headers": headers,
            "params": query,
            "timeout": timeout_seconds,
            "verify": verify_ssl,
        }

        if rendered_body.strip():
            if body_format == "json":
                try:
                    request_kwargs["json"] = json.loads(rendered_body)
                except json.JSONDecodeError as exc:
                    raise ValueError("event_code must be valid JSON when body_format is 'json'") from exc
            else:
                request_kwargs["data"] = rendered_body

        response = requests.request(**request_kwargs)
        if response.status_code >= 400:
            raise RuntimeError(
                f"Webhook request failed with status {response.status_code}: {response.text[:500]}"
            )

        self.logger.info(
            "Webhook handler executed successfully for listener '%s' (%s %s)",
            listener.id,
            method,
            url,
        )
