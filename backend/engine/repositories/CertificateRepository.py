

import logging

from engine.models.certificate_request import CertificateRequestStatus
from helpers.DataBackend import getMasterBackendClient

class CertificateRepository:
    def __init__(self):        
        self.backend_client = getMasterBackendClient()

    def set_processing_as_failed(self):
        """Set all certificate requests with status 'processing' to 'failed'."""
        try:
            processing_requests = self.backend_client.search("certificate_request", {"status": CertificateRequestStatus.PROCESSING})
            for request in processing_requests:
                self.backend_client.update("certificate_request", request['id'], {"status": CertificateRequestStatus.FAILED})
                logging.info(f"Set certificate request {request['id']} status from 'processing' to 'failed'")
        except Exception as e:
            logging.error(f"Error while updating processing requests to failed: {e}")
            raise