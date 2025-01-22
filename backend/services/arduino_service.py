import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.models.sensor_data import SensorData, ArduinoStatus, ArduinoCommand, IrrigationLog
from typing import Optional, Dict, List
from sqlalchemy import and_

logger = logging.getLogger(__name__)

class ArduinoService:
    def __init__(self):
        self.command_timeout = timedelta(minutes=5)  # Commands expire after 5 minutes

    async def process_sensor_data(self, device_id: str, data: Dict, db: Session) -> bool:
        """Process incoming sensor data from Arduino"""
        try:
            # Update device status
            status = db.query(ArduinoStatus)\
                .filter(ArduinoStatus.device_id == device_id)\
                .first()
                
            if not status:
                status = ArduinoStatus(device_id=device_id)
                db.add(status)
            
            status.last_seen = datetime.utcnow()
            status.battery_level = data.get("battery_level")
            status.is_online = True
            status.firmware_version = data.get("firmware_version")
            status.signal_strength = data.get("signal_strength")
            
            # Save sensor readings
            if "zone_id" in data and data.get("sensor_data"):
                sensor_data = SensorData(
                    zone_id=data["zone_id"],
                    device_id=device_id,
                    soil_moisture=data["sensor_data"].get("moisture"),
                    temperature=data["sensor_data"].get("temperature"),
                    humidity=data["sensor_data"].get("humidity"),
                    light_level=data["sensor_data"].get("light"),
                    battery_level=data["sensor_data"].get("battery")
                )
                db.add(sensor_data)
            
            db.commit()
            return True
        except Exception as e:
            logger.error(f"Error processing sensor data: {e}")
            return False

    async def get_pending_commands(self, device_id: str, db: Session) -> List[Dict]:
        """Get pending commands for Arduino"""
        try:
            # Get commands that are pending and not expired
            expiry_time = datetime.utcnow() - self.command_timeout
            commands = db.query(ArduinoCommand)\
                .filter(
                    and_(
                        ArduinoCommand.device_id == device_id,
                        ArduinoCommand.status == "pending",
                        ArduinoCommand.created_at > expiry_time
                    )
                )\
                .all()
            
            return [
                {
                    "command_id": cmd.id,
                    "type": cmd.command_type,
                    "parameters": cmd.parameters
                }
                for cmd in commands
            ]
        except Exception as e:
            logger.error(f"Error getting pending commands: {e}")
            return []

    async def update_command_status(
        self, 
        device_id: str, 
        command_id: int, 
        status: str, 
        error_message: Optional[str],
        db: Session
    ) -> bool:
        """Update command execution status"""
        try:
            command = db.query(ArduinoCommand)\
                .filter(
                    and_(
                        ArduinoCommand.id == command_id,
                        ArduinoCommand.device_id == device_id
                    )
                )\
                .first()
                
            if command:
                command.status = status
                command.executed_at = datetime.utcnow()
                command.error_message = error_message
                db.commit()
                return True
            return False
        except Exception as e:
            logger.error(f"Error updating command status: {e}")
            return False

    async def queue_command(
        self, 
        device_id: str, 
        command_type: str, 
        parameters: Dict,
        db: Session
    ) -> bool:
        """Queue a new command for Arduino"""
        try:
            command = ArduinoCommand(
                device_id=device_id,
                command_type=command_type,
                parameters=parameters,
                status="pending"
            )
            db.add(command)
            db.commit()
            return True
        except Exception as e:
            logger.error(f"Error queueing command: {e}")
            return False

    async def start_irrigation(self, zone_id: str, duration: int, db: Session) -> bool:
        """Queue irrigation start command"""
        try:
            # Get Arduino device for zone
            device = db.query(ArduinoStatus)\
                .filter(ArduinoStatus.zone_id == zone_id)\
                .first()
                
            if not device or not device.is_online:
                raise Exception("No online device found for zone")
                
            # Create irrigation log
            log = IrrigationLog(
                zone_id=zone_id,
                device_id=device.device_id,
                start_time=datetime.utcnow(),
                duration=duration,
                type="manual",
                status="pending"
            )
            db.add(log)
            
            # Queue command
            success = await self.queue_command(
                device.device_id,
                "start_irrigation",
                {"zone_id": zone_id, "duration": duration},
                db
            )
            
            if not success:
                log.status = "failed"
                log.error_message = "Failed to queue command"
                db.commit()
                return False
                
            return True
        except Exception as e:
            logger.error(f"Error starting irrigation: {e}")
            return False

    async def stop_irrigation(self, zone_id: str, db: Session) -> bool:
        """Queue irrigation stop command"""
        try:
            # Get Arduino device for zone
            device = db.query(ArduinoStatus)\
                .filter(ArduinoStatus.zone_id == zone_id)\
                .first()
                
            if not device:
                raise Exception("No device found for zone")
                
            # Find active irrigation log
            log = db.query(IrrigationLog)\
                .filter(
                    and_(
                        IrrigationLog.zone_id == zone_id,
                        IrrigationLog.status.in_(["pending", "in_progress"])
                    )
                )\
                .first()
                
            if log:
                # Queue stop command
                success = await self.queue_command(
                    device.device_id,
                    "stop_irrigation",
                    {"zone_id": zone_id},
                    db
                )
                
                if not success:
                    log.status = "failed"
                    log.error_message = "Failed to queue stop command"
                    db.commit()
                    return False
                    
                return True
            return False
        except Exception as e:
            logger.error(f"Error stopping irrigation: {e}")
            return False
