from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://hvgotlfiwwirfpezvxhp.supabase.co")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2Z290bGZpd3dpcmZwZXp2eGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NDMwNDAsImV4cCI6MjA3NDUxOTA0MH0.DKs4wMlerIHnXfS3DxRkQugktFEZo-rgsSpRFsmKXJE")

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Database URL construction for SQLAlchemy (for PostgreSQL compatibility)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql://postgres.hvgotlfiwwirfpezvxhp:HazardGOAT17!@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
)

# Fix potential "postgres://" to "postgresql://" in the URL
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_supabase() -> Client:
    """Get Supabase client instance"""
    return supabase