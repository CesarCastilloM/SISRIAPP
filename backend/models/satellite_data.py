from sqlalchemy import Column, Integer, Float, DateTime, String, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.models.base import Base
from datetime import datetime

class SatelliteData(Base):
    __tablename__ = "satellite_data"
    
    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(String(50), ForeignKey("zones.zone_id"), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    ndvi = Column(Float)  # Normalized Difference Vegetation Index
    soil_moisture = Column(Float)
    land_surface_temp = Column(Float)
    raw_data = Column(JSON)
    
    # Relationships
    zone = relationship("Zone", back_populates="satellite_data")
    
    def to_dict(self):
        return {
            'id': self.id,
            'zone_id': self.zone_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'ndvi': self.ndvi,
            'soil_moisture': self.soil_moisture,
            'land_surface_temp': self.land_surface_temp,
            'raw_data': self.raw_data
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'SatelliteData':
        return cls(**data)
