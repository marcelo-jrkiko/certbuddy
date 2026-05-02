

from engine.models.certificate_request import CertificateRequest, CertificateRequestType
from engine.repositories.UserRepository import UserRepository
from engine.repositories.CA_AccountRepository import CA_AccountRepository
from engine.authorities.BaseCertificateAuthority import BaseCertificateAuthority
from engine.challenges.DnsChallenge import DnsChallenge
from acme import client, messages
from acme.client import ClientNetwork
from acme import crypto_util
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
import time
from engine.models.ca_response import CA_Response

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
    
    def get_directory(self, account_key=None) -> messages.Directory:
        import requests
        response = requests.get(self.directory_url)
        response.raise_for_status()
        return messages.Directory.from_json(response.json())
    
    def get_acme_client(self, account_key):
        directory = self.get_directory()
        net = ClientNetwork(account_key)
        return client.ClientV2(directory, net)
    
    def get_account_key(self, user_id: str):
        account = self.carepository.get_account("letsencrypt", user_id)
        
        userRepo = UserRepository()
        user_details = userRepo.get_user(user_id)
        
        if not account:
            # Create new account with LE
            account_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
            acme_client = self.get_acme_client(account_key)
            
            # Register the account
            try:
                # Try to create account - new_account may handle both existing and new accounts
                acme_client.new_account(
                    messages.NewRegistration(
                        contact=[f"mailto:{user_details.get('email')}"],
                        terms_of_service_agreed=True
                    )
                )
            except AssertionError as e:
                # Log for debugging - the library may fail silently with assertions
                self.logger.warning(f"Account creation assertion error (may already exist): {e}")
                # Continue anyway - account might already be registered
            except Exception as e:
                self.logger.error(f"Error during account creation: {type(e).__name__}: {e}")
                raise
            
            # Serialize the key for storage
            key_pem = account_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption()
            ).decode()
            
            self.carepository.create_account("letsencrypt", user_id, {
                "account_key": key_pem,
            })
            
            return account_key
        else:
            # Load the key from storage
            key_pem = account.account_data["account_key"]
            return serialization.load_pem_private_key(key_pem.encode(), password=None)
            
        
    def _issue_dns_challenge(self, request: CertificateRequest, challenge: DnsChallenge) -> CA_Response:
        account_key = self.get_account_key(request.issue_to)
        acme_client = self.get_acme_client(account_key)
        
        # Generate the CSR
        csr_pem = crypto_util.make_csr(account_key, [request.domain])
        
        # Create the order
        order = acme_client.new_order(csr_pem)
        
        # Get the DNS challenge from the order
        authz = order.authorizations[0]
        dns_challenge = authz.body.challenges[0]
        
        # Call the challenge handler to set up the DNS record
        challenge.apply(request.domain, "_acme-challenge", dns_challenge.validation(account_key))
        
        # Wait some time for the DNS record to propagate, then notify ACME server
        time.sleep(45)  # TODO: implement a more robust wait strategy
        
        acme_client.answer_challenge(dns_challenge, dns_challenge.response(account_key))
        
        # Finalize the order and get the certificate
        finalized_order = acme_client.poll_and_finalize(order)
        
        return CA_Response(
            okay=True,
            message="Certificate issued successfully",
            certificate_key=csr_pem.decode(),
            certificate_file=finalized_order.fullchain_pem,
            type=CertificateRequestType.ISSUER
        )