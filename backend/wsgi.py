import os
import sys
import logging

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Log environment details
logger.debug("Starting wsgi.py initialization")
logger.debug(f"Current directory: {os.getcwd()}")
logger.debug(f"Directory contents: {os.listdir()}")
logger.debug(f"PYTHONPATH: {os.getenv('PYTHONPATH')}")
logger.debug(f"Python path: {sys.path}")
logger.debug(f"Environment variables: {dict(os.environ)}")

# Add the current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
    logger.debug(f"Added {current_dir} to Python path")

try:
    logger.debug("Attempting to import app.main")
    from app.main import app
    logger.debug("Successfully imported app.main")
except Exception as e:
    logger.error(f"Failed to import app: {str(e)}")
    logger.error(f"Exception type: {type(e)}")
    import traceback
    logger.error(f"Full traceback: {traceback.format_exc()}")
    raise

# This is what Render will import
application = app