from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from backend.database.session import get_db
from backend.models.user import User
from backend.schemas.device import DeviceRegister, DeviceUpdate, DeviceResponse, DeviceCommand
from backend.services.device_service import DeviceService
from backend.services.auth_service import AuthService
from backend.middleware.security import limiter

router = APIRouter(prefix="/devices", tags=["Devices"])

@router.get("/", response_model=List[DeviceResponse])
async def get_devices(
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """Get all devices for the current user"""
    device_service = DeviceService(db)
    return device_service.get_user_devices(current_user.id)

@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device(
    device_id: str,
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific device by ID"""
    device_service = DeviceService(db)
    device = device_service.get_device(device_id, current_user.id)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    return device

@router.post("/register", response_model=DeviceResponse)
@limiter.limit("10/hour")
async def register_device(
    device_data: DeviceRegister,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """Register a new device"""
    device_service = DeviceService(db)
    try:
        device = device_service.register_device(device_data, current_user.id)
        # Schedule device provisioning in background
        background_tasks.add_task(
            device_service.provision_device,
            device.id,
            current_user.id
        )
        return device
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: str,
    device_data: DeviceUpdate,
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """Update device settings"""
    device_service = DeviceService(db)
    try:
        device = device_service.update_device(device_id, device_data, current_user.id)
        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Device not found"
            )
        return device
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{device_id}/status")
async def get_device_status(
    device_id: str,
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """Get current device status"""
    device_service = DeviceService(db)
    status = device_service.get_device_status(device_id, current_user.id)
    if not status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    return status

@router.post("/{device_id}/command")
async def send_device_command(
    device_id: str,
    command: DeviceCommand,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """Send command to device"""
    device_service = DeviceService(db)
    try:
        command_id = device_service.send_command(device_id, command, current_user.id)
        # Monitor command execution in background
        background_tasks.add_task(
            device_service.monitor_command,
            command_id,
            device_id
        )
        return {"command_id": command_id, "status": "pending"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
