from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from backend.models.sensor_data import ArduinoStatus, SensorData, IrrigationLog
from backend.services.weather_service import WeatherService
from backend.services.satellite_service import SatelliteService
from backend.services.notification_service import NotificationService
import logging
import statistics

logger = logging.getLogger(__name__)

class FallbackService:
    def __init__(self):
        self.weather_service = WeatherService()
        self.satellite_service = SatelliteService()
        self.notification_service = NotificationService()
        self.arduino_offline_threshold = timedelta(minutes=15)
        self.connection_retry_limit = 3
        
    async def check_arduino_status(self, device_id: str, db: Session) -> Dict:
        """Check Arduino connectivity status and handle offline scenarios"""
        arduino_status = db.query(ArduinoStatus).filter(
            ArduinoStatus.device_id == device_id
        ).first()
        
        if not arduino_status:
            await self.handle_arduino_failure(device_id, "Device not registered in system", db)
            return {
                "status": "offline",
                "reason": "Device not registered",
                "last_seen": None,
                "retry_count": 0
            }
            
        time_since_last_seen = datetime.utcnow() - arduino_status.last_seen
        
        # Check if device is offline
        if time_since_last_seen > self.arduino_offline_threshold:
            reason = f"Connection lost for {time_since_last_seen.total_seconds() / 60:.1f} minutes"
            
            # Update retry count
            arduino_status.error_count += 1
            db.commit()
            
            # Different messages based on retry count
            if arduino_status.error_count >= self.connection_retry_limit:
                reason += f" after {arduino_status.error_count} retry attempts"
                severity = "high"
            else:
                reason += f" (Attempt {arduino_status.error_count} of {self.connection_retry_limit})"
                severity = "medium"
            
            await self.handle_arduino_failure(device_id, reason, db, severity)
            
            return {
                "status": "offline",
                "reason": reason,
                "last_seen": arduino_status.last_seen,
                "retry_count": arduino_status.error_count,
                "signal_strength": arduino_status.signal_strength
            }
            
        # Device is online but check signal strength
        if arduino_status.signal_strength and arduino_status.signal_strength < -80:  # Weak WiFi signal
            await self.notification_service.send_alert(
                title="Weak Arduino Connection",
                message=f"Arduino {device_id} has weak signal strength ({arduino_status.signal_strength} dBm). Connection may be unstable.",
                severity="low",
                db=db
            )
            
        return {
            "status": "online",
            "last_seen": arduino_status.last_seen,
            "signal_strength": arduino_status.signal_strength,
            "battery_level": arduino_status.battery_level
        }
    
    async def handle_arduino_failure(self, device_id: str, reason: str, db: Session, severity: str = "high"):
        """Handle Arduino connection failure"""
        # Send notification with connection-specific details
        message = f"""
        Arduino Connection Alert:
        Device ID: {device_id}
        Status: OFFLINE
        Reason: {reason}
        
        Actions Taken:
        1. Activated fallback mode using satellite/weather data
        2. Monitoring for reconnection
        3. Using historical patterns for irrigation decisions
        
        Next Steps:
        1. Check physical Arduino connection
        2. Verify WiFi network availability
        3. Check power supply
        4. Inspect for any physical damage
        
        The system will continue operating in fallback mode until connection is restored.
        """
        
        await self.notification_service.send_alert(
            title=f"Arduino {device_id} Connection Lost",
            message=message,
            severity=severity,
            db=db
        )
        
        # Update Arduino status in database
        arduino_status = db.query(ArduinoStatus).filter(
            ArduinoStatus.device_id == device_id
        ).first()
        
        if arduino_status:
            arduino_status.is_online = False
            arduino_status.last_offline = datetime.utcnow()
            db.commit()
            
        # Log the connection failure
        logger.error(f"Arduino connection failure for device {device_id}: {reason}")
