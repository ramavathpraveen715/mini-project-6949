#include <Adafruit_Sensor.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

#define DHTPIN 4
#define DHTTYPE DHT11
#define SOIL_PIN 34
#define LIGHT_PIN 36
#define RAIN_PIN 32

const char* ssid = "a";
const char* password = "anjan2006";
const char* serverUrl = "http://192.168.56.1:3000/api/data";

DHT dht(DHTPIN, DHTTYPE);

int loopCount = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(RAIN_PIN, INPUT);
  dht.begin();

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }

  Serial.println("\nConnected to WiFi");
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());
  Serial.print("Server URL: ");
  Serial.println(serverUrl);
}

void loop() {
  loopCount++;

  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();

  int soilRaw  = analogRead(SOIL_PIN);
  int lightRaw = analogRead(LIGHT_PIN);
  int rainRaw  = analogRead(RAIN_PIN);

  // --- Debug RAW values ---
  Serial.printf(">>> RAW: Soil=%d  Light=%d  Rain=%d\n", soilRaw, lightRaw, rainRaw);

  // --- Soil Moisture ---
  // Resistive sensor: DRY = high ADC, WET = low ADC
  const int SOIL_DRY = 3000;
  const int SOIL_WET = 800;
  int soil = map(soilRaw, SOIL_DRY, SOIL_WET, 0, 100);  // 0% = dry, 100% = wet
  soil = constrain(soil, 0, 100);

  // --- Light Level ---
  // LDR: DARK = low ADC, BRIGHT = high ADC
  const int LIGHT_DARK   = 300;
  const int LIGHT_BRIGHT = 3800;
  int light = map(lightRaw, LIGHT_DARK, LIGHT_BRIGHT, 0, 100);  // 0% = dark, 100% = bright
  light = constrain(light, 0, 100);

  // --- Rain Sensor ---
  // Your module behaves like light sensor: DRY = high ADC, WET = low ADC
  // Flipped map: high RAW = dry (0%), low RAW = wet (100%)
  const int RAIN_DRY = 4095;  // tweak if needed based on RAW dry value
  const int RAIN_WET = 400;   // tweak if needed based on RAW wet value
  int rain = map(rainRaw, RAIN_DRY, RAIN_WET, 0, 100);  // 0% = dry, 100% = raining
  rain = constrain(rain, 0, 100);

  // --- DHT Sensor Output ---
  if (isnan(temp) || isnan(hum)) {
    Serial.println("Failed to read DHT sensor!");
  } else {
    Serial.printf("Temperature:    %.1f C\n", temp);
    Serial.printf("Humidity:       %.1f %%\n", hum);
  }

  Serial.printf("Soil raw:       %d\n", soilRaw);
  Serial.printf("Soil moisture:  %d%%\n", soil);
  Serial.printf("Light raw:      %d\n", lightRaw);
  Serial.printf("Light level:    %d%%\n", light);
  Serial.printf("Rain raw:       %d\n", rainRaw);
  Serial.printf("Rain level:     %d%% (0=dry, 100=raining)\n", rain);

  // --- Send Data to Server ---
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    String payload = "{\"temp\":"     + String(temp, 1)  +
                     ",\"humidity\":" + String(hum, 1)   +
                     ",\"soil\":"     + String(soil)      +
                     ",\"light\":"    + String(light)     +
                     ",\"rain\":"     + String(rain)      + "}";

    Serial.printf("Sending POST to: %s\n", serverUrl);
    Serial.printf("Payload: %s\n", payload.c_str());
    
    int httpCode = http.POST(payload);

    if (httpCode > 0) {
      Serial.printf("✅ Server POST status: %d\n", httpCode);
    } else {
      Serial.printf("❌ Server POST failed with code: %d\n", httpCode);
      Serial.printf("Error: %s\n", http.errorToString(httpCode).c_str());
    }

    http.end();
  } else {
    Serial.printf("❌ WiFi disconnected! Status: %d\n", WiFi.status());
  }

  Serial.println("----------------------------------");
  delay(5000);
}