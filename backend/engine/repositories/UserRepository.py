
from utils import get_main_domain
from engine.models.shared_config import SharedConfig
from engine.models.certificateauthority_config import CertificateAuthorityConfig
from engine.models.challenge_config import ChallengeConfig
from helpers.DataBackend import BackendClient, getMasterBackendClient
import fnmatch

class UserRepository:
    def __init__(self):
        self.backend_client = getMasterBackendClient()
    
    def get_user(self, user_id: str) -> dict:
        user = self.backend_client._make_request("GET", f"/users/{user_id}")
        return user.get('data') if user else None
    
    def merge_shared_config(self, user_id: str, obj: dict):
        """Merge shared configuration into the given object based on user ID and domain"""
        
        if obj.get("merged_config"):
            shared_config = self.get_shared_config(obj["merged_config"])
            
            # merge the shared config into the object config
            if shared_config and shared_config.config:
                obj_config = obj.get("config", {})
                merged_config = {**shared_config.config, **obj_config}
                obj["config"] = merged_config
      
        return obj
    
    def get_shared_config(self, id: str) -> SharedConfig:
        config = self.backend_client._make_request("GET", f"/shared_config/{id}")
        return config
    
    def get_challenge_config(self, user_id: str, challenge_key: str, domain: str) -> ChallengeConfig:
        
        
        config = self.backend_client.search("challenge_config", 
            {
                "user_created": user_id,
                "challenge_key": challenge_key,        
            },
            fields=["challenge_key", "config", "domain", "merged_config"]
        )
        
        # Filter using wildcard domain matching 
        config = [c for c in config if fnmatch.fnmatch(domain, c["domain"])]
        
        if config:
            return config[0]
        
        return None
    
    def get_certificate_authority_config(self, user_id: str, ca_key: str, domain: str) -> CertificateAuthorityConfig:
        config = self.backend_client.search("certificateauthority_config", 
            {
                "user_created": user_id,
                "ca_key": ca_key,
            },
            fields=["ca_key", "config", "domain", "merged_config"]
        )
        
        # Filter using wildcard domain matching 
        config = [c for c in config if fnmatch.fnmatch(domain, c["domain"])]
        
        if config:
            return config[0]
        
        return None