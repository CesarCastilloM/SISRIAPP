import sys
import logging
import uvicorn
from fastapi import FastAPI
from sqlalchemy import text
from database.database import engine, SessionLocal
from models.zone import Zone

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_database():
    """Test database connection and operations"""
    try:
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1")).fetchone()
            logger.info("✓ Database connection successful")
            
            # Test tables
            result = conn.execute(text("""
                SELECT TABLE_NAME 
                FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA = 'railway'
            """)).fetchall()
            logger.info("✓ Found tables: %s", [r[0] for r in result])
            
        # Test session
        db = SessionLocal()
        try:
            logger.info("✓ Session creation successful")
            
            # Test zone operations
            test_zone = Zone(
                zone_id="TEST_DIAG_001",
                name="Test Zone",
                description="Diagnostic test zone"
            )
            db.add(test_zone)
            db.commit()
            logger.info("✓ Zone creation successful")
            
            db.delete(test_zone)
            db.commit()
            logger.info("✓ Zone deletion successful")
            
        finally:
            db.close()
            
        return True
    except Exception as e:
        logger.error("✗ Database test failed: %s", str(e))
        return False

def test_api():
    """Test API endpoints"""
    try:
        app = FastAPI()
        client = app.test_client()
        
        # Test root endpoint
        response = client.get("/")
        assert response.status_code == 200
        logger.info("✓ Root endpoint successful")
        
        # Test zones endpoint
        response = client.get("/api/zones")
        assert response.status_code == 200
        logger.info("✓ Zones endpoint successful")
        
        return True
    except Exception as e:
        logger.error("✗ API test failed: %s", str(e))
        return False

if __name__ == "__main__":
    logger.info("Starting diagnostic tests...")
    
    # Test database
    if not test_database():
        logger.error("Database tests failed!")
        sys.exit(1)
    
    logger.info("All tests passed successfully!")
