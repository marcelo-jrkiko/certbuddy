"""Pydantic model for interaction_request collection."""

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class InteractionRequest(BaseModel):
    """Model for interaction request."""
    id: Optional[str] = Field(None, description="UUID identifier")
    date_created: Optional[datetime] = Field(None, description="Creation timestamp")
    date_updated: Optional[datetime] = Field(None, description="Last update timestamp")
    user: Optional[str] = Field(None, description="UUID of the related user")
    status: Optional[str] = Field(None, description="Interaction request status")
    type: Optional[str] = Field(None, description="Interaction request type")
    request_data: Optional[dict[str, Any]] = Field(None, description="Payload sent in the interaction request")
    response_data: Optional[dict[str, Any]] = Field(None, description="Payload returned for the interaction request")

    class Config:
        from_attributes = True
