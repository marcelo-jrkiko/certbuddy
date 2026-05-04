import logging

from engine.events.EventDispatcher import EventDispatcher
from engine.CertificateRequester import CertificateRequester
from helpers.DataBackend import getMasterBackendClient

import datetime

class RenewalTask:
    def __init__(self):
        self.requester = CertificateRequester()
        self.started_threads = set()
        self.logger = logging.getLogger(__name__)
        self.event_dispatcher = EventDispatcher()
    
    def run(self):
        backend = getMasterBackendClient()

        # List all certificate that expired or will expire today and is active
        expire_limit = datetime.datetime.now() + datetime.timedelta(days=1)
        
        expiring_certs = backend.search("certificate", {
            "is_active": True,
            "expires_at": {
                "_lte": expire_limit.isoformat()
            }
        })        
            
        for cert in expiring_certs:
            self.logger.info(f"Certificate {cert['id']} is expiring at {cert['expires_at']}. Requesting renewal...")
                        
            thread = self.requester.renew_certificate(cert['id'])
            self.started_threads.add(thread)
            self.logger.info(f"Started renewal thread {thread} for certificate {cert['id']}")
                
        # Wait for all threads to complete before exiting
        self.wait_for_threads()
            
    def wait_for_threads(self):
        self.logger.info("Waiting for all renewal threads to complete...")
        for thread in self.started_threads:
            thread.join()
        self.logger.info("All renewal threads have completed.")
        
    
