

from abc import ABC, abstractmethod
import logging

class DnsChallengeConfig(ABC):
    pass


class DnsChallenge(ABC):    
    def __init__(self):
        self.type = "DNS-01"
        self.logger = logging.getLogger(self.__class__.__name__)

    def configure(self, config: DnsChallengeConfig):
        self.config = config        

    @abstractmethod
    def apply(self, domain: str, key: str, token: str) -> None:
        """
        Apply the DNS challenge by creating the appropriate TXT record for the given domain and token.
        """
        raise NotImplementedError("This method should be implemented by subclasses.")