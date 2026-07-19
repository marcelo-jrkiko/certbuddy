import time
from typing import Any, Optional

from engine.events.EventDispatcher import EventDispatcher
from engine.models.interaction_request import InteractionRequest
from helpers.DataBackend import BackendClient, getMasterBackendClient


class InteractionRequestRepository:
    """Repository to manage interaction_request records."""

    FINAL_STATUSES = {"answer", "responded", "rejected"}

    def __init__(self, backend_client: Optional[BackendClient] = None):
        self.backend_client = backend_client or getMasterBackendClient()
        self.event_dispatcher = EventDispatcher()

    def create_request(
        self,
        user_id: str,
        request_type: str,
        request_data: Optional[dict[str, Any]] = None,
        status: str = "new",
    ) -> InteractionRequest:
        created_item = self.backend_client.create(
            "interaction_request",
            {
                "user": user_id,
                "type": request_type,
                "status": status,
                "request_data": request_data or {},
            },
        )
        
        self.event_dispatcher.dispatch(
            event_id="interaction_request.created",
            user_id=user_id,
            payload={"request_id": created_item["id"], "type": request_type},
        )

        return InteractionRequest(**created_item)

    def get_request(self, request_id: str) -> Optional[InteractionRequest]:
        item = self.backend_client.get_item("interaction_request", request_id)
        if not item:
            return None

        return InteractionRequest(**item)

    def update_request(self, request_id: str, data: dict[str, Any]) -> Optional[InteractionRequest]:
        updated_item = self.backend_client.update("interaction_request", request_id, data)
        if updated_item:
            return InteractionRequest(**updated_item)

        # Some backends may not return the updated payload. Re-fetch in that case.
        return self.get_request(request_id)

    def delete_request(self, request_id: str) -> None:
        self.backend_client.delete("interaction_request", request_id)

    def wait_for_answer(
        self,
        request_id: str,
        timeout_seconds: int = 300,
        poll_interval_seconds: float = 2.0,
        final_statuses: Optional[set[str]] = None,
    ) -> InteractionRequest:
        statuses = {s.lower() for s in (final_statuses or self.FINAL_STATUSES)}
        started_at = time.monotonic()

        while True:
            interaction_request = self.get_request(request_id)
            if not interaction_request:
                raise ValueError(f"Interaction request '{request_id}' not found")

            status = (interaction_request.status or "").lower()
            if status in statuses:
                return interaction_request

            if timeout_seconds is not None and time.monotonic() - started_at >= timeout_seconds:
                self.event_dispatcher.dispatch(
                    event_id="interaction_request.timeout",
                    user_id=interaction_request.user,
                    payload={"request_id": request_id, "status": status},
                )
                raise TimeoutError(
                    f"Timed out waiting for interaction request '{request_id}' answer. "
                    f"Expected one of: {sorted(statuses)}"
                )

            time.sleep(poll_interval_seconds)