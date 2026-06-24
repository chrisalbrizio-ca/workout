import { getOuraToken, saveOuraToken, fetchOuraData } from './oura.js';
import { setupHealthLoader } from './health.js';

let ouraData = null;

async function init() {
  console.log('%c[Garage Protocol] Clean rebuild starting...', 'color:#666');

  // Oura Token handling (Local)
  const tokenInput = document.getElementById('oura-token');
  const saveBtn = document.getElementById('save-token');

  if (tokenInput && saveBtn) {
    tokenInput.value = getOuraToken();

    saveBtn.onclick = () => {
      saveOuraToken(tokenInput.value);
      showCloudStatus('Token saved locally ✓', 'green');
      refreshOura();
    };
  }

  // Cloud Save / Load
  const cloudPasswordInput = document.getElementById('cloud-password');
  const saveCloudBtn = document.getElementById('save-cloud');
  const loadCloudBtn = document.getElementById('load-cloud');

  const WORKER_URL = 'https://oura-proxy.chrisalbrizio.workers.dev';

  if (saveCloudBtn && cloudPasswordInput) {
    saveCloudBtn.onclick = async () => {
      const token = tokenInput.value.trim();
      const password = cloudPasswordInput.value.trim();

      if (!token || !password) {
        showCloudStatus('Please enter both token and password', 'red');
        return;
      }

      try {
        const res = await fetch(`${WORKER_URL}/save-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password })
        });

        if (res.ok) {
          showCloudStatus('Token saved to cloud ✓', 'green');
        } else {
          const err = await res.json();
          showCloudStatus('Error: ' + (err.error || 'Failed to save'), 'red');
        }
      } catch (e) {
        showCloudStatus('Network error: ' + e.message, 'red');
      }
    };
  }

  if (loadCloudBtn && cloudPasswordInput && tokenInput) {
    loadCloudBtn.onclick = async () => {
      const password = cloudPasswordInput.value.trim();
      if (!password) {
        showCloudStatus('Please enter your cloud password', 'red');
        return;
      }

      try {
        const res = await fetch(`${WORKER_URL}/load-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });

        if (res.ok) {
          const data = await res.json();
          tokenInput.value = data.token;
          saveOuraToken(data.token);
          showCloudStatus('Token loaded from cloud ✓', 'green');
          refreshOura();
        } else {
          const err = await res.json();
          showCloudStatus('Error: ' + (err.error || 'Token not found'), 'red');
        }
      } catch (e) {
        showCloudStatus('Network error: ' + e.message, 'red');
      }
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
  if (status) status.textContent = 'Syncing with Oura...';

  ouraData = await fetchOuraData(true);

  if (ouraData?.error) {
    if (status) status.textContent = `Error: ${ouraData.error}`;
    console.error('Oura error:', ouraData.error);
    return;
  }

  if (ouraData && ouraData.readiness && status) {
    status.textContent = `Last sync: ${new Date(ouraData.lastSync).toLocaleTimeString()}`;
    updateDashboard(ouraData);
  } else if (status) {
    status.textContent = 'No recent Readiness data found';
  }
}

function updateDashboard(data) {
  const readinessEl = document.getElementById('readiness-score');
  if (readinessEl && data.readiness) {
    readinessEl.textContent = data.readiness.score ?? '--';
  }

  console.log('Dashboard updated with Oura data:', data);
}

function showCloudStatus(message, color = 'white') {
  const el = document.getElementById('cloud-status');
  if (el) {
    el.textContent = message;
    el.style.color = color === 'green' ? '#4ade80' : color === 'red' ? '#f87171' : '#aaa';
  }
}

window.addEventListener('DOMContentLoaded', init);