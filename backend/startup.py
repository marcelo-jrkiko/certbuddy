# Load environment variables
import logging
from flask.cli import load_dotenv
from utils import Config


load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_config():
    """Load configuration from environment variables."""
    global config
    config = Config()
    return config
    

