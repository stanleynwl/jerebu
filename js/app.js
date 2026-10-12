import { createScene } from './scene.js';
import { createMap } from './map.js';
import { REGIONS, apiToCigs, apiToPm25, band, regionOfState, haversineKm } from './aqi.js';

// ---------- copy ----------
const T = {
  en: {
    title: 'Breathing this air for 24hrs ≈',
    unit: 'cigarettes', unit1: 'cigarette',
    cap: 'worth of harm to your health',
    regionLegend: 'Region of Malaysia',
    regions: { north: 'North', central: 'Central', south: 'South', east: 'East Coast', sarawak: 'Sarawak', sabah: 'Sabah' },
    station: 'Station', allStations: 'All stations (average)',
    api: 'API now', pm: 'PM2.5 est., µg/m³', worst: 'Worst:',
    trend: 'Last 24 hours', now: 'now',
    updated: 'Updated', justNow: 'just now', minAgo: (m) => `${m} min ago`, hrAgo: (h) => `${h} h ago`,
    locate: 'Near me', simulate: 'Simulate results', aDay: 'a day', reset: 'Reset', hold: 'Hold',
    smokiest: 'Smokiest right now',
    bands: { good: 'Good', moderate: 'Moderate', unhealthy: 'Unhealthy', veryUnhealthy: 'Very unhealthy', hazardous: 'Hazardous', na: 'No data' },
    srcModel: 'Modelled PM2.5 · DOE feed down', srcSnap: 'Saved snapshot · live data unavailable',
    nearest: (n, km) => `Nearest station: ${n} (${km} km)`, locErr: 'Could not get your location',
    loadErr: 'Could not refresh — showing the last reading',
    foot: 'Cigarette maths: <a href="https://berkeleyearth.org/air-pollution-and-cigarette-equivalence/" target="_blank" rel="noopener">Berkeley Earth</a>, 22 µg/m³ PM2.5 ≈ 1 cigarette a day. PM2.5 is estimated from the official API. Data: <a href="https://eqms.doe.gov.my/APIMS/main" target="_blank" rel="noopener">Jabatan Alam Sekitar (APIMS)</a>. Satire, not medical advice. Inspired by <a href="https://secondhand.sangsara.net" target="_blank" rel="noopener">SecondHand</a> (Singapore).',
  },
  ms: {
    title: 'Menghirup udara ini selama 24 jam ≈',
    unit: 'batang rokok', unit1: 'batang rokok',
    cap: 'bersamaan kemudaratan kepada kesihatan anda',
    regionLegend: 'Wilayah Malaysia',
    regions: { north: 'Utara', central: 'Tengah', south: 'Selatan', east: 'Pantai Timur', sarawak: 'Sarawak', sabah: 'Sabah' },
    station: 'Stesen', allStations: 'Semua stesen (purata)',
    api: 'IPU kini', pm: 'Anggaran PM2.5, µg/m³', worst: 'Paling teruk:',
    trend: '24 jam lepas', now: 'kini',
    updated: 'Dikemas kini', justNow: 'baru sahaja', minAgo: (m) => `${m} minit lalu`, hrAgo: (h) => `${h} jam lalu`,
    locate: 'Dekat saya', simulate: 'Simulasi keputusan', aDay: 'sehari', reset: 'Set semula', hold: 'Tahan',
    smokiest: 'Paling berasap sekarang',
    bands: { good: 'Baik', moderate: 'Sederhana', unhealthy: 'Tidak sihat', veryUnhealthy: 'Sangat tidak sihat', hazardous: 'Berbahaya', na: 'Tiada data' },
    srcModel: 'PM2.5 model · suapan JAS terputus', srcSnap: 'Data simpanan · data langsung tiada',
    nearest: (n, km) => `Stesen terdekat: ${n} (${km} km)`, locErr: 'Lokasi anda tidak dapat dikesan',
    loadErr: 'Gagal dikemas kini — bacaan terakhir dipaparkan',
    foot: 'Kiraan rokok: <a href="https://berkeleyearth.org/air-pollution-and-cigarette-equivalence/" target="_blank" rel="noopener">Berkeley Earth</a>, 22 µg/m³ PM2.5 ≈ 1 batang rokok sehari. PM2.5 dianggarkan daripada IPU rasmi. Data: <a href="https://eqms.doe.gov.my/APIMS/main" target="_blank" rel="noopener">Jabatan Alam Sekitar (APIMS)</a>. Satira, bukan nasihat perubatan. Diilhamkan oleh <a href="https://secondhand.sangsara.net" target="_blank" rel="noopener">SecondHand</a> (Singapura).',
  },
};

// ---------- state ----------
const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};
const ui = {
  lang: store.get('jerebu.lang', (navigator.language || '').toLowerCase().startsWith('ms') ? 'ms' : 'en'),
  region: store.get('jerebu.region', 'central'),
  station: null,
  sim: null,
  near: null,
};
if (!REGIONS.some((r) => r.key === ui.region)) ui.region = 'central';

let data = null;
const trendCache = new Map();
let shown = null;

const $ = (s) => document.querySelector(s);
const t = () => T[ui.lang];
const fmt = (n) => (n == null ? '–' : n.toFixed(1));

const stage = $('#stage');
const scene = createScene(stage);
const map = createMap(stage, { onPick: (r) => { selectRegion(r); } });

// ---------- data ----------
function prettyName(loc) {
  const head = String(loc || '').split(',')[0].trim();
  return head === head.toUpperCase() ? head.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : head;
}

async function loadSnapshot() {
  const raw = await (await fetch('/data/snapshot.json')).json();
  const rows = raw.data || [];
  return {
    source: 'snapshot',
    recordTime: rows.map((r) => r.RECORD_DT).sort().pop(),
    stations: rows.map((r) => ({
      id: r.STATION_ID, name: prettyName(r.STATION_LOCATION), state: r.STATE_NAME, stateId: r.STATE_ID,
      lat: +r.LATITUDE, lon: +r.LONGITUDE, api: r.API == null ? null : +r.API,
    })),
  };
}

async function load(manual = false) {
  $('#refresh').classList.add('is-spin');
  try {
    const r = await fetch('/api/air', { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    data = await r.json();
  } catch (err) {
    console.warn('live data failed', err);
    if (!data || data.source === 'snapshot') {
      try { data = await loadSnapshot(); } catch { /* nothing to show */ }
    } else if (manual) toast(t().loadErr);
  }
  $('#refresh').classList.remove('is-spin');
  render();
  loadTrend();
}

async function loadTrend() {
  const reg = REGIONS.find((r) => r.key === ui.region);
  const key = reg.states.join(',');
  if (!trendCache.has(key)) {
    trendCache.set(key, fetch('/api/trend?states=' + key)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null));
  }
  const res = await trendCache.get(key);
  if (reg.key === ui.region) drawTrend(res);
}

// ---------- derived values ----------
const live = (s) => s.api != null;

function regionStats(key) {
  const reg = REGIONS.find((r) => r.key === key);
  const list = (data?.stations || []).filter((s) => reg.states.includes(s.stateId));
  const ok = list.filter(live);
  const avg = ok.length ? ok.reduce((a, s) => a + s.api, 0) / ok.length : null;
  const worst = ok.slice().sort((a, b) => b.api - a.api)[0] || null;
  return { list, avg, worst };
}

function liveApi() {
  if (!data) return null;
  if (ui.station) {
    const s = data.stations.find((x) => x.id === ui.station);
    if (s && live(s)) return s.api;
  }
  return regionStats(ui.region).avg;
}

// ---------- rendering ----------
function applyI18n() {
  document.documentElement.lang = ui.lang === 'ms' ? 'ms' : 'en';
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t()[el.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t()[el.dataset.i18nHtml]; });
  document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === ui.lang)));
}

let tweenId = 0;
function tweenNumber(to) {
  const el = $('#num');
  const id = ++tweenId;
  if (to == null) { el.textContent = '–'; shown = null; return; }
  const from = shown ?? 0;
  shown = to;
  if (Math.abs(to - from) < 0.05) { el.textContent = fmt(to); return; }
  const start = performance.now(), dur = 700;
  const step = (now) => {
    if (id !== tweenId) return;
    const k = Math.min(1, Math.max(0, (now - start) / dur));
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function render() {
  applyI18n();
  const L = t();
  const api = ui.sim ?? liveApi();
  const cigs = api == null ? null : apiToCigs(api);

  // hero
  tweenNumber(cigs);
  $('#unit').textContent = cigs != null && Math.abs(cigs - 1) < 0.05 ? L.unit1 : L.unit;
  document.title = cigs == null ? 'Jerebu' : `${fmt(cigs)} 🚬 · Jerebu`;

  // regions
  document.querySelectorAll('#regions button').forEach((b) => {
    const k = b.dataset.r;
    b.setAttribute('aria-pressed', String(k === ui.region));
    b.innerHTML = L.regions[k] + (ui.near === k ? ' <span class="near" title="Near you">📍</span>' : '');
  });

  // stations
  const rs = regionStats(ui.region);
  const sel = $('#station');
  sel.innerHTML = `<option value="">${L.allStations}</option>` + rs.list
    .slice().sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => `<option value="${s.id}" ${live(s) ? '' : 'disabled'}>${s.name}, ${s.state} · ${s.api ?? '–'}</option>`).join('');
  sel.value = ui.station && rs.list.some((s) => s.id === ui.station) ? ui.station : '';

  // stats
  const b = band(api);
  $('#sApi').textContent = api == null ? '–' : Math.round(api);
  $('#sBand').textContent = L.bands[b.key];
  $('#sBand').style.setProperty('--c', b.color);
  $('#sPm').textContent = api == null ? '–' : Math.round(apiToPm25(api));
  $('#sWorst').textContent = rs.worst ? rs.worst.api : '–';
  $('#sWorstName').textContent = rs.worst ? `${L.worst} ${rs.worst.name}` : '';

  // updated line + source badge
  updateAgo();
  const badge = $('#srcBadge');
  badge.hidden = !data || data.source === 'doe';
  if (data && data.source !== 'doe') badge.textContent = data.source === 'model' ? L.srcModel : L.srcSnap;

  // simulator
  const slider = $('#sim');
  if (ui.sim == null && api != null) slider.value = Math.round(api);
  $('#simLabel').textContent = cigs == null ? '' : `${fmt(cigs)} ${L.aDay}`;
  slider.style.setProperty('--p', (slider.value / 5) + '%');
  $('#reset').disabled = ui.sim == null;
  document.body.classList.toggle('is-sim', ui.sim != null);

  // ranking
  const top = (data?.stations || []).filter(live).sort((a, b2) => b2.api - a.api).slice(0, 5);
  $('#rank').innerHTML = top.map((s) => `<li><button type="button" data-id="${s.id}">
      <span class="dotc" style="--c:${band(s.api).color}"></span>
      <span class="rn">${s.name}<small>${s.state}</small></span>
      <span class="rv">${fmt(apiToCigs(s.api))} 🚬<small>API ${s.api}</small></span></button></li>`).join('');

  // scene + map
  if (api != null) scene.setLevel(api, cigs);
  const regionValues = Object.fromEntries(REGIONS.map((r) => {
    const v = regionStats(r.key).avg;
    return [r.key, v == null ? null : apiToCigs(v)];
  }));
  map.update({ stations: data?.stations || [], regionValues, selected: ui.region, names: L.regions });

  // trend highlight follows the station choice
  const reg = REGIONS.find((r) => r.key === ui.region);
  const cached = trendCache.get(reg.states.join(','));
  if (cached) cached.then((res) => { if (reg.key === ui.region) drawTrend(res); });
}

function updateAgo() {
  const L = t();
  const el = $('#updated');
  if (!data?.recordTime) { el.textContent = '…'; return; }
  const when = new Date(data.recordTime + '+08:00');
  const time = when.toLocaleTimeString(ui.lang === 'ms' ? 'ms-MY' : 'en-MY', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kuala_Lumpur' });
  const mins = Math.max(0, Math.round((Date.now() - when) / 60000));
  const ago = mins < 1 ? L.justNow : mins < 120 ? L.minAgo(mins) : L.hrAgo(Math.round(mins / 60));
  el.textContent = `${L.updated} ${time} · ${ago}`;
  $('#dot').classList.toggle('is-stale', data.source !== 'doe' || mins > 150);
}

function drawTrend(res) {
  const box = $('#trend');
  if (!res?.series || !data) { box.hidden = true; return; }
  const ids = ui.station ? [ui.station] : regionStats(ui.region).list.map((s) => s.id);
  const byT = new Map();
  for (const id of ids) {
    for (const [ts, v] of res.series[id] || []) {
      if (v == null) continue;
      const e = byT.get(ts) || [0, 0];
      e[0] += v; e[1] += 1;
      byT.set(ts, e);
    }
  }
  const pts = [...byT.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([ts, [sum, n]]) => [ts, sum / n]);
  if (pts.length < 3) { box.hidden = true; return; }
  box.hidden = false;

  const vals = pts.map((p) => p[1]);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const yMin = Math.max(0, Math.floor((lo - 10) / 10) * 10), yMax = Math.max(yMin + 40, Math.ceil((hi + 10) / 10) * 10);
  const X = (i) => (i / (pts.length - 1)) * 320;
  const Y = (v) => 60 - ((v - yMin) / (yMax - yMin)) * 54;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
  const col = band(vals[vals.length - 1]).color;
  const guides = [50, 100, 200, 300].filter((g) => g > yMin && g < yMax)
    .map((g) => `<line x1="0" x2="320" y1="${Y(g)}" y2="${Y(g)}" class="guide"/><text x="318" y="${Y(g) - 2}" class="gtxt">${g}</text>`).join('');
  $('#spark').innerHTML = `<defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".35"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
    ${guides}<path d="${line}L320,64L0,64Z" fill="url(#sg)"/><path d="${line}" fill="none" stroke="${col}" stroke-width="2" vector-effect="non-scaling-stroke"/>
    <circle cx="${X(pts.length - 1)}" cy="${Y(vals[vals.length - 1])}" r="3" fill="${col}"/>`;
  $('#trendRange').textContent = `API ${Math.round(lo)}–${Math.round(hi)}`;
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
}

// ---------- interactions ----------
function selectRegion(key, station = null) {
  ui.region = key;
  ui.station = station;
  store.set('jerebu.region', key);
  render();
  loadTrend();
}

$('#regions').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-r]');
  if (b) selectRegion(b.dataset.r);
});

$('#station').addEventListener('change', (e) => {
  ui.station = e.target.value || null;
  render();
});

$('#rank').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-id]');
  if (!b) return;
  const s = data.stations.find((x) => x.id === b.dataset.id);
  if (s) selectRegion(regionOfState(s.stateId), s.id);
});

document.querySelector('.lang').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-lang]');
  if (!b) return;
  ui.lang = b.dataset.lang;
  store.set('jerebu.lang', ui.lang);
  render();
});

$('#sim').addEventListener('input', (e) => {
  ui.sim = +e.target.value;
  render();
});
$('#reset').addEventListener('click', () => {
  ui.sim = null;
  render();
});

$('#refresh').addEventListener('click', () => {
  trendCache.clear();
  load(true);
});

$('#locate').addEventListener('click', () => {
  if (!navigator.geolocation || !data) return toast(t().locErr);
  navigator.geolocation.getCurrentPosition((pos) => {
    const me = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    const best = data.stations.filter(live)
      .map((s) => ({ s, d: haversineKm(me, s) }))
      .sort((a, b) => a.d - b.d)[0];
    if (!best) return;
    ui.near = regionOfState(best.s.stateId);
    selectRegion(ui.near, best.s.id);
    toast(t().nearest(best.s.name, Math.round(best.d)));
  }, () => toast(t().locErr), { timeout: 10000, maximumAge: 600000 });
});

$('#pausebtn').addEventListener('click', (e) => {
  const p = !scene.isPaused();
  scene.setPaused(p);
  e.currentTarget.setAttribute('aria-pressed', String(p));
  store.set('jerebu.paused', p ? '1' : '');
});
if (store.get('jerebu.paused', '') === '1') { scene.setPaused(true); $('#pausebtn').setAttribute('aria-pressed', 'true'); }

// hold (or tap to pin) the map
const mapBtn = $('#mapbtn');
let downAt = 0, pinned = false;
function setMap(on, pin = false) {
  pinned = on && pin;
  map.show(on, pin);
  scene.setMapMode(on);
  mapBtn.setAttribute('aria-pressed', String(on));
}
mapBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  downAt = performance.now();
  if (pinned) { setMap(false); downAt = 0; return; }
  setMap(true);
  mapBtn.setPointerCapture?.(e.pointerId);
});
mapBtn.addEventListener('pointerup', () => {
  if (!downAt) return;
  if (performance.now() - downAt < 260) setMap(true, true);
  else setMap(false);
  downAt = 0;
});
mapBtn.addEventListener('pointercancel', () => { if (!pinned) setMap(false); });
mapBtn.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMap(!map.isOn(), true); }
});
stage.addEventListener('click', (e) => {
  if (pinned && !e.target.closest('.paper') && !e.target.closest('#mapbtn')) setMap(false);
});
const typing = (e) => /INPUT|SELECT|TEXTAREA/.test(e.target.tagName);
addEventListener('keydown', (e) => {
  if ((e.key === 'm' || e.key === 'M') && !e.repeat && !typing(e)) setMap(true);
  if (e.key === 'Escape') setMap(false);
});
addEventListener('keyup', (e) => {
  if ((e.key === 'm' || e.key === 'M') && !pinned) setMap(false);
});

// ---------- go ----------
render();
load();
setInterval(updateAgo, 30_000);
setInterval(() => { trendCache.clear(); load(); }, 10 * 60_000);
