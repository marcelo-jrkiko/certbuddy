


from cloudflare import Cloudflare

from backend.helpers import CSR
from helpers.CloudFlare import get_zone_id
from engine.authorities import BaseCertificateAuthority
from engine.models.ca_response import CA_Response
from engine.models.certificate_request import CertificateRequest, CertificateRequestType
import fnmatch
from cryptography.hazmat.primitives import serialization

class CloudflareOriginCA(BaseCertificateAuthority):
    def __init__(self, config):
        super().__init__(config)
        self.compatibleChallengesTypes = [ "EMPTY" ]  # Cloudflare Origin CA does not require challenges, so we use a placeholder type
        
    def issue_certificate(self, request: CertificateRequest, challenge: any) -> CA_Response:
        api_token = self.config.get("api_token")
        if not api_token:
            raise Exception("Cloudflare API token is required for issuing certificates")
        
        cf = Cloudflare(api_token=api_token)
        domain = request.domain
        
        # - Zone ID
        zone_id = self.config.get("zone_id")
        
        if zone_id is None:
            zone_id = get_zone_id(cf, domain)
            
        if zone_id is None:
            self.logger.error(f"Could not find Cloudflare zone for domain {domain}")
            raise Exception(f"Could not find Cloudflare zone for domain {domain}")  
       
        # Generate the CSR
        csr_pem, private_key = CSR.generate_csr(request.domain)
        
        validity_days = request.config.get("validity_days", "365")
    
        new_cert = cf.origin_ca_certificates.create(
            csr=csr_pem.decode(),
            hostnames=[request.domain],
            requested_validity=int(validity_days),  
            request_type="origin-rsa"  
        )
        
        response : CA_Response = {
            "okay": True,
            "message": "Certificate issued successfully",
            "certificate_key": private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption()
            ).decode(),
            "certificate_file": new_cert["certificate"],
            "type": CertificateRequestType.ISSUER
        }
        
        return response