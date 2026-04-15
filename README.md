# Real-Time Micro-Climate Digital Twin for Small Farm Monitoring

This project contains:

- ESP32 embedded firmware example for sensor reading and cloud upload
- Frontend dashboard example for displaying farm telemetry
- Cloud integration guidance for Firebase Realtime Database
- Local backend server to serve the dashboard

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
- Light sensor (LDR)
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

### LDR Sensor
- One side -> 3.3V
- Other side -> GPIO 35
- Fixed resistor -> GND

### Relay Module
- VCC -> 5V
- GND -> GND
- IN -> GPIO 26

---

## 3. Embedded Firmware

Open `arduino/esp32_farm_monitor.ino` in Arduino IDE, update your Wi-Fi credentials, and flash to ESP32.

## 4. Cloud Integration

Use Firebase Realtime Database for easy cloud storage. See `firebase/firebase_sample.md` for setup details.

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

---

## 7. Notes

- The dashboard currently uses simulated JSON telemetry for demonstration.
- Replace `firebaseUrl` in `frontend/app.js` with your Firebase Realtime Database URL.
- The ESP32 sketch posts JSON to Firebase using HTTP.
