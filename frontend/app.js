const apiUrl = window.location.origin + '/api/data';

let lastAlerts = [];

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function showNotification(message) {
  console.log('Attempting to show notification:', message);
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Farm Alert', { body: message });
    console.log('Notification shown');
  } else {
    console.log('Notification not shown - permission not granted or not supported');
  }
}

function formatSoil(data) {
  if (typeof data.soil === 'number' && data.soil >= 0 && data.soil <= 100) {
    return `${data.soil}%`;
  }
  return `${data.soil}`;
}

function getSoilValue(data) {
  if (typeof data.soil === 'number' && data.soil >= 0 && data.soil <= 100) {
    return data.soil;
  }
  return 0;
}

function getLightValue(data) {
  if (typeof data.light === 'number' && data.light >= 0 && data.light <= 100) {
    return data.light;
  }
  return 50; // Default to medium light
}

function getRainValue(data) {
  if (typeof data.rain === 'number' && data.rain >= 0 && data.rain <= 100) {
    return data.rain;
  }
  return 0; // Default to no rain
}

function createAlerts(data) {
  const temp = data.temp;
  const hum = data.humidity;
  const soil = getSoilValue(data);
  const light = getLightValue(data);
  const suggestions = [];
  let alertLevel = 'NORMAL';
  let alertMessage = 'Climate conditions are stable. Monitor regularly and follow standard care.';

  if (temp >= 40) {
    alertLevel = 'CRITICAL';
    alertMessage = 'Extreme heat detected. Protect crops immediately and reduce irrigation during peak sun.';
    suggestions.push('Provide shade or drought-tolerant cover.');
    suggestions.push('Mulch the soil to retain moisture.');
    suggestions.push('Water early morning or late evening only.');
  } else if (temp >= 35) {
    alertLevel = 'WARNING';
    alertMessage = 'High temperature alert. Increase hydration and watch crop stress signs.';
    suggestions.push('Irrigate lightly and evenly.');
    suggestions.push('Avoid strong sunlight during transplanting.');
  }

  if (hum <= 30) {
    if (alertLevel !== 'CRITICAL') alertLevel = 'WARNING';
    if (alertMessage.includes('stable') || alertMessage.includes('Stable')) {
      alertMessage = 'Low humidity detected. Soil drying may increase and pests can stress plants.';
    }
    suggestions.push('Spray light misting to keep foliage cool.');
    suggestions.push('Use shade nets if available.');
  } else if (hum >= 80) {
    if (alertLevel !== 'CRITICAL') alertLevel = 'WARNING';
    alertMessage = 'High humidity detected. Watch for fungal disease and reduce overwatering.';
    suggestions.push('Improve air circulation around plants.');
    suggestions.push('Avoid overhead watering in the evening.');
  }

  if (soil !== 0) {
    if (soil <= 25) {
      alertLevel = alertLevel === 'CRITICAL' ? 'CRITICAL' : 'WARNING';
      alertMessage = 'Soil moisture is low. Irrigation needed soon to protect root health.';
      suggestions.push('Start irrigation now and monitor soil moisture.');
      suggestions.push('Add organic mulch to reduce evaporation.');
    } else if (soil >= 80) {
      if (alertLevel !== 'CRITICAL') alertLevel = 'WARNING';
      alertMessage = 'Soil is very wet. Reduce watering and check drainage.';
      suggestions.push('Pause irrigation until soil dries slightly.');
      suggestions.push('Inspect fields for waterlogging.');
    }
  }

  // Light-based alerts
  if (light <= 20) {
    if (alertLevel !== 'CRITICAL') alertLevel = 'WARNING';
    alertMessage = 'Low light conditions detected. Plant growth may be affected.';
    suggestions.push('Consider supplemental lighting for indoor plants.');
    suggestions.push('Monitor plant health for signs of etiolation.');
  } else if (light >= 90) {
    if (alertLevel !== 'CRITICAL') alertLevel = 'WARNING';
    alertMessage = 'Very bright light detected. Watch for heat stress and sunburn on leaves.';
    suggestions.push('Provide shade during peak sunlight hours.');
    suggestions.push('Ensure adequate watering to prevent dehydration.');
  }

  // Rain-based alerts
  const rain = data.rain || 0;
  if (rain <= 20) {
    alertLevel = alertLevel === 'CRITICAL' ? 'CRITICAL' : 'WARNING';
    if (alertMessage.includes('stable') || alertMessage.includes('Stable')) {
      alertMessage = 'Rain detected! Monitor for waterlogging and reduce irrigation.';
    }
    suggestions.push('Pause scheduled irrigation to prevent overwatering.');
    suggestions.push('Check field drainage and ensure no flooding.');
  }

  if (suggestions.length === 0) {
    suggestions.push('Continue regular monitoring.');
    suggestions.push('Keep water management balanced.');
  }

  return { alertLevel, alertMessage, suggestions };
}

function createActionPlan(data) {
  const temp = data.temp;
  const hum = data.humidity;
  const soil = getSoilValue(data);
  const light = getLightValue(data);
  const actions = [];
  let title = 'General crop protection actions';

  if (temp >= 40) {
    title = 'Heat protection plan';
    actions.push('Set up shade cloth for sensitive plants.');
    actions.push('Irrigate during early morning and late evening only.');
    actions.push('Use mulch to reduce soil evaporation.');
  } else if (temp >= 35) {
    title = 'High temperature care';
    actions.push('Monitor young plants for heat stress.');
    actions.push('Reduce fertilizer application until cooler conditions return.');
  }

  if (hum <= 30) {
    title = 'Dry air response';
    actions.push('Spray foliage lightly to raise humidity.');
    actions.push('Avoid long daytime irrigation sessions.');
  } else if (hum >= 80) {
    title = 'High humidity response';
    actions.push('Open vents or remove plastic covers.');
    actions.push('Inspect for fungal spots and remove affected leaves.');
  }

  if (soil <= 25) {
    title = 'Soil moisture recovery';
    actions.push('Water deeply and evenly.');
    actions.push('Add organic matter to improve water retention.');
  } else if (soil >= 80) {
    title = 'Waterlogging care';
    actions.push('Stop irrigation until soil drains.');
    actions.push('Check field drainage channels.');
  }

  // Light-based actions
  if (light <= 20) {
    title = 'Low light response';
    actions.push('Install grow lights if indoors.');
    actions.push('Thin dense canopy to allow more light penetration.');
    actions.push('Monitor for leggy growth and provide support.');
  } else if (light >= 90) {
    title = 'Bright light protection';
    actions.push('Install shade cloth during peak sun hours.');
    actions.push('Ensure plants have adequate water to prevent wilting.');
    actions.push('Consider reflective mulches to reduce heat buildup.');
  }

  // Rain-based actions
  const rain = data.rain || 0;
  if (rain <= 20) {
    title = 'Rain management';
    actions.push('Suspend all irrigation to prevent waterlogging.');
    actions.push('Monitor soil drainage systems.');
    actions.push('Watch for plant diseases in high humidity from rain.');
  }

  if (actions.length === 0) {
    actions.push('Keep monitoring farm conditions every 5 minutes.');
    actions.push('Maintain a balanced watering schedule.');
  }

  return { title, actions };
}

function updateDashboard(data) {
  document.getElementById('temp').innerText = data.temp.toFixed(1);
  document.getElementById('hum').innerText = data.humidity.toFixed(1);
  document.getElementById('soil').innerText = formatSoil(data);
  document.getElementById('light').innerText = getLightValue(data);
  document.getElementById('rain').innerText = getRainValue(data);

  // Update ESP32 connection status
  const espStatus = document.getElementById('esp-status');
  if (data.espConnected) {
    espStatus.innerText = '🟢 Connected';
    espStatus.style.color = '#22c55e';
  } else {
    espStatus.innerText = '🔴 Disconnected';
    espStatus.style.color = '#ef4444';
  }

  const soilValue = getSoilValue(data);
  const irrigation = soilValue <= 40 ? 'ON' : 'OFF';
  const stress = data.temp > 35 ? 'HIGH' : 'NORMAL';

  document.getElementById('status').innerText = irrigation === 'ON' ? 'Irrigation Needed' : 'Good';
  document.getElementById('irrigation').innerText = irrigation;
  document.getElementById('stress').innerText = stress;

  const alerts = createAlerts(data);
  const alertEl = document.getElementById('alert-level');
  alertEl.innerText = alerts.alertLevel;
  alertEl.className = `alert-pill ${alerts.alertLevel.toLowerCase()}`;
  document.getElementById('alert-message').innerText = alerts.alertMessage;

  const suggestionsEl = document.getElementById('alert-suggestions');
  suggestionsEl.innerHTML = '';
  alerts.suggestions.forEach((suggestion) => {
    const item = document.createElement('li');
    item.innerText = suggestion;
    suggestionsEl.appendChild(item);
  });

  const actionPlan = createActionPlan(data);
  document.getElementById('action-title').innerText = actionPlan.title;
  const actionList = document.getElementById('action-list');
  actionList.innerHTML = '';
  actionPlan.actions.forEach((action) => {
    const item = document.createElement('li');
    item.innerText = action;
    actionList.appendChild(item);
  });

  // Handle anomaly alerts
  const anomalyList = document.getElementById('anomaly-list');
  const anomalies = data.alerts || [];
  if (anomalies.length > 0) {
    anomalyList.innerHTML = '';
    anomalies.forEach((alert) => {
      const item = document.createElement('li');
      item.innerText = alert;
      anomalyList.appendChild(item);
    });
    // Show notification if new alerts
    if (JSON.stringify(anomalies) !== JSON.stringify(lastAlerts)) {
      console.log('New alerts detected, showing notification');
      showNotification(anomalies.join('. '));
      lastAlerts = [...anomalies];
    }
  } else {
    anomalyList.innerHTML = '<li>No anomalies detected.</li>';
    lastAlerts = [];
  }
}

async function loadMobileUrl() {
  try {
    const response = await fetch('/api/info');
    const info = await response.json();
    const mobileUrl = `http://${info.serverIp}:${info.port}`;
    const urlElement = document.getElementById('mobile-url');
    urlElement.innerText = mobileUrl;
    urlElement.href = mobileUrl;
  } catch (error) {
    const urlElement = document.getElementById('mobile-url');
    urlElement.innerText = 'Unable to detect local IP. Use the host IP on your Wi-Fi network.';
    urlElement.style.pointerEvents = 'none';
  }
}

async function fetchData() {
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Fetched data from server:', data);
    updateDashboard(data);
  } catch (error) {
    console.error('Dashboard fetch failed:', error);
  }
}

loadMobileUrl();
requestNotificationPermission();
fetchData();
setInterval(fetchData, 5000);

document.getElementById('test-notification').addEventListener('click', () => {
  showNotification('This is a test alert for sudden changes like rain detection.');
});
