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

# Log the current environment
logger.debug(f"Current directory: {os.getcwd()}")
logger.debug(f"Directory contents: {os.listdir()}")
logger.debug(f"PYTHONPATH: {sys.path}")

try:
    from app.main import app
except Exception as e:
    logger.error(f"Failed to import app: {str(e)}")
    logger.error(f"Exception type: {type(e)}")
    import traceback
    logger.error(f"Full traceback: {traceback.format_exc()}")
    raise

# This is what Render will import
application = app