from sqlalchemy import Column, Integer, String, DateTime, JSON, Text
from backend.models.base import Base
from datetime import datetime

class SystemLog(Base):
    __tablename__ = "system_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    log_level = Column(String(20), nullable=False)  # INFO, WARNING, ERROR, CRITICAL
    component = Column(String(50), nullable=False)  # arduino, server, database, etc.
    message = Column(Text, nullable=False)
    details = Column(JSON)
    
    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'log_level': self.log_level,
            'component': self.component,
            'message': self.message,
            'details': self.details
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'SystemLog':
        return cls(**data)
