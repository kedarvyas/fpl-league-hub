from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
import logging

# Configure logging
logger = logging.getLogger(__name__)

load_dotenv()

# Get the DATABASE_URL from environment variables
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    # Render provides DATABASE_URL in postgres:// format, but SQLAlchemy needs postgresql://
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    logger.info("Using Render database URL")
else:
    # Local development fallback
    DB_USER = os.getenv("DB_USER", "fpl_user")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "fpl_tacticos_league")
    DB_NAME = os.getenv("DB_NAME", "fpl_league_hub")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"
    logger.info("Using local database URL")

logger.debug(f"Database URL format: postgresql://user:***@{DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'unknown'}")

try:
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    logger.info("Database engine created successfully")
except Exception as e:
    logger.error(f"Failed to create database engine: {str(e)}")
    raise

Base = declarative_base()

def get_db():
    db = SessionLocal()
    logger.debug("Database connection established")
    try:
        yield db
    finally:
        db.close()
        logger.debug("Database connection closed")