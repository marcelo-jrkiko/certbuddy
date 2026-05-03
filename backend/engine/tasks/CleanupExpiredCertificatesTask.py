


import datetime
import logging

from helpers.DataBackend import getMasterBackendClient
from utils import Config

class CleanupExpiredCertificatesTask:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.backend = getMasterBackendClient()

    def run(self):
        config = Config()
        if not config.AUTO_CLEANUP_ENABLED:
            self.logger.info("Auto cleanup of expired certificates is disabled. Skipping task.")
            return
        
        date_limit = datetime.datetime.now() - datetime.timedelta(days=config.AUTO_CLEANUP_BEFORE_EXPIRE_DAYS)
        expired_certs = self.backend.search("certificates", {
            "expires_at": {
                "_lte": date_limit.isoformat()
            }
        })
        
        for cert in expired_certs:
            self.logger.info(f"Cleaning up expired certificate {cert['id']} that expired at {cert['expires_at']}")
            try:
                self.backend.delete("certificates", cert['id'])
                self.logger.info(f"Deleted expired certificate {cert['id']}")
            except Exception as e:
                self.logger.error(f"Failed to delete expired certificate {cert['id']}: {e}")
                continue