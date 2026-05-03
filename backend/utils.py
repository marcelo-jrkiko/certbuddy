import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

class Config:
    """Base configuration"""
    DIRECTUS_URL = os.getenv('DIRECTUS_URL', 'http://localhost:8055')
    
    # API Configuration
    API_PORT = int(os.getenv('ENGINE_API_PORT', 3000))
    DEBUG = os.getenv('DEBUG') == 'True'


def get_main_domain(domain: str) -> str:
    """Extract the main domain from a given domain string"""
    if not domain:
        return ""
    
    parts = domain.split('.')
    if len(parts) >= 2:
        return '.'.join(parts[-2:])
    return domain   