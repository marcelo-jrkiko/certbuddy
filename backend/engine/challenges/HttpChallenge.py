

from abc import ABC, abstractmethod
import logging
import json

from engine.models.certificate_request import CertificateRequest

class HttpChallenge(ABC):    
    def __init__(self):
        self.type = "HTTP-01"
        self.logger = logging.getLogger(self.__class__.__name__)

    def configure(self, request: CertificateRequest, config: dict | str | None):
        if config:
            if isinstance(config, str):
                config = json.loads(config)
            else:
                self.config = config      
        
        self.request = request

    @abstractmethod
    def apply(self, domain: str, key: str, content: str) -> None:
        """
        Apply the HTTP challenge by creating the appropriate HTTP resource for the given domain and token.
        """
        raise NotImplementedError("This method should be implemented by subclasses.")