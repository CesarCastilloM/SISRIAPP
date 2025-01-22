import os
import logging
from sqlalchemy import text, create_engine
from sqlalchemy.orm import sessionmaker
from backend.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database engine
engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})

# Create a session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_database():
    """Initialize the database with required tables"""
    try:
        # Read schema file
        schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
        with open(schema_path, 'r') as f:
            schema = f.read()

        # Split into individual statements
        statements = [s.strip() for s in schema.split(';') if s.strip()]

        # Execute each statement
        with engine.connect() as conn:
            for statement in statements:
                try:
                    conn.execute(text(statement))
                    conn.commit()
                except Exception as e:
                    logger.error(f"Error executing statement: {e}")
                    logger.error(f"Statement: {statement}")
                    raise

        logger.info("Database initialized successfully!")
        
        # Verify connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT DATABASE()")).fetchone()
            logger.info(f"Connected to database: {result[0]}")
            
            # Get table list
            result = conn.execute(text("""
                SELECT TABLE_NAME 
                FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA = 'public'
            """)).fetchall()
            logger.info("Available tables: %s", [r[0] for r in result])
            
        return True
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        return False

if __name__ == "__main__":
    logger.info(f"Initializing database at: {settings.DATABASE_URL}")
    init_database()
