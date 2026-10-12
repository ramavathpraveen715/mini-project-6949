require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const DATASET_PATH = process.env.DATASET_PATH || 'C:\\Users\\Praveen\\OneDrive\\Documents\\Smart_Farming_Crop_Yield_2024.csv';
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'farmsense';
let mongoClient;
let readings;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

let latestData = {
  temp: 28.5,
  humidity: 65,
  soil: 55,
  light: 75,
  rain: 0,
  ts: new Date().toISOString()
};

function parseCsvLine(line) {
  const values = [];
  let value = '';
  let quoted = false;
  for (const character of line) {
    if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) {
      values.push(value.trim());
      value = '';
    } else value += character;
  }
  values.push(value.trim());
  return values;
}

function solveLinearSystem(matrix, values) {
  const size = values.length;
  const augmented = matrix.map((row, index) => [...row, values[index]]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    if (Math.abs(augmented[column][column]) < 1e-10) continue;
    for (let row = column + 1; row < size; row += 1) {
      const ratio = augmented[row][column] / augmented[column][column];
      for (let cell = column; cell <= size; cell += 1) augmented[row][cell] -= ratio * augmented[column][cell];
    }
  }
  const solution = Array(size).fill(0);
  for (let row = size - 1; row >= 0; row -= 1) {
    let remainder = augmented[row][size];
    for (let column = row + 1; column < size; column += 1) remainder -= augmented[row][column] * solution[column];
    solution[row] = Math.abs(augmented[row][row]) < 1e-10 ? 0 : remainder / augmented[row][row];
  }
  return solution;
}

function trainFullModel() {
  const lines = fs.readFileSync(DATASET_PATH, 'utf8').trim().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift());
  const yieldIndex = headers.indexOf('yield_kg_per_hectare');
  const selectedFeatures = ['temperature_C', 'humidity_%', 'soil_moisture_%', 'sunlight_hours', 'rainfall_mm'];
  const excluded = new Set(headers.filter(header => !selectedFeatures.includes(header)).concat('yield_kg_per_hectare'));
  const categorical = new Set();
  const dateColumns = new Set();
  const rows = lines.map(parseCsvLine).filter(row => Number.isFinite(Number(row[yieldIndex])));
  const featureColumns = headers.filter(header => !excluded.has(header));
  const categories = Object.fromEntries(featureColumns.filter(column => categorical.has(column)).map(column => [column, [...new Set(rows.map(row => row[headers.indexOf(column)]))]]));
  const rawFeatures = row => featureColumns.flatMap(column => {
    const value = row[headers.indexOf(column)];
    if (categorical.has(column)) return categories[column].map(category => value === category ? 1 : 0);
    if (dateColumns.has(column)) return [Number.isFinite(Date.parse(value)) ? Date.parse(value) / 86400000 : 0];
    return [Number.isFinite(Number(value)) ? Number(value) : 0];
  });
  const points = rows.map(row => ({ features: rawFeatures(row), yield: Number(row[yieldIndex]) }));
  if (points.length < 2) throw new Error('Dataset does not contain enough numeric rows to train');

  const featureCount = points[0].features.length;
  const means = Array(featureCount).fill(0).map((_, index) => points.reduce((sum, point) => sum + point.features[index], 0) / points.length);
  const deviations = Array(featureCount).fill(0).map((_, index) => Math.sqrt(points.reduce((sum, point) => sum + (point.features[index] - means[index]) ** 2, 0) / points.length) || 1);
  const scaled = points.map(point => [1, ...point.features.map((value, index) => (value - means[index]) / deviations[index])]);
  const matrixSize = featureCount + 1;
  const matrix = Array(matrixSize).fill(0).map(() => Array(matrixSize).fill(0));
  const vector = Array(matrixSize).fill(0);
  scaled.forEach((row, index) => row.forEach((value, column) => {
    vector[column] += value * points[index].yield;
    row.forEach((other, otherColumn) => { matrix[column][otherColumn] += value * other; });
  }));
  for (let index = 1; index < matrixSize; index += 1) matrix[index][index] += 0.1;
  const coefficients = solveLinearSystem(matrix, vector);
  const predict = input => {
    const raw = rawFeatures(input);
    return coefficients[0] + raw.reduce((sum, value, index) => sum + coefficients[index + 1] * ((value - means[index]) / deviations[index]), 0);
  };
  const residuals = points.map(point => point.yield - (coefficients[0] + point.features.reduce((sum, value, index) => sum + coefficients[index + 1] * ((value - means[index]) / deviations[index]), 0)));
  const meanYield = points.reduce((sum, point) => sum + point.yield, 0) / points.length;
  const ssRes = residuals.reduce((sum, residual) => sum + residual ** 2, 0);
  const ssTot = points.reduce((sum, point) => sum + (point.yield - meanYield) ** 2, 0);

  return {
    feature: featureColumns,
    featureCount,
    target: 'yield_kg_per_hectare',
    rows: points.length,
    r2: 1 - ssRes / ssTot,
    mae: residuals.reduce((sum, residual) => sum + Math.abs(residual), 0) / residuals.length,
    minYield: Math.min(...points.map(point => point.yield)),
    maxYield: Math.max(...points.map(point => point.yield)),
    defaults: headers.reduce((result, header, index) => {
      if (!excluded.has(header)) result[header] = rows[0][index];
      return result;
    }, {}),
    predict
  };
}

let model;
try {
  model = trainFullModel();
  console.log(`Trained full-feature model with ${model.rows} rows from ${DATASET_PATH}`);
} catch (error) {
  console.error(`Model training failed: ${error.message}`);
  process.exitCode = 1;
}

function buildGuidance(data) {
  const temp = Number(data.temp);
  const humidity = Number(data.humidity);
  const soil = Number(data.soil);
  const rain = Number(data.rain);
  const predictionInput = { ...model.defaults, ...data, 'humidity_%': humidity, 'soil_moisture_%': soil, 'temperature_C': Number(data.temp), 'rainfall_mm': rain };
  const prediction = model ? model.predict(predictionInput) : null;
  const alerts = [];
  const precautions = [];
  let irrigation = 'OFF';
  const conditions = [];

  const addCondition = (name, value, unit, good, title, recommendation) => {
    conditions.push({ name, value, unit, state: good ? 'Good' : 'Attention', title, recommendation });
    alerts.push({ level: good ? 'good' : 'warning', title, text: recommendation });
  };

  addCondition('Temperature', temp, '°C', temp >= 15 && temp <= 32,
    temp < 15 || temp > 32 ? 'Temperature needs attention' : 'Temperature is good',
    temp < 15 ? 'Protect crops from cold stress.' : temp > 32 ? 'Add shade and check plant heat stress.' : 'No temperature action needed.');
  addCondition('Humidity', humidity, '%', humidity >= 45 && humidity <= 80,
    humidity < 45 || humidity > 80 ? 'Humidity needs attention' : 'Humidity is good',
    humidity < 45 ? 'Inspect leaves and check soil for water loss.' : humidity > 80 ? 'Improve airflow and avoid wetting leaves.' : 'Humidity is suitable.');
  addCondition('Soil moisture', soil, '%', soil >= 35 && soil <= 75,
    soil < 35 || soil > 75 ? 'Soil moisture needs attention' : 'Soil moisture is good',
    soil < 35 ? 'Irrigation may be needed.' : soil > 75 ? 'Pause irrigation and check drainage.' : 'Soil moisture is suitable.');
  addCondition('Light', Number(data.light), '%', Number(data.light) >= 25 && Number(data.light) <= 95,
    Number(data.light) < 25 || Number(data.light) > 95 ? 'Light needs attention' : 'Light is good',
    Number(data.light) < 25 ? 'Check shading and plant light exposure.' : Number(data.light) > 95 ? 'Use shade protection during strong sunlight.' : 'Light exposure is suitable.');
  addCondition('Rain', rain, '%', rain < 70,
    rain >= 70 ? 'Rain risk is high' : 'Rain risk is low',
    rain >= 70 ? 'Delay irrigation and check drainage.' : 'Rain is unlikely to interrupt irrigation.');

  if (humidity < 45) {
    alerts.push({ level: 'warning', title: 'Low humidity', text: 'Crop water loss may increase.' });
    precautions.push('Inspect leaves for wilting and check soil before irrigating.');
  } else if (humidity > 80) {
    alerts.push({ level: 'warning', title: 'High humidity', text: 'Fungal disease risk is elevated.' });
    precautions.push('Improve airflow and avoid wetting leaves.');
  } else alerts.push({ level: 'good', title: 'Humidity is in range', text: 'Conditions are suitable for most crops.' });

  if (soil < 35 && rain < 40 && humidity < 80) {
    irrigation = 'ON';
    alerts.push({ level: 'action', title: 'Irrigation recommended', text: 'Soil is dry and rain is unlikely.' });
    precautions.push('Run the pump briefly, then recheck soil moisture.');
  } else if (soil < 35) {
    alerts.push({ level: 'warning', title: 'Dry soil detected', text: 'Check rain forecast before watering.' });
    precautions.push('Do not irrigate automatically while humidity or rain risk is high.');
  }

  return {
    prediction: Number.isFinite(prediction) ? Math.min(model.maxYield, Math.max(model.minYield, prediction)) : null,
    irrigation,
    alerts,
    precautions,
    conditions,
    explanation: 'Decisions use temperature, humidity, soil moisture, light, and rain readings from the live dashboard.'
  };
}

app.get('/api/data', (req, res) => {
  res.json({ ...latestData, guidance: buildGuidance(latestData) });
});

app.get('/api/model', (req, res) => {
  if (!model) return res.status(503).json({ error: 'Model is not available' });
  res.json({
    feature: model.feature,
    target: model.target,
    rows: model.rows,
    r2: model.r2,
    mae: model.mae,
    featureCount: model.featureCount,
    excluded: ['region', 'farm_id', 'sensor_id', 'timestamp', 'yield_kg_per_hectare', 'all other dataset columns'],
    dataset: DATASET_PATH
  });
});

app.post('/api/data', async (req, res) => {
  const incoming = req.body || {};

  const nextData = {
    temp: Number(incoming.temp ?? latestData.temp),
    humidity: Number(incoming.humidity ?? latestData.humidity),
    soil: Number(incoming.soil ?? latestData.soil),
    light: Number(incoming.light ?? latestData.light),
    rain: Number(incoming.rain ?? latestData.rain),
    ts: new Date().toISOString()
  };

  try {
    if (readings) await readings.insertOne({ ...nextData, ts: new Date(nextData.ts) });
    latestData = nextData;
    res.status(200).json({ status: 'ok', receivedAt: latestData.ts });
  } catch (error) {
    console.error(`Failed to save telemetry reading: ${error.message}`);
    res.status(503).json({ error: 'Unable to save telemetry reading' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

async function startServer() {
  if (MONGODB_URI) {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const database = mongoClient.db(MONGODB_DB);
    readings = database.collection('readings');
    await readings.createIndex({ ts: -1 });

    const latestReading = await readings.findOne({}, { sort: { ts: -1 } });
    if (latestReading) {
      latestData = {
        temp: latestReading.temp,
        humidity: latestReading.humidity,
        soil: latestReading.soil,
        light: latestReading.light,
        rain: latestReading.rain,
        ts: new Date(latestReading.ts).toISOString()
      };
    }
    console.log(`Connected to MongoDB database "${MONGODB_DB}"`);
  } else {
    console.warn('MONGODB_URI is not set; telemetry will only be kept in memory.');
  }

  app.listen(PORT, () => {
    console.log(`Farm telemetry server running at http://localhost:${PORT}`);
  });
}

startServer().catch(async error => {
  console.error(`Failed to start telemetry server: ${error.message}`);
  if (mongoClient) await mongoClient.close();
  process.exitCode = 1;
});
