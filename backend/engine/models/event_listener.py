"""Pydantic model for event_listener collection."""

from typing import Any, Optional
from pydantic import BaseModel, Field


class EventListener(BaseModel):
    """Model for event listener."""

    id: Optional[str] = Field(None, description="UUID identifier")
    event_user: Optional[str] = Field(None, description="UUID of the user associated with this event")
    event_id: Optional[str] = Field(None, description="Event identifier (e.g. cert.uploaded)")
    handler: Optional[str] = Field(None, description="Handler type (shell_script or webhook)")
    event_params: Optional[dict[str, Any] | str] = Field(
        None,
        description="JSON object with handler parameters",
    )
    event_code: Optional[str] = Field(
        None,
        description="Handler code/template (script for shell, body template for webhook)",
    )
    is_global: Optional[bool] = Field(False, description="Whether this listener is global (applies to all users)")

    # Legacy fields kept for compatibility with older data snapshots.
    event_flow: Optional[str] = Field(None, description="Legacy flow identifier")
    config: Optional[dict] = Field(None, description="Legacy configuration")

    class Config:
        from_attributes = True
