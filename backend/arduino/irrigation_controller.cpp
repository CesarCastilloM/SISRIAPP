#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>
#include <EEPROM.h>
#include <SoftwareSerial.h>
#include <CircularBuffer.h>
#include <DHT.h>
#include <TimeLib.h>
#include <WiFiUDP.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "config.h"

// Constants for system configuration
constexpr uint8_t MAX_ZONES = 4;
constexpr uint16_t BUFFER_SIZE = 64;
constexpr uint32_t WATCHDOG_TIMEOUT = 8000;
constexpr uint16_t SENSOR_READ_INTERVAL = 5000;
constexpr uint16_t SERVER_UPDATE_INTERVAL = 30000;
constexpr uint8_t MAX_RETRY_ATTEMPTS = 3;

// Pin definitions
constexpr uint8_t RS485_BUS1_RX = D9;
constexpr uint8_t RS485_BUS1_TX = D10;
constexpr uint8_t RS485_BUS2_RX = D11;
constexpr uint8_t RS485_BUS2_TX = D12;
constexpr uint8_t RS485_BUS1_RE_DE = D1;
constexpr uint8_t RS485_BUS2_RE_DE = D2;
constexpr uint8_t RELAY_PINS[MAX_ZONES] = {D5, D6, D7, D8};
constexpr uint8_t FLOW_SENSOR_PIN = D3;
constexpr uint8_t DHT_PIN = D4;
constexpr uint8_t MOISTURE_SENSOR_BACKUP_PIN = A0;
constexpr uint8_t PH_SENSOR_BACKUP_PIN = A1;
constexpr uint8_t NPK_SENSOR_BACKUP_PIN = A2;
constexpr uint8_t RAIN_SENSOR_PIN = D13;
constexpr uint8_t PRESSURE_SENSOR_PIN = A3;
constexpr uint8_t WIND_SENSOR_PIN = D2;

// Sensor addresses
constexpr uint8_t SOIL_SENSOR_ADDR = 0x01;
constexpr uint8_t SOLAR_SENSOR_ADDR = 0x02;

// Sensor commands
constexpr uint8_t CMD_READ_MOISTURE = 0x01;
constexpr uint8_t CMD_READ_TEMP = 0x02;
constexpr uint8_t CMD_READ_PH = 0x03;
constexpr uint8_t CMD_READ_NPK = 0x04;
constexpr uint8_t CMD_READ_EC = 0x05;
constexpr uint8_t CMD_READ_SOLAR = 0x01;

// Sensor calibration factors
constexpr float MOISTURE_MIN = 0.0;
constexpr float MOISTURE_MAX = 100.0;
constexpr float PH_FACTOR = 0.1;
constexpr float NPK_FACTOR = 0.1;
constexpr float PRESSURE_FACTOR = 0.1;
constexpr float WIND_FACTOR = 0.1;
constexpr float FLOW_FACTOR = 2.25;

// OLED display settings
constexpr uint8_t SCREEN_WIDTH = 128;
constexpr uint8_t SCREEN_HEIGHT = 64;
constexpr uint8_t OLED_RESET = -1;
constexpr uint8_t DISPLAY_FONT_SIZE = 1;
constexpr uint8_t TEXT_BASE_X = 0;
constexpr uint8_t TEXT_BASE_Y = 0;
constexpr uint8_t LINE_HEIGHT = 10;
constexpr uint16_t DISPLAY_UPDATE_INTERVAL = 1000;
constexpr uint8_t SCREEN_ADDRESS = 0x3C;

// Create display object
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// System state and buffers
struct SystemState {
    bool zoneActive[MAX_ZONES];
    uint32_t zoneStartTime[MAX_ZONES];
    uint32_t zoneDuration[MAX_ZONES];
    float flowRate;
    float totalWaterUsage;
    bool serverConnected;
    bool sensorsResponding;
    uint8_t errorFlags;
    
    // RS485 Soil Sensor Data
    float soilMoisture;
    float soilTemp;
    float soilPH;
    float soilNPK[3];  // N, P, K values
    float soilEC;
    
    // RS485 Solar Sensor Data
    float solarRadiation;
    
    // Backup Sensor Data
    float backupMoisture;
    float backupPH;
    float backupNPK[3];  // N, P, K values
    
    // Additional Sensor Data
    float airTemp;
    float airHumidity;
    float pressure;
    float windSpeed;
    bool isRaining;
} state;

// Circular buffers for sensor data
CircularBuffer<float, BUFFER_SIZE> soilMoistureBuffer;
CircularBuffer<float, BUFFER_SIZE> temperatureBuffer;
CircularBuffer<float, BUFFER_SIZE> humidityBuffer;
CircularBuffer<float, BUFFER_SIZE> solarRadiationBuffer;
CircularBuffer<float, BUFFER_SIZE> phBuffer;
CircularBuffer<float, BUFFER_SIZE> ecBuffer;

// Communication objects
SoftwareSerial rs485Bus1(RS485_BUS1_RX, RS485_BUS1_TX);  // RX, TX for soil sensors
SoftwareSerial rs485Bus2(RS485_BUS2_RX, RS485_BUS2_TX);  // RX, TX for solar sensor
DHT dht(DHT_PIN, DHT22);
WiFiUDP ntpUDP;

// Timers and counters
uint32_t lastSensorRead = 0;
uint32_t lastServerUpdate = 0;
uint32_t lastWatchdogReset = 0;
volatile uint32_t flowPulseCount = 0;

// Error flags
enum ErrorFlags {
    ERR_WIFI_CONN = 0x01,
    ERR_SERVER_CONN = 0x02,
    ERR_SENSOR_TIMEOUT = 0x04,
    ERR_FLOW_SENSOR = 0x08,
    ERR_VALVE_FEEDBACK = 0x10,
    ERR_DISPLAY = 0x20
};

// Function prototypes
void setupWatchdog();
void handleWatchdog();
void readSensors();
void updateServer();
void handleIrrigation();
void ICACHE_RAM_ATTR flowPulseCounter();
bool sendSensorCommand(SoftwareSerial& bus, uint8_t addr, uint8_t cmd);
float readSensorResponse(SoftwareSerial& bus);
void handleError(uint8_t errorFlag);
void recoverFromError();
void setupDisplay();
void updateDisplay();

void setup() {
    // Initialize serial communication
    Serial.begin(115200);
    Wire.begin();
    Wire.setClock(100000);
    
    // Initialize display
    setupDisplay();
    
    // Initialize RS485 buses
    rs485Bus1.begin(9600);
    rs485Bus2.begin(9600);

    // Configure pins
    pinMode(RS485_BUS1_RE_DE, OUTPUT);
    pinMode(RS485_BUS2_RE_DE, OUTPUT);
    for (uint8_t i = 0; i < MAX_ZONES; i++) {
        pinMode(RELAY_PINS[i], OUTPUT);
        digitalWrite(RELAY_PINS[i], LOW);
    }
    pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);

    // Initialize sensors
    dht.begin();

    // Setup flow meter interrupt
    attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), flowPulseCounter, RISING);

    // Initialize EEPROM
    EEPROM.begin(512);

    // Setup watchdog
    setupWatchdog();

    // Initialize WiFi connection
    WiFi.mode(WIFI_STA);
    WiFi.begin("YOUR_WIFI_SSID", "YOUR_WIFI_PASSWORD");

    // Initialize state
    memset(&state, 0, sizeof(state));
}

void loop() {
    static uint32_t currentTime = millis();

    // Handle watchdog
    handleWatchdog();

    // Check WiFi connection
    if (WiFi.status() != WL_CONNECTED) {
        handleError(ERR_WIFI_CONN);
        delay(1000);
        return;
    }

    // Read sensors at specified interval
    if (currentTime - lastSensorRead >= SENSOR_READ_INTERVAL) {
        readSensors();
        lastSensorRead = currentTime;
    }

    // Update server at specified interval
    if (currentTime - lastServerUpdate >= SERVER_UPDATE_INTERVAL) {
        updateServer();
        lastServerUpdate = currentTime;
    }

    // Handle irrigation control
    handleIrrigation();

    // Update display
    updateDisplay();

    // Small delay to prevent CPU hogging
    delay(10);
}

void readSensors() {
    // Read RS485 soil sensor data (Bus 1)
    digitalWrite(RS485_BUS1_RE_DE, HIGH);
    delay(10);
    
    // Read soil moisture
    if (sendSensorCommand(rs485Bus1, SOIL_SENSOR_ADDR, CMD_READ_MOISTURE)) {
        state.soilMoisture = readSensorResponse(rs485Bus1);
        if (state.soilMoisture >= 0) {
            soilMoistureBuffer.push(state.soilMoisture);
            state.sensorsResponding = true;
        }
    }
    
    // Read soil temperature
    if (sendSensorCommand(rs485Bus1, SOIL_SENSOR_ADDR, CMD_READ_TEMP)) {
        state.soilTemp = readSensorResponse(rs485Bus1);
    }
    
    // Read soil pH
    if (sendSensorCommand(rs485Bus1, SOIL_SENSOR_ADDR, CMD_READ_PH)) {
        state.soilPH = readSensorResponse(rs485Bus1);
        if (state.soilPH >= 0) {
            phBuffer.push(state.soilPH);
        }
    }
    
    // Read NPK values
    if (sendSensorCommand(rs485Bus1, SOIL_SENSOR_ADDR, CMD_READ_NPK)) {
        for (int i = 0; i < 3; i++) {
            state.soilNPK[i] = readSensorResponse(rs485Bus1);
        }
    }
    
    // Read EC
    if (sendSensorCommand(rs485Bus1, SOIL_SENSOR_ADDR, CMD_READ_EC)) {
        state.soilEC = readSensorResponse(rs485Bus1);
        if (state.soilEC >= 0) {
            ecBuffer.push(state.soilEC);
        }
    }
    
    digitalWrite(RS485_BUS1_RE_DE, LOW);
    
    // Read solar radiation sensor (RS485 Bus 2)
    digitalWrite(RS485_BUS2_RE_DE, HIGH);
    delay(10);
    if (sendSensorCommand(rs485Bus2, SOLAR_SENSOR_ADDR, CMD_READ_SOLAR)) {
        state.solarRadiation = readSensorResponse(rs485Bus2);
        if (state.solarRadiation >= 0) {
            solarRadiationBuffer.push(state.solarRadiation);
        }
    }
    digitalWrite(RS485_BUS2_RE_DE, LOW);
    
    // Read backup analog sensors
    state.backupMoisture = analogRead(MOISTURE_SENSOR_BACKUP_PIN) * (MOISTURE_MAX - MOISTURE_MIN) / 1023.0 + MOISTURE_MIN;
    state.backupPH = analogRead(PH_SENSOR_BACKUP_PIN) * PH_FACTOR;
    
    // Read backup NPK sensor
    int npkRaw = analogRead(NPK_SENSOR_BACKUP_PIN);
    for (int i = 0; i < 3; i++) {
        state.backupNPK[i] = npkRaw * NPK_FACTOR;  // You might want to adjust this calculation based on your sensor
    }
    
    // Read DHT sensor
    state.airHumidity = dht.readHumidity();
    state.airTemp = dht.readTemperature();
    if (!isnan(state.airHumidity) && !isnan(state.airTemp)) {
        humidityBuffer.push(state.airHumidity);
        temperatureBuffer.push(state.airTemp);
    }
    
    // Read other digital sensors
    state.isRaining = digitalRead(RAIN_SENSOR_PIN);
    state.pressure = analogRead(PRESSURE_SENSOR_PIN) * PRESSURE_FACTOR;
    state.windSpeed = pulseIn(WIND_SENSOR_PIN, HIGH) * WIND_FACTOR;
    
    // Calculate flow rate
    noInterrupts();
    float pulseCount = flowPulseCount;
    flowPulseCount = 0;
    interrupts();
    
    state.flowRate = pulseCount * FLOW_FACTOR;
    state.totalWaterUsage += state.flowRate * (SENSOR_READ_INTERVAL / 60000.0);
}

void updateServer() {
    StaticJsonDocument<1024> doc;
    
    // Add system status
    doc["flowRate"] = state.flowRate;
    doc["totalWater"] = state.totalWaterUsage;
    doc["errors"] = state.errorFlags;
    
    // Add zone status
    JsonArray zones = doc.createNestedArray("zones");
    for (uint8_t i = 0; i < MAX_ZONES; i++) {
        JsonObject zone = zones.createNestedObject();
        zone["active"] = state.zoneActive[i];
        zone["duration"] = state.zoneDuration[i];
        zone["startTime"] = state.zoneStartTime[i];
    }
    
    // Add RS485 sensor data
    JsonObject rs485 = doc.createNestedObject("rs485");
    rs485["soilMoisture"] = state.soilMoisture;
    rs485["soilTemp"] = state.soilTemp;
    rs485["soilPH"] = state.soilPH;
    rs485["soilEC"] = state.soilEC;
    
    JsonArray npk = rs485.createNestedArray("NPK");
    for (int i = 0; i < 3; i++) {
        npk.add(state.soilNPK[i]);
    }
    
    rs485["solarRadiation"] = state.solarRadiation;
    
    // Add backup sensor data
    JsonObject backup = doc.createNestedObject("backup");
    backup["moisture"] = state.backupMoisture;
    backup["pH"] = state.backupPH;
    
    JsonArray backupNPK = backup.createNestedArray("NPK");
    for (int i = 0; i < 3; i++) {
        backupNPK.add(state.backupNPK[i]);
    }
    
    // Add environmental data
    JsonObject env = doc.createNestedObject("environment");
    env["airTemp"] = state.airTemp;
    env["airHumidity"] = state.airHumidity;
    env["pressure"] = state.pressure;
    env["windSpeed"] = state.windSpeed;
    env["isRaining"] = state.isRaining;
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    HTTPClient http;
    http.begin("http://your-server/api/update");
    http.addHeader("Content-Type", "application/json");
    
    int httpCode = http.POST(jsonString);
    if (httpCode == 200) {
        state.serverConnected = true;
        state.errorFlags &= ~ERR_SERVER_CONN;
    } else {
        handleError(ERR_SERVER_CONN);
    }
    
    http.end();
}

void handleIrrigation() {
    uint32_t currentTime = millis();

    for (uint8_t i = 0; i < MAX_ZONES; i++) {
        if (state.zoneActive[i]) {
            // Check if irrigation duration has elapsed
            if (currentTime - state.zoneStartTime[i] >= state.zoneDuration[i]) {
                digitalWrite(RELAY_PINS[i], LOW);
                state.zoneActive[i] = false;
            }
            
            // Check flow sensor feedback
            if (state.flowRate < 0.1 && state.zoneActive[i]) {
                handleError(ERR_FLOW_SENSOR);
            }
        }
    }
}

void ICACHE_RAM_ATTR flowPulseCounter() {
    flowPulseCount++;
}

void handleError(uint8_t errorFlag) {
    state.errorFlags |= errorFlag;
    
    // Implement error-specific recovery actions
    switch (errorFlag) {
        case ERR_WIFI_CONN:
            WiFi.reconnect();
            break;
        case ERR_SENSOR_TIMEOUT:
            // Reset sensor bus
            rs485Bus1.flush();
            rs485Bus2.flush();
            break;
        case ERR_FLOW_SENSOR:
            // Disable active zones
            for (uint8_t i = 0; i < MAX_ZONES; i++) {
                if (state.zoneActive[i]) {
                    digitalWrite(RELAY_PINS[i], LOW);
                    state.zoneActive[i] = false;
                }
            }
            break;
    }
}

void setupWatchdog() {
    ESP.wdtDisable();
    ESP.wdtEnable(WATCHDOG_TIMEOUT);
}

void handleWatchdog() {
    if (millis() - lastWatchdogReset >= WATCHDOG_TIMEOUT / 2) {
        ESP.wdtFeed();
        lastWatchdogReset = millis();
    }
}

bool sendSensorCommand(SoftwareSerial& bus, uint8_t addr, uint8_t cmd) {
    bus.write(addr);
    bus.write(cmd);
    bus.write(addr + cmd);  // Checksum
    delay(100);  // Wait for response
    return bus.available() >= 3;
}

float readSensorResponse(SoftwareSerial& bus) {
    if (bus.available() >= 3) {
        byte response[3];
        bus.readBytes(response, 3);
        if (response[0] + response[1] == response[2]) {
            return (response[0] * 256 + response[1]) / 100.0;
        }
    }
    return -1.0;
}

void setupDisplay() {
    if(!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
        state.errorFlags |= ERR_DISPLAY;
        Serial.println(F("SSD1306 allocation failed"));
        return;
    }
    display.clearDisplay();
    display.setTextSize(DISPLAY_FONT_SIZE);
    display.setTextColor(SSD1306_WHITE);
    display.display();
}

void updateDisplay() {
    static unsigned long lastDisplayUpdate = 0;
    if (millis() - lastDisplayUpdate < DISPLAY_UPDATE_INTERVAL) return;
    lastDisplayUpdate = millis();
    
    display.clearDisplay();
    display.setCursor(TEXT_BASE_X, TEXT_BASE_Y);
    
    // Display moisture and temperature
    display.print(F("Moisture: "));
    display.print(state.soilMoisture, 1);
    display.println(F("%"));
    
    display.setCursor(TEXT_BASE_X, TEXT_BASE_Y + LINE_HEIGHT);
    display.print(F("Temp: "));
    display.print(state.soilTemp, 1);
    display.println(F("C"));
    
    // Display pH and EC
    display.setCursor(TEXT_BASE_X, TEXT_BASE_Y + LINE_HEIGHT * 2);
    display.print(F("pH: "));
    display.println(state.soilPH, 1);
    
    display.setCursor(TEXT_BASE_X, TEXT_BASE_Y + LINE_HEIGHT * 3);
    display.print(F("EC: "));
    display.print(state.soilEC, 1);
    display.println(F("mS/cm"));
    
    // Display NPK values
    display.setCursor(TEXT_BASE_X, TEXT_BASE_Y + LINE_HEIGHT * 4);
    display.print(F("N:"));
    display.print(state.soilNPK[0], 0);
    display.print(F(" P:"));
    display.print(state.soilNPK[1], 0);
    display.print(F(" K:"));
    display.println(state.soilNPK[2], 0);
    
    // Display active zones
    display.setCursor(TEXT_BASE_X, TEXT_BASE_Y + LINE_HEIGHT * 5);
    display.print(F("Zones:"));
    for (int i = 0; i < MAX_ZONES; i++) {
        if (state.zoneActive[i]) {
            display.print(i + 1);
            display.print(F(" "));
        }
    }
    
    display.display();
}
