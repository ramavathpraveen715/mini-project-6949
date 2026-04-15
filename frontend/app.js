const firebaseUrl = "https://your-project.firebaseio.com/data.json";
const apiUrl = window.location.origin + '/api/data';

function updateDashboard(data) {
  document.getElementById('temp').innerText = data.temp.toFixed(1);
  document.getElementById('hum').innerText = data.humidity.toFixed(1);
  document.getElementById('soil').innerText = data.soil;
  document.getElementById('light').innerText = data.light;

  const irrigation = data.soil < 2000 ? 'ON' : 'OFF';
  const stress = data.temp > 35 ? 'HIGH' : 'NORMAL';

  document.getElementById('status').innerText = irrigation === 'ON' ? 'Irrigation Needed' : 'Good';
  document.getElementById('irrigation').innerText = irrigation;
  document.getElementById('stress').innerText = stress;
}

async function fetchData() {
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    updateDashboard(data);
  } catch (error) {
    console.error('Dashboard fetch failed', error);
  }
}

fetchData();
setInterval(fetchData, 5000);
