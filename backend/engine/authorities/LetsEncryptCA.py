

import josepy

from engine.challenges.HttpChallenge import HttpChallenge
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
        self.compatibleChallengesTypes = [ "DNS-01", "HTTP-01" ]
        self.directory_url = "https://acme-staging-v02.api.letsencrypt.org/directory"  # Use staging for testing, switch to production for real issuance
    
        self.carepository = CA_AccountRepository()
    
    def configure(self, config):
        super().configure(config)    
        
        if(self.config.get("environment") == "production"):
            self.directory_url = "https://acme-v02.api.letsencrypt.org/directory"

    def _safe_attr(self, obj, attr, default=None):
        try:
            return getattr(obj, attr, default)
        except Exception:
            return default

    def _challenge_status(self, challenge):
        status = self._safe_attr(challenge, "status")
        if status is not None:
            return status

        body = self._safe_attr(challenge, "body")
        return self._safe_attr(body, "status")

    def _order_status(self, order):
        body = self._safe_attr(order, "body")
        if body is not None:
            return self._safe_attr(body, "status")
        return self._safe_attr(order, "status")
    
    def issue_certificate(self, request: CertificateRequest, challenge: any) -> CA_Response:        
        self.logger.info(
            f"Starting certificate issuance for domain={request.domain}, user_id={request.issue_to}, challenge_type={getattr(challenge, 'type', 'unknown')}"
        )

        if challenge.type not in self.compatibleChallengesTypes:
            self.logger.error(
                f"Unsupported challenge type for domain={request.domain}, user_id={request.issue_to}: {challenge.type}"
            )
            raise Exception(f"Challenge type {challenge.type} is not compatible with Let's Encrypt CA")

        try:
            if challenge.type == "DNS-01":
                response = self._issue_dns_challenge(request, challenge)
            elif challenge.type == "HTTP-01":
                response = self._issue_http_challenge(request, challenge)
            else:
                raise Exception(f"Challenge type {challenge.type} is not compatible with Let's Encrypt CA")

            self.logger.info(
                f"Certificate issuance completed successfully for domain={request.domain}, user_id={request.issue_to}"
            )
            return response
        except Exception as e:
            self.logger.exception(
                f"Certificate issuance failed for domain={request.domain}, user_id={request.issue_to}, challenge_type={challenge.type}: {e}"
            )
            raise
    
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
        self.logger.info(f"Loading Let's Encrypt account for user_id={user_id}")
        account = self.carepository.get_account("letsencrypt", user_id)
        
        userRepo = UserRepository()
        user_details = userRepo.get_user(user_id)
        
        if not account:
            self.logger.info(f"No existing Let's Encrypt account found for user_id={user_id}, creating one")
            # Create new account with LE
            account_key = josepy.JWKRSA(key=rsa.generate_private_key(public_exponent=65537, key_size=2048, backend=default_backend()))
            acme_client = self.get_acme_client(account_key)
            
            # Register the account
            try:
                resource = acme_client.new_account(
                    messages.NewRegistration.from_data(email=user_details.get("email"), terms_of_service_agreed=True)
                )
            except Exception as e:
                self.logger.exception(
                    f"Failed to register Let's Encrypt account for user_id={user_id}, email={user_details.get('email')}: {e}"
                )
                raise
            
            # Serialize account data: key, uri, and body
            account_key_json = account_key.json_dumps()
            account_uri = resource.uri if hasattr(resource, 'uri') else None
            account_body_json = resource.body.json_dumps() if hasattr(resource, 'body') else None
            
            self.carepository.create_account("letsencrypt", user_id, {
                "account_key": account_key_json,
                "account_uri": account_uri,
                "account_body": account_body_json,
            })

            self.logger.info(
                f"Let's Encrypt account created successfully for user_id={user_id}, account_uri={account_uri}"
            )
            
            return account_key, resource.uri
        else:
            account_data = account.get("account_data", {})
            if isinstance(account_data, str):
                try:
                    account_data = json.loads(account_data)
                except Exception as e:
                    self.logger.exception(
                        f"Failed to parse stored Let's Encrypt account_data for user_id={user_id}: {e}"
                    )
                    raise
            
            # Deserialize the stored account key and URI
            key_json = account_data.get("account_key")
            account_uri = account_data.get("account_uri")
            
            if key_json and account_uri:
                account_key = josepy.JWKRSA.json_loads(key_json)
                self.logger.info(
                    f"Loaded existing Let's Encrypt account for user_id={user_id}, account_uri={account_uri}"
                )
                return account_key, account_uri
            else:
                self.logger.error(
                    f"Stored Let's Encrypt account is missing key or URI for user_id={user_id}"
                )
                raise ValueError(f"No account key or URI found for user {user_id}")
            
    def place_order(self, request: CertificateRequest, challenge_type: str):
        account_key, account_uri = self.get_account_key(request.issue_to)
        acme_client = self.get_acme_client(account_key, existing=True, account_uri=account_uri)
        
        # Generate the CSR
        csr_pem, private_key = CSR.generate_csr(request.domain)
    
        # TODO: Check the last order time in the account, see if we need to wait before placing a new order
        self.logger.info(f"Placing new order for domain {request.domain} with account URI {account_uri}")
        order = None
        try:
            # Create the order
            order = acme_client.new_order(csr_pem)
            self.logger.info(
                f"Order created successfully for domain={request.domain}, user_id={request.issue_to}, order_uri={order.uri}, order_status={self._order_status(order)}"
            )
        except Exception as e:
            self.logger.exception(
                f"Error creating order for domain={request.domain}, user_id={request.issue_to}, challenge_type={challenge_type}: {e}"
            )
            raise
            
        try:
            # Get the challenge from the order
            authz = order.authorizations[0]
            avaliable_challenges = authz.body.challenges
            challenge_details = None
            for c in avaliable_challenges:
                if c.chall.typ == challenge_type:
                    challenge_details = c
                    break
        except Exception as e:
            self.logger.exception(
                f"Failed while extracting challenge details for domain={request.domain}, user_id={request.issue_to}, order_uri={self._safe_attr(order, 'uri')}: {e}"
            )
            raise
                
        if not challenge_details:
            available_types = [self._safe_attr(c.chall, "typ", "unknown") for c in avaliable_challenges]
            self.logger.error(
                f"No {challenge_type} challenge found for domain={request.domain}, user_id={request.issue_to}, order_uri={order.uri}, available={available_types}"
            )
            raise Exception(f"No {challenge_type} challenge found for order")
        
        self.logger.info(
            f"{challenge_type} challenge found for domain={request.domain}, user_id={request.issue_to}, order_uri={order.uri}, challenge_uri={challenge_details.uri}, challenge_status={self._challenge_status(challenge_details)}"
        )
        
        return challenge_details, account_key, acme_client, order, private_key
      
    def finalize_order(self, acme_client, order, private_key, domain: str = "unknown", user_id: str = "unknown"):
        self.logger.info(
            f"Finalizing order for domain={domain}, user_id={user_id}, order_uri={self._safe_attr(order, 'uri')}, order_status={self._order_status(order)}"
        )

        try:
            # Finalize the order and get the certificate
            finalized_order = acme_client.poll_and_finalize(order)
        except Exception as e:
            self.logger.exception(
                f"Order finalization failed for domain={domain}, user_id={user_id}, order_uri={self._safe_attr(order, 'uri')}: {e}"
            )
            raise

        cert_pem = self._safe_attr(finalized_order, "fullchain_pem")
        if not cert_pem:
            self.logger.error(
                f"Order finalized without certificate body for domain={domain}, user_id={user_id}, order_uri={self._safe_attr(finalized_order, 'uri', self._safe_attr(order, 'uri'))}"
            )
            raise Exception("Order finalized but certificate file is empty")

        self.logger.info(
            f"Certificate generated successfully for domain={domain}, user_id={user_id}, order_uri={self._safe_attr(finalized_order, 'uri', self._safe_attr(order, 'uri'))}, order_status={self._order_status(finalized_order)}"
        )
        
        response : CA_Response = {
            "okay": True,
            "message": "Certificate issued successfully",
            "certificate_key": private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption()
            ).decode(),
            "certificate_file": cert_pem,
            "type": CertificateRequestType.ISSUER
        }
        
        return response
        
    def _issue_http_challenge(self, request: CertificateRequest, challenge: HttpChallenge) -> CA_Response:        
        http_challenge, account_key, acme_client, order, private_key = self.place_order(request, "http-01")
        
        # Call the challenge handler to set up the HTTP challenge
        try:
            self.logger.info(
                f"Applying HTTP challenge for domain={request.domain}, challenge_uri={http_challenge.uri}, token_path={http_challenge.chall.path}"
            )
            challenge.apply(request.domain, http_challenge.chall.path, http_challenge.validation(account_key))
        except Exception as e:
            self.logger.exception(
                f"Failed to apply HTTP challenge for domain={request.domain}, challenge_uri={self._safe_attr(http_challenge, 'uri')}: {e}"
            )
            raise
        
        # Wait some time for the HTTP challenge to propagate, then notify ACME server
        time.sleep(45)  # TODO: implement a more robust wait strategy

        try:
            self.logger.info(
                f"Answering HTTP challenge for domain={request.domain}, challenge_uri={http_challenge.uri}"
            )
            acme_client.answer_challenge(http_challenge, http_challenge.response(account_key))
            self.logger.info(
                f"HTTP challenge accepted by ACME client for domain={request.domain}, challenge_uri={http_challenge.uri}, challenge_status={self._challenge_status(http_challenge)}"
            )
        except Exception as e:
            self.logger.exception(
                f"Failed to answer HTTP challenge for domain={request.domain}, challenge_uri={self._safe_attr(http_challenge, 'uri')}: {e}"
            )
            raise
        
        return self.finalize_order(acme_client, order, private_key, request.domain, request.issue_to)
    
    def _issue_dns_challenge(self, request: CertificateRequest, challenge: DnsChallenge) -> CA_Response:        
        dns_challenge, account_key, acme_client, order, private_key = self.place_order(request, "dns-01")
        
        # Call the challenge handler to set up the DNS record
        try:
            self.logger.info(
                f"Applying DNS challenge for domain={request.domain}, challenge_uri={dns_challenge.uri}, record_name={dns_challenge.chall.LABEL}"
            )
            challenge.apply(request.domain, dns_challenge.chall.LABEL, dns_challenge.validation(account_key))
        except Exception as e:
            self.logger.exception(
                f"Failed to apply DNS challenge for domain={request.domain}, challenge_uri={self._safe_attr(dns_challenge, 'uri')}: {e}"
            )
            raise
        
        # Wait some time for the DNS record to propagate, then notify ACME server
        time.sleep(45)  # TODO: implement a more robust wait strategy

        try:
            self.logger.info(
                f"Answering DNS challenge for domain={request.domain}, challenge_uri={dns_challenge.uri}"
            )
            acme_client.answer_challenge(dns_challenge, dns_challenge.response(account_key))
            self.logger.info(
                f"DNS challenge accepted by ACME client for domain={request.domain}, challenge_uri={dns_challenge.uri}, challenge_status={self._challenge_status(dns_challenge)}"
            )
        except Exception as e:
            self.logger.exception(
                f"Failed to answer DNS challenge for domain={request.domain}, challenge_uri={self._safe_attr(dns_challenge, 'uri')}: {e}"
            )
            raise
        
        return self.finalize_order(acme_client, order, private_key, request.domain, request.issue_to)