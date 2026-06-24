// Oura Integration - Clean & Simple
const OURA_KEY = 'gp_oura_token';

export function getOuraToken() {
  return localStorage.getItem(OURA_KEY) || '';
}

export function saveOuraToken(token) {
  localStorage.setItem(OURA_KEY, token.trim());
}

const PROXY_URL = 'https://oura-proxy.chrisalbrizio.workers.dev';

export async function fetchOuraData(force = false) {
  const token = getOuraToken();
  if (!token) {
    return { error: 'No token saved' };
  }

  const cacheKey = 'gp_oura_cache';
  const cached = JSON.parse(localStorage.getItem(cacheKey) || '{}');

  if (!force && cached.timestamp && (Date.now() - cached.timestamp < 3600000)) {
    return cached.data;
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const d30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const proxyRes = await fetch(
      `${PROXY_URL}/v2/usercollection/daily_readiness?start_date=${d30}&end_date=${today}`,
      {
        headers: {
          'X-Oura-Token': token,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!proxyRes.ok) {
      const errorText = await proxyRes.text();
      throw new Error(`Proxy error: ${proxyRes.status} - ${errorText}`);
    }

    const readinessData = await proxyRes.json();
    const latestReadiness = readinessData.data?.slice(-1)[0] || null;

    const data = {
      readiness: latestReadiness,
      lastSync: new Date().toISOString()
    };

    localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
    return data;

  } catch (e) {
    console.error('Oura fetch failed:', e);
    return { error: e.message, cached: cached.data || null };
  }
}