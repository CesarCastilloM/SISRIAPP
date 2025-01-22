-- MySQL Schema for Smart Irrigation System

-- Drop existing tables if they exist
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS zones;
DROP TABLE IF EXISTS arduino_status;
DROP TABLE IF EXISTS sensor_data;
DROP TABLE IF EXISTS irrigation_logs;
DROP TABLE IF EXISTS commands;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS weather_data;
DROP TABLE IF EXISTS satellite_data;
DROP TABLE IF EXISTS system_logs;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS irrigation_schedules;
DROP TABLE IF EXISTS irrigation_history;
SET FOREIGN_KEY_CHECKS = 1;

-- Create zones table if it doesn't exist
CREATE TABLE IF NOT EXISTS zones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zone_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    geometry JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create irrigation_schedules table if it doesn't exist
CREATE TABLE IF NOT EXISTS irrigation_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zone_id VARCHAR(255) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    days_of_week VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (zone_id) REFERENCES zones(zone_id) ON DELETE CASCADE
);

-- Create irrigation_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS irrigation_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zone_id VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zone_id) REFERENCES zones(zone_id) ON DELETE CASCADE
);

-- Create sensor_data table if it doesn't exist
CREATE TABLE IF NOT EXISTS sensor_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zone_id VARCHAR(255) NOT NULL,
    sensor_type VARCHAR(50) NOT NULL,
    value FLOAT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zone_id) REFERENCES zones(zone_id) ON DELETE CASCADE
);

-- Arduino Status
CREATE TABLE arduino_status (
    id INT PRIMARY KEY AUTO_INCREMENT,
    device_id VARCHAR(50) UNIQUE NOT NULL,
    last_seen TIMESTAMP NULL,
    battery_level FLOAT,
    firmware_version VARCHAR(20),
    signal_strength FLOAT,      -- WiFi signal strength in dBm
    is_online BOOLEAN DEFAULT FALSE,
    error_count INT DEFAULT 0,
    last_error TEXT,
    last_offline TIMESTAMP NULL,
    zone_id VARCHAR(255),
    FOREIGN KEY (zone_id) REFERENCES zones(zone_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sensor Data
CREATE TABLE sensor_data_old (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    zone_id VARCHAR(50) NOT NULL,
    device_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    soil_moisture FLOAT,        -- Percentage
    soil_temp FLOAT,           -- Celsius
    soil_ph FLOAT,
    soil_ec FLOAT,             -- Electrical conductivity
    soil_n FLOAT,              -- Nitrogen level
    soil_p FLOAT,              -- Phosphorus level
    soil_k FLOAT,              -- Potassium level
    air_temp FLOAT,            -- Celsius
    air_humidity FLOAT,        -- Percentage
    light_level FLOAT,         -- Lux
    pressure FLOAT,            -- hPa
    wind_speed FLOAT,          -- m/s
    is_raining BOOLEAN,
    flow_rate FLOAT,           -- L/min
    total_water FLOAT,         -- Total water used in L
    FOREIGN KEY (zone_id) REFERENCES zones(zone_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Irrigation Logs
CREATE TABLE irrigation_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    zone_id VARCHAR(50) NOT NULL,
    device_id VARCHAR(50) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NULL,
    duration INT,              -- Duration in seconds
    water_used FLOAT,         -- Water used in liters
    trigger_type VARCHAR(50),  -- 'manual', 'scheduled', 'sensor', 'weather'
    status VARCHAR(20),       -- 'completed', 'interrupted', 'failed'
    error_message TEXT,
    FOREIGN KEY (zone_id) REFERENCES zones(zone_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Commands Queue
CREATE TABLE commands (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    device_id VARCHAR(50) NOT NULL,
    command_type VARCHAR(50) NOT NULL,  -- 'start_irrigation', 'stop_irrigation', 'update_config'
    parameters JSON,
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'executed', 'failed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP NULL,
    error_message TEXT,
    priority INT DEFAULT 1,
    expiry_time TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Notifications
CREATE TABLE notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL,  -- 'low', 'medium', 'high'
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    user_id INT,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Weather Data
CREATE TABLE weather_data (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    zone_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    temperature FLOAT,
    humidity FLOAT,
    pressure FLOAT,
    wind_speed FLOAT,
    wind_direction FLOAT,
    precipitation FLOAT,
    forecast_type VARCHAR(50),  -- 'current', 'hourly', 'daily'
    raw_data JSON,
    FOREIGN KEY (zone_id) REFERENCES zones(zone_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Satellite Data
CREATE TABLE satellite_data (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    zone_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    ndvi FLOAT,               -- Normalized Difference Vegetation Index
    soil_moisture FLOAT,
    land_surface_temp FLOAT,
    raw_data JSON,
    FOREIGN KEY (zone_id) REFERENCES zones(zone_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- System Logs
CREATE TABLE system_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    log_level VARCHAR(20) NOT NULL,  -- 'INFO', 'WARNING', 'ERROR', 'CRITICAL'
    component VARCHAR(50) NOT NULL,   -- 'arduino', 'server', 'database', etc.
    message TEXT NOT NULL,
    details JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create indexes for better query performance
CREATE INDEX idx_sensor_data_timestamp ON sensor_data_old(timestamp);
CREATE INDEX idx_sensor_data_zone ON sensor_data_old(zone_id);
CREATE INDEX idx_irrigation_logs_zone ON irrigation_logs(zone_id);
CREATE INDEX idx_irrigation_logs_time ON irrigation_logs(start_time);
CREATE INDEX idx_commands_status ON commands(status, device_id);
CREATE INDEX idx_notifications_timestamp ON notifications(timestamp);
CREATE INDEX idx_weather_data_zone_time ON weather_data(zone_id, timestamp);
CREATE INDEX idx_satellite_data_zone_time ON satellite_data(zone_id, timestamp);
CREATE INDEX idx_system_logs_level_time ON system_logs(log_level, timestamp);
