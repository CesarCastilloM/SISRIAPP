from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database.database import SessionLocal, engine, Base, init_db
from models.zone import Zone
import logging
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from config import settings
import random

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
try:
    init_db()
    logger.info("Database initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize database: {str(e)}")
    raise

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic models
class ZoneBase(BaseModel):
    name: str
    description: Optional[str] = None
    geometry: Optional[dict] = None

class ZoneCreate(ZoneBase):
    pass

class ZoneUpdate(ZoneBase):
    pass

class ZoneResponse(ZoneBase):
    id: int
    zone_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DashboardData(BaseModel):
    total_zones: int
    active_zones: int
    total_water_usage: float
    soil_moisture_avg: float
    recent_alerts: List[str]
    zone_summaries: List[dict]

# API Routes
@app.get("/")
def root():
    return {"message": settings.PROJECT_NAME}

@app.get("/api/zones", response_model=List[ZoneResponse])
def get_zones(db: Session = Depends(get_db)):
    try:
        zones = db.query(Zone).all()
        return zones
    except Exception as e:
        logger.error(f"Error fetching zones: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/zones", response_model=ZoneResponse)
def create_zone(zone: ZoneCreate, db: Session = Depends(get_db)):
    try:
        db_zone = Zone(**zone.dict())
        db.add(db_zone)
        db.commit()
        db.refresh(db_zone)
        return db_zone
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating zone: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/zones/{zone_id}", response_model=ZoneResponse)
def update_zone(zone_id: str, zone: ZoneUpdate, db: Session = Depends(get_db)):
    try:
        db_zone = db.query(Zone).filter(Zone.zone_id == zone_id).first()
        if not db_zone:
            raise HTTPException(status_code=404, detail="Zone not found")
        
        for key, value in zone.dict(exclude_unset=True).items():
            setattr(db_zone, key, value)
        
        db.commit()
        db.refresh(db_zone)
        return db_zone
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating zone: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/zones/{zone_id}")
def delete_zone(zone_id: str, db: Session = Depends(get_db)):
    try:
        db_zone = db.query(Zone).filter(Zone.zone_id == zone_id).first()
        if not db_zone:
            raise HTTPException(status_code=404, detail="Zone not found")
        
        db.delete(db_zone)
        db.commit()
        return {"message": "Zone deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting zone: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/zones/{zone_id}/weather")
async def get_zone_weather(zone_id: str, db: Session = Depends(get_db)):
    """Get weather data for a specific zone"""
    try:
        # Get zone from database
        zone = db.query(Zone).filter(Zone.zone_id == zone_id).first()
        if not zone:
            raise HTTPException(status_code=404, detail="Zone not found")
            
        if not zone.geometry:
            raise HTTPException(status_code=400, detail="Zone has no geometry defined")
            
        # Initialize weather service
        weather_service = WeatherService()
        
        # Get coordinates from zone geometry
        coordinates = zone.geometry.get("coordinates", [])[0]  # Get outer ring of polygon
        
        # Get weather data for zone polygon
        weather_data = await weather_service.get_weather_data_for_polygon(coordinates)
        
        return {
            "zone_id": zone_id,
            "zone_name": zone.name,
            "weather_data": weather_data,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting weather data for zone {zone_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get weather data for zone: {str(e)}"
        )

@app.get("/api/dashboard", response_model=DashboardData)
async def get_dashboard(db: Session = Depends(get_db)):
    try:
        # Verify database connection first
        if not db:
            raise HTTPException(status_code=500, detail="Database connection failed")

        # Get all zones
        zones = db.query(Zone).all()
        total_zones = len(zones)
        
        # Get real sensor data if available, otherwise use simulated data
        try:
            # Try to get real sensor data from Arduino
            sensor_data = get_latest_sensor_data(db)
            soil_moisture_avg = sensor_data.get('moisture', round(random.uniform(40, 80), 2))
            water_usage = sensor_data.get('water_usage', round(random.uniform(100, 1000), 2))
        except Exception as sensor_err:
            logger.warning(f"Failed to get sensor data, using simulated data: {sensor_err}")
            soil_moisture_avg = round(random.uniform(40, 80), 2)
            water_usage = round(random.uniform(100, 1000), 2)

        # Get active zones count
        active_zones = sum(1 for zone in zones if zone.is_active)

        # Get recent alerts from database or system
        recent_alerts = get_recent_alerts(db) or [
            "Low moisture detected in Zone 1",
            "Irrigation completed in Zone 2",
            "System maintenance required"
        ]

        dashboard_data = {
            "total_zones": total_zones,
            "active_zones": active_zones,
            "total_water_usage": water_usage,
            "soil_moisture_avg": soil_moisture_avg,
            "recent_alerts": recent_alerts[:5],  # Limit to 5 most recent alerts
            "zone_summaries": [
                {
                    "id": zone.id,
                    "name": zone.name,
                    "moisture": get_zone_moisture(zone.id, db),
                    "last_watered": get_last_watered_time(zone.id, db),
                    "status": "Active" if zone.is_active else "Inactive"
                }
                for zone in zones
            ]
        }
        
        logger.info("Dashboard data fetched successfully")
        return dashboard_data

    except Exception as e:
        logger.error(f"Error fetching dashboard data: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load dashboard data: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
