# Load environment variables
import logging
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
    logging.basicConfig(level=logging.DEBUG if config.DEBUG else logging.INFO)
    logger = logging.getLogger(__name__)
    
    test_backend_connection()
    
    return config
    
def test_backend_connection():
    """Test connection to the backend by fetching user info"""
    try:
        backend_client = getMasterBackendClient()
        user_info = backend_client.get_user_info()
        logger.info(f"Successfully connected to backend. Master user info: {user_info.get('email', 'N/A')}")
    except Exception as e:
        logger.error(f"FAILED TO CONNECT USING MASTER TOKEN: {str(e)}")
        raise Exception("Failed to connect to the backend with the master token. Please check the configuration and try again.")
