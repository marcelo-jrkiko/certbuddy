"""Pydantic model for certificates collection."""

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class Certificate(BaseModel):
    """Model for certificate."""
    id: Optional[str] = Field(None, description="UUID identifier")
    common_name: Optional[str] = Field(None, description="Common name / domain")
    issued_to: Optional[str] = Field(None, description="UUID of the user this certificate is issued to")
    is_active: bool = Field(default=False, description="Whether the certificate is active")
    tags: Optional[list[str]] = Field(None, description="Tags for categorizing certificates")
    certificate_file: Optional[str] = Field(None, description="UUID of the certificate file")
    certificate_key: Optional[str] = Field(None, description="UUID of the certificate key file")
    expires_at: Optional[datetime] = Field(None, description="Certificate expiration datetime")
    user_created: Optional[str] = Field(None, description="UUID of the user who created this")
    date_created: Optional[datetime] = Field(None, description="Creation timestamp")
    date_updated: Optional[datetime] = Field(None, description="Last update timestamp")

    class Config:
        from_attributes = True
