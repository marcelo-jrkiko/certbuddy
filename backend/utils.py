import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

class Config:
    """Base configuration"""
    DIRECTUS_URL = os.getenv('DIRECTUS_URL', 'http://localhost:8055')
    
    # API Configuration
    API_PORT = int(os.getenv('ENGINE_API_PORT', 3000))
    DEBUG = os.getenv('FLASK_ENV') == 'development'
