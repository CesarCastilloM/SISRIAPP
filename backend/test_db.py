from database.database import SessionLocal, init_db, verify_db_connection
from models.zone import Zone
import logging
import random
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_database_connection():
    """Test database connection and data persistence"""
    try:
        # Initialize database
        init_db()
        
        # Verify connection
        if not verify_db_connection():
            raise Exception("Database connection verification failed")
        
        # Create a test session
        db = SessionLocal()
        try:
            # Create a test zone
            test_zone = Zone(
                name=f"Test Zone {random.randint(1000, 9999)}",
                description="Test zone for database verification",
                geometry={"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]}
            )
            
            # Add and commit the test zone
            db.add(test_zone)
            db.commit()
            db.refresh(test_zone)
            logger.info(f"Created test zone with ID: {test_zone.id}")
            
            # Verify we can read the zone back
            retrieved_zone = db.query(Zone).filter(Zone.id == test_zone.id).first()
            if retrieved_zone is None:
                raise Exception("Failed to retrieve test zone")
            
            logger.info("Successfully verified data persistence")
            
            # Clean up
            db.delete(test_zone)
            db.commit()
            logger.info("Cleaned up test data")
            
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error in database operations: {str(e)}")
            raise
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Database test failed: {str(e)}")
        return False

if __name__ == "__main__":
    # Test with retries
    max_retries = 3
    retry_interval = 5
    
    for attempt in range(max_retries):
        try:
            if test_database_connection():
                logger.info("Database test completed successfully")
                break
        except Exception as e:
            logger.error(f"Test attempt {attempt + 1} failed: {str(e)}")
            if attempt < max_retries - 1:
                logger.info(f"Retrying in {retry_interval} seconds...")
                time.sleep(retry_interval)
            else:
                logger.error("All test attempts failed")
