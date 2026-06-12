import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

class Config:
    """Base configuration"""
    DIRECTUS_URL = os.getenv('DIRECTUS_URL', 'http://localhost:8055')
    
    # API Configuration
    API_PORT = int(os.getenv('ENGINE_API_PORT', 3000))
    DEBUG = os.getenv('DEBUG') == 'True'
    
    # Certificate Renewal Configuration
    RENEWAL_CHECK_INTERVAL = int(os.getenv('ENGINE_RENEWAL_CHECK_INTERVAL', 24))  # in hours
    RENEWAL_BEFORE_EXPIRE_HOURS = int(os.getenv('ENGINE_RENEWAL_BEFORE_EXPIRE_HOURS', 24))  # in hours
    
    # Certificate Auto Cleanup Configuration
    AUTO_CLEANUP_ENABLED = os.getenv('ENGINE_AUTO_CLEANUP_ENABLED') == 'True'
    AUTO_CLEANUP_INTERVAL = int(os.getenv('ENGINE_AUTO_CLEANUP_INTERVAL', 4))  # in hours
    AUTO_CLEANUP_BEFORE_EXPIRE_DAYS = int(os.getenv('ENGINE_AUTO_CLEANUP_BEFORE_EXPIRE_DAYS', 120))  # in days
    
    ALLOW_GLOBAL_CERTIFICATE_MATCHING = os.getenv('ENGINE_ALLOW_GLOBAL_CERTIFICATE_MATCHING') == 'True'
    
    CERT_STORAGE = os.getenv('ENGINE_CERT_STORAGE', 'default_vault') 
    
    LOGS_DIR = os.getenv('ENGINE_LOGS_DIR', 'logs')
    
    LOGS_DIR = os.path.abspath(LOGS_DIR)
    if not os.path.exists(LOGS_DIR):
        os.makedirs(LOGS_DIR, exist_ok=True)        
    


def get_main_domain(domain: str) -> str:
    """Extract the main domain from a given domain string.
    
    Handles both single-part (.com) and two-part (.com.br) public suffixes.
    
    Examples:
        sub1.sub2.main.com -> main.com
        sub1.sub2.main2.com.br -> main.com.br
        sub1.main.com -> main.com
        sub2.main2.com.br -> main.com.br
        main.com -> main.com
    """
    if not domain:
        return ""
    
    parts = domain.lower().split('.')
    if len(parts) < 2:
        return domain
    
    # Common two-part public suffixes (add more as needed)
    two_part_suffixes = {
        'com.br', 'co.uk', 'com.au', 'co.nz', 'co.jp', 'co.in', 'co.kr', 'co.th',
        'gov.uk', 'org.uk', 'ac.uk', 'gov.br', 'org.br', 'co.za', 'co.id', 'com.mx',
        'co.il', 'ac.nz', 'co.tz', 'co.ug', 'co.ve', 'com.vn',
    }
    
    # Check if the last two parts form a known two-part suffix
    if len(parts) >= 3:
        last_two = '.'.join(parts[-2:])
        if last_two in two_part_suffixes:
            return '.'.join(parts[-3:])
    
    # Default: return last two parts (for .com, .org, .net, etc.)
    return '.'.join(parts[-2:])   
        