from pydantic import BaseModel, Field, confloat
from typing import Optional, List
from datetime import datetime
from enum import Enum

class WeatherCondition(str, Enum):
    CLEAR = "clear"
    PARTLY_CLOUDY = "partly_cloudy"
    CLOUDY = "cloudy"
    RAIN = "rain"
    SNOW = "snow"
    THUNDERSTORM = "thunderstorm"
    FOG = "fog"
    MIST = "mist"
    DRIZZLE = "drizzle"
    OTHER = "other"

class WindDirection(str, Enum):
    N = "N"
    NE = "NE"
    E = "E"
    SE = "SE"
    S = "S"
    SW = "SW"
    W = "W"
    NW = "NW"

class WeatherData(BaseModel):
    temperature: float = Field(..., description="Temperature in Celsius")
    humidity: confloat(ge=0, le=100) = Field(..., description="Relative humidity in percentage")
    pressure: float = Field(..., description="Atmospheric pressure in hPa")
    wind_speed: float = Field(..., description="Wind speed in m/s")
    wind_direction: WindDirection
    precipitation: float = Field(..., description="Precipitation in mm")
    condition: WeatherCondition
    cloud_cover: confloat(ge=0, le=100) = Field(..., description="Cloud cover in percentage")
    visibility: float = Field(..., description="Visibility in km")
    uv_index: float = Field(..., ge=0, description="UV index")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class WeatherForecast(WeatherData):
    probability_precipitation: confloat(ge=0, le=100) = Field(..., description="Probability of precipitation in percentage")
    temperature_min: float = Field(..., description="Minimum temperature in Celsius")
    temperature_max: float = Field(..., description="Maximum temperature in Celsius")

class WeatherAlert(BaseModel):
    alert_type: str
    severity: str
    title: str
    description: str
    start_time: datetime
    end_time: datetime
    affected_zones: List[str]
    source: str

class WeatherStats(BaseModel):
    temperature_avg: float
    temperature_min: float
    temperature_max: float
    humidity_avg: float
    total_precipitation: float
    dominant_condition: WeatherCondition
    period_start: datetime
    period_end: datetime
