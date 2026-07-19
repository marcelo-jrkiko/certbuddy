import logging
from typing import Any

from engine.events.handlers import BaseEventHandler, ShellScriptEventHandler, WebhookEventHandler
from engine.models.event_listener import EventListener
from helpers.DataBackend import getMasterBackendClient


class EventDispatcher:
    """Class responsible for dispatching events to the appropriate listeners."""

    def __init__(self):
        self._listeners: list[EventListener] = []
        self._handlers: list[BaseEventHandler] = [
            ShellScriptEventHandler(),
            WebhookEventHandler(),
        ]
        self.logger = logging.getLogger(__name__)
        self.backend = getMasterBackendClient()

    def dispatch(self, event_id: str, user_id: str, payload: dict[str, Any] | None = None):
        """Dispatch an event to registered listeners for the user/event."""
        self.load()

        self.logger.info("Dispatching event '%s' for user '%s'", event_id, user_id)
        listeners = self.get_listeners_for_user(user_id, event_id)
        self.logger.info("Found %s listeners for user '%s'", len(listeners), user_id)

        base_payload = dict(payload or {})
        base_payload["event_id"] = event_id
        base_payload["user_id"] = user_id

        for listener in listeners:
            self.logger.info("Processing listener '%s' for event '%s'", listener.id, event_id)
            handler = self._get_handler_for_listener(listener)
            if not handler:
                self.logger.error(
                    "No handler registered for listener '%s' with type '%s'",
                    listener.id,
                    listener.handler,
                )
                continue

            try:
                listener_payload = dict(base_payload)
                listener_payload["listener_id"] = listener.id
                handler.execute(listener, event_id, user_id, listener_payload)
                self.logger.info(
                    "Successfully dispatched event '%s' to listener '%s'",
                    event_id,
                    listener.id,
                )
            except Exception as exc:
                self.logger.error(
                    "Error dispatching event '%s' to listener '%s': %s",
                    event_id,
                    listener.id,
                    exc,
                )

    def _get_handler_for_listener(self, listener: EventListener) -> BaseEventHandler | None:
        for handler in self._handlers:
            if handler.can_handle(listener):
                return handler
        return None

    def get_listeners_for_user(self, user_id: str, event_id: str | None = None) -> list[EventListener]:
        """Get event listeners for a specific user."""
        if event_id:
            return [
                listener
                for listener in self._listeners
                if (listener.event_user == user_id or listener.is_global) and listener.event_id == event_id
            ]

        return [listener for listener in self._listeners if listener.event_user == user_id or listener.is_global]

    def load(self):
        """Load event listeners from the database."""
        self.logger.info("Loading event listeners from database")
        try:
            listeners_raw = self.backend.get_collection("event_listener")
            listeners: list[EventListener] = []
            for item in listeners_raw:
                try:
                    listeners.append(EventListener.model_validate(item))
                except Exception as parse_error:
                    self.logger.error("Invalid event_listener item skipped: %s", parse_error)

            self._listeners = listeners
            self.logger.info("Loaded %s event listeners", len(listeners))
        except Exception as exc:
            self.logger.error("Error loading event listeners: %s", exc)
            self._listeners = []
