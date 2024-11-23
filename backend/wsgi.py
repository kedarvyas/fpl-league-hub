import os
import sys
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Log the current directory and Python path
logger.debug(f"Current working directory: {os.getcwd()}")
logger.debug(f"Python path: {sys.path}")
logger.debug(f"Directory contents: {os.listdir()}")

try:
    from app.main import app
    logger.debug("Successfully imported app")
except Exception as e:
    logger.error(f"Failed to import app: {str(e)}")
    logger.error(f"Exception type: {type(e)}")
    import traceback
    logger.error(f"Full traceback: {traceback.format_exc()}")
    sys.exit(1)