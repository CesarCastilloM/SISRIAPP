from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

class DeviceType(str, Enum):
    ARDUINO = "arduino"
    ESP32 = "esp32"
    RASPBERRY_PI = "raspberry_pi"

class DeviceStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    ERROR = "error"
    MAINTENANCE = "maintenance"

class CommandType(str, Enum):
    START_IRRIGATION = "start_irrigation"
    STOP_IRRIGATION = "stop_irrigation"
    UPDATE_SETTINGS = "update_settings"
    CALIBRATE = "calibrate"
    REBOOT = "reboot"

class CommandStatus(str, Enum):
    PENDING = "pending"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class DeviceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    device_type: DeviceType
    firmware_version: str
    hardware_version: str
    mac_address: str = Field(..., regex="^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$")
    settings: Dict[str, Any] = {}

class DeviceRegister(DeviceBase):
    pass

class DeviceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    firmware_version: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class DeviceResponse(DeviceBase):
    device_id: str
    status: DeviceStatus
    last_seen: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    is_active: bool
    owner_id: int

    class Config:
        from_attributes = True

class DeviceCommand(BaseModel):
    command_type: CommandType
    parameters: Dict[str, Any] = {}
    timeout: int = Field(60, ge=1, le=3600)  # timeout in seconds

class CommandResponse(BaseModel):
    command_id: str
    device_id: str
    command_type: CommandType
    parameters: Dict[str, Any]
    status: CommandStatus
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True
