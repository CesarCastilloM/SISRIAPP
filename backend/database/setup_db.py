import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database URL
MYSQL_URL = "mysql://root:brjPUAePrxlCtJclfAYlGekGGturlDLN@autorack.proxy.rlwy.net:24840/railway"

# Create engine
engine = create_engine(MYSQL_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Add the project root to Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, project_root)

# Import models
from backend.models.base import Base
from backend.models.user import User
from backend.models.zone import Zone
from backend.models.sensor_data import SensorData, ArduinoStatus, Command
from backend.models.notification import Notification
from backend.models.weather_data import WeatherData
from backend.models.satellite_data import SatelliteData
from backend.models.system_log import SystemLog

def init_database():
    try:
        # Create all tables
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        
        # Create a session
        db = SessionLocal()
        
        try:
            # Check if admin user exists
            admin = db.query(User).filter_by(username='admin').first()
            if not admin:
                # Create admin user
                admin = User(
                    username='admin',
                    email='admin@sisriapp.com',
                    is_admin=True
                )
                admin.set_password('admin123')  # Change this in production!
                db.add(admin)
                db.commit()
                logger.info("Created admin user")
            
            # Create a test zone if none exists
            test_zone = db.query(Zone).first()
            if not test_zone:
                test_zone = Zone(
                    zone_id="ZONE001",
                    name="Test Zone",
                    description="Test irrigation zone",
                    area_size=1000.0,  # 1000 square meters
                    crop_type="Mixed Vegetables",
                    soil_type="Loam",
                    target_moisture_min=30.0,
                    target_moisture_max=60.0,
                    location_lat=20.7214,
                    location_lon=-103.3906,
                    geometry={"type": "Polygon", "coordinates": [[[0,0],[0,1],[1,1],[1,0],[0,0]]]},
                    device_id="ARDUINO001",
                    owner_id=admin.id
                )
                db.add(test_zone)
                db.commit()
                logger.info("Created test zone")
            
            logger.info("Database initialization completed successfully!")
            
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        raise e

def reset_database():
    """WARNING: This will delete all data!"""
    try:
        logger.warning("Dropping all tables...")
        Base.metadata.drop_all(bind=engine)
        init_database()
        logger.info("Database reset completed successfully!")
    except Exception as e:
        logger.error(f"Error resetting database: {str(e)}")
        raise e

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Initialize or reset the database')
    parser.add_argument('--reset', action='store_true', help='Reset the database (WARNING: This will delete all data!)')
    args = parser.parse_args()
    
    if args.reset:
        response = input("WARNING: This will delete all data! Are you sure? (yes/no): ")
        if response.lower() == 'yes':
            reset_database()
        else:
            print("Database reset cancelled.")
    else:
        init_database()
