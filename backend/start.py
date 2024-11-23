import os
import sys
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Log environment information
logger.debug(f"Current working directory: {os.getcwd()}")
logger.debug(f"Python path: {sys.path}")
logger.debug(f"Environment variables: {dict(os.environ)}")
logger.debug(f"Directory contents: {list(Path().glob('**/*.py'))}")

try:
    import uvicorn
    from app.main import app
    logger.info("Successfully imported app")
    
    if __name__ == "__main__":
        port = int(os.environ.get("PORT", 8000))
        uvicorn.run("app.main:app", host="0.0.0.0", port=port, log_level="debug")
except Exception as e:
    logger.error(f"Error during startup: {e}", exc_info=True)
    sys.exit(1)