import sys
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Log Python path and current directory
logger.debug(f"Python Path: {sys.path}")
logger.debug(f"Current Directory: {Path().absolute()}")
logger.debug(f"Contents of current directory: {list(Path().glob('*'))}")

try:
    from app.main import app
    logger.debug("Successfully imported app")
except Exception as e:
    logger.error(f"Failed to import app: {str(e)}")
    logger.error(f"Exception type: {type(e)}")
    import traceback
    logger.error(f"Full traceback: {traceback.format_exc()}")
    raise

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True, log_level="debug")