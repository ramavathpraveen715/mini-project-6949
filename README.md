# FarmSense Farm Condition Monitor

This project contains:

- ESP32 embedded firmware example for sensor reading and cloud upload
- Frontend dashboard example for displaying farm telemetry
- Cloud integration guidance for Firebase Realtime Database
- A model trained from temperature, humidity, soil moisture, light, and rain fields in `Smart_Farming_Crop_Yield_2024.csv`
- Farmer-facing yield guidance, precautions, and conservative irrigation automation recommendations
- A responsive mobile dashboard

## Project Structure

- `arduino/esp32_farm_monitor.ino` — ESP32 Arduino sketch
- `frontend/index.html` — Dashboard UI
- `frontend/style.css` — Dashboard styling
- `frontend/app.js` — Dashboard logic and data simulation
- `backend/server.js` — Local Express server for development
- `package.json` — Project dependencies and run scripts

---

## 1. Hardware Required

- ESP32 development board
- DHT11 or DHT22 sensor
- Soil moisture sensor module
- Relay module
- Water pump (optional)
- Jumper wires and breadboard
- 5V power supply

## 2. Circuit Connections

### DHT11 / DHT22
- VCC -> 3.3V
- GND -> GND
- DATA -> GPIO 4

### Soil Moisture Sensor
- VCC -> 3.3V
- GND -> GND
- AOUT -> GPIO 34

### Relay Module
- VCC -> 5V
- GND -> GND
- IN -> GPIO 26

---

## 3. Embedded Firmware

Open `arduino/esp32_farm_monitor.ino` in Arduino IDE, update your Wi-Fi credentials, and flash to ESP32.

## 4. Cloud Integration

Telemetry can be stored in MongoDB. Configure a MongoDB connection string as described below; the dashboard and ESP32 continue using the same backend API.

## 5. Dashboard

Open `frontend/index.html` in a browser or run the local server and open `http://localhost:3000`.

---

## 6. Local Development

Install dependencies:

```bash
npm install
```

Run the local dashboard server:

```bash
npm start
```

Then open `http://localhost:3000`.

The server trains at startup using `C:\Users\Praveen\OneDrive\Documents\Smart_Farming_Crop_Yield_2024.csv`. To use another file, set `DATASET_PATH` before starting Node. Training uses the five requested numeric fields: `temperature_C`, `humidity_%`, `soil_moisture_%`, `sunlight_hours`, and `rainfall_mm`. The dashboard maps these to Temperature, Humidity, Soil Moisture, Light, and Rain decisions.

### MongoDB setup

1. Create a MongoDB database (MongoDB Atlas or a local MongoDB server) and copy its connection string.
2. Copy `.env.example` to `.env` and set `MONGODB_URI` to that connection string. Set `MONGODB_DB` if you want a database name other than `farmsense`.
3. Start the backend with `npm start`.

The backend saves each `POST /api/data` telemetry reading in the `readings` collection and loads the most recent reading on startup. Keep `.env` private and do not commit your connection string. Without `MONGODB_URI`, the server runs in demo mode and keeps readings in memory only.

Each live reading is classified as Good or Attention. The dashboard recommends precautions for temperature stress, humidity disease risk, dry or saturated soil, low or excessive light, and high rain risk. Irrigation is recommended only when soil is below 35%, rain is below 40%, and humidity is below 80%.

The dashboard does not silently turn on hardware. It recommends `Pump ON` only when soil moisture is below 35%, rain is below 40%, and humidity is below 80%; an ESP32 or relay integration can consume that decision after electrical and safety checks.

---

## 7. Notes

- The dashboard reads the latest telemetry from the backend at `GET /api/data`.
- Sensor devices should send JSON readings to `POST /api/data`; MongoDB persistence is enabled when `MONGODB_URI` is configured.
- The MongoDB connection string belongs in the ignored `.env` file, not in frontend code or firmware.
