const express = require('express');
const path = require('path');
const os = require('os');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // Parse JSON bodies

// Initialize with demo data so dashboard has something to show
let latestData = { 
  temp: 28.5, 
  humidity: 65, 
  soil: 55, 
  light: 75, 
  rain: 0, 
  alerts: [],
  lastUpdate: new Date().toISOString()
};
let dataHistory = [];
const maxHistory = 5;
let espConnected = false;

function detectAnomalies(newData) {
  const alerts = [];
  if (dataHistory.length > 0) {
    const prev = dataHistory[dataHistory.length - 1];
    if (Math.abs(newData.temp - prev.temp) > 5) {
      alerts.push(`Sudden temperature change: ${newData.temp}°C (was ${prev.temp}°C)`);
    }
    if (Math.abs(newData.humidity - prev.humidity) > 20) {
      alerts.push(`Humidity spike/drop: ${newData.humidity}% (was ${prev.humidity}%) - Possible rain or ventilation issue`);
    }
    if (Math.abs(newData.soil - prev.soil) > 30) {
      alerts.push(`Soil moisture change: ${newData.soil}% (was ${prev.soil}%) - Check irrigation`);
    }
    if (Math.abs(newData.light - prev.light) > 40) {
      alerts.push(`Sudden light change: ${newData.light}% (was ${prev.light}%) - Possible cloud cover or artificial lighting change`);
    }
  }
  return alerts;
}

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.post('/api/data', (req, res) => {
  const newData = req.body;
  const alerts = detectAnomalies(newData);
  espConnected = true;
  latestData = { ...newData, alerts, lastUpdate: new Date().toISOString(), espConnected: true };
  dataHistory.push(newData);
  if (dataHistory.length > maxHistory) dataHistory.shift();
  console.log('✅ Received ESP32 data:', latestData);
  res.sendStatus(200);
});

app.get('/api/data', (req, res) => {
  console.log('GET /api/data - Returning data (ESP32 Connected: ' + espConnected + ')');
  res.json({
    ...latestData,
    irrigation: latestData.soil <= 40,
    stress: latestData.temp > 35 ? 'HIGH' : 'NORMAL',
    espConnected: espConnected
  });
});

app.get('/api/info', (req, res) => {
  res.json({
    serverIp: getLocalIp(),
    port,
    message: 'Connect your mobile to the same Wi-Fi network and open the address shown.'
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    serverRunning: true,
    espConnected: espConnected,
    lastDataUpdate: latestData.lastUpdate,
    dataPoints: dataHistory.length
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log('\n========================================');
  console.log('🌾 Farm Monitor Dashboard');
  console.log('========================================');
  console.log(`📱 Dashboard: http://localhost:${port}`);
  console.log(`📱 Mobile: http://${getLocalIp()}:${port}`);
  console.log('📡 Waiting for ESP32 data on /api/data');
  console.log('========================================\n');
});
