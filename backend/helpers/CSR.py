
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa

def generate_csr(domain_name: str) -> str:
    # Generate a private key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )

    # Build CSR subject
    subject = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, domain_name),
    ])

    # Create CSR
    csr = (
        x509.CertificateSigningRequestBuilder()
        .subject_name(subject)
        .sign(private_key, hashes.SHA256())
    )

    # Export CSR in PEM format
    csr_pem = csr.public_bytes(serialization.Encoding.PEM)

    return csr_pem, private_key