
from helpers.DataBackend import BackendClient


class UserRepository:
    def __init__(self):
        self.backend_client = BackendClient()
    
    def get_user(self, user_id: str) -> dict:
        user = self.backend_client._make_request("GET", f"/users/{user_id}")
        return user