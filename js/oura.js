// Oura Integration - Clean & Simple
const OURA_KEY = 'gp_oura_token';

export function getOuraToken() {
  return localStorage.getItem(OURA_KEY) || '';
}

export function saveOuraToken(token) {
  localStorage.setItem(OURA_KEY, token.trim());
}

export async function fetchOuraData(force = false) {
  const token = getOuraToken();
  if (!token) return null;

  // Simple cache (1 hour)
  const cacheKey = 'gp_oura_cache';
  const cached = JSON.parse(localStorage.getItem(cacheKey) || '{}');
  
  if (!force && cached.timestamp && (Date.now() - cached.timestamp < 3600000)) {
    return cached.data;
  }

  try {
    const headers = { 'Authorization': `Bearer ${token}` };
    const today = new Date().toISOString().slice(0, 10);
    const d30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const [readinessRes, sleepRes] = await Promise.all([
      fetch(`https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${d30}&end_date=${today}`, { headers }),
      fetch(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${d30}&end_date=${today}`, { headers })
    ]);

    if (!readinessRes.ok) throw new Error('Oura API error');

    const readiness = await readinessRes.json();
    const sleep = await sleepRes.json();

    const data = {
      readiness: readiness.data?.slice(-1)[0] || null,
      sleep: sleep.data?.slice(-1)[0] || null,
      lastSync: new Date().toISOString()
    };

    localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
    return data;
  } catch (e) {
    console.error('Oura fetch failed:', e);
    return cached.data || null;
  }
}