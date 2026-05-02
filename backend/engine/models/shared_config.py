"""Pydantic model for shared_config collection."""

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class SharedConfig(BaseModel):
    """Model for shared configuration."""
    id: str = Field(..., description="UUID identifier")
    user_created: Optional[str] = Field(None, description="UUID of the user who created this")
    date_created: Optional[datetime] = Field(None, description="Creation timestamp")
    key: Optional[str] = Field(None, description="Configuration key")
    config: Optional[dict[str, Any]] = Field(None, description="Configuration data")

    class Config:
        from_attributes = True
