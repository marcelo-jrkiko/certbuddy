
import logging
import tempfile

from flask import config

from engine.storage.BaseCertificateStorage import CertificateStorageFileType
import utils
from engine.events.EventDispatcher import EventDispatcher
from engine.authorities.CloudflareOriginCA import CloudflareOriginCA
from engine.authorities.LetsEncryptCA import LetsEncryptCA

from engine.challenges.NoChallenge import NoChallenge
from engine.challenges.CloudflareChallenge import CloudflareDnsChallenge
from engine.challenges.ManualDnsChallenge import ManualDnsChallenge
from engine.challenges.LocalFileHttpChallenge import LocalFileHttpChallenge
from engine.challenges.SFTPFileHttpChallenge import SFTPFileHttpChallenge

from helpers.CertificateViewer import CertificateViewer

from helpers.DataBackend import BackendClient, getMasterBackendClient
from engine.models.ca_response import CA_Response
from engine.storage import StorageBackend

from engine.repositories.UserRepository import UserRepository
from engine.models.certificate_request import CertificateRequest, CertificateRequestStatus, CertificateRequestType
import datetime
import threading
import uuid
from collections import defaultdict

class CertificateRequester:
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        
        self.event_dispatcher = EventDispatcher()        
        self.event_dispatcher.load()
        
    def get_avaliable_challenges(self):
        return {
            "CLOUDFLARE_DNS" : {
                "name": "Cloudflare DNS Challenge",
                "class" : CloudflareDnsChallenge,
                "config_preset" : {
                  "zone_id": "",
                  "api_token": "", 
                },
                "type": "dns"
            },
            "MANUAL_DNS" : {
                "name": "Manual DNS Challenge",
                "class" : ManualDnsChallenge,
                "config_preset" : {
                  "timeout_seconds": 86400,
                  "poll_interval_seconds": 30
                },
                "type": "dns"
            },
            "EMPTY" : {
                "name": "No Challenge",
                "class" : NoChallenge,
                "config_preset" : {},
                "type": "none"
            },
            "LOCAL_FILE_HTTP" : {
                "name": "Local File HTTP Challenge",
                "class" : LocalFileHttpChallenge,
                "config_preset" : {
                  "base_path": "/path/to/challenges/{$domain}/{$key}"
                },
                "type": "http"
            },
            "SFTP_FILE_HTTP" : {
                "name": "SFTP File HTTP Challenge",
                "class" : SFTPFileHttpChallenge,
                "config_preset" : {
                  "base_path": "/path/to/challenges/{$domain}/{$key}",
                  "remote_host": "example.com",
                  "remote_user": "username",
                  "remote_port": 22,
                  "private_key_path": "/path/to/private/key"
                },
                "type": "http"
            }
        }
        
    def get_avaliable_certificate_authorities(self):
        return {
            "LETSENCRYPT" : {
                "name": "Let's Encrypt",
                "class" : LetsEncryptCA,
                "config_preset" : {
                  "environment": "production", # or "staging"
                },
            },
            "CLOUDFLARE_ORIGIN_CA" : {
                "name": "Cloudflare Origin CA",
                "class" : CloudflareOriginCA,
                "config_preset" : {
                  "api_token": "",
                  "zone_id": "",
                },
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
        self.logger.info(f"Started certificate request processing in thread {thread_id}")
        
        request.config = request.config or {}
        request.config["thread_id"] = thread_id
        
        backendClient = getMasterBackendClient()
        backendClient.update("certificate_request", request.id, {
            "config": request.config,
            "status": CertificateRequestStatus.PROCESSING
        })
        
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
    
    
    def renew_certificate(self, certificate_id: str):
        """Renew a certificate by its ID"""
        backend = getMasterBackendClient()
        cert = backend.get("certificates", certificate_id)
        
        self.event_dispatcher.dispatch("cert.expired", cert['issue_to'], {
                "request_id": cert['id'],
                "domain": cert['domain'],
                'user_id': cert['issue_to']
            })
            
        # Find the last certificate request for this certificate
        cert_requests = backend.search("certificate_request", {
            "certificate": cert['id'],
            "status": "issued"
        }, sort="-date_created", limit=1)
        
        
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
        
        return self.start_request_async(created_request)
    
    def process_request(self, request: CertificateRequest):         
        backendClient = getMasterBackendClient()  
             
        try:  
            self.logger.addHandler(logging.FileHandler(f"{utils.Config.LOGS_DIR}/request_{request.id}.log"))
            self.logger.setLevel(logging.DEBUG)
            
            self.logger.info(f"Processing certificate request {request.id} for domain {request.domain} and user {request.issue_to}")
            
            self.event_dispatcher.dispatch("cert.requested", request.issue_to, {
                "request_id": request.id,
                "domain": request.domain,
                'user_id': request.issue_to
            })
            
            userRepo = UserRepository()
            
            self.logger.info(f"Retrieving challenge and CA config for user {request.issue_to}")        
            # Get the Challenge Config for the request challenge
            challenge_config = userRepo.get_challenge_config(request.issue_to, request.challenge_type, request.domain)
                        
            # Get the Certificate Authority Config for the request
            ca_config = userRepo.get_certificate_authority_config(request.issue_to, request.certificate_authority, request.domain)
            
            if not challenge_config and request.challenge_type != "EMPTY":
                self.logger.error(f"No challenge config found for user {request.issue_to}")
                raise Exception("No challenge config found for user")
            elif not challenge_config and request.challenge_type == "EMPTY":
                self.logger.info(f"Request {request.id} has challenge type EMPTY, using default no-challenge config")
                challenge_config = {
                    "config": {}
                }
            
            if not ca_config:
                self.logger.error(f"No certificate authority config found for user {request.issue_to}")
                raise Exception("No certificate authority config found for user")
            
            challenge_config = userRepo.merge_shared_config(request.issue_to, challenge_config)
            ca_config = userRepo.merge_shared_config(request.issue_to, ca_config)
            
            # Instantiate the Challenge and CA classes based on the request
            self.logger.info(f"Instantiating challenge and CA for request {request.id} - Challenge: {request.challenge_type}, CA: {request.certificate_authority}")
            
            challenge_class = self.get_avaliable_challenges().get(request.challenge_type)
            ca_class = self.get_avaliable_certificate_authorities().get(request.certificate_authority)
            
            challenge_obj = challenge_class["class"]()       
            ca_obj = ca_class["class"]()        
            
            # Loads the challenge and CA configuration
            self.logger.info(f"Configuring challenge and CA for request {request.id}")
            challenge_obj.configure(request, challenge_config.get('config'))
            ca_obj.configure(ca_config.get('config'))
            
            # Call the CA to issue the certificate based on the request and challenge
            self.logger.info(f"Issuing certificate for request {request.id}, ca: {ca_obj.__class__.__name__}, challenge: {challenge_obj.__class__.__name__}")
            ca_response : CA_Response = ca_obj.issue(request, challenge_obj)
            
            if not ca_response.get("okay"):
                self.logger.error(f"Certificate issuance failed for request {request.id} with error: {ca_response.get('error_message')}")
                raise Exception(f"Certificate issuance failed: {ca_response.get('error_message')}")
            
            # Store the issued certificate and key in the storage 
            self.logger.info(f"Storing issued certificate for request {request.id} in storage")
            storage = StorageBackend.get_certificate_storage(backendClient)
            
            cert_file_id = None
            key_file_id = None
            cert_details = None
            
            # create temporary files for the certificate and key
            temp_cert_file = tempfile.NamedTemporaryFile(delete=False, suffix=".crt").name
            with open(temp_cert_file, 'wb') as cert_f:
                cert_f.write(ca_response.get("certificate_file").encode())                
                cert_f.flush()                
            
            with open(temp_cert_file, 'rb') as cert_f:    
                cert_file_id = storage.store(CertificateStorageFileType.CERTIFICATE, request.issue_to, request.domain, cert_f.read())           
            
            cert_details = CertificateViewer.get_details(temp_cert_file)                    
                
            # ---
            temp_key_file = tempfile.NamedTemporaryFile(delete=False, suffix=".key").name
            with open(temp_key_file, 'wb') as key_f:
                key_f.write(ca_response.get("certificate_key").encode())
                key_f.flush() 
            
            with open(temp_key_file, 'rb') as key_f:    
                key_file_id = storage.store(CertificateStorageFileType.KEY, request.issue_to, request.domain, key_f.read())
                      
            # 
            if not cert_file_id or not key_file_id:
                self.logger.error(f"Failed to upload certificate or key for request {request.id}")
                raise Exception("Failed to upload certificate or key")
            
            self.logger.info(f"Certificate and key files uploaded for request {request.id} with cert_file_id: {cert_file_id} and key_file_id: {key_file_id}")
            
            # tags
            tags = request.config.get("tags", []) if request.config else []
            
            if isinstance(tags, str):
                tags = [tag.strip() for tag in tags.split(",")]
                                  
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
            
            self.logger.info(f"New certificate record created for request {request.id} with certificate ID: {new_certificate.get('id')}")

            # Update the request with the certificate details and mark it as completed
            backendClient.update("certificate_request", request.id, {
                "status": CertificateRequestStatus.ISSUED,
                "certificate": new_certificate.get('id'),
                "type": ca_response.get("type")
            })
            
            # Mark all other ceritificate of the same domain and user as inactive except the newly issued one
            existing_certs = backendClient.search("certificates", {
                "issued_to": request.issue_to,
                "common_name": request.domain,
                "is_active": True,
                "id": { "_neq": new_certificate.get('id') }
            })
            for cert in existing_certs:
                backendClient.update("certificates", cert['id'], {
                    "is_active": False
                })
            
            self.event_dispatcher.dispatch("cert.issued", request.issue_to, {
                "request_id": request.id,
                "domain": request.domain,
                'user_id': request.issue_to,
                "certificate_id": new_certificate.get('id')
            })
            
            self.logger.info(f"Certificate request {request.id} marked as ISSUED with certificate ID: {new_certificate.get('id')}")
        except Exception as e:
            self.logger.error(f"Error processing certificate request {request.id}:")     
            self.logger.exception(e)       
            
            request.config = request.config or {}
            request.config["error"] = str(e)
            
            backendClient.update("certificate_request", request.id, {
                "status": CertificateRequestStatus.FAILED,
                "config": request.config
            })
            
            self.event_dispatcher.dispatch("cert.failed", request.issue_to, {
                "request_id": request.id,
                "domain": request.domain,
                'user_id': request.issue_to,
                "error": str(e)
            })