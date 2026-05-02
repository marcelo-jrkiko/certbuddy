

from engine.models.certificate_request import CertificateRequestType


class CA_Response:
    okay: bool
    message: str
    certificate_key: str
    certificate_file: str
    type: CertificateRequestType