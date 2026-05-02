

import json

from engine.models.certificateauthority_account import CertificateAuthorityAccount
from helpers.DataBackend import BackendClient, getMasterBackendClient


class CA_AccountRepository:
    def __init__(self):
        self.backend_client = getMasterBackendClient()
        
        
    def get_account(self, account_key: str, user_id: str) -> CertificateAuthorityAccount:
        account_item = self.backend_client.search("certificateauthority_account", 
            {
                "account_key": account_key,
                "user_created": user_id
            },
        )
        
        if account_item:
            return CertificateAuthorityAccount(**account_item)
        
        return None
    
    def create_account(self, account_key: str, user_id: str, account_data: any) -> CertificateAuthorityAccount:
        new_account = self.backend_client.create("certificateauthority_account", {
            "account_key": account_key,
            "user_created": user_id,
            "account_data": json.dumps(account_data)
        })
        
        return CertificateAuthorityAccount(**new_account)