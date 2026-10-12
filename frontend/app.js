zconst dashboard = {
  temp: document.getElementById('temp'),
  humidity: document.getElementById('humidity'),
  soil: document.getElementById('soil'),
  light: document.getElementById('light'),
  rain: document.getElementById('rain'),
  timestamp: document.getElementById('timestamp'),
  summary: document.getElementById('summary'),
  conditions: document.getElementById('conditions'),
  explanation: document.getElementById('explanation'),
  alerts: document.getElementById('alerts'),
  precautions: document.getElementById('precautions'),
  irrigation: document.getElementById('irrigation'),
  status: document.getElementById('status'),
  tempBar: document.getElementById('temp-bar'),
  humidityBar: document.getElementById('humidity-bar'),
  soilBar: document.getElementById('soil-bar'),
  lightBar: document.getElementById('light-bar'),
  rainBar: document.getElementById('rain-bar')
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatTimestamp(isoString) {
  if (!isoString) return 'N/A';
  return new Date(isoString).toLocaleString();
}

function setBar(element, value, min, max) {
  const percentage = ((clamp(value, min, max) - min) / (max - min)) * 100;
  element.style.width = `${Math.max(0, Math.min(percentage, 100))}%`;
}

function renderData(data) {
  const safeData = data || {};
  const temp = Number(safeData.temp ?? 0);
  const humidity = Number(safeData.humidity ?? 0);
  const soil = Number(safeData.soil ?? 0);
  const light = Number(safeData.light ?? 0);
  const rain = Number(safeData.rain ?? 0);

  dashboard.temp.textContent = `${temp.toFixed(1)}°C`;
  dashboard.humidity.textContent = `${humidity.toFixed(1)}%`;
  dashboard.soil.textContent = `${soil.toFixed(0)}%`;
  dashboard.light.textContent = `${light.toFixed(0)}%`;
  dashboard.rain.textContent = `${rain.toFixed(0)}%`;
  dashboard.timestamp.textContent = formatTimestamp(safeData.ts);
  const guidance = safeData.guidance || {};
  dashboard.explanation.textContent = guidance.explanation || 'No guidance available.';
  dashboard.irrigation.textContent = `Pump ${guidance.irrigation || 'OFF'}`;
  dashboard.irrigation.className = `action-pill ${guidance.irrigation === 'ON' ? 'on' : ''}`;
  dashboard.conditions.innerHTML = (guidance.conditions || []).map(condition =>
    `<div class="condition ${condition.state === 'Good' ? 'good' : 'attention'}"><div><strong>${condition.name}</strong><span>${condition.title}</span></div><b>${Number(condition.value).toFixed(1)}${condition.unit}</b><small>${condition.recommendation}</small></div>`).join('');
  dashboard.alerts.innerHTML = (guidance.alerts || []).map(alert =>
    `<div class="alert ${alert.level}"><strong>${alert.title}</strong><span>${alert.text}</span></div>`).join('');
  dashboard.precautions.innerHTML = (guidance.precautions || ['Keep checking sensor readings.'])
    .map(item => `<li>${item}</li>`).join('');

  setBar(dashboard.tempBar, temp, 0, 45);
  setBar(dashboard.humidityBar, humidity, 0, 100);
  setBar(dashboard.soilBar, soil, 0, 100);
  setBar(dashboard.lightBar, light, 0, 100);
  setBar(dashboard.rainBar, rain, 0, 100);

  const summary = [
    temp > 32 ? 'High temperature alert.' : 'Temperature is stable.',
    humidity < 40 ? 'Low humidity risk.' : humidity > 80 ? 'Humidity is high.' : 'Humidity is within range.',
    soil < 35 ? 'Soil moisture needs attention.' : 'Soil moisture looks healthy.',
    light < 25 ? 'Lower light exposure today.' : 'Light levels look adequate.'
  ].join(' ');
  dashboard.summary.textContent = summary;
  dashboard.status.textContent = 'Live';
  dashboard.status.style.background = '#e8f5e9';
  dashboard.status.style.color = '#1e7e34';
}

async function loadData() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    renderData(data);
  } catch (error) {
    dashboard.status.textContent = 'Offline';
    dashboard.status.style.background = '#ffebee';
    dashboard.status.style.color = '#c62828';
    dashboard.summary.textContent = 'Unable to reach the telemetry service. Check if the backend is running.';
  }
}

loadData();
setInterval(loadData, 5000);
