// Malaysian API (Indeks Pencemaran Udara) helpers.
//
// The DOE publishes the API, not the raw PM2.5 concentration, so we estimate
// PM2.5 with a piecewise-linear map. API 100 sits on the Malaysian Ambient Air
// Quality Standard 2020 PM2.5 24h limit (35 µg/m³); from API 200 upwards the
// breakpoints follow the US PSI scale that Malaysia's upper bands mirror.
const BREAKS = [
  [0, 0],
  [50, 15],
  [100, 35],
  [200, 150],
  [300, 250],
  [400, 350],
  [500, 500],
];

function lerpTable(x, table, from, to) {
  if (x <= table[0][from]) return table[0][to];
  for (let i = 1; i < table.length; i++) {
    const a = table[i - 1], b = table[i];
    if (x <= b[from]) {
      const t = (x - a[from]) / (b[from] - a[from]);
      return a[to] + t * (b[to] - a[to]);
    }
  }
  const last = table[table.length - 1];
  return last[to] * (x / last[from]);
}

export const apiToPm25 = (api) => lerpTable(Math.max(0, api), BREAKS, 0, 1);
export const pm25ToApi = (pm) => lerpTable(Math.max(0, pm), BREAKS, 1, 0);

// Berkeley Earth: breathing 22 µg/m³ of PM2.5 for a day ≈ smoking 1 cigarette.
export const CIG_UGM3 = 22;
export const apiToCigs = (api) => apiToPm25(api) / CIG_UGM3;
export const cigsToApi = (c) => pm25ToApi(c * CIG_UGM3);

// DOE category bands and the colours APIMS uses on its map.
export const BANDS = [
  { max: 50, key: 'good', color: '#3b82f6' },
  { max: 100, key: 'moderate', color: '#22c55e' },
  { max: 200, key: 'unhealthy', color: '#facc15' },
  { max: 300, key: 'veryUnhealthy', color: '#f97316' },
  { max: Infinity, key: 'hazardous', color: '#dc2626' },
];

export function band(api) {
  if (api == null || Number.isNaN(api)) return { key: 'na', color: '#9ca3af' };
  return BANDS.find((b) => api <= b.max);
}

// Regions grouped the way DOE groups states (statelist REGION_ID).
export const REGIONS = [
  { key: 'north', states: [9, 2, 7, 8], anchor: [100.75, 5.35] },
  { key: 'central', states: [10, 14, 16], anchor: [101.55, 3.1] },
  { key: 'south', states: [5, 4, 1], anchor: [103.0, 2.05] },
  { key: 'east', states: [6, 11, 3], anchor: [102.75, 4.35] },
  { key: 'sarawak', states: [13], anchor: [113.2, 2.6] },
  { key: 'sabah', states: [12, 15], anchor: [116.9, 5.4] },
];

export const regionOfState = (stateId) =>
  (REGIONS.find((r) => r.states.includes(stateId)) || REGIONS[1]).key;

export function haversineKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
