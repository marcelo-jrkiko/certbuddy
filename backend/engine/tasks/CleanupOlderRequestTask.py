


import datetime
import logging

from helpers.DataBackend import getMasterBackendClient
from utils import Config

class CleanupOlderRequestsTask:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.backend = getMasterBackendClient()

    def run(self):
        config = Config()
        if not config.AUTO_CLEANUP_ENABLED:
            self.logger.info("Auto cleanup of older requests is disabled. Skipping task.")
            return
        
        date_limit = datetime.datetime.now() - datetime.timedelta(days=180)
        older_requests = self.backend.search("certificate_request", {
            "created_at": {
                "_lte": date_limit.isoformat()
            }
        })
        
        for request in older_requests:
            self.logger.info(f"Cleaning up older request {request['id']} that was created at {request['created_at']}")
            try:
                self.backend.delete("certificate_request", request['id'])
                self.logger.info(f"Deleted older request {request['id']}")
            except Exception as e:
                self.logger.error(f"Failed to delete older request {request['id']}: {e}")
                continue