// Shared helpers for the serverless functions. Files starting with "_" are
// not exposed as routes by Vercel.
import { pm25ToApi } from '../js/aqi.js';
import { STATIONS } from './_stations.js';

const DOE_BASE = 'https://eqms.doe.gov.my/api3/publicportalapims/';
const NEA_PSI = 'https://api-open.data.gov.sg/v2/real-time/api/psi';
const UA = 'Mozilla/5.0 (compatible; jerebu/1.0; +https://github.com/stanleynwl/jerebu)';

export async function fetchDoe(path) {
  const r = await fetch(DOE_BASE + path, {
    headers: { Accept: 'application/json', 'User-Agent': UA, Referer: 'https://eqms.doe.gov.my/APIMS/main' },
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

// ---------- Singapore (NEA via data.gov.sg) ----------
// Singapore's five PSI regions become "stations" of a pseudo-state 99. NEA
// publishes the real 24-hour PM2.5, so those carry `pm25` as well as the PSI.
export const SG_STATE = 99;
const SG_REGIONS = [
  ['central', 'Central', 1.35735, 103.82], ['north', 'North', 1.41803, 103.82], ['east', 'East', 1.35735, 103.94],
  ['west', 'West', 1.35735, 103.7], ['south', 'South', 1.29587, 103.82],
];
const sgStation = ([key, name, lat, lon]) => ({ id: 'SG-' + key, name, state: 'Singapore', stateId: SG_STATE, lat, lon });

async function fetchNea(query = '') {
  const r = await fetch(NEA_PSI + query, { headers: { Accept: 'application/json', 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('NEA → ' + r.status);
  const j = await r.json();
  if (!j.data?.items) throw new Error('NEA: unexpected payload');
  return j.data;
}

export async function fetchSingapore() {
  const d = await fetchNea();
  const item = d.items[0];
  const R = item.readings;
  const stations = SG_REGIONS.map((reg) => ({
    ...sgStation(reg),
    api: R.psi_twenty_four_hourly?.[reg[0]] ?? null,
    pm25: R.pm25_twenty_four_hourly?.[reg[0]] ?? null,
  }));
  if (!stations.some((s) => s.api != null)) throw new Error('NEA returned no readings');
  return { recordTime: item.timestamp.slice(0, 19), stations };
}

// last ~24 h of 24-hour PSI per region (today + yesterday, Singapore time)
export async function singaporeTrend() {
  const day = (offset) => new Date(Date.now() + 8 * 3600e3 - offset * 86400e3).toISOString().slice(0, 10);
  const days = await Promise.allSettled([fetchNea('?date=' + day(1)), fetchNea('?date=' + day(0))]);
  const series = {};
  for (const r of days) {
    if (r.status !== 'fulfilled') continue;
    for (const item of r.value.items) {
      const psi = item.readings.psi_twenty_four_hourly || {};
      for (const [key] of SG_REGIONS) {
        if (psi[key] != null) (series['SG-' + key] ||= []).push([item.timestamp.slice(0, 19), psi[key]]);
      }
    }
  }
  for (const k in series) series[k] = series[k].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-25);
  return series;
}

// ---------- modelled fallbacks (Open-Meteo / CAMS) ----------
// 24 h mean PM2.5 at each point, in one request
async function openMeteoPm25(points) {
  const lat = points.map((s) => s.lat.toFixed(4)).join(',');
  const lon = points.map((s) => s.lon.toFixed(4)).join(',');
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
    '&hourly=pm2_5&past_days=1&forecast_days=1&timezone=Asia%2FKuala_Lumpur';
  const r = await fetch(url, { signal: AbortSignal.timeout(9000) });
  if (!r.ok) throw new Error('open-meteo ' + r.status);
  let j = await r.json();
  if (!Array.isArray(j)) j = [j];
  const now = mytHour().slice(0, 16);
  let recordTime = null;
  const values = points.map((_, i) => {
    const h = j[i]?.hourly;
    if (!h) return null;
    const idx = h.time.findLastIndex((t) => t <= now);
    const win = h.pm2_5.slice(Math.max(0, idx - 23), idx + 1).filter((v) => v != null);
    if (!recordTime && idx >= 0) recordTime = h.time[idx] + ':00';
    return win.length ? win.reduce((a, b) => a + b, 0) / win.length : null;
  });
  return { recordTime, values };
}

// when DOE is down: modelled PM2.5 at each DOE station, converted to an API
export async function openMeteoFallback() {
  const { recordTime, values } = await openMeteoPm25(STATIONS);
  return { recordTime, stations: STATIONS.map((s, i) => ({ ...s, api: values[i] == null ? null : Math.round(pm25ToApi(values[i])) })) };
}

// when NEA is down: modelled PM2.5 for the five Singapore regions
export async function singaporeFallback() {
  const pts = SG_REGIONS.map(sgStation);
  const { recordTime, values } = await openMeteoPm25(pts);
  return {
    recordTime,
    stations: pts.map((s, i) => ({ ...s, pm25: values[i] == null ? null : Math.round(values[i]), api: values[i] == null ? null : Math.round(pm25ToApi(values[i])) })),
  };
}

// Current hour in Malaysia time as "YYYY-MM-DDTHH:00:00".
export function mytHour() {
  return new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 13) + ':00:00';
}
