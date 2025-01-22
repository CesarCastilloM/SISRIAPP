from backend.database.session import engine
from backend.models.base import Base
from backend.models.user import User
from backend.models.zone import Zone
from backend.models.sensor_data import SensorData, ArduinoStatus, Command
from backend.models.notification import Notification
from backend.models.weather_data import WeatherData
from backend.models.satellite_data import SatelliteData
from backend.models.system_log import SystemLog

def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    create_tables()
    print("Database tables created successfully")
