#include <Arduino.h>
#include <WiFiEsp.h>
#include <WiFiEspClient.h>
#include <WiFiEspUdp.h>
#include <ArduinoJson.h>
#include <EEPROM.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "config.h"

// WiFi and Network
WiFiEspClient client;
char server[] = "YOUR_RAILWAY_SERVER";  // Your Railway server URL
int port = 443;  // HTTPS port
const char* DEVICE_ID = "DEVICE_1";

// Create display object
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// System state
struct SystemState {
    bool zoneActive[MAX_ZONES];
    uint32_t zoneStartTime[MAX_ZONES];
    uint32_t zoneDuration[MAX_ZONES];
    float flowRate;
    float totalWaterUsage;
    bool serverConnected;
    bool sensorsResponding;
    uint8_t errorFlags;
    
    // Sensor Data
    float soilMoisture;
    float soilTemp;
    float soilPH;
    float soilNPK[3];
    float soilEC;
    float airTemp;
    float airHumidity;
    float pressure;
    float windSpeed;
    bool isRaining;
    unsigned long lastSensorUpdate;
    unsigned long lastCommandCheck;
} state;

// DHT sensor
DHT dht(DHT_PIN, DHT22);

// Timers
uint32_t lastSensorRead = 0;
uint32_t lastServerUpdate = 0;
uint32_t lastCommandCheck = 0;
uint32_t lastDisplayUpdate = 0;
uint32_t lastWatchdogReset = 0;
volatile uint32_t flowPulseCount = 0;

// Function prototypes
void setupWiFi();
void readSensors();
void sendSensorData();
void checkCommands();
void updateCommandStatus(int commandId, const char* status, const char* errorMessage = nullptr);
void handleIrrigation();
void ICACHE_RAM_ATTR flowPulseCounter();
void setupDisplay();
void updateDisplay();
void handleError(uint8_t errorFlag);

void setup() {
    // Initialize debug serial
    DEBUG_SERIAL.begin(115200);
    while (!DEBUG_SERIAL) {}
    DEBUG_SERIAL.println("Starting system...");
    
    // Initialize ESP8266 serial
    ESP8266_SERIAL.begin(ESP8266_BAUD_RATE);
    
    // Initialize RS485 serials
    RS485_SERIAL1.begin(RS485_BAUD_RATE);
    RS485_SERIAL2.begin(RS485_BAUD_RATE);
    
    // Initialize I2C
    Wire.begin();
    
    // Initialize display
    setupDisplay();
    display.println("Initializing...");
    display.display();
    
    // Configure pins
    pinMode(RS485_BUS1_RE_DE, OUTPUT);
    pinMode(RS485_BUS2_RE_DE, OUTPUT);
    digitalWrite(RS485_BUS1_RE_DE, LOW);  // Receive mode
    digitalWrite(RS485_BUS2_RE_DE, LOW);  // Receive mode
    
    // Configure relay pins
    pinMode(RELAY_1_PIN, OUTPUT);
    pinMode(RELAY_2_PIN, OUTPUT);
    pinMode(RELAY_3_PIN, OUTPUT);
    pinMode(RELAY_4_PIN, OUTPUT);
    
    // Turn off all relays
    digitalWrite(RELAY_1_PIN, LOW);
    digitalWrite(RELAY_2_PIN, LOW);
    digitalWrite(RELAY_3_PIN, LOW);
    digitalWrite(RELAY_4_PIN, LOW);
    
    // Configure sensor pins
    pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
    pinMode(RAIN_SENSOR_PIN, INPUT_PULLUP);
    pinMode(WIND_SENSOR_PIN, INPUT);
    
    // Initialize sensors
    dht.begin();
    
    // Attach flow meter interrupt
    attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), flowPulseCounter, RISING);
    
    // Initialize WiFi
    if (!connectWiFi()) {
        DEBUG_SERIAL.println("Failed to connect to WiFi");
    }
    
    // Initialize state
    memset(&state, 0, sizeof(state));
    
    DEBUG_SERIAL.println("System initialized");
}

void loop() {
    maintainWiFiConnection();  // Check WiFi connection first
    
    if (WiFi.status() == WL_CONNECTED) {
        unsigned long currentMillis = millis();
        
        // Send sensor data every SENSOR_INTERVAL
        if (currentMillis - state.lastSensorUpdate >= SENSOR_INTERVAL) {
            readSensors();
            sendSensorData();
            state.lastSensorUpdate = currentMillis;
        }
        
        // Check for commands every COMMAND_CHECK_INTERVAL
        if (currentMillis - state.lastCommandCheck >= COMMAND_CHECK_INTERVAL) {
            checkCommands();
            state.lastCommandCheck = currentMillis;
        }
    }
    
    // Always handle irrigation, even if offline
    handleIrrigation();
    
    // Always update display
    updateDisplay();
    
    // Handle any pending serial commands
    //handleSerial();
    
    // Small delay to prevent tight looping
    delay(100);
}

// WiFi connection management
bool connectWiFi() {
    uint8_t attempts = 0;
    const uint8_t MAX_ATTEMPTS = 5;
    
    while (WiFi.status() != WL_CONNECTED && attempts < MAX_ATTEMPTS) {
        DEBUG_SERIAL.print("Connecting to WiFi");
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
        
        // Wait up to 10 seconds for connection
        uint8_t timeout = 20;
        while (timeout && WiFi.status() != WL_CONNECTED) {
            delay(500);
            DEBUG_SERIAL.print(".");
            timeout--;
        }
        DEBUG_SERIAL.println();
        
        if (WiFi.status() == WL_CONNECTED) {
            DEBUG_SERIAL.println("WiFi connected");
            DEBUG_SERIAL.print("Signal strength (RSSI): ");
            DEBUG_SERIAL.println(WiFi.RSSI());
            return true;
        }
        
        attempts++;
        DEBUG_SERIAL.println("WiFi connection failed, retrying...");
        delay(1000 * attempts);  // Increasing delay between attempts
    }
    
    return false;
}

void maintainWiFiConnection() {
    static unsigned long lastWiFiCheck = 0;
    const unsigned long WIFI_CHECK_INTERVAL = 30000;  // Check every 30 seconds
    
    if (millis() - lastWiFiCheck >= WIFI_CHECK_INTERVAL) {
        lastWiFiCheck = millis();
        
        if (WiFi.status() != WL_CONNECTED) {
            DEBUG_SERIAL.println("WiFi connection lost!");
            
            // Try to reconnect
            if (!connectWiFi()) {
                // If reconnection fails, continue with last known settings
                DEBUG_SERIAL.println("WiFi reconnection failed, continuing with last known state");
                state.serverConnected = false;
                
                // Continue irrigation if active, based on last known schedule
                if (anyZoneActive()) {
                    DEBUG_SERIAL.println("Continuing irrigation with last known schedule");
                }
            } else {
                // Reconnected successfully, sync with server
                state.serverConnected = true;
                sendSensorData();  // Update server with current state
                checkCommands();   // Check for any missed commands
            }
        }
    }
}

bool anyZoneActive() {
    for (uint8_t i = 0; i < MAX_ZONES; i++) {
        if (state.zoneActive[i]) return true;
    }
    return false;
}

void readSensors() {
    // Read DHT22 sensor
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();
    
    if (!isnan(humidity) && !isnan(temperature)) {
        state.airHumidity = humidity;
        state.airTemp = temperature;
    }
    
    // Read analog sensors
    state.soilMoisture = map(analogRead(MOISTURE_SENSOR_PIN), 0, 1023, MOISTURE_MIN, MOISTURE_MAX);
    state.soilPH = map(analogRead(PH_SENSOR_PIN), 0, 1023, PH_MIN, PH_MAX);
    state.soilEC = analogRead(EC_SENSOR_PIN) * EC_FACTOR;
    state.pressure = analogRead(PRESSURE_SENSOR_PIN) * PRESSURE_FACTOR;
    
    // Read NPK sensors
    state.soilNPK[0] = analogRead(NPK_N_SENSOR_PIN);
    state.soilNPK[1] = analogRead(NPK_P_SENSOR_PIN);
    state.soilNPK[2] = analogRead(NPK_K_SENSOR_PIN);
    
    // Read digital sensors
    state.isRaining = !digitalRead(RAIN_SENSOR_PIN);  // Active LOW
    
    // Calculate flow rate (pulses to L/min)
    cli();  // Disable interrupts
    state.flowRate = (flowPulseCount * FLOW_FACTOR) / (SENSOR_READ_INTERVAL / 1000.0);
    state.totalWaterUsage += state.flowRate * (SENSOR_READ_INTERVAL / 60000.0);  // Add water used in last interval
    flowPulseCount = 0;
    sei();  // Enable interrupts
    
    // Read wind speed (implement according to your sensor type)
    // This is a placeholder - implement based on your specific wind sensor
    state.windSpeed = analogRead(WIND_SENSOR_PIN) * 0.1;  // Example conversion
}

void ICACHE_RAM_ATTR flowPulseCounter() {
    flowPulseCount++;
}

void setupDisplay() {
    if(!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
        DEBUG_SERIAL.println(F("SSD1306 allocation failed"));
        handleError(ERR_DISPLAY);
        return;
    }
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0,0);
}

void updateDisplay() {
    display.clearDisplay();
    display.setCursor(0,0);
    
    // Show WiFi status
    display.print("WiFi: ");
    display.println(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");
    
    // Show active zones
    display.print("Zones: ");
    for(int i = 0; i < MAX_ZONES; i++) {
        display.print(state.zoneActive[i] ? "1" : "0");
    }
    display.println();
    
    // Show sensor readings
    display.print("Temp: ");
    display.print(state.airTemp, 1);
    display.println("C");
    
    display.print("Hum: ");
    display.print(state.airHumidity, 0);
    display.println("%");
    
    display.print("Flow: ");
    display.print(state.flowRate, 1);
    display.println("L/m");
    
    display.display();
}

// Error handling function
void handleError(uint8_t errorFlag) {
    state.errorFlags |= errorFlag;
    DEBUG_SERIAL.print("Error: 0x");
    DEBUG_SERIAL.println(errorFlag, HEX);
    
    // Update display with error
    display.clearDisplay();
    display.setCursor(0,0);
    display.print("Error: 0x");
    display.println(errorFlag, HEX);
    display.display();
}

void sendSensorData() {
    if (WiFi.status() != WL_CONNECTED) return;

    // Create JSON document
    StaticJsonDocument<1024> doc;
    
    // Device status
    doc["device_id"] = DEVICE_ID;
    doc["battery_level"] = 100;  // Add actual battery monitoring if available
    doc["firmware_version"] = FIRMWARE_VERSION;
    doc["signal_strength"] = WiFi.RSSI();
    
    // Sensor data
    JsonObject sensorData = doc.createNestedObject("sensor_data");
    sensorData["moisture"] = state.soilMoisture;
    sensorData["soil_temp"] = state.soilTemp;
    sensorData["soil_ph"] = state.soilPH;
    sensorData["soil_n"] = state.soilNPK[0];
    sensorData["soil_p"] = state.soilNPK[1];
    sensorData["soil_k"] = state.soilNPK[2];
    sensorData["soil_ec"] = state.soilEC;
    sensorData["air_temp"] = state.airTemp;
    sensorData["air_humidity"] = state.airHumidity;
    sensorData["pressure"] = state.pressure;
    sensorData["wind_speed"] = state.windSpeed;
    sensorData["is_raining"] = state.isRaining;
    sensorData["flow_rate"] = state.flowRate;
    sensorData["total_water"] = state.totalWaterUsage;

    // Convert to string
    String jsonString;
    serializeJson(doc, jsonString);

    // Initialize client
    WiFiEspClient client;
    
    DEBUG_SERIAL.println("Connecting to server...");
    
    if (client.connect(server, port)) {
        DEBUG_SERIAL.println("Connected to server");
        
        // Make HTTP POST request
        client.println("POST /api/arduino/" + String(DEVICE_ID) + "/data HTTP/1.1");
        client.println("Host: " + String(server));
        client.println("Content-Type: application/json");
        client.print("Content-Length: ");
        client.println(jsonString.length());
        client.println();
        client.println(jsonString);
        
        delay(100); // Wait for server response
        
        // Read response
        while (client.available()) {
            String line = client.readStringUntil('\r');
            DEBUG_SERIAL.print(line);
        }
        
        client.stop();
        state.serverConnected = true;
        DEBUG_SERIAL.println("\nData sent successfully");
    } else {
        state.serverConnected = false;
        handleError(ERR_SERVER_CONN);
    }
}

void checkCommands() {
    if (WiFi.status() != WL_CONNECTED) return;

    WiFiEspClient client;
    
    if (client.connect(server, port)) {
        // Make HTTP GET request
        client.println("GET /api/arduino/" + String(DEVICE_ID) + "/commands HTTP/1.1");
        client.println("Host: " + String(server));
        client.println("Connection: close");
        client.println();
        
        delay(100); // Wait for server response
        
        String response = "";
        bool headersDone = false;
        
        // Read response
        while (client.available()) {
            String line = client.readStringUntil('\n');
            if (line == "\r") {
                headersDone = true;
                continue;
            }
            if (headersDone) {
                response += line;
            }
        }
        
        client.stop();
        
        // Parse commands
        StaticJsonDocument<1024> doc;
        DeserializationError error = deserializeJson(doc, response);
        
        if (!error) {
            JsonArray commands = doc["commands"];
            for (JsonObject command : commands) {
                int commandId = command["command_id"];
                const char* type = command["type"];
                JsonObject params = command["parameters"];
                
                bool success = false;
                String errorMessage;
                
                // Handle different command types
                if (strcmp(type, "start_irrigation") == 0) {
                    uint8_t zoneIndex = params["zone_id"].as<int>() - 1;
                    uint32_t duration = params["duration"];
                    
                    if (zoneIndex < MAX_ZONES) {
                        state.zoneActive[zoneIndex] = true;
                        state.zoneStartTime[zoneIndex] = millis();
                        state.zoneDuration[zoneIndex] = duration;
                        digitalWrite(RELAY_1_PIN + (zoneIndex * 2), HIGH);
                        success = true;
                    } else {
                        errorMessage = "Invalid zone index";
                    }
                }
                else if (strcmp(type, "stop_irrigation") == 0) {
                    uint8_t zoneIndex = params["zone_id"].as<int>() - 1;
                    
                    if (zoneIndex < MAX_ZONES) {
                        state.zoneActive[zoneIndex] = false;
                        digitalWrite(RELAY_1_PIN + (zoneIndex * 2), LOW);
                        success = true;
                    } else {
                        errorMessage = "Invalid zone index";
                    }
                }
                
                // Update command status
                updateCommandStatus(commandId, success ? "executed" : "failed", errorMessage.c_str());
            }
        }
    }
}

void updateCommandStatus(int commandId, const char* status, const char* errorMessage) {
    if (WiFi.status() != WL_CONNECTED) return;

    WiFiEspClient client;
    
    if (client.connect(server, port)) {
        // Create JSON document
        StaticJsonDocument<200> doc;
        doc["status"] = status;
        if (errorMessage) {
            doc["error_message"] = errorMessage;
        }
        
        String jsonString;
        serializeJson(doc, jsonString);
        
        // Make HTTP POST request
        client.println("POST /api/arduino/" + String(DEVICE_ID) + "/commands/" + String(commandId) + "/status HTTP/1.1");
        client.println("Host: " + String(server));
        client.println("Content-Type: application/json");
        client.print("Content-Length: ");
        client.println(jsonString.length());
        client.println();
        client.println(jsonString);
        
        delay(100); // Wait for server response
        
        // Read response (optional)
        while (client.available()) {
            String line = client.readStringUntil('\r');
            DEBUG_SERIAL.print(line);
        }
        
        client.stop();
    }
}

void handleIrrigation() {
    uint32_t currentTime = millis();
    
    // Check each zone
    for (uint8_t i = 0; i < MAX_ZONES; i++) {
        if (state.zoneActive[i]) {
            // Check if irrigation duration has elapsed
            if (currentTime - state.zoneStartTime[i] >= state.zoneDuration[i]) {
                // Stop irrigation for this zone
                state.zoneActive[i] = false;
                digitalWrite(RELAY_1_PIN + (i * 2), LOW);  // Using consecutive pins for relays
                
                // Update command status
                updateCommandStatus(i, "completed");
            }
            
            // Check for safety conditions
            if (state.isRaining || state.flowRate < 0.1 || state.pressure > MAX_PRESSURE) {
                // Stop irrigation if it's raining or there's a flow/pressure problem
                state.zoneActive[i] = false;
                digitalWrite(RELAY_1_PIN + (i * 2), LOW);
                
                // Update command status with error
                String errorMsg = state.isRaining ? "Stopped due to rain" :
                                state.flowRate < 0.1 ? "No flow detected" :
                                "Pressure too high";
                updateCommandStatus(i, "failed", errorMsg.c_str());
            }
        }
    }
}
