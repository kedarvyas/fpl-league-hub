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

if DATABASE_URL:
    # Log the database connection (masking sensitive info)
    sanitized_url = DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'unknown'
    logger.info(f"Using database at: {sanitized_url}")
    
    # Modify URL for SQLAlchemy if necessary
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
else:
    # Local development fallback
    DB_USER = os.getenv("DB_USER", "fpl_user")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "fpl_tacticos_league")
    DB_NAME = os.getenv("DB_NAME", "fpl_league_hub")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"
    logger.info("Using local database configuration")

# Create engine with SSL required for Render
engine = create_engine(
    DATABASE_URL,
    connect_args={
        "sslmode": "require" if "render.com" in DATABASE_URL else "prefer"
    },
    pool_size=5,
    max_overflow=2,
    pool_timeout=30,
    pool_recycle=1800
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        logger.debug("Database connection opened in get_db")
        yield db
    finally:
        db.close()
        logger.debug("Database connection closed in get_db")