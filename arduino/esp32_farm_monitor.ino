#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

#define DHTPIN 4
#define DHTTYPE DHT11
#define SOIL_PIN 34
#define LDR_PIN 35
#define RELAY_PIN 26

const char* ssid = "RPL";
const char* password = "9866412253";
const char* serverUrl = "http://192.168.56.1:8080/api/data";

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(RELAY_PIN, OUTPUT);
  dht.begin();

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }

  Serial.println("\nConnected to WiFi");
}

void loop() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  int soil = analogRead(SOIL_PIN);
  int light = analogRead(LDR_PIN);

  if (isnan(temp) || isnan(hum)) {
    Serial.println("Failed to read DHT sensor!");
  } else {
    Serial.printf("Temperature: %.1f C\n", temp);
    Serial.printf("Humidity: %.1f %%\n", hum);
  }

  Serial.printf("Soil: %d\n", soil);
  Serial.printf("Light: %d\n", light);

  bool irrigationOn = soil < 2000;
  digitalWrite(RELAY_PIN, irrigationOn ? HIGH : LOW);

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    String payload = "{\"temp\":" + String(temp, 1) + ",\"humidity\":" + String(hum, 1) + ",\"soil\":" + String(soil) + ",\"light\":" + String(light) + "}";
    int httpCode = http.POST(payload);

    if (httpCode > 0) {
      Serial.printf("Server POST status: %d\n", httpCode);
    } else {
      Serial.printf("Server POST failed: %s\n", http.errorToString(httpCode).c_str());
    }
    http.end();
  }

  delay(5000);
}
