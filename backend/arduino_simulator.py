import time
import random
import json
import sqlite3
from datetime import datetime
import logging
from typing import Dict, List
import threading
import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ArduinoSimulator:
    def __init__(self, device_id: str = "SIM001"):
        self.device_id = device_id
        self.zones: Dict[str, dict] = {}  # zone_id: {is_active: bool, arduino_id: str}
        self.running = True
        self.db_path = "smart_irrigation.db"
        
        # Initialize zones from database
        self._init_zones()
        
        # Sensor ranges
        self.sensor_ranges = {
            "soil_moisture": (20, 80),  # percentage
            "soil_temp": (15, 30),      # Celsius
            "soil_ph": (6.0, 7.5),
            "soil_ec": (1.0, 2.0),      # mS/cm
            "soil_n": (40, 60),         # mg/kg
            "soil_p": (20, 40),         # mg/kg
            "soil_k": (150, 250),       # mg/kg
            "air_temp": (18, 35),       # Celsius
            "air_humidity": (40, 80),   # percentage
            "light_level": (1000, 10000) # lux
        }

    def _create_tables_if_not_exist(self):
        """Create necessary tables if they don't exist"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create zones table if it doesn't exist
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS zones (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    zone_id VARCHAR(255) NOT NULL UNIQUE,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    geometry TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create sensor_data table if it doesn't exist
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sensor_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    zone_id VARCHAR(255) NOT NULL,
                    sensor_type VARCHAR(50) NOT NULL,
                    value FLOAT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create arduino_status table if it doesn't exist
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS arduino_status (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    device_id VARCHAR(50) UNIQUE NOT NULL,
                    last_seen TIMESTAMP,
                    battery_level FLOAT,
                    firmware_version VARCHAR(20),
                    signal_strength FLOAT,
                    is_online BOOLEAN DEFAULT FALSE,
                    error_count INTEGER DEFAULT 0,
                    last_error TEXT,
                    last_offline TIMESTAMP,
                    zone_id VARCHAR(255)
                )
            """)
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error creating tables: {e}")

    def _init_zones(self):
        """Initialize zones from the database"""
        self._create_tables_if_not_exist()
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Check if any zones exist
            cursor.execute("SELECT COUNT(*) FROM zones")
            count = cursor.fetchone()[0]
            
            if count == 0:
                # Create test zones if none exist
                test_zones = [
                    ("ZONE1", "North Field", "Agricultural area in the north"),
                    ("ZONE2", "South Garden", "Garden area in the south"),
                    ("ZONE3", "East Greenhouse", "Greenhouse cultivation area")
                ]
                
                for zone_id, name, desc in test_zones:
                    cursor.execute("""
                        INSERT INTO zones (zone_id, name, description)
                        VALUES (?, ?, ?)
                    """, (zone_id, name, desc))
                    
                    # Create arduino status for each zone
                    arduino_id = f"ARD_{zone_id}"
                    cursor.execute("""
                        INSERT INTO arduino_status (device_id, zone_id, is_online, firmware_version)
                        VALUES (?, ?, ?, ?)
                    """, (arduino_id, zone_id, True, "1.0.0"))
                    
                    self.zones[zone_id] = {
                        "is_active": False,
                        "arduino_id": arduino_id
                    }
                
                conn.commit()
                logger.info("Created test zones with their Arduino systems")
            else:
                # Load existing zones
                cursor.execute("""
                    SELECT z.zone_id, a.device_id 
                    FROM zones z 
                    LEFT JOIN arduino_status a ON z.zone_id = a.zone_id
                """)
                for zone_id, arduino_id in cursor.fetchall():
                    if not arduino_id:
                        arduino_id = f"ARD_{zone_id}"
                        # Create arduino status if it doesn't exist
                        cursor.execute("""
                            INSERT INTO arduino_status (device_id, zone_id, is_online, firmware_version)
                            VALUES (?, ?, ?, ?)
                        """, (arduino_id, zone_id, True, "1.0.0"))
                    
                    self.zones[zone_id] = {
                        "is_active": False,
                        "arduino_id": arduino_id
                    }
                conn.commit()
            
            conn.close()
        except Exception as e:
            logger.error(f"Error initializing zones: {e}")

    def generate_sensor_data(self, zone_id: str) -> dict:
        """Generate random sensor data within realistic ranges"""
        return {
            "soil_moisture": random.uniform(*self.sensor_ranges["soil_moisture"]),
            "soil_temp": random.uniform(*self.sensor_ranges["soil_temp"]),
            "soil_ph": random.uniform(*self.sensor_ranges["soil_ph"]),
            "soil_ec": random.uniform(*self.sensor_ranges["soil_ec"]),
            "soil_n": random.uniform(*self.sensor_ranges["soil_n"]),
            "soil_p": random.uniform(*self.sensor_ranges["soil_p"]),
            "soil_k": random.uniform(*self.sensor_ranges["soil_k"]),
            "air_temp": random.uniform(*self.sensor_ranges["air_temp"]),
            "air_humidity": random.uniform(*self.sensor_ranges["air_humidity"]),
            "light_level": random.uniform(*self.sensor_ranges["light_level"]),
            "zone_id": zone_id,
            "device_id": self.zones[zone_id]["arduino_id"],
            "timestamp": datetime.now().isoformat()
        }

    def save_sensor_data(self, data: dict):
        """Save sensor data to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Save each sensor type separately
            sensor_types = [
                ("soil_moisture", data["soil_moisture"]),
                ("soil_temperature", data["soil_temp"]),
                ("soil_ph", data["soil_ph"]),
                ("soil_ec", data["soil_ec"]),
                ("nitrogen", data["soil_n"]),
                ("phosphorus", data["soil_p"]),
                ("potassium", data["soil_k"]),
                ("air_temperature", data["air_temp"]),
                ("air_humidity", data["air_humidity"]),
                ("light_level", data["light_level"])
            ]
            
            for sensor_type, value in sensor_types:
                cursor.execute("""
                    INSERT INTO sensor_data (zone_id, sensor_type, value, timestamp)
                    VALUES (?, ?, ?, ?)
                """, (data["zone_id"], sensor_type, value, data["timestamp"]))
            
            # Update arduino_status
            cursor.execute("""
                UPDATE arduino_status 
                SET last_seen = ?,
                    is_online = ?,
                    battery_level = ?,
                    signal_strength = ?
                WHERE device_id = ?
            """, (
                datetime.now().isoformat(),
                True,
                random.uniform(80, 100),  # Battery level between 80-100%
                random.uniform(-70, -50),  # WiFi signal strength in dBm
                data["device_id"]
            ))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error saving sensor data: {e}")

    def handle_irrigation(self, zone_id: str, action: str):
        """Handle irrigation commands"""
        if zone_id in self.zones:
            if action == "START_IRRIGATION":
                self.zones[zone_id]["is_active"] = True
                logger.info(f"Started irrigation in zone {zone_id}")
            elif action == "STOP_IRRIGATION":
                self.zones[zone_id]["is_active"] = False
                logger.info(f"Stopped irrigation in zone {zone_id}")

    def test_zone(self, zone_id: str):
        """Test a specific zone's irrigation system"""
        if zone_id not in self.zones:
            logger.error(f"Zone {zone_id} not found")
            return
        
        logger.info(f"Testing zone {zone_id}")
        
        # Start irrigation
        self.handle_irrigation(zone_id, "START_IRRIGATION")
        
        # Generate and save initial sensor data
        initial_data = self.generate_sensor_data(zone_id)
        self.save_sensor_data(initial_data)
        logger.info(f"Initial soil moisture: {initial_data['soil_moisture']}%")
        
        # Wait for 10 seconds
        time.sleep(10)
        
        # Generate and save data after irrigation
        final_data = self.generate_sensor_data(zone_id)
        self.save_sensor_data(final_data)
        logger.info(f"Final soil moisture: {final_data['soil_moisture']}%")
        
        # Stop irrigation
        self.handle_irrigation(zone_id, "STOP_IRRIGATION")
        
        return {
            "zone_id": zone_id,
            "initial_moisture": initial_data['soil_moisture'],
            "final_moisture": final_data['soil_moisture'],
            "arduino_id": self.zones[zone_id]["arduino_id"]
        }

    def run(self):
        """Main loop to simulate Arduino behavior"""
        while self.running:
            try:
                # Generate and save sensor data for each zone
                for zone_id in self.zones:
                    sensor_data = self.generate_sensor_data(zone_id)
                    self.save_sensor_data(sensor_data)
                    
                    # Simulate changes in soil moisture based on irrigation status
                    if self.zones[zone_id]["is_active"]:  # If irrigation is active
                        self.sensor_ranges["soil_moisture"] = (
                            min(80, self.sensor_ranges["soil_moisture"][0] + 5),
                            min(90, self.sensor_ranges["soil_moisture"][1] + 5)
                        )
                    else:  # If irrigation is inactive
                        self.sensor_ranges["soil_moisture"] = (
                            max(20, self.sensor_ranges["soil_moisture"][0] - 2),
                            max(30, self.sensor_ranges["soil_moisture"][1] - 2)
                        )
                
                # Sleep for 5 seconds before next update
                time.sleep(5)
                
            except Exception as e:
                logger.error(f"Error in main loop: {e}")
                time.sleep(5)  # Sleep even if there's an error

    def stop(self):
        """Stop the simulator"""
        self.running = False

def main():
    simulator = ArduinoSimulator()
    
    try:
        # Start the simulator in a separate thread
        simulator_thread = threading.Thread(target=simulator.run)
        simulator_thread.start()
        
        logger.info("Arduino simulator started. Testing all zones...")
        
        # Test each zone
        test_results = []
        for zone_id in simulator.zones:
            result = simulator.test_zone(zone_id)
            test_results.append(result)
            time.sleep(2)  # Wait between zone tests
        
        # Print test results
        logger.info("\nTest Results:")
        for result in test_results:
            logger.info(f"""
Zone: {result['zone_id']}
Arduino ID: {result['arduino_id']}
Initial Moisture: {result['initial_moisture']:.1f}%
Final Moisture: {result['final_moisture']:.1f}%
Moisture Change: {(result['final_moisture'] - result['initial_moisture']):.1f}%
-------------------""")
        
        logger.info("\nSimulator continuing to run. Press Ctrl+C to stop.")
        
        # Keep the main thread running
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        logger.info("Stopping simulator...")
        simulator.stop()
        simulator_thread.join()
        logger.info("Simulator stopped.")

if __name__ == "__main__":
    main()
