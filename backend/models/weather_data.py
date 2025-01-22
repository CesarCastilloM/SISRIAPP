from sqlalchemy import Column, Integer, Float, DateTime, String, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.models.base import Base
from datetime import datetime

class WeatherData(Base):
    __tablename__ = "weather_data"
    
    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(String(50), ForeignKey("zones.zone_id"), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    temperature = Column(Float)
    humidity = Column(Float)
    pressure = Column(Float)
    wind_speed = Column(Float)
    wind_direction = Column(Float)
    precipitation = Column(Float)
    forecast_type = Column(String(50))  # current, hourly, daily
    raw_data = Column(JSON)
    
    # Relationships
    zone = relationship("Zone", back_populates="weather_data")
    
    def to_dict(self):
        return {
            'id': self.id,
            'zone_id': self.zone_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'temperature': self.temperature,
            'humidity': self.humidity,
            'pressure': self.pressure,
            'wind_speed': self.wind_speed,
            'wind_direction': self.wind_direction,
            'precipitation': self.precipitation,
            'forecast_type': self.forecast_type,
            'raw_data': self.raw_data
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'WeatherData':
        return cls(**data)
