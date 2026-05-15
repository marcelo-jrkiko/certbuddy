

from utils import Config
from engine.storage.BaseCertificateStorage import BaseCertificateStorage
from engine.storage.DataBackendCertificateStorage import DataBackendCertificateStorage
        
def get_certificate_storage(backendClient) -> BaseCertificateStorage:
    """Factory function to get the appropriate certificate storage implementation based on configuration."""
    config = Config()
    storage_type = config.CERT_STORAGE.lower()
    
    if storage_type == "default_vault":        
        return DataBackendCertificateStorage(backendClient)
    else:
        raise ValueError(f"Unsupported certificate storage type: {storage_type}")
