// "Hold" map: a paper map of Malaysia held up in front of the scene.
import { MAP } from './map-data.js';
import { STATES, band } from './aqi.js';

const RAD = Math.PI / 180;
export const project = (lon, lat) => [
  MAP.scale * lon * RAD + MAP.tx,
  -MAP.scale * Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2)) + MAP.ty,
];

const RING = 'M20 70 C 12 30, 70 6, 118 16 C 156 26, 158 86, 112 108 C 70 126, 18 112, 12 78 C 8 56, 30 40, 52 34';

export function createMap(stage, { onPick }) {
  const wrap = document.createElement('div');
  wrap.className = 'mapwrap';
  wrap.setAttribute('aria-hidden', 'true');

  let grid = '';
  for (let x = 50; x < MAP.W; x += 100) grid += `<line x1="${x}" y1="0" x2="${x}" y2="${MAP.H}"/>`;
  for (let y = 40; y < MAP.H; y += 100) grid += `<line x1="0" y1="${y}" x2="${MAP.W}" y2="${y}"/>`;

  wrap.innerHTML = `
    <div class="paperbox"><div class="paper">
      <svg viewBox="0 0 ${MAP.W} ${MAP.H}" class="mapsvg">
        <defs>
          <filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter>
        </defs>
        <g class="m-grid">${grid}</g>
        <g class="m-nb">${MAP.neighbours.map((n) => `<path d="${n.d}"/>`).join('')}</g>
        <path class="m-land" d="${MAP.malaysia}" filter="url(#rough)"/>
        <g class="m-stations"></g>
        <g class="m-labels"></g>
        <text class="m-title" x="620" y="122">MALAYSIA</text>
        <text class="m-sub" x="620" y="146">LAUT CHINA SELATAN</text>
        <g class="m-compass" transform="translate(955 395)">
          <circle r="22"/><path d="M0,-30 L7,0 L0,6 L-7,0 Z" class="needle"/><text y="-36">U</text>
        </g>
      </svg>
    </div>
    <svg class="thumb" viewBox="0 0 220 600" aria-hidden="true">
      <defs>
        <linearGradient id="tSkin" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#dba077"/><stop offset="1" stop-color="#a66d47"/></linearGradient>
        <pattern id="batik2" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="rotate(-14)">
          <rect width="48" height="48" fill="#1b3a6b"/>
          <g transform="translate(24 24)" fill="#e8b84a">${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse rx="3.5" ry="8.5" transform="rotate(${a}) translate(0 -8.5)"/>`).join('')}<circle r="4" fill="#c4342d"/></g>
          <g fill="#2fa696"><circle r="2.6"/><circle cx="48" r="2.6"/><circle cy="48" r="2.6"/><circle cx="48" cy="48" r="2.6"/></g>
        </pattern>
      </defs>
      <path d="M8,600 L16,318 C12,250 40,192 96,182 L176,178 C208,184 218,236 212,306 L200,600 Z" fill="url(#tSkin)" class="t-line"/>
      <path d="M178,214 C196,230 200,266 194,300" class="t-crease"/>
      <g transform="rotate(-16 92 196)">
        <rect x="46" y="44" width="92" height="176" rx="46" fill="url(#tSkin)" class="t-line"/>
        <rect x="58" y="54" width="68" height="66" rx="27" class="t-nail"/>
        <path d="M68,64 q14,-6 30,0" stroke="#fff" stroke-width="3.5" opacity=".5" fill="none" stroke-linecap="round"/>
        <path d="M66,156 q26,10 52,0" class="t-crease"/>
      </g>
      <path d="M2,600 L8,470 C80,452 150,450 214,464 L220,600 Z" fill="url(#batik2)"/>
      <path d="M8,470 C80,452 150,450 214,464" stroke="#e8b84a" stroke-width="9" fill="none"/>
    </svg></div>`;
  stage.appendChild(wrap);

  const stationsG = wrap.querySelector('.m-stations');
  const labelsG = wrap.querySelector('.m-labels');

  // one label per state: name over number, with a dotted leader to the state
  const SIDE = { end: -1, start: 1, middle: 0 };
  labelsG.innerHTML = STATES.map((st) => {
    const [lx, ly] = st.label;
    const [ax, ay] = project(...st.anchor);
    const side = SIDE[st.align];
    const fromX = lx - side * 8, fromY = side ? ly - 2 : ly + (ay > ly ? 22 : -26);
    const lead = Math.hypot(lx - ax, ly - ay) > 30
      ? `<line x1="${fromX}" y1="${fromY}" x2="${ax.toFixed(1)}" y2="${ay.toFixed(1)}" class="lead"/><circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="2.4" class="lead-dot"/>`
      : '';
    const cx = side * 50, sx = 0.8, sy = 0.52;
    return `<g class="m-reg" data-s="${st.id}">${lead}
      <g transform="translate(${lx} ${ly})" text-anchor="${st.align}">
        <rect x="${cx - 58}" y="-28" width="116" height="50" fill="transparent"/>
        <path d="${RING}" class="ring" transform="translate(${(cx - 83 * sx).toFixed(1)} ${(-3 - 65 * sy).toFixed(1)}) scale(${sx} ${sy})"/>
        <text class="m-name" y="-11"></text>
        <text class="m-num" y="17"></text>
      </g></g>`;
  }).join('');

  labelsG.addEventListener('click', (e) => {
    const g = e.target.closest('.m-reg');
    if (g && wrap.classList.contains('is-sticky')) onPick(+g.dataset.s);
  });

  function update({ stations, stateValues, selected, selectedIds, lang }) {
    stationsG.innerHTML = stations
      .map((s) => {
        const [x, y] = project(s.lon, s.lat);
        const on = selectedIds.has(s.id);
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${on ? 7 : 4.6}" class="${on ? 'on' : ''}" fill="${band(s.api).color}"><title>${s.name} · ${s.api ?? '–'}</title></circle>`;
      })
      .join('');
    labelsG.querySelectorAll('.m-reg').forEach((g) => {
      const id = +g.dataset.s;
      const st = STATES.find((x) => x.id === id);
      g.classList.toggle('is-sel', id === selected);
      g.querySelector('.m-name').textContent = (lang === 'ms' && st.mapMs) || st.map;
      const v = stateValues[id];
      g.querySelector('.m-num').textContent = v == null ? '–' : v.toFixed(1);
    });
  }

  function show(on, sticky = false) {
    wrap.classList.toggle('is-on', on);
    wrap.classList.toggle('is-sticky', on && sticky);
    stage.classList.toggle('map-on', on);
  }

  return { update, show, isOn: () => wrap.classList.contains('is-on') };
}
