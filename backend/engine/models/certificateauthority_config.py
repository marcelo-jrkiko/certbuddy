"""Pydantic model for certificateauthority_config collection."""

from typing import Any, Optional
from pydantic import BaseModel, Field


class CertificateAuthorityConfig(BaseModel):
    """Model for certificate authority configuration."""
    id: str = Field(..., description="UUID identifier")
    user_created: Optional[str] = Field(None, description="UUID of the user who created this")
    ca_key: Optional[str] = Field(None, description="Certificate authority key")
    config: Optional[dict[str, Any]] = Field(None, description="Configuration data")
    domain: Optional[str] = Field(None, description="Domain")
    merged_config: Optional[str] = Field(None, description="UUID of merged shared configuration")

    class Config:
        from_attributes = True
