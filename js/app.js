import { createScene } from './scene.js';
import { createMap } from './map.js';
import { STATES, SG, stateById, citiesOf, apiToCigs, apiToPm25, cigsFor, band, haversineKm } from './aqi.js';
import { THEMES, themeFor } from './themes.js';
import { BRANDS, brandByKey, brandIcon } from './brands.js';

// ---------- copy ----------
const T = {
  en: {
    title: 'Breathing this air for 24hrs ≈',
    unit: 'cigarettes', unit1: 'cigarette',
    cap: 'worth of harm to your health',
    stateLegend: 'State', cityLegend: 'City', allCities: 'All (average)', brandLegend: 'Brand',
    api: 'API now', psi: 'PSI, 24 h', pm: 'PM2.5 est., µg/m³', pmReal: 'PM2.5 24 h, µg/m³', worst: 'Worst:',
    trend: 'Last 24 hours', now: 'now',
    updated: 'Updated', justNow: 'just now', minAgo: (m) => `${m} min ago`, hrAgo: (h) => `${h} h ago`,
    locate: 'Near me', simulate: 'Simulate results', aDay: 'a day', reset: 'Reset', hold: 'Hold',
    smokiest: 'Smokiest cities right now',
    bands: { good: 'Good', moderate: 'Moderate', unhealthy: 'Unhealthy', veryUnhealthy: 'Very unhealthy', hazardous: 'Hazardous', na: 'No data' },
    srcModel: 'Modelled PM2.5 · DOE feed down', srcModelSg: 'Modelled PM2.5 · NEA feed down', srcSnap: 'Saved snapshot · live data unavailable',
    nearest: (n, km) => `Nearest station: ${n} (${km} km)`, locErr: 'Could not get your location',
    nearYou: 'Near you', nearYouIp: 'Near you (approx.)',
    farAway: 'You seem to be outside Malaysia and Singapore, so pick a place below',
    loadErr: 'Could not refresh — showing the last reading',
    foot: 'Cigarette maths: <a href="https://berkeleyearth.org/air-pollution-and-cigarette-equivalence/" target="_blank" rel="noopener">Berkeley Earth</a>, 22 µg/m³ PM2.5 ≈ 1 cigarette a day. Malaysia: PM2.5 is estimated from the official API, data from <a href="https://eqms.doe.gov.my/APIMS/main" target="_blank" rel="noopener">Jabatan Alam Sekitar (APIMS)</a>. Singapore: measured PM2.5 from NEA via <a href="https://data.gov.sg" target="_blank" rel="noopener">data.gov.sg</a>. Your location is only used to pick the nearest station. Satire, not medical advice. Inspired by <a href="https://secondhand.sangsara.net" target="_blank" rel="noopener">SecondHand</a> (Singapore).',
  },
  ms: {
    title: 'Menghirup udara ini selama 24 jam ≈',
    unit: 'batang rokok', unit1: 'batang rokok',
    cap: 'bersamaan kemudaratan kepada kesihatan anda',
    stateLegend: 'Negeri', cityLegend: 'Bandar', allCities: 'Semua (purata)', brandLegend: 'Jenama',
    api: 'IPU kini', psi: 'PSI, 24 jam', pm: 'Anggaran PM2.5, µg/m³', pmReal: 'PM2.5 24 jam, µg/m³', worst: 'Paling teruk:',
    trend: '24 jam lepas', now: 'kini',
    updated: 'Dikemas kini', justNow: 'baru sahaja', minAgo: (m) => `${m} minit lalu`, hrAgo: (h) => `${h} jam lalu`,
    locate: 'Dekat saya', simulate: 'Simulasi keputusan', aDay: 'sehari', reset: 'Set semula', hold: 'Tahan',
    smokiest: 'Bandar paling berasap sekarang',
    bands: { good: 'Baik', moderate: 'Sederhana', unhealthy: 'Tidak sihat', veryUnhealthy: 'Sangat tidak sihat', hazardous: 'Berbahaya', na: 'Tiada data' },
    srcModel: 'PM2.5 model · suapan JAS terputus', srcModelSg: 'PM2.5 model · suapan NEA terputus', srcSnap: 'Data simpanan · data langsung tiada',
    nearest: (n, km) => `Stesen terdekat: ${n} (${km} km)`, locErr: 'Lokasi anda tidak dapat dikesan',
    nearYou: 'Dekat anda', nearYouIp: 'Dekat anda (anggaran)',
    farAway: 'Anda kelihatan berada di luar Malaysia dan Singapura, jadi pilih lokasi di bawah',
    loadErr: 'Gagal dikemas kini — bacaan terakhir dipaparkan',
    foot: 'Kiraan rokok: <a href="https://berkeleyearth.org/air-pollution-and-cigarette-equivalence/" target="_blank" rel="noopener">Berkeley Earth</a>, 22 µg/m³ PM2.5 ≈ 1 batang rokok sehari. Malaysia: PM2.5 dianggarkan daripada IPU rasmi, data daripada <a href="https://eqms.doe.gov.my/APIMS/main" target="_blank" rel="noopener">Jabatan Alam Sekitar (APIMS)</a>. Singapura: PM2.5 sebenar daripada NEA melalui <a href="https://data.gov.sg" target="_blank" rel="noopener">data.gov.sg</a>. Lokasi anda hanya digunakan untuk memilih stesen terdekat. Satira, bukan nasihat perubatan. Diilhamkan oleh <a href="https://secondhand.sangsara.net" target="_blank" rel="noopener">SecondHand</a> (Singapura).',
  },
};

// ---------- state ----------
const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};
const ui = {
  lang: store.get('jerebu.lang', (navigator.language || '').toLowerCase().startsWith('ms') ? 'ms' : 'en'),
  state: +store.get('jerebu.state', '14'),
  city: null,
  brand: brandByKey(store.get('jerebu.brand', 'klasik')).key,
  sim: null,
  near: null, // { stateId, cityKey, how: 'gps' | 'ip' } once we know where the visitor is
  manual: false, // set when the visitor picks a place themselves, so location never overrides it
};
if (!stateById(ui.state)) ui.state = 14;

let data = null;
let appliedBrand = null;
const trendCache = new Map();
let shown = null;

const $ = (s) => document.querySelector(s);
const t = () => T[ui.lang];
const fmt = (n) => (n == null ? '–' : n.toFixed(1));
const stateName = (st) => (ui.lang === 'ms' && st.ms) || st.en;
const cityName = (c) => (ui.lang === 'ms' ? c.ms : c.en);

const stage = $('#stage');
const scene = createScene(stage);
const map = createMap(stage, { onPick: (id) => { ui.manual = true; selectState(id); } });

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
  if (data) autoLocate();
}

function trendFor(stateId) {
  if (!trendCache.has(stateId)) {
    trendCache.set(stateId, fetch('/api/trend?states=' + stateId)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null));
  }
  return trendCache.get(stateId);
}

async function loadTrend() {
  const id = ui.state;
  const res = await trendFor(id);
  if (id === ui.state) drawTrend(res);
}

// ---------- derived values ----------
const live = (s) => s.api != null;
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function stateStats(id) {
  const cities = citiesOf(id, data?.stations || []);
  const stations = cities.flatMap((c) => c.stations);
  const ok = stations.filter(live);
  const avg = mean(ok.map((s) => s.api));
  const pm25 = ok.length && ok.every((s) => s.pm25 != null) ? mean(ok.map((s) => s.pm25)) : null;
  const worst = cities.filter((c) => c.api != null).sort((a, b) => b.api - a.api)[0] || null;
  return { cities, stations, avg, pm25, worst };
}

function currentCity(stats) {
  return ui.city ? stats.cities.find((c) => c.key === ui.city) || null : null;
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

const chip = (attrs, label, pressed, api) =>
  `<button type="button" ${attrs} aria-pressed="${pressed}"><i class="bd" style="--c:${band(api).color}"></i>${label}</button>`;

function render() {
  applyI18n();
  const L = t();
  const stats = stateStats(ui.state);
  const city = currentCity(stats);
  if (ui.city && !city) ui.city = null;
  const isSg = ui.state === SG;
  const liveApi = city ? city.api : stats.avg;
  const livePm = city ? city.pm25 : stats.pm25;
  const api = ui.sim ?? liveApi;
  const cigs = ui.sim != null ? apiToCigs(ui.sim) : cigsFor(liveApi, livePm);

  // hero
  tweenNumber(cigs);
  $('#unit').textContent = cigs != null && Math.abs(cigs - 1) < 0.05 ? L.unit1 : L.unit;
  document.title = cigs == null ? 'Jerebu' : `${fmt(cigs)} 🚬 · Jerebu`;

  // state chips
  $('#stateChips').innerHTML = STATES.map((st) => {
    const avg = data ? stateStats(st.id).avg : null;
    const pin = ui.near?.stateId === st.id ? ' <span class="near" title="Near you">📍</span>' : '';
    return chip(`data-s="${st.id}"`, stateName(st) + pin, st.id === ui.state, avg);
  }).join('');

  // city chips (hidden when the state has a single city)
  const multi = stats.cities.length > 1;
  $('#cities').hidden = !stats.cities.length;
  $('#cityChips').innerHTML = (multi ? chip('data-c=""', L.allCities, !ui.city, stats.avg) : '') +
    stats.cities.map((c) => chip(`data-c="${c.key}"`, cityName(c), multi ? c.key === ui.city : true, c.api)).join('');

  // brand chips + the scene's cigarettes
  $('#brandChips').innerHTML = BRANDS.map((br) =>
    `<button type="button" data-b="${br.key}" aria-pressed="${br.key === ui.brand}" title="Jerebu ${br.ms}">${brandIcon(br)}${ui.lang === 'ms' ? br.ms : br.en}</button>`).join('');
  if (appliedBrand !== ui.brand) { scene.setBrand(brandByKey(ui.brand)); appliedBrand = ui.brand; }

  // backdrop follows the city (a single-city state uses that city)
  const st = stateById(ui.state);
  const themeCity = city || (stats.cities.length === 1 ? stats.cities[0] : null);
  const th = themeFor(ui.state, themeCity ? themeCity.key : null);
  scene.setTheme(th.key, th.seed);
  const place = themeCity && cityName(themeCity) !== stateName(st) ? `${cityName(themeCity)}, ${stateName(st)}` : stateName(st);
  const isNear = ui.near && ui.near.stateId === ui.state && (ui.city || themeCity?.key || null) === (ui.near.cityKey || null);
  const near = isNear ? (ui.near.how === 'gps' ? L.nearYou : L.nearYouIp) : '';
  $('#locCity').textContent = '📍 ' + place;
  $('#locNote').textContent = [near, THEMES[th.key][ui.lang]].filter(Boolean).join(' · ');

  // stats (Singapore reports PSI and a measured PM2.5)
  const b = band(api);
  const realPm = ui.sim == null && livePm != null;
  $('#sApi').textContent = api == null ? '–' : Math.round(api);
  $('#lblApi').textContent = isSg ? L.psi : L.api;
  $('#sBand').textContent = L.bands[b.key];
  $('#sBand').style.setProperty('--c', b.color);
  $('#sPm').textContent = api == null ? '–' : Math.round(realPm ? livePm : apiToPm25(api));
  $('#lblPm').textContent = realPm ? L.pmReal : L.pm;
  $('#sWorst').textContent = stats.worst ? Math.round(stats.worst.api) : '–';
  $('#sWorstName').textContent = stats.worst ? `${L.worst} ${cityName(stats.worst)}` : '';

  // updated line + source badge for whichever feed this place comes from
  updateAgo();
  const src = isSg ? data?.sg?.source : data?.source;
  const badge = $('#srcBadge');
  badge.hidden = !data || src === 'doe' || src === 'nea';
  if (!badge.hidden) badge.textContent = src === 'model' ? (isSg ? L.srcModelSg : L.srcModel) : L.srcSnap;

  // simulator
  const slider = $('#sim');
  if (ui.sim == null && api != null) slider.value = Math.round(api);
  $('#simLabel').textContent = cigs == null ? '' : `${fmt(cigs)} ${L.aDay}`;
  $('#reset').disabled = ui.sim == null;
  document.body.classList.toggle('is-sim', ui.sim != null);

  // nationwide city ranking
  const allCities = STATES.flatMap((st) => citiesOf(st.id, data?.stations || []).map((c) => ({ ...c, st })));
  const top = allCities.filter((c) => c.api != null).sort((a, c) => c.api - a.api).slice(0, 5);
  $('#rank').innerHTML = top.map((c) => `<li><button type="button" data-s="${c.st.id}" data-c="${c.key}">
      <span class="dotc" style="--c:${band(c.api).color}"></span>
      <span class="rn">${cityName(c)}<small>${stateName(c.st)}</small></span>
      <span class="rv">${fmt(cigsFor(c.api, c.pm25))} 🚬<small>${c.st.id === SG ? 'PSI' : 'API'} ${Math.round(c.api)}</small></span></button></li>`).join('');

  // scene + map
  if (api != null) scene.setLevel(api, cigs);
  const stateValues = Object.fromEntries(STATES.map((st) => {
    const ss = stateStats(st.id);
    return [st.id, cigsFor(ss.avg, ss.pm25)];
  }));
  const selectedIds = new Set((city ? city.stations : stats.stations).map((s) => s.id));
  map.update({ stations: data?.stations || [], stateValues, selected: ui.state, selectedIds, lang: ui.lang });

  // trend follows the city choice
  const cached = trendCache.get(ui.state);
  if (cached) { const id = ui.state; cached.then((res) => { if (id === ui.state) drawTrend(res); }); }
}

function updateAgo() {
  const L = t();
  const el = $('#updated');
  const isSg = ui.state === SG;
  const rt = isSg ? data?.sg?.recordTime : data?.recordTime;
  if (!rt) { el.textContent = '…'; return; }
  const when = new Date(rt + '+08:00');
  const time = when.toLocaleTimeString(ui.lang === 'ms' ? 'ms-MY' : 'en-MY', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kuala_Lumpur' });
  const mins = Math.max(0, Math.round((Date.now() - when) / 60000));
  const ago = mins < 1 ? L.justNow : mins < 120 ? L.minAgo(mins) : L.hrAgo(Math.round(mins / 60));
  el.textContent = `${L.updated} ${time} · ${ago}`;
  $('#dot').classList.toggle('is-stale', (isSg ? data.sg?.source !== 'nea' : data.source !== 'doe') || mins > 150);
}

function drawTrend(res) {
  const box = $('#trend');
  if (!res?.series || !data) { box.hidden = true; return; }
  const stats = stateStats(ui.state);
  const city = currentCity(stats);
  const ids = (city ? city.stations : stats.stations).map((s) => s.id);
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
  $('#trendRange').textContent = `${ui.state === SG ? 'PSI' : 'API'} ${Math.round(lo)}–${Math.round(hi)}`;
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
function selectState(id, city = null) {
  ui.state = id;
  ui.city = city;
  store.set('jerebu.state', String(id));
  render();
  loadTrend();
}

$('#stateChips').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-s]');
  if (!b) return;
  ui.manual = true;
  selectState(+b.dataset.s);
});

$('#cityChips').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-c]');
  if (!b) return;
  ui.manual = true;
  ui.city = b.dataset.c || null;
  render();
});

$('#brandChips').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-b]');
  if (!b) return;
  ui.brand = b.dataset.b;
  store.set('jerebu.brand', ui.brand);
  render();
});

$('#rank').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-s]');
  if (!b) return;
  ui.manual = true;
  selectState(+b.dataset.s, b.dataset.c);
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

// ---------- the visitor's location ----------
// On load we open on the visitor's nearest city: first a rough guess from
// Vercel's IP geolocation (no prompt), then the browser's precise location if
// they allow it. Anything they pick themselves wins over both.
const FAR_KM = 250;

function nearestTo(me) {
  const best = (data?.stations || []).filter(live)
    .map((s) => ({ s, d: haversineKm(me, s) }))
    .sort((a, b) => a.d - b.d)[0];
  if (!best) return null;
  const cities = citiesOf(best.s.stateId, data.stations);
  const city = cities.find((c) => c.stations.some((s) => s.id === best.s.id)) || null;
  return { stateId: best.s.stateId, city, km: best.d };
}

function goNear(me, how, announce) {
  const n = nearestTo(me);
  if (!n || n.km > FAR_KM) {
    if (announce) toast(n ? t().farAway : t().locErr);
    return false;
  }
  ui.near = { stateId: n.stateId, cityKey: n.city ? n.city.key : null, how };
  const multi = citiesOf(n.stateId, data.stations).length > 1;
  selectState(n.stateId, multi && n.city ? n.city.key : null);
  if (announce) toast(t().nearest(n.city ? cityName(n.city) : stateName(stateById(n.stateId)), Math.round(n.km)));
  return true;
}

function preciseLocation(announce) {
  if (!navigator.geolocation) { if (announce) toast(t().locErr); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (!announce && ui.manual) return;
      const me = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      const n = nearestTo(me), prev = ui.near;
      // speak up when asked, or when the precise fix moves us somewhere new
      const moved = !prev || !n || prev.stateId !== n.stateId || prev.cityKey !== (n.city ? n.city.key : null);
      goNear(me, 'gps', announce || moved);
    },
    () => { if (announce) toast(t().locErr); },
    { timeout: 12000, maximumAge: 10 * 60_000 },
  );
}

let located = false;
async function autoLocate() {
  if (located) return;
  located = true;
  // ?at=lat,lon previews the page as if you were standing there
  const at = (new URLSearchParams(location.search).get('at') || '').split(',').map(Number);
  if (at.length === 2 && at.every(Number.isFinite)) { goNear({ lat: at[0], lon: at[1] }, 'gps', true); return; }
  try {
    const w = await (await fetch('/api/where', { cache: 'no-store' })).json();
    if (w.lat != null && !ui.manual) goNear(w, 'ip', false);
  } catch { /* no rough location; the precise one may still come */ }
  preciseLocation(false);
}

$('#locate').addEventListener('click', () => {
  if (!data) return toast(t().locErr);
  ui.manual = false;
  preciseLocation(true);
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
