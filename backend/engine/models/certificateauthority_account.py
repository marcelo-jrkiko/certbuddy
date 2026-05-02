"""Pydantic model for certificateauthority_account collection."""

from typing import Any, Optional
from pydantic import BaseModel, Field


class CertificateAuthorityAccount(BaseModel):
    """Model for certificate authority account."""
    id: str = Field(..., description="UUID identifier")
    user_created: Optional[str] = Field(None, description="UUID of the user who created this")
    account_key: Optional[str] = None
    account_data: Optional[dict[str, Any]] = None

    class Config:
        from_attributes = True
