from pydantic import BaseModel, Field, confloat
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum

class SensorType(str, Enum):
    SOIL_MOISTURE = "soil_moisture"
    TEMPERATURE = "temperature"
    HUMIDITY = "humidity"
    PRESSURE = "pressure"
    PH = "ph"
    EC = "ec"
    FLOW = "flow"
    RAIN = "rain"
    WIND = "wind"
    LIGHT = "light"

class SensorData(BaseModel):
    sensor_type: SensorType
    value: float
    unit: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = {}

class SensorReading(BaseModel):
    device_id: str
    zone_id: str
    readings: list[SensorData]
    battery_level: Optional[float] = None
    signal_strength: Optional[int] = None

class SensorStats(BaseModel):
    min_value: float
    max_value: float
    avg_value: float
    std_dev: float
    count: int
    first_reading: datetime
    last_reading: datetime

class SensorCalibration(BaseModel):
    sensor_type: SensorType
    offset: float = 0.0
    scale: float = 1.0
    reference_value: float
    calibration_date: datetime = Field(default_factory=datetime.utcnow)

class SensorThresholds(BaseModel):
    min_value: float
    max_value: float
    critical_min: Optional[float] = None
    critical_max: Optional[float] = None
    warning_min: Optional[float] = None
    warning_max: Optional[float] = None
