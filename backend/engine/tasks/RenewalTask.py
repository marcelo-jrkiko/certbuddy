import logging
from engine.CertificateRequester import CertificateRequester
from helpers.DataBackend import getMasterBackendClient
import datetime

class RenewalTask:
    def __init__(self):
        self.requester = CertificateRequester()
        self.started_threads = set()
        self.logger = logging.getLogger(__name__)
    
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
            
            # Find the last certificate request for this certificate
            cert_requests = backend.search("certificate_request", {
                "certificate": cert['id'],
                "status": "issued"
            }, sort="-date_created", limit=1)
            
            if not cert_requests:
                self.logger.warning(f"No previous certificate request found for certificate {cert['id']}. Skipping renewal.")
                continue
            
            # Create a new certificate request with the same domain and configuration
            last_request = cert_requests[0]
            new_request = {
                "domain": cert['domain'],
                "issue_to": last_request['issue_to'],
                "challenge_type": last_request['challenge_type'],
                "certificate_authority": last_request['certificate_authority'],
                "config": last_request['config'],
                "status": "pending",
                "date_created": datetime.datetime.now().isoformat(),
                "type": last_request['type']
            }
            
            created_request = backend.create("certificate_request", new_request)
            self.logger.info(f"Created renewal request {created_request['id']} for certificate {cert['id']}")
            
            thread = self.requester.start_request_async(created_request)
            self.started_threads.add(thread)
            self.logger.info(f"Started renewal thread {thread} for request {created_request['id']}")
                
        # Wait for all threads to complete before exiting
        self.wait_for_threads()
            
    def wait_for_threads(self):
        self.logger.info("Waiting for all renewal threads to complete...")
        for thread in self.started_threads:
            thread.join()
        self.logger.info("All renewal threads have completed.")
        
    
