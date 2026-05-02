from engine.CertificateRequester import CertificateRequester
from helpers.DataBackend import getMasterBackendClient
from startup import load_config
import datetime
import logging

config = load_config()
logger = logging.getLogger(__name__) 
requester = CertificateRequester()

started_threads = set()

def run():
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
        logger.info(f"Certificate {cert['id']} is expiring at {cert['expires_at']}. Requesting renewal...")
        
        # Find the last certificate request for this certificate
        cert_requests = backend.search("certificate_request", {
            "certificate": cert['id'],
            "status": "issued"
        }, sort="-date_created", limit=1)
        
        if not cert_requests:
            logger.warning(f"No previous certificate request found for certificate {cert['id']}. Skipping renewal.")
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
        logger.info(f"Created renewal request {created_request['id']} for certificate {cert['id']}")
        
        thread = requester.start_request_async(created_request)
        started_threads.add(thread)
        logger.info(f"Started renewal thread {thread} for request {created_request['id']}")
        
        
def wait_for_threads():
    logger.info("Waiting for all renewal threads to complete...")
    for thread in started_threads:
        thread.join()
    logger.info("All renewal threads have completed.")
    
    
if __name__ == "__main__":
    run()
    wait_for_threads()