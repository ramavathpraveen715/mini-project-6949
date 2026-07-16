/**
 * ESP32 SIMULATOR - Sends test sensor data to the backend
 * Run: node test-esp32-simulator.js
 */

const http = require('http');

const SERVER_URL = 'http://localhost:3000/api/data';

// Simulate real sensor values with slight variations
let baseTemp = 28.5;
let baseHumidity = 65;
let baseSoil = 55;
let baseLight = 75;
let baseRain = 0;

function generateSensorData() {
  // Add realistic fluctuations
  const temp = baseTemp + (Math.random() - 0.5) * 2;  // ±1°C variation
  const humidity = Math.max(30, Math.min(90, baseHumidity + (Math.random() - 0.5) * 5));
  const soil = Math.max(0, Math.min(100, baseSoil + (Math.random() - 0.5) * 10));
  const light = Math.max(0, Math.min(100, baseLight + (Math.random() - 0.5) * 15));
  const rain = baseRain;

  return {
    temp: parseFloat(temp.toFixed(1)),
    humidity: parseFloat(humidity.toFixed(1)),
    soil: Math.round(soil),
    light: Math.round(light),
    rain: Math.round(rain)
  };
}

function sendData() {
  const data = generateSensorData();
  const payload = JSON.stringify(data);

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/data',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`✅ [${new Date().toLocaleTimeString()}] Sent: ${JSON.stringify(data)} | Status: ${res.statusCode}`);
  });

  req.on('error', (e) => {
    console.error(`❌ Error: ${e.message}`);
  });

  req.write(payload);
  req.end();
}

console.log('🤖 ESP32 Simulator Started');
console.log('📡 Sending data to: http://localhost:3000/api/data');
console.log('🌐 Open dashboard: http://localhost:3000');
console.log('⏱️  Sending every 5 seconds...\n');

// Send data every 5 seconds
setInterval(sendData, 5000);

// Send first data immediately
sendData();
