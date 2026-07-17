# Load environment variables
import logging
import sys
from flask.cli import load_dotenv
from utils import Config
from helpers.DataBackend import getMasterBackendClient

load_dotenv()

logger = None
config = None

def startup():
    """Load configuration from environment variables."""
    global config, logger
    config = Config()
    
    # Configure logging
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(f"{config.LOGS_DIR}/api.log"),
            logging.StreamHandler(sys.stdout)
        ],        
    )
    test_backend_connection()
    
    logger = logging.getLogger("MAIN")
    logging.info(f"Configuration loaded successfully: \n\t - CHALLENGE_DIR: {config.HTTP_CHALLENGE_DIR}\n\t - NGINX_CONFIG_DIR: {config.NGINX_CONFIG_DIR}\n\t - CERT_STORAGE: {config.CERT_STORAGE}\n\t - LOGS_DIR: {config.LOGS_DIR}")  
      
    
    return config
    
def test_backend_connection():
    """Test connection to the backend by fetching user info"""
    try:
        backend_client = getMasterBackendClient()
        user_info = backend_client.get_user_info()
        logging.info(f"Successfully connected to backend. Master user info: {user_info.get('email', 'N/A')}")
    except Exception as e:
        logging.error(f"FAILED TO CONNECT USING MASTER TOKEN: {str(e)}")
        raise Exception("Failed to connect to the backend with the master token. Please check the configuration and try again.")
