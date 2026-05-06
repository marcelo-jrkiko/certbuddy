

import datetime
from enum import Enum
from io import BufferedReader
import logging
import tempfile
from typing_extensions import Buffer
from helpers.DataBackend import BackendClient
from engine.storage.BaseCertificateStorage import BaseCertificateStorage, CertificateStorageFileType

class DataBackendCertificateStorage(BaseCertificateStorage):
    def __init__(self, backendClient: BackendClient):
        super().__init__(backendClient)
        
    def store(self, type: CertificateStorageFileType, user_id: str, common_name: str, content: Buffer) -> str:
        cert_filename = f"{common_name}_{user_id[0:8]}_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Copy the certificate to temporary files to be uploaded to directus and reutilized
        temp_cert_file = f"{tempfile.gettempdir()}/{cert_filename}.{type}"
        with open(temp_cert_file, 'wb') as f:
            f.write(content)
            
         # Upload certificate and key files to Directus
        with open(temp_cert_file, 'rb') as cert_f:
            cert_data = self.backendClient.upload_file(cert_f, f"{cert_filename}.{type}")

            return cert_data.get("id")
            
        
        return None
    
    def get(self, type: CertificateStorageFileType, file_id: str) -> BufferedReader:
        temp_cert_file = tempfile.NamedTemporaryFile(delete=False, suffix=f".{type}")
        cert_path = temp_cert_file.name
        
        self.backend_client.download_file(file_id, cert_path)
        
        return open(cert_path, 'rb')


        

    
        
        
