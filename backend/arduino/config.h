#ifndef CONFIG_H
#define CONFIG_H

// Board-specific Configuration
#define BOARD_TYPE "MEGA_WIFI_R3"
#define FIRMWARE_VERSION "1.0.0"

// WiFi Configuration (ESP8266)
#define WIFI_SSID "Your_SSID"
#define WIFI_PASSWORD "Your_Password"
#define ESP8266_BAUD_RATE 115200

// Pin Definitions for Arduino Mega
// Serial Communication
#define ESP8266_SERIAL Serial3  // For ESP8266 WiFi module
#define DEBUG_SERIAL Serial     // USB Serial for debugging
#define RS485_SERIAL1 Serial1   // For RS485 Bus 1
#define RS485_SERIAL2 Serial2   // For RS485 Bus 2

// RS485 Control Pins
#define RS485_BUS1_RE_DE 22    // RS485 Bus 1 RE/DE
#define RS485_BUS2_RE_DE 24    // RS485 Bus 2 RE/DE

// Relay Control Pins (Digital)
#define RELAY_1_PIN 30         // Zone 1
#define RELAY_2_PIN 32         // Zone 2
#define RELAY_3_PIN 34         // Zone 3
#define RELAY_4_PIN 36         // Zone 4

// Sensor Pins (Digital)
#define FLOW_SENSOR_PIN 2      // Flow sensor (Interrupt capable)
#define DHT_PIN 3              // DHT22 Temperature/Humidity
#define RAIN_SENSOR_PIN 4      // Rain detection
#define WIND_SENSOR_PIN 5      // Anemometer

// I2C Pins (Built-in)
#define I2C_SDA 20            // I2C Data (SDA)
#define I2C_SCL 21            // I2C Clock (SCL)

// Analog Sensor Pins
#define MOISTURE_SENSOR_PIN A0  // Soil moisture
#define PH_SENSOR_PIN A1       // pH sensor
#define EC_SENSOR_PIN A2       // EC sensor
#define PRESSURE_SENSOR_PIN A3  // Pressure sensor
#define NPK_N_SENSOR_PIN A4    // Nitrogen sensor
#define NPK_P_SENSOR_PIN A5    // Phosphorus sensor
#define NPK_K_SENSOR_PIN A6    // Potassium sensor

// OLED Display Configuration
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET 4
#define SCREEN_ADDRESS 0x3C
#define I2C_CLOCK 100000
#define DISPLAY_UPDATE_INTERVAL 1000

// System Timings
#define SENSOR_READ_INTERVAL 5000
#define SERVER_UPDATE_INTERVAL 300000
#define COMMAND_CHECK_INTERVAL 10000
#define WATCHDOG_TIMEOUT 8000

// Sensor Configuration
#define MAX_ZONES 4
#define BUFFER_SIZE 64
#define MAX_RETRY_ATTEMPTS 3

// RS485 Configuration
#define RS485_BAUD_RATE 9600

// Calibration Storage
#define EEPROM_CAL_START 100
#define EEPROM_SETTINGS_START 500

// Sensor Calibration Values
#define MOISTURE_MIN 0.0
#define MOISTURE_MAX 100.0
#define PH_MIN 0.0
#define PH_MAX 14.0
#define EC_FACTOR 1.0
#define FLOW_FACTOR 2.25
#define PRESSURE_FACTOR 0.1

#endif // CONFIG_H
