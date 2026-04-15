const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json()); // Parse JSON bodies

let latestData = { temp: 0, humidity: 0, soil: 0, light: 0 };

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.post('/api/data', (req, res) => {
  latestData = req.body;
  console.log('Received ESP32 data:', latestData);
  res.sendStatus(200);
});

app.get('/api/data', (req, res) => {
  res.json({
    ...latestData,
    irrigation: latestData.soil < 2000,
    stress: latestData.temp > 35 ? 'HIGH' : 'NORMAL'
  });
});

app.listen(port, () => {
  console.log(`Dashboard server running at http://localhost:${port}`);
});
