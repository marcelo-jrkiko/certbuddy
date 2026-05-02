

from abc import ABC, abstractmethod
import logging

from engine.models.ca_response import CA_Response
from engine.models.certificate_request import CertificateRequest


class BaseCertificateAuthority(ABC):
    def __init__(self):
        self.compatibleChallengesTypes = [ "DNS-01" , "HTTP-01" ]
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def issue(self, request: CertificateRequest, challenge: any) -> CA_Response:
        # Check if the challenge type is compatible with this CA
        if challenge.type not in self.compatibleChallengesTypes:
            raise Exception(f"Challenge type {challenge.type} is not compatible with this CA")
        
        return self.__issue(request, challenge)
    
    @abstractmethod
    def __issue(self, request: CertificateRequest, challenge: any) -> CA_Response:
        """
        Internal method to be implemented by subclasses to handle the actual certificate issuance logic.
        """
        raise NotImplementedError("This method should be implemented by subclasses.")

    