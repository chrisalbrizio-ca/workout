import { getOuraToken, saveOuraToken, fetchOuraData } from './oura.js';
import { setupHealthLoader } from './health.js';

let ouraData = null;

async function init() {
  console.log('%c[Garage Protocol] Clean rebuild starting...', 'color:#666');

  // Oura Token handling
  const tokenInput = document.getElementById('oura-token');
  const saveBtn = document.getElementById('save-token');

  if (tokenInput && saveBtn) {
    tokenInput.value = getOuraToken();

    saveBtn.onclick = () => {
      saveOuraToken(tokenInput.value);
      alert('Token saved!');
      refreshOura();
    };
  }

  // Health Export button
  const healthBtn = document.getElementById('load-health');
  if (healthBtn) {
    const openPicker = setupHealthLoader((data) => {
      console.log('Health data loaded:', data);
      document.getElementById('health-status').textContent = 'Health data loaded successfully';
    });
    healthBtn.onclick = openPicker;
  }

  // Initial Oura load
  await refreshOura();

  // Hourly refresh
  setInterval(() => {
    if (!document.hidden) refreshOura();
  }, 60 * 60 * 1000);
}

async function refreshOura() {
  const status = document.getElementById('oura-status');
  if (status) status.textContent = 'Syncing...';

  ouraData = await fetchOuraData(true);

  if (ouraData && status) {
    status.textContent = `Last sync: ${new Date(ouraData.lastSync).toLocaleTimeString()}`;
    updateDashboard(ouraData);
  } else if (status) {
    status.textContent = 'No Oura data (check token)';
  }
}

function updateDashboard(data) {
  const readinessEl = document.getElementById('readiness-score');
  if (readinessEl && data.readiness) {
    readinessEl.textContent = data.readiness.score || '--';
  }

  // Add more UI updates here as we build
  console.log('Dashboard updated with Oura data');
}

window.addEventListener('DOMContentLoaded', init);