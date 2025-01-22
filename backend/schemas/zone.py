from pydantic import BaseModel, Field, confloat
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum

class SoilType(str, Enum):
    CLAY = "clay"
    LOAM = "loam"
    SAND = "sand"
    SILT = "silt"
    CLAY_LOAM = "clay_loam"
    SANDY_LOAM = "sandy_loam"
    SILTY_LOAM = "silty_loam"

class CropType(str, Enum):
    CORN = "corn"
    WHEAT = "wheat"
    SOYBEAN = "soybean"
    COTTON = "cotton"
    VEGETABLES = "vegetables"
    FRUITS = "fruits"
    OTHER = "other"

class ZoneBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    area_size: float = Field(..., gt=0)  # in square meters
    crop_type: CropType
    soil_type: SoilType
    target_moisture_min: confloat(ge=0, le=100) = Field(..., description="Minimum target soil moisture percentage")
    target_moisture_max: confloat(ge=0, le=100) = Field(..., description="Maximum target soil moisture percentage")
    location_lat: confloat(ge=-90, le=90)
    location_lon: confloat(ge=-180, le=180)
    geometry: Dict[str, Any]  # GeoJSON for zone boundaries
    device_id: Optional[str] = None

class ZoneCreate(ZoneBase):
    pass

class ZoneUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    area_size: Optional[float] = Field(None, gt=0)
    crop_type: Optional[CropType] = None
    soil_type: Optional[SoilType] = None
    target_moisture_min: Optional[confloat(ge=0, le=100)] = None
    target_moisture_max: Optional[confloat(ge=0, le=100)] = None
    location_lat: Optional[confloat(ge=-90, le=90)] = None
    location_lon: Optional[confloat(ge=-180, le=180)] = None
    geometry: Optional[Dict[str, Any]] = None
    device_id: Optional[str] = None
    is_active: Optional[bool] = None

class ZoneResponse(ZoneBase):
    zone_id: str
    created_at: datetime
    updated_at: datetime
    is_active: bool
    owner_id: int

    class Config:
        from_attributes = True

class IrrigationSchedule(BaseModel):
    start_time: datetime
    duration: int  # in minutes
    days_of_week: list[int] = Field(..., min_items=1, max_items=7)  # 0 = Monday, 6 = Sunday
