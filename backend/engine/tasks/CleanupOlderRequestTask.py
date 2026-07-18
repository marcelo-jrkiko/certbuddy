


import datetime
import logging

from engine.models.certificate_request import CertificateRequestStatus
from helpers.DataBackend import getMasterBackendClient
from utils import Config

class CleanupOlderRequestsTask:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.backend = getMasterBackendClient()

    def remove_requests(self, filter):
        """Remove certificate requests based on the provided filter."""
        try:
            older_requests = self.backend.search("certificate_request", filter)
            for request in older_requests:
                self.logger.info(f"Cleaning up older request {request['id']} that was created at {request['created_at']}")
                try:
                    self.backend.delete("certificate_request", request['id'])
                    self.logger.info(f"Deleted older request {request['id']}")
                except Exception as e:
                    self.logger.error(f"Failed to delete older request {request['id']}: {e}")
                    continue
        except Exception as e:
            self.logger.error(f"Error while searching for older requests: {e}")
            raise

    def remove_processing_requests(self):
        self.remove_requests({
            "status": CertificateRequestStatus.PROCESSING
        })

    def run(self):
        config = Config()
        if not config.AUTO_CLEANUP_ENABLED:
            self.logger.info("Auto cleanup of older requests is disabled. Skipping task.")
            return
        
        # Calculate the date limit for requests older than 180 days
        date_limit = datetime.datetime.now() - datetime.timedelta(days=180)
        self.remove_requests({
            "created_at": {
                "_lte": date_limit.isoformat()
            }
        })        
        
        