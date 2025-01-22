#include <ArduinoJson.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <NTPClient.h>
#include <WiFiUdp.h>

// Pin definitions for multiple zones
const int NUM_ZONES = 4;
const int ZONE_PINS[NUM_ZONES] = {D5, D6, D7, D8};  // Relay pins for each zone
const int SOIL_MOISTURE_PINS[NUM_ZONES] = {A0, A1, A2, A3};  // Soil moisture sensors for each zone

// Sensor pins
const int TEMPERATURE_PIN = D1;
const int HUMIDITY_PIN = D2;
const int LIGHT_SENSOR_PIN = A4;
const int PH_SENSOR_PIN = A5;

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server details
const char* serverUrl = "YOUR_RAILWAY_SERVER_URL";

// NTP Client for time synchronization
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org");

// Operation mode
enum Mode { AUTO, PILOT };
Mode currentMode = AUTO;

// Zone status tracking
struct ZoneStatus {
    bool isActive;
    unsigned long startTime;
    unsigned long duration;
};

ZoneStatus zoneStatus[NUM_ZONES];

// Sensor data structure
struct SensorData {
    float temperatura;
    float humedad;
    float luz;
    float velocidad_viento;
    float humedad_suelo[NUM_ZONES];
    float ph;
    float n;
    float p;
    float k;
    double lat;
    double lon;
};

void setup() {
    Serial.begin(115200);
    
    // Initialize zone pins
    for (int i = 0; i < NUM_ZONES; i++) {
        pinMode(ZONE_PINS[i], OUTPUT);
        digitalWrite(ZONE_PINS[i], LOW);
        zoneStatus[i] = {false, 0, 0};
    }
    
    // Connect to WiFi
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nConnected to WiFi");
    
    // Initialize NTP Client
    timeClient.begin();
    timeClient.setTimeOffset(0);  // Adjust based on your timezone
}

void loop() {
    timeClient.update();
    
    if (currentMode == AUTO) {
        handleAutoMode();
    } else {
        handlePilotMode();
    }
    
    // Check and update zone status
    updateZoneStatus();
    
    delay(1000);
}

void handleAutoMode() {
    static unsigned long lastUpdate = 0;
    const unsigned long updateInterval = 300000;  // 5 minutes
    
    if (millis() - lastUpdate >= updateInterval) {
        SensorData data = readSensors();
        sendDataToServer(data);
        lastUpdate = millis();
    }
}

void handlePilotMode() {
    // Check for manual commands from server
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        http.begin(String(serverUrl) + "/api/manual-control");
        int httpCode = http.GET();
        
        if (httpCode > 0) {
            String payload = http.getString();
            DynamicJsonDocument doc(1024);
            deserializeJson(doc, payload);
            
            if (doc.containsKey("command")) {
                String command = doc["command"].as<String>();
                int zoneId = doc["zone_id"].as<int>();
                
                if (command == "START_IRRIGATION" && zoneId >= 0 && zoneId < NUM_ZONES) {
                    startZoneIrrigation(zoneId, doc["duration"].as<unsigned long>());
                } else if (command == "STOP_IRRIGATION" && zoneId >= 0 && zoneId < NUM_ZONES) {
                    stopZoneIrrigation(zoneId);
                }
            }
        }
        http.end();
    }
}

void updateZoneStatus() {
    unsigned long currentTime = millis();
    
    for (int i = 0; i < NUM_ZONES; i++) {
        if (zoneStatus[i].isActive) {
            if (currentTime - zoneStatus[i].startTime >= zoneStatus[i].duration) {
                stopZoneIrrigation(i);
            }
        }
    }
}

void startZoneIrrigation(int zoneId, unsigned long duration) {
    if (zoneId >= 0 && zoneId < NUM_ZONES) {
        digitalWrite(ZONE_PINS[zoneId], HIGH);
        zoneStatus[zoneId] = {true, millis(), duration};
        Serial.printf("Started irrigation for zone %d\n", zoneId);
    }
}

void stopZoneIrrigation(int zoneId) {
    if (zoneId >= 0 && zoneId < NUM_ZONES) {
        digitalWrite(ZONE_PINS[zoneId], LOW);
        zoneStatus[zoneId] = {false, 0, 0};
        Serial.printf("Stopped irrigation for zone %d\n", zoneId);
    }
}

SensorData readSensors() {
    SensorData data;
    
    // Read sensor values
    for (int i = 0; i < NUM_ZONES; i++) {
        data.humedad_suelo[i] = map(analogRead(SOIL_MOISTURE_PINS[i]), 0, 1023, 0, 100);
    }
    
    data.temperatura = readTemperature();
    data.humedad = readHumidity();
    data.luz = map(analogRead(LIGHT_SENSOR_PIN), 0, 1023, 0, 100);
    data.ph = readPH();
    
    // Get GPS coordinates (mock values for demonstration)
    data.lat = 37.7749;
    data.lon = -122.4194;
    
    // Mock values for demonstration
    data.velocidad_viento = 2.5;
    data.n = 50;
    data.p = 30;
    data.k = 40;
    
    return data;
}

void sendDataToServer(SensorData data) {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        http.begin(String(serverUrl) + "/api/predict");
        http.addHeader("Content-Type", "application/json");
        
        DynamicJsonDocument doc(2048);
        doc["temperatura"] = data.temperatura;
        doc["humedad"] = data.humedad;
        doc["luz"] = data.luz;
        doc["velocidad_viento"] = data.velocidad_viento;
        doc["ph"] = data.ph;
        doc["n"] = data.n;
        doc["p"] = data.p;
        doc["k"] = data.k;
        doc["lat"] = data.lat;
        doc["lon"] = data.lon;
        
        JsonArray humedadSuelo = doc.createNestedArray("humedad_suelo");
        for (int i = 0; i < NUM_ZONES; i++) {
            humedadSuelo.add(data.humedad_suelo[i]);
        }
        
        String jsonString;
        serializeJson(doc, jsonString);
        
        int httpResponseCode = http.POST(jsonString);
        
        if (httpResponseCode > 0) {
            String response = http.getString();
            DynamicJsonDocument responseDoc(2048);
            deserializeJson(responseDoc, response);
            
            if (responseDoc.containsKey("schedule")) {
                JsonArray schedule = responseDoc["schedule"]["schedule"].as<JsonArray>();
                for (JsonVariant v : schedule) {
                    int zoneId = v["zone_id"].as<int>();
                    unsigned long duration = v["duration_minutes"].as<unsigned long>() * 60000;
                    startZoneIrrigation(zoneId, duration);
                }
            }
        }
        
        http.end();
    }
}

float readTemperature() {
    // Implement temperature sensor reading
    return 25.0; // Mock value
}

float readHumidity() {
    // Implement humidity sensor reading
    return 65.0; // Mock value
}

float readPH() {
    // Implement pH sensor reading
    return 6.5; // Mock value
}
