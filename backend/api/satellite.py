from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from backend.database.session import get_db
from backend.models.user import User
from backend.services.satellite_service import SatelliteService
from backend.services.zone_service import ZoneService
from backend.services.auth_service import AuthService
from backend.middleware.security import limiter

router = APIRouter(prefix="/satellite", tags=["Satellite"])

@router.get("/{zone_id}/latest")
@limiter.limit("30/minute")
async def get_latest_satellite_data(
    zone_id: str,
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """Get latest satellite data for a zone"""
    zone_service = ZoneService(db)
    zone = zone_service.get_zone(zone_id, current_user.id)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found"
        )
    
    satellite_service = SatelliteService()
    try:
        return await satellite_service.get_zone_data(zone_id, zone.geometry)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Satellite service unavailable: {str(e)}"
        )

@router.get("/{zone_id}/ndvi")
@limiter.limit("30/minute")
async def get_zone_ndvi(
    zone_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """Get NDVI (Normalized Difference Vegetation Index) data for a zone"""
    zone_service = ZoneService(db)
    zone = zone_service.get_zone(zone_id, current_user.id)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found"
        )
    
    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()
    
    satellite_service = SatelliteService()
    try:
        return await satellite_service.get_ndvi_series(
            zone_id,
            zone.geometry,
            start_date,
            end_date
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Satellite service unavailable: {str(e)}"
        )

@router.get("/{zone_id}/history")
@limiter.limit("30/minute")
async def get_satellite_history(
    zone_id: str,
    start_date: datetime,
    end_date: Optional[datetime] = None,
    indices: Optional[List[str]] = None,
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """Get historical satellite data for a zone"""
    zone_service = ZoneService(db)
    zone = zone_service.get_zone(zone_id, current_user.id)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found"
        )
    
    if not end_date:
        end_date = datetime.now()
    
    if (end_date - start_date).days > 365:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Historical data limited to 1 year"
        )
    
    satellite_service = SatelliteService()
    try:
        return await satellite_service.get_historical_data(
            zone_id,
            zone.geometry,
            start_date,
            end_date,
            indices or ["ndvi", "ndwi", "evi"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Satellite service unavailable: {str(e)}"
        )

@router.get("/analysis")
@limiter.limit("30/minute")
async def analyze_satellite_data(
    zone_id: str,
    analysis_type: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze satellite data for insights"""
    zone_service = ZoneService(db)
    zone = zone_service.get_zone(zone_id, current_user.id)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found"
        )
    
    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()
    
    satellite_service = SatelliteService()
    try:
        return await satellite_service.analyze_data(
            zone_id,
            zone.geometry,
            analysis_type,
            start_date,
            end_date
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Analysis service unavailable: {str(e)}"
        )
