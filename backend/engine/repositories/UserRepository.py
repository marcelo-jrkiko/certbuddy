
from engine.models.certificateauthority_config import CertificateAuthorityConfig
from engine.models.challenge_config import ChallengeConfig
from helpers.DataBackend import BackendClient


class UserRepository:
    def __init__(self):
        self.backend_client = BackendClient()
    
    def get_user(self, user_id: str) -> dict:
        user = self.backend_client._make_request("GET", f"/users/{user_id}")
        return user
    
    def get_challenge_config(self, user_id: str) -> ChallengeConfig:
        config = self.backend_client.search("challenge_config", 
            {
                "user_created": user_id
            },
            fields=["challenge_key", "config", "domain"]
        )
        
        if config:
            return config[0]
        
        return None
    
    def get_certificate_authority_config(self, user_id: str) -> CertificateAuthorityConfig:
        config = self.backend_client.search("certificateauthority_config", 
            {
                "user_created": user_id
            },
            fields=["ca_key", "config", "domain"]
        )
        
        if config:
            return config[0]
        
        return None