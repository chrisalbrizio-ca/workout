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

// === Workout day switching ===
document.querySelectorAll('.workout-day-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.workout-day-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.workout-day').forEach(div => div.style.display = 'none');
    const day = btn.dataset.day;
    const target = document.getElementById(`workout-${day}`);
    if (target) target.style.display = 'block';
  };
});

// Save workout progress
const saveWorkoutBtn = document.getElementById('save-workout');
if (saveWorkoutBtn) {
  saveWorkoutBtn.onclick = () => {
    const checked = [];
    document.querySelectorAll('.workout-day input[type="checkbox"]:checked').forEach(cb => {
      checked.push(cb.parentElement.textContent.trim());
    });
    localStorage.setItem('gp_workout_progress', JSON.stringify(checked));
    const status = document.getElementById('workout-status');
    if (status) status.textContent = 'Workout progress saved ✓';
  };
}

// Body Metrics
const saveMetricsBtn = document.getElementById('save-metrics');
if (saveMetricsBtn) {
  saveMetricsBtn.onclick = () => {
    const metrics = {
      weight: document.getElementById('metric-weight').value,
      bodyfat: document.getElementById('metric-bodyfat').value,
      trt: document.getElementById('metric-trt').value,
      notes: document.getElementById('metric-notes').value,
      date: new Date().toISOString()
    };
    localStorage.setItem('gp_body_metrics', JSON.stringify(metrics));
    const status = document.getElementById('metrics-status');
    if (status) status.textContent = 'Metrics saved ✓';
  };
}

// Recovery advice based on Readiness
function updateRecoveryAdvice(score) {
  const adviceEl = document.getElementById('recovery-advice');
  if (!adviceEl) return;

  let html = '';
  if (!score || score < 70) {
    html = `<p style="color:#f87171;">Low Readiness — Focus on sleep, light walks, and recovery. Consider a deload day.</p>`;
  } else if (score < 85) {
    html = `<p style="color:#facc15;">Moderate Readiness — Solid day for training. Prioritize sleep and nutrition.</p>`;
  } else {
    html = `<p style="color:#4ade80;">High Readiness — Excellent day to push hard in the gym.</p>`;
  }
  adviceEl.innerHTML = html;
}

// Hook recovery updates into Oura refresh
const originalUpdateDashboard = updateDashboard;
updateDashboard = function(data) {
  originalUpdateDashboard(data);
  if (data.readiness && data.readiness.score) {
    const recEl = document.getElementById('recovery-score');
    if (recEl) recEl.textContent = data.readiness.score;
    updateRecoveryAdvice(data.readiness.score);
  }
};

window.addEventListener('DOMContentLoaded', init);