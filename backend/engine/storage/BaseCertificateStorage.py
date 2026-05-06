

from abc import ABC, abstractmethod
import datetime
from enum import Enum
import logging
import tempfile
from typing_extensions import Buffer

from helpers.DataBackend import BackendClient

class CertificateStorageFileType(str, Enum):
    """Enum for certificate storage types."""
    KEY = "key"
    CERTIFICATE = "crt"


class BaseCertificateStorage(ABC):
    def __init__(self, backendClient: BackendClient):
        self.logger = logging.getLogger(__name__)
        self.backendClient = backendClient
        
    @abstractmethod
    def store(self, type: CertificateStorageFileType, user_id: str, common_name: str, content: Buffer) -> str:
        pass
    
    @abstractmethod
    def get(self, file_id: str) -> Buffer:
        pass
        