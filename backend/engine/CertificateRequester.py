
import logging
import tempfile

from helpers.CertificateViewer import CertificateViewer
from helpers.DataBackend import BackendClient, getMasterBackendClient
from engine.models.ca_response import CA_Response
from engine.authorities import LetsEncryptCA
from engine.challenges.CloudflareChallenge import CloudflareDnsChallenge
from engine.repositories.UserRepository import UserRepository
from engine.models.certificate_request import CertificateRequest, CertificateRequestStatus
import datetime
import threading
import uuid
from collections import defaultdict

class CertificateRequester:
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def get_avaliable_challenges(self):
        return {
            "CLOUDFLARE_DNS" : {
                "name": "Cloudflare DNS Challenge",
                "class" : CloudflareDnsChallenge,
                "type": "dns"
            }
        }
        
    def get_avaliable_certificate_authorities(self):
        return {
            "LETSENCRYPT" : {
                "name": "Let's Encrypt",
                "class" : LetsEncryptCA
            }
        }
        
    # Global thread pool
    _thread_pool = {}
    _thread_pool_lock = threading.Lock()

    def start_request_async(self, request: CertificateRequest):
        """Start certificate request processing in a separate thread"""
        thread_id = str(uuid.uuid4())
        
        thread = threading.Thread(
            target=self.process_request,
            args=(request,),
            name=f"CertRequest-{thread_id}",
            daemon=False
        )
        
        with self._thread_pool_lock:
            self._thread_pool[thread_id] = {
                "thread": thread,
                "request_id": request.id,
            }
        
        thread.start()
        self.logger.debug(f"Started certificate request processing in thread {thread_id}")
        
        return thread_id
    
    def get_request_status(self, thread_id: str):
        """Get the status of a certificate request thread"""
        with self._thread_pool_lock:
            thread_info = self._thread_pool.get(thread_id)
        
        if not thread_info:
            return {
                "status": "not_found",
                "message": f"No thread found with ID {thread_id}"
            }
        
        thread = thread_info["thread"]
        if thread.is_alive():
            return {
                "status": "processing",
                "message": f"Thread {thread_id} is still processing",
                "request_id": thread_info["request_id"]
            }
        else:
            return {
                "status": "completed",
                "message": f"Thread {thread_id} has completed",
                "request_id": thread_info["request_id"]
            }
    
    
        
    def process_request(self, request: CertificateRequest):    
        self.logger.debug(f"Processing certificate request {request.id} for domain {request.domain} and user {request.issue_to}")
        
        userRepo = UserRepository()
        
        self.logger.debug(f"Retrieving challenge and CA config for user {request.issue_to}")        
        # Get the Challenge Config for the request challenge
        challenge_config = userRepo.get_challenge_config(request.issue_to)
        
        # Get the Certificate Authority Config for the request
        ca_config = userRepo.get_certificate_authority_config(request.issue_to)
        
        if not challenge_config:
            self.logger.error(f"No challenge config found for user {request.issue_to}")
            raise Exception("No challenge config found for user")
        
        if not ca_config:
            self.logger.error(f"No certificate authority config found for user {request.issue_to}")
            raise Exception("No certificate authority config found for user")
        
        # Instantiate the Challenge and CA classes based on the request
        self.logger.debug(f"Instantiating challenge and CA for request {request.id} - Challenge: {request.challenge_type}, CA: {request.certificate_authority}")
        
        challenge_class = self.get_avaliable_challenges().get(request.challenge_type)
        ca_class = self.get_avaliable_certificate_authorities().get(request.certificate_authority)
        
        challenge_obj = challenge_class["class"]()       
        ca_obj = ca_class["class"]()        
        
        # Loads the challenge and CA configuration
        self.logger.debug(f"Configuring challenge and CA for request {request.id}")
        challenge_obj.configure(challenge_config.config)
        ca_obj.configure(ca_config.config)
        
        # Call the CA to issue the certificate based on the request and challenge
        self.logger.debug(f"Issuing certificate for request {request.id}")
        ca_response : CA_Response = ca_obj.issue(request, challenge_obj)
        
        if not ca_response.okay:
            self.logger.error(f"Certificate issuance failed for request {request.id} with error: {ca_response.error_message}")
            raise Exception(f"Certificate issuance failed: {ca_response.error_message}")
        
        # Store the issued certificate and key in the storage 
        self.logger.debug(f"Storing issued certificate for request {request.id} in storage")
        backendClient = getMasterBackendClient()  
        
        cert_filename = f"{request.domain}_{request.issue_to[0:8]}_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # create temporary files for the certificate and key
        temp_cert_file = f"{tempfile.gettempdir()}/{cert_filename}.crt"
        with open(temp_cert_file, 'wb') as f:
            f.write(ca_response.certificate_file.encode())
        
        temp_key_file = f"{tempfile.gettempdir()}/{cert_filename}.key"
        with open(temp_key_file, 'wb') as f:
            f.write(ca_response.certificate_key.encode())
           
        # Upload certificate and key files to Directus
        self.logger.debug(f"Uploading certificate and key files for request {request.id} to Directus")
        with open(temp_cert_file, 'rb') as cert_f:
            cert_data = backendClient.upload_file(cert_f, f"{cert_filename}.crt")
        
        with open(temp_key_file, 'rb') as key_f:
            key_data = backendClient.upload_file(key_f, f"{cert_filename}.key")
        
        cert_file_id = cert_data.get('id')
        key_file_id = key_data.get('id')
        
        # 
        if not cert_file_id or not key_file_id:
            self.logger.error(f"Failed to upload certificate or key for request {request.id}")
            raise Exception("Failed to upload certificate or key")
        
        self.logger.debug(f"Certificate and key files uploaded for request {request.id} with cert_file_id: {cert_file_id} and key_file_id: {key_file_id}")
        
        # tags
        tags = request.config.get("tags", []) if request.config else []
        
        cert_details = CertificateViewer.get_details(temp_cert_file)                    
        new_certificate = backendClient.create("certificates", {
            "issued_to": request.issue_to,
            "common_name": request.domain,
            "certificate_file": cert_file_id,
            "certificate_key": key_file_id,
            "tags": tags,
            "is_active": True,
            "expires_at": cert_details.get("not_valid_after") if cert_details else None,
            "type" : "issued"
        })
        
        self.logger.debug(f"New certificate record created for request {request.id} with certificate ID: {new_certificate.get('id')}")

        # Update the request with the certificate details and mark it as completed
        backendClient.update("certificate_request", request.id, {
            "status": CertificateRequestStatus.ISSUED,
            "certificate": new_certificate.get('id')
        })
        
        self.logger.debug(f"Certificate request {request.id} marked as ISSUED with certificate ID: {new_certificate.get('id')}")
                