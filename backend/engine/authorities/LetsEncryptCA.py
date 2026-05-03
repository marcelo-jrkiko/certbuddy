

import josepy

from engine.models.certificate_request import CertificateRequest, CertificateRequestType
from engine.repositories.UserRepository import UserRepository
from engine.repositories.CA_AccountRepository import CA_AccountRepository
from engine.authorities.BaseCertificateAuthority import BaseCertificateAuthority
from engine.challenges.DnsChallenge import DnsChallenge
from acme import client, messages
from acme.client import ClientNetwork, ClientV2
from acme import crypto_util
from acme.errors import ConflictError
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import time
from engine.models.ca_response import CA_Response
from helpers import CSR
import json

class LetsEncryptCA(BaseCertificateAuthority):
    def __init__(self):
        super().__init__()
        self.compatibleChallengesTypes = [ "DNS-01" ]
        self.directory_url = "https://acme-staging-v02.api.letsencrypt.org/directory"  # Use staging for testing, switch to production for real issuance
    
        self.carepository = CA_AccountRepository()
        
    def issue_certificate(self, request: CertificateRequest, challenge: any) -> CA_Response:        
        if challenge.type not in self.compatibleChallengesTypes:
            raise Exception(f"Challenge type {challenge.type} is not compatible with Let's Encrypt CA")
        
        if challenge.type == "DNS-01":
            return self._issue_dns_challenge(request, challenge)
    
    def get_directory(self, account_key) -> messages.Directory:
       net = ClientNetwork(account_key, user_agent="CertBuddy/1.0")
       return ClientV2.get_directory(self.directory_url, net), net
    
    def get_acme_client(self, account_key, existing=False, account_uri=None):
        directory, net = self.get_directory(account_key)
        acme_client = client.ClientV2(directory, net)
        
        if existing and account_uri:
            # For existing accounts, we need to set the account on the network object
            # so it uses kid-based signing instead of jwk
            # Create a RegistrationResource with the account URI
            regr = messages.RegistrationResource(
                body=messages.Registration(),
                uri=account_uri
            )
            net.account = regr
                    
        return acme_client
    
    def get_account_key(self, user_id: str):
        account = self.carepository.get_account("letsencrypt", user_id)
        
        userRepo = UserRepository()
        user_details = userRepo.get_user(user_id)
        
        if not account:
            # Create new account with LE
            account_key = josepy.JWKRSA(key=rsa.generate_private_key(public_exponent=65537, key_size=2048, backend=default_backend()))
            acme_client = self.get_acme_client(account_key)
            
            # Register the account
            resource = acme_client.new_account(
                messages.NewRegistration.from_data(email=user_details.get("email"), terms_of_service_agreed=True)
            )
            
            # Serialize account data: key, uri, and body
            account_key_json = account_key.json_dumps()
            account_uri = resource.uri if hasattr(resource, 'uri') else None
            account_body_json = resource.body.json_dumps() if hasattr(resource, 'body') else None
            
            self.carepository.create_account("letsencrypt", user_id, {
                "account_key": account_key_json,
                "account_uri": account_uri,
                "account_body": account_body_json,
            })
            
            return account_key, resource.uri
        else:
            account_data = account.get("account_data", {})
            if isinstance(account_data, str):
                account_data = json.loads(account_data)
            
            # Deserialize the stored account key and URI
            key_json = account_data.get("account_key")
            account_uri = account_data.get("account_uri")
            
            if key_json and account_uri:
                account_key = josepy.JWKRSA.json_loads(key_json)
                return account_key, account_uri
            else:
                raise ValueError(f"No account key or URI found for user {user_id}")
            
        
    def _issue_dns_challenge(self, request: CertificateRequest, challenge: DnsChallenge) -> CA_Response:
        account_key, account_uri = self.get_account_key(request.issue_to)
        acme_client = self.get_acme_client(account_key, existing=True, account_uri=account_uri)
        
        # Generate the CSR
        csr_pem, private_key = CSR.generate_csr(request.domain)
    
        # TODO: Check the last order time in the account, see if we need to wait before placing a new order
        self.logger.debug(f"Placing new order for domain {request.domain} with account URI {account_uri}")
        order = None
        try:
            # Create the order
            order = acme_client.new_order(csr_pem)
            self.logger.debug(f"Order created successfully for domain {request.domain}, order URI: {order.uri}")
        except Exception as e:
            self.logger.error(f"Error creating order: {e}")
            raise
    
        
        # Get the DNS challenge from the order
        authz = order.authorizations[0]
        avaliable_challenges = authz.body.challenges
        dns_challenge = None
        for c in avaliable_challenges:
            if c.chall.typ == "dns-01":
                dns_challenge = c
                break
                
        if not dns_challenge:
            self.logger.error(f"No DNS-01 challenge found for order {order.uri}")
            raise Exception("No DNS-01 challenge found for order")
        
        self.logger.debug(f"DNS-01 challenge found for domain {request.domain}, challenge URI: {dns_challenge.uri}")
        
        # Call the challenge handler to set up the DNS record
        challenge.apply(request.domain, dns_challenge.chall.LABEL, dns_challenge.validation(account_key))
        
        # Wait some time for the DNS record to propagate, then notify ACME server
        time.sleep(45)  # TODO: implement a more robust wait strategy
        
        acme_client.answer_challenge(dns_challenge, dns_challenge.response(account_key))
        
        # Finalize the order and get the certificate
        finalized_order = acme_client.poll_and_finalize(order)
        
        response : CA_Response = {
            "okay": True,
            "message": "Certificate issued successfully",
            "certificate_key": private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption()
            ).decode(),
            "certificate_file": finalized_order.fullchain_pem,
            "type": CertificateRequestType.ISSUER
        }
        
        return response