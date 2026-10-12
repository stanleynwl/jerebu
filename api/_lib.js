// Shared helpers for the serverless functions. Files starting with "_" are
// not exposed as routes by Vercel.
import { pm25ToApi } from '../js/aqi.js';
import { STATIONS } from './_stations.js';

const DOE_BASE = 'https://eqms.doe.gov.my/api3/publicportalapims/';

export async function fetchDoe(path) {
  const r = await fetch(DOE_BASE + path, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; jerebu/1.0; +https://github.com/stanleynwl/jerebu)',
      Referer: 'https://eqms.doe.gov.my/APIMS/main',
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`DOE ${path} → ${r.status}`);
  return r.json();
}

// "Batu Muda, W.P. KUALA LUMPUR" → "Batu Muda"; "JOHAN SETIA" → "Johan Setia"
export function prettyName(loc) {
  const head = String(loc || '').split(',')[0].trim();
  return head === head.toUpperCase() ? head.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : head;
}

export function normalizeDoe(rows) {
  const stations = rows.map((r) => ({
    id: r.STATION_ID,
    name: prettyName(r.STATION_LOCATION),
    state: r.STATE_NAME,
    stateId: r.STATE_ID,
    lat: +r.LATITUDE,
    lon: +r.LONGITUDE,
    api: r.API == null ? null : +r.API,
  }));
  const times = rows.map((r) => r.RECORD_DT).filter(Boolean).sort();
  return { recordTime: times[times.length - 1] || null, stations };
}

// Modelled fallback when DOE is down: Open-Meteo (CAMS) PM2.5 at
// each DOE station, averaged over the last 24 h and converted to an API.
export async function openMeteoFallback() {
  const lat = STATIONS.map((s) => s.lat.toFixed(4)).join(',');
  const lon = STATIONS.map((s) => s.lon.toFixed(4)).join(',');
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
    '&hourly=pm2_5&past_days=1&forecast_days=1&timezone=Asia%2FKuala_Lumpur';
  const r = await fetch(url, { signal: AbortSignal.timeout(9000) });
  if (!r.ok) throw new Error('open-meteo ' + r.status);
  let j = await r.json();
  if (!Array.isArray(j)) j = [j];
  const nowMyt = mytHour();
  let recordTime = null;
  const stations = STATIONS.map((s, i) => {
    const h = j[i]?.hourly;
    if (!h) return { ...s, api: null };
    const idx = h.time.findLastIndex((t) => t <= nowMyt.slice(0, 16));
    const win = h.pm2_5.slice(Math.max(0, idx - 23), idx + 1).filter((v) => v != null);
    if (!recordTime && idx >= 0) recordTime = h.time[idx] + ':00';
    const mean = win.reduce((a, b) => a + b, 0) / (win.length || 1);
    return { ...s, api: win.length ? Math.round(pm25ToApi(mean)) : null };
  });
  return { recordTime, stations };
}

// Current hour in Malaysia time as "YYYY-MM-DDTHH:00:00".
export function mytHour() {
  return new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 13) + ':00:00';
}
