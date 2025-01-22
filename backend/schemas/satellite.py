from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

class SatelliteIndex(str, Enum):
    NDVI = "ndvi"  # Normalized Difference Vegetation Index
    EVI = "evi"    # Enhanced Vegetation Index
    NDWI = "ndwi"  # Normalized Difference Water Index
    NDMI = "ndmi"  # Normalized Difference Moisture Index
    NBR = "nbr"    # Normalized Burn Ratio

class CloudCoverage(str, Enum):
    CLEAR = "clear"              # 0-10%
    PARTLY_CLOUDY = "partly"     # 10-50%
    MOSTLY_CLOUDY = "mostly"     # 50-90%
    CLOUDY = "cloudy"           # 90-100%

class SatelliteData(BaseModel):
    zone_id: str
    capture_date: datetime
    cloud_coverage: CloudCoverage
    indices: Dict[SatelliteIndex, float]
    metadata: Dict[str, Any] = {}
    resolution: float  # in meters
    source: str
    quality_score: float = Field(..., ge=0, le=1)

class SatelliteStats(BaseModel):
    zone_id: str
    index_type: SatelliteIndex
    min_value: float
    max_value: float
    mean_value: float
    std_dev: float
    period_start: datetime
    period_end: datetime
    sample_count: int

class ZoneAnalysis(BaseModel):
    zone_id: str
    analysis_date: datetime
    vegetation_health: float = Field(..., ge=0, le=1)
    water_stress: float = Field(..., ge=0, le=1)
    growth_stage: str
    anomalies: List[Dict[str, Any]]
    recommendations: List[str]

class HistoricalTrend(BaseModel):
    zone_id: str
    index_type: SatelliteIndex
    timestamps: List[datetime]
    values: List[float]
    trend_direction: str
    confidence: float = Field(..., ge=0, le=1)
