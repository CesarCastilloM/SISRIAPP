from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from backend.database.session import get_db
from backend.models.user import User
from backend.services.weather_service import WeatherService
from backend.services.auth_service import AuthService
from backend.middleware.security import limiter

router = APIRouter(prefix="/weather", tags=["Weather"])

@router.get("/current")
@limiter.limit("60/minute")
async def get_current_weather(
    lat: float,
    lon: float,
    db: Session = Depends(get_db)
):
    """Get current weather conditions for a location"""
    weather_service = WeatherService()
    try:
        return await weather_service.get_weather_data(lat, lon)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Weather service unavailable: {str(e)}"
        )

@router.get("/forecast")
@limiter.limit("60/minute")
async def get_weather_forecast(
    lat: float,
    lon: float,
    days: Optional[int] = 7,
    db: Session = Depends(get_db)
):
    """Get weather forecast for a location"""
    if days < 1 or days > 14:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Days must be between 1 and 14"
        )
    
    weather_service = WeatherService()
    try:
        data = await weather_service.get_weather_data(lat, lon)
        return {
            "forecast": data["forecast"][:days],
            "source": data["source"],
            "timestamp": data["timestamp"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Weather service unavailable: {str(e)}"
        )

@router.get("/history")
@limiter.limit("30/minute")
async def get_weather_history(
    lat: float,
    lon: float,
    start_date: datetime,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """Get historical weather data for a location"""
    if not end_date:
        end_date = datetime.now()
    
    if (end_date - start_date).days > 30:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Historical data limited to 30 days"
        )
    
    weather_service = WeatherService()
    try:
        return await weather_service.get_historical_weather(lat, lon, start_date, end_date)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Weather service unavailable: {str(e)}"
        )

@router.get("/alerts")
@limiter.limit("60/minute")
async def get_weather_alerts(
    lat: float,
    lon: float,
    db: Session = Depends(get_db)
):
    """Get active weather alerts for a location"""
    weather_service = WeatherService()
    try:
        return await weather_service.get_weather_alerts(lat, lon)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Weather service unavailable: {str(e)}"
        )
