"""Pydantic model for event_listener collection."""

from typing import Optional
from pydantic import BaseModel, Field


class EventListener(BaseModel):
    """Model for event listener."""
    id: Optional[str] = Field(None, description="UUID identifier")
    event_user: Optional[str] = Field(None, description="UUID of the user associated with this event")
    event_flow: Optional[str] = Field(None, description="UUID of the flow associated with this event")

    class Config:
        from_attributes = True
