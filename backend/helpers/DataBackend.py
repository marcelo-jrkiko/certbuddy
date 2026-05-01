import logging
import json
from typing import Any, Dict
import requests


class BackendClient:
    def __init__(self, config, token: str):
        self.base_url =  config.DIRECTUS_URL
        self.token = token
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def _make_request(self, method: str, endpoint: str, params: Dict[str, Any] = None, data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Make a direct HTTP request to the Directus API"""
        url = f"{self.base_url}{endpoint}"
        response = None
        
        try:
            if method == "GET":
                response = requests.get(url, headers=self.headers, params=params)
            elif method == "POST":
                response = requests.post(url, headers=self.headers, json=data)
            elif method == "PATCH":
                response = requests.patch(url, headers=self.headers, json=data)
            elif method == "DELETE":
                response = requests.delete(url, headers=self.headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            if(response.status_code >= 400):
                logging.error(f"Backend request failed: {response.status_code} \r\n\t - {response.text}")
                response.raise_for_status()                
            
            return response.json() if response.text else {}
        except requests.exceptions.RequestException as e:
            logging.error(f"Backend request failed: {e} -> {response.text if response else 'No response'}")
            raise Exception(f"Failed to request the backend!")

    def get_client(self, name: str) -> Dict[str, Any]:
        """Get client details by slug"""
        filter_obj = {"slug": {"_eq": name}}
        params = {
            "filter": json.dumps(filter_obj)
        }
        response = self._make_request("GET", "/items/Client", params=params)
        items = response.get("data", [])
        return items[0] if items else None
    
    def search(self, collection_name: str, query: Dict[str, Any], fields: list = None) -> list:
        """Search for items in a collection"""
        params = {
            "filter": json.dumps(query) if isinstance(query, dict) else query
        }
        
        if fields:
            params["fields"] = fields
            
        response = self._make_request("GET", f"/items/{collection_name}", params=params)
        return response.get("data", [])

    def get_collection(self, collection_name: str) -> list:
        """Get all items from a collection"""
        response = self._make_request("GET", f"/items/{collection_name}")
        return response.get("data", [])
    
    def create(self, collection_name: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new item in a collection"""
        response = self._make_request("POST", f"/items/{collection_name}", data=data)
        return response.get("data", {})
    
    def update(self, collection_name: str, item_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing item in a collection"""
        response = self._make_request("PATCH", f"/items/{collection_name}/{item_id}", data=data)
        return response.get("data", {})
    
    def delete(self, collection_name: str, item_id: str) -> None:
        """Delete an item from a collection"""
        self._make_request("DELETE", f"/items/{collection_name}/{item_id}")