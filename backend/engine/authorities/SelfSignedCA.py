from datetime import datetime, timedelta, timezone

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID

from engine.authorities.BaseCertificateAuthority import BaseCertificateAuthority
from engine.models.ca_response import CA_Response
from engine.models.certificate_request import CertificateRequest, CertificateRequestType


class SelfSignedCA(BaseCertificateAuthority):
    def __init__(self):
        super().__init__()
        # Self-signed certificates do not require ownership challenge flow.
        self.compatibleChallengesTypes = ["EMPTY"]

    def issue_certificate(self, request: CertificateRequest, challenge: any) -> CA_Response:
        if not request.domain:
            raise Exception("Domain is required for self-signed certificate issuance")

        validity_days = int(self.config.get("validity_days", 365))
        key_size = int(self.config.get("key_size", 2048))

        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=key_size,
        )

        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COMMON_NAME, request.domain),
        ])

        now = datetime.now(timezone.utc)
        certificate = (
            x509.CertificateBuilder()
            .subject_name(subject)
            .issuer_name(issuer)
            .public_key(private_key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(now)
            .not_valid_after(now + timedelta(days=validity_days))
            .add_extension(
                x509.SubjectAlternativeName([x509.DNSName(request.domain)]),
                critical=False,
            )
            .add_extension(
                x509.BasicConstraints(ca=False, path_length=None),
                critical=True,
            )
            .sign(private_key, hashes.SHA256())
        )

        response: CA_Response = {
            "okay": True,
            "message": "Self-signed certificate issued successfully",
            "certificate_key": private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption(),
            ).decode(),
            "certificate_file": certificate.public_bytes(serialization.Encoding.PEM).decode(),
            "type": CertificateRequestType.ISSUER,
        }

        return response