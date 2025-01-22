import os
from pathlib import Path
from dotenv import load_dotenv
from typing import Optional

# Get the absolute path to the .env file
env_path = Path(__file__).parent.parent / '.env'

# Load environment variables from the specific path
load_dotenv(dotenv_path=env_path)

class Settings:
    PROJECT_NAME: str = "Smart Irrigation System"
    PROJECT_VERSION: str = "1.0.0"
    
    # Database settings
    MYSQL_USER: str = os.getenv('MYSQL_USER', "root")
    MYSQL_PASSWORD: str = os.getenv('MYSQL_PASSWORD', "brjPUAePrxlCtJclfAYlGekGGturlDLN")
    MYSQL_HOST: str = os.getenv('MYSQL_HOST', "autorack.proxy.rlwy.net")
    MYSQL_PORT: str = os.getenv('MYSQL_PORT', "24840")
    MYSQL_DATABASE: str = os.getenv('MYSQL_DATABASE', "railway")
    
    DATABASE_URL: str = (
        f"mysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"
    )
    
    # SQLAlchemy settings
    SQLALCHEMY_DATABASE_URL: str = DATABASE_URL
    SQLALCHEMY_POOL_SIZE: int = int(os.getenv('SQLALCHEMY_POOL_SIZE', 5))
    SQLALCHEMY_MAX_OVERFLOW: int = int(os.getenv('SQLALCHEMY_MAX_OVERFLOW', 10))
    SQLALCHEMY_POOL_TIMEOUT: int = int(os.getenv('SQLALCHEMY_POOL_TIMEOUT', 30))
    SQLALCHEMY_POOL_RECYCLE: int = int(os.getenv('SQLALCHEMY_POOL_RECYCLE', 1800))
    
    # API settings
    API_V1_STR: str = "/api"
    
    class Config:
        case_sensitive = True

settings = Settings()

# Server Configuration
HOST = os.getenv('HOST', '0.0.0.0')
PORT = int(os.getenv('PORT', 8000))
CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*').split(',')

# Operation Mode
OPERATION_MODE = os.getenv('OPERATION_MODE', 'PILOT')

# Earth Engine Credentials
GEE_SERVICE_ACCOUNT = os.getenv('GEE_SERVICE_ACCOUNT')
GEE_PRIVATE_KEY = os.getenv('GEE_PRIVATE_KEY', '').replace('\\n', '\n') if os.getenv('GEE_PRIVATE_KEY') else None

# Feature Flags
ENABLE_FALLBACK = os.getenv('ENABLE_FALLBACK', 'true').lower() == 'true'
ENABLE_WEATHER = os.getenv('ENABLE_WEATHER', 'true').lower() == 'true'
ENABLE_GEE = os.getenv('ENABLE_GEE', 'true').lower() == 'true'

# Irrigation Thresholds
SOIL_MOISTURE_THRESHOLD = float(os.getenv('SOIL_MOISTURE_THRESHOLD', 30))
ETO_THRESHOLD = float(os.getenv('ETO_THRESHOLD', 5))
RAIN_PROBABILITY_THRESHOLD = float(os.getenv('RAIN_PROBABILITY_THRESHOLD', 60))

# Forecast Settings
MAX_FORECAST_DAYS = int(os.getenv('MAX_FORECAST_DAYS', 5))

# System Check Intervals (in seconds)
SENSOR_CHECK_INTERVAL = int(os.getenv('SENSOR_CHECK_INTERVAL', 300))
SERVER_CHECK_INTERVAL = int(os.getenv('SERVER_CHECK_INTERVAL', 60))
