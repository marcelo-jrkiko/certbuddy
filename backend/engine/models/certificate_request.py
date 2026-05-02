"""Pydantic model for certificate_request collection."""

from datetime import datetime
from typing import Any, Optional
from enum import Enum
from pydantic import BaseModel, Field


class CertificateRequestStatus(str, Enum):
    """Status enum for certificate requests."""
    PENDING = "pending"
    REJECTED = "rejected"
    ISSUED = "issued"
    FAILED = "failed"


class CertificateRequest(BaseModel):
    """Model for certificate request."""
    id: str = Field(..., description="UUID identifier")
    domain: Optional[str] = None
    issue_to: Optional[str] = Field(None, description="UUID of the user to issue to")
    status: Optional[CertificateRequestStatus] = None
    challenge_type: Optional[str] = None
    certificate_authority: Optional[str] = None
    config: Optional[dict[str, Any]] = None
    date_created: Optional[datetime] = None

    class Config:
        from_attributes = True
