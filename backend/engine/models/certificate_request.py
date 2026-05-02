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
    PROCESSING = "processing"

class CertificateRequestType(str, Enum):
    """Type enum for certificate requests."""
    ISSUER = "issuer"
    PULLER = "puller"

class CertificateRequest(BaseModel):
    """Model for certificate request."""
    id: Optional[str] = Field(None, description="UUID identifier")
    date_created: Optional[datetime] = Field(None, description="Creation timestamp")
    domain: Optional[str] = Field(None, description="Domain name")
    issue_to: Optional[str] = Field(None, description="UUID of the user to issue to")
    status: Optional[CertificateRequestStatus] = None
    challenge_type: Optional[str] = Field(None, description="Type of challenge (dns, http, etc)")
    certificate_authority: Optional[str] = Field(None, description="Certificate authority type")
    config: Optional[dict[str, Any]] = Field(None, description="Configuration data")
    certificate: Optional[str] = Field(None, description="UUID of the issued certificate")
    type: Optional[CertificateRequestType] = Field(None, description="Type of certificate request")

    class Config:
        from_attributes = True
