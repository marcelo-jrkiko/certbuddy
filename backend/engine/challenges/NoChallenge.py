


import logging
import json

from engine.models.certificate_request import CertificateRequest

class NoChallenge:
    def __init__(self):
        self.type = "EMPTY"
        self.logger = logging.getLogger(self.__class__.__name__)

    def configure(self, request: CertificateRequest, config: dict | str | None):
        if config:
            if isinstance(config, str):
                config = json.loads(config)
            else:
                self.config = config      
        
        self.request = request 
                
    def apply(self) -> None:
        self.logger.info("No challenge to apply for this certificate request.")