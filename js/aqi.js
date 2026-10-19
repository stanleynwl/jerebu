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
// Singapore publishes the real 24 h PM2.5; use it when we have it
export const cigsFor = (api, pm25) => (pm25 != null ? pm25 / CIG_UGM3 : api == null ? null : apiToCigs(api));
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

// States and federal territories (DOE STATE_ID), north to south, then Borneo.
// `label` is where the state's number sits on the paper map (map coords) and
// `align` is its text anchor; `anchor` is the lon/lat the leader line points to.
export const STATES = [
  { id: 9, en: 'Perlis', map: 'PERLIS', anchor: [100.25, 6.5], label: [150, 50], align: 'end' },
  { id: 2, en: 'Kedah', map: 'KEDAH', anchor: [100.6, 5.95], label: [150, 95], align: 'end' },
  { id: 7, en: 'Penang', ms: 'Pulau Pinang', map: 'PENANG', mapMs: 'P. PINANG', anchor: [100.33, 5.38], label: [150, 140], align: 'end' },
  { id: 8, en: 'Perak', map: 'PERAK', anchor: [101.0, 4.6], label: [150, 185], align: 'end' },
  { id: 10, en: 'Selangor', map: 'SELANGOR', anchor: [101.4, 3.35], label: [150, 230], align: 'end' },
  { id: 14, en: 'Kuala Lumpur', map: 'KUALA LUMPUR', anchor: [101.69, 3.14], label: [150, 275], align: 'end' },
  { id: 16, en: 'Putrajaya', map: 'PUTRAJAYA', anchor: [101.69, 2.93], label: [150, 320], align: 'end' },
  { id: 5, en: 'Negeri Sembilan', map: 'N. SEMBILAN', anchor: [102.2, 2.75], label: [150, 365], align: 'end' },
  { id: 4, en: 'Melaka', map: 'MELAKA', anchor: [102.25, 2.25], label: [150, 410], align: 'end' },
  { id: 1, en: 'Johor', map: 'JOHOR', anchor: [103.4, 2.0], label: [404, 336], align: 'start' },
  { id: 6, en: 'Pahang', map: 'PAHANG', anchor: [102.6, 3.75], label: [404, 252], align: 'start' },
  { id: 11, en: 'Terengganu', map: 'TERENGGANU', anchor: [103.0, 5.0], label: [404, 168], align: 'start' },
  { id: 3, en: 'Kelantan', map: 'KELANTAN', anchor: [102.0, 5.3], label: [404, 86], align: 'start' },
  { id: 12, en: 'Sabah', map: 'SABAH', anchor: [117.0, 5.3], label: [900, 190], align: 'middle' },
  { id: 13, en: 'Sarawak', map: 'SARAWAK', anchor: [113.2, 2.5], label: [728, 300], align: 'middle' },
  { id: 15, en: 'Labuan', map: 'LABUAN', anchor: [115.23, 5.3], label: [744, 100], align: 'middle' },
  { id: 99, en: 'Singapore', ms: 'Singapura', map: 'SINGAPORE', mapMs: 'SINGAPURA', anchor: [103.82, 1.35], label: [404, 410], align: 'start', sg: true },
];
export const SG = 99;

export const stateById = (id) => STATES.find((s) => s.id === id);

// Stations grouped into the cities people know, biggest first. Stations DOE
// adds later fall through as their own city.
const CITY_TABLE = {
  9: [['Kangar', ['CA01R']]],
  2: [['Alor Setar', ['CA03K']], ['Sungai Petani', ['CA04K']], ['Kulim', ['CA05K']], ['Langkawi', ['CA02K']]],
  7: [['George Town', ['CA08P']], ['Seberang Perai', ['CA06P', 'CA07P']], ['Balik Pulau', ['CA09P']]],
  8: [['Ipoh', ['CA11A', 'CA12A']], ['Taiping', ['CA10A']], ['Seri Manjung', ['CA13A']], ['Tanjung Malim', ['CA14A']]],
  10: [['Shah Alam', ['CA20B']], ['Petaling Jaya', ['CA19B']], ['Klang', ['CA21B']], ['Johan Setia', ['MCAQM001']], ['Banting', ['CA22B']], ['Kuala Selangor', ['CA18B']]],
  14: [['Cheras', ['CA16W']], ['Batu Muda', ['CA15W']]],
  16: [['Putrajaya', ['CA17W']]],
  5: [['Seremban', ['CA24N']], ['Nilai', ['CA23N']], ['Port Dickson', ['CA25N']]],
  4: [['Melaka City', ['CA28M'], 'Bandaraya Melaka'], ['Bukit Rambai', ['CA27M']], ['Alor Gajah', ['CA26M']]],
  1: [['Johor Bahru', ['CA33J']], ['Pasir Gudang', ['CA34J']], ['Batu Pahat', ['CA31J']], ['Kluang', ['CA32J']], ['Segamat', ['CA29J']], ['Kota Tinggi', ['CA36J']], ['Pengerang', ['CA35J']], ['Tangkak', ['CA66J']]],
  6: [['Kuantan', ['CA40C', 'CA41C']], ['Temerloh', ['CA38C']], ['Jerantut', ['CA39C']], ['Rompin', ['CA37C']]],
  11: [['Kuala Terengganu', ['CA44T']], ['Kemaman', ['CA42T']], ['Paka', ['CA43T']], ['Besut', ['CA45T']]],
  3: [['Kota Bharu', ['CA47D']], ['Tanah Merah', ['CA46D']]],
  12: [['Kota Kinabalu', ['CA50S', 'MCAQM003']], ['Sandakan', ['CA49S']], ['Tawau', ['CA48S']], ['Keningau', ['CA52S']], ['Kimanis', ['CA51S']]],
  13: [['Kuching', ['CA65Q']], ['Miri', ['CA56Q', 'CA55Q']], ['Sibu', ['CA61Q']], ['Bintulu', ['CA58Q']], ['Samarahan', ['CA64Q']], ['Serian', ['MCAQM002']], ['Sri Aman', ['CA63Q']], ['Sarikei', ['CA62Q']], ['Mukah', ['CA59Q']], ['Kapit', ['CA60Q']], ['Limbang', ['CA54Q']], ['Samalaju', ['CA57Q']]],
  15: [['Labuan', ['CA53L']]],
  99: [['Central', ['SG-central'], 'Tengah'], ['North', ['SG-north'], 'Utara'], ['East', ['SG-east'], 'Timur'], ['West', ['SG-west'], 'Barat'], ['South', ['SG-south'], 'Selatan']],
};

// → [{ key, en, ms, stations: [...], api }] for one state, api = mean of live stations
export function citiesOf(stateId, stations) {
  const inState = stations.filter((s) => s.stateId === stateId);
  const used = new Set();
  const out = [];
  for (const [en, ids, ms] of CITY_TABLE[stateId] || []) {
    const list = inState.filter((s) => ids.includes(s.id));
    if (!list.length) continue;
    list.forEach((s) => used.add(s.id));
    out.push({ key: en, en, ms: ms || en, stations: list });
  }
  for (const s of inState) if (!used.has(s.id)) out.push({ key: s.name, en: s.name, ms: s.name, stations: [s] });
  for (const c of out) {
    const ok = c.stations.filter((s) => s.api != null);
    c.api = ok.length ? ok.reduce((a, s) => a + s.api, 0) / ok.length : null;
    c.pm25 = ok.length && ok.every((s) => s.pm25 != null) ? ok.reduce((a, s) => a + s.pm25, 0) / ok.length : null;
  }
  return out;
}

export function haversineKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
