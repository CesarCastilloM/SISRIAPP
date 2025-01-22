from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import logging
import sys
import os

# Add parent directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
import time
import mysql.connector

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def wait_for_db():
    """Wait for database to be available"""
    max_retries = 5
    retry_interval = 5  # seconds
    
    for attempt in range(max_retries):
        try:
            # Try to connect directly with mysql-connector first
            conn = mysql.connector.connect(
                host=settings.MYSQL_HOST,
                user=settings.MYSQL_USER,
                password=settings.MYSQL_PASSWORD,
                port=int(settings.MYSQL_PORT),
                database=settings.MYSQL_DATABASE
            )
            conn.close()
            logger.info("Successfully connected to MySQL database")
            return True
        except Exception as e:
            logger.warning(f"Database connection attempt {attempt + 1} failed: {str(e)}")
            if attempt < max_retries - 1:
                logger.info(f"Retrying in {retry_interval} seconds...")
                time.sleep(retry_interval)
            else:
                logger.error("Failed to connect to database after maximum retries")
                raise

# Create MySQL engine with proper configuration
engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URL,
    pool_size=settings.SQLALCHEMY_POOL_SIZE,
    max_overflow=settings.SQLALCHEMY_MAX_OVERFLOW,
    pool_timeout=settings.SQLALCHEMY_POOL_TIMEOUT,
    pool_recycle=settings.SQLALCHEMY_POOL_RECYCLE,
    echo=True,
    pool_pre_ping=True  # Enable automatic reconnection
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()

def verify_db_connection():
    """Verify database connection and basic operations"""
    try:
        # Get a connection from the engine
        with engine.connect() as connection:
            # Try a simple query
            result = connection.execute(text("SELECT 1"))
            result.fetchone()
            logger.info("Database connection verified successfully")
            return True
    except Exception as e:
        logger.error(f"Database connection verification failed: {str(e)}")
        return False

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        # Verify connection is active
        db.execute(text("SELECT 1"))
        yield db
    except Exception as e:
        logger.error(f"Error in database session: {str(e)}")
        raise
    finally:
        db.close()

def init_db():
    """Initialize the database by creating all tables"""
    try:
        # Wait for database to be available
        wait_for_db()
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        # Verify connection
        if verify_db_connection():
            logger.info("Database initialized and verified successfully")
        else:
            raise Exception("Database verification failed after initialization")
            
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        raise
