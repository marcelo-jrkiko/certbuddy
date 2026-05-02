"""Pydantic model for challenge_config collection."""

from typing import Any, Optional
from pydantic import BaseModel, Field


class ChallengeConfig(BaseModel):
    """Model for challenge configuration."""
    id: Optional[str] = Field(None, description="UUID identifier")
    user_created: Optional[str] = Field(None, description="UUID of the user who created this")
    challenge_key: Optional[str] = Field(None, description="Challenge key")
    config: Optional[dict[str, Any]] = Field(None, description="Configuration data")
    domain: Optional[str] = Field(None, description="Domain")
    merged_config: Optional[str] = Field(None, description="UUID of merged shared configuration")

    class Config:
        from_attributes = True
