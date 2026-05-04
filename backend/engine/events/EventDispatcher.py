


import logging

from engine.models.event_listener import EventListener
from helpers.DataBackend import getMasterBackendClient


class EventDispatcher:
    """Class responsible for dispatching events to the appropriate listeners."""
        
    def __init__(self):
        self._listeners = []
        self.logger = logging.getLogger(__name__)
        self.backend = getMasterBackendClient()        
        
    def dispatch(self, event_id: str, user_id: str, payload: dict):
        """Dispatch an event to the appropriate listeners."""
        self.logger.info(f"Dispatching event '{event_id}' for user '{user_id}'")
        listeners = self.get_listeners_for_user(user_id, event_id)
        self.logger.info(f"Found {len(listeners)} listeners for user '{user_id}'")
        for listener in listeners:
            self.logger.info(f"Processing listener '{listener.id}' for event '{event_id}'")
            
            payload = payload if payload else {}
            payload["event_id"] = event_id
            payload["user_id"] = user_id
            payload["listener_id"] = listener.id
            
            # Merge the config from the listener
            if listener.config:
                for key, value in listener.config.items():
                    if key not in payload:
                        payload[key] = value
                   
            
            try:
                # Call the Directus Flow API to trigger the flow associated with this listener
                self.backend._make_request(
                    method="POST",
                    endpoint=f"/flows/trigger/{listener.event_flow}",
                    data={
                        "event": event_id,
                        "payload": payload
                    }
                )
                
                self.logger.info(f"Successfully dispatched event '{event_id}' to listener '{listener.id}'")
            except Exception as e:
                self.logger.error(f"Error dispatching event '{event_id}' to listener '{listener.id}': {e}")
                         
        
    def get_listeners_for_user(self, user_id: str, event_id: str = None) -> list[EventListener]:
        """Get event listeners for a specific user."""
        if event_id:
            return [listener for listener in self._listeners if listener.event_user == user_id and listener.event_id == event_id]
        
        return [listener for listener in self._listeners if listener.event_user == user_id]
    
    def load(self):
        """Load event listeners from the database."""
        self.logger.info("Loading event listeners from database")
        try:
            listeners = self.backend.get_collection("event_listener")
            self._listeners = listeners
            self.logger.info(f"Loaded {len(listeners)} event listeners")
        except Exception as e:
            self.logger.error(f"Error loading event listeners: {e}")
            self._listeners = []
        