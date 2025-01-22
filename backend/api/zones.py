from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from backend.core.auth import get_current_active_user
from backend.crud.zone import create_zone, get_zones, get_zone, update_zone, delete_zone
from backend.database.session import get_db
from backend.models.user import User
from backend.schemas.zone import ZoneCreate, Zone, ZoneUpdate, ZoneResponse, IrrigationSchedule
from backend.services.zone_service import ZoneService
from backend.services.auth_service import AuthService
from backend.middleware.security import limiter

router = APIRouter(prefix="/zones", tags=["Zones"])

@router.get("/", response_model=List[ZoneResponse])
async def get_zones(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    skip: int = 0,
    limit: int = 100,
):
    """Get all zones for the current user"""
    zone_service = ZoneService(db)
    zones = zone_service.get_user_zones(current_user.id, skip=skip, limit=limit)
    return zones

@router.get("/{zone_id}", response_model=ZoneResponse)
async def get_zone(
    zone_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get specific zone by ID"""
    zone_service = ZoneService(db)
    zone = zone_service.get_zone(zone_id, current_user.id)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found"
        )
    if zone.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough permissions"
        )
    return zone

@router.post("/", response_model=ZoneResponse)
async def create_zone(
    zone_data: ZoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new zone"""
    zone_service = ZoneService(db)
    try:
        return zone_service.create_zone(zone_data, current_user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{zone_id}", response_model=ZoneResponse)
async def update_zone(
    zone_id: str,
    zone_data: ZoneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an existing zone"""
    zone_service = ZoneService(db)
    zone = zone_service.get_zone(zone_id, current_user.id)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found"
        )
    if zone.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough permissions"
        )
    try:
        zone = zone_service.update_zone(zone_id, zone_data, current_user.id)
        return zone
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{zone_id}")
async def delete_zone(
    zone_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a zone"""
    zone_service = ZoneService(db)
    zone = zone_service.get_zone(zone_id, current_user.id)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found"
        )
    if zone.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough permissions"
        )
    if not zone_service.delete_zone(zone_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found"
        )
    return {"message": "Zone deleted successfully"}

@router.get("/{zone_id}/sensor-data")
async def get_zone_sensor_data(
    zone_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get sensor data for a specific zone"""
    zone_service = ZoneService(db)
    zone = zone_service.get_zone(zone_id, current_user.id)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found"
        )
    if zone.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough permissions"
        )
    data = zone_service.get_sensor_data(
        zone_id,
        current_user.id,
        start_date or (datetime.now() - timedelta(days=7)),
        end_date or datetime.now()
    )
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found or no data available"
        )
    return data

@router.post("/{zone_id}/schedule")
async def set_irrigation_schedule(
    zone_id: str,
    schedule: IrrigationSchedule,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Set irrigation schedule for a zone"""
    zone_service = ZoneService(db)
    zone = zone_service.get_zone(zone_id, current_user.id)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found"
        )
    if zone.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough permissions"
        )
    try:
        return zone_service.set_irrigation_schedule(zone_id, schedule, current_user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException as e:
        raise e
