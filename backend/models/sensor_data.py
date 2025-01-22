from sqlalchemy import Column, Integer, Float, DateTime, String, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.models.base import Base

class SensorData(Base):
    __tablename__ = "sensor_data"
    
    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(String(50), ForeignKey("zones.zone_id"))
    device_id = Column(String(50), index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    soil_moisture = Column(Float)
    soil_temp = Column(Float)
    soil_ph = Column(Float)
    soil_ec = Column(Float)
    soil_n = Column(Float)
    soil_p = Column(Float)
    soil_k = Column(Float)
    air_temp = Column(Float)
    air_humidity = Column(Float)
    light_level = Column(Float)
    pressure = Column(Float)
    wind_speed = Column(Float)
    is_raining = Column(Boolean)
    flow_rate = Column(Float)
    total_water = Column(Float)
    
    # Relationships
    zone = relationship("Zone", back_populates="sensor_data")

class ArduinoStatus(Base):
    __tablename__ = "arduino_status"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(50), unique=True, index=True)
    last_seen = Column(DateTime)
    battery_level = Column(Float)
    firmware_version = Column(String(20))
    signal_strength = Column(Float)
    is_online = Column(Boolean, default=False)
    error_count = Column(Integer, default=0)
    last_error = Column(String(500))
    last_offline = Column(DateTime)
    zone_id = Column(String(50), ForeignKey("zones.zone_id"))
    
    # Relationships
    zone = relationship("Zone", back_populates="arduino_statuses")

class Command(Base):
    __tablename__ = "commands"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(50), index=True)
    command_type = Column(String(50))
    parameters = Column(JSON)
    status = Column(String(20), default='pending')
    created_at = Column(DateTime, default=datetime.utcnow)
    executed_at = Column(DateTime, nullable=True)
    error_message = Column(String(500))
    priority = Column(Integer, default=1)
    expiry_time = Column(DateTime)
    
    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'command_type': self.command_type,
            'parameters': self.parameters,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'executed_at': self.executed_at.isoformat() if self.executed_at else None,
            'error_message': self.error_message,
            'priority': self.priority,
            'expiry_time': self.expiry_time.isoformat() if self.expiry_time else None
        }

class IrrigationLog(Base):
    __tablename__ = "irrigation_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(String(50), ForeignKey("zones.zone_id"))
    device_id = Column(String(50), index=True)
    start_time = Column(DateTime)
    end_time = Column(DateTime, nullable=True)
    duration = Column(Integer)  # in seconds
    water_volume = Column(Float)  # in liters
    type = Column(String(20))  # 'scheduled', 'manual', 'smart'
    status = Column(String(20))  # 'completed', 'failed', 'in_progress'
    error_message = Column(String(200), nullable=True)
    
    zone = relationship("Zone", back_populates="irrigation_logs")
