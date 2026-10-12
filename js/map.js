// "Hold" map: a paper map of Malaysia held up in front of the scene.
import { MAP } from './map-data.js';
import { REGIONS, band } from './aqi.js';

const RAD = Math.PI / 180;
export const project = (lon, lat) => [
  MAP.scale * lon * RAD + MAP.tx,
  -MAP.scale * Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2)) + MAP.ty,
];

// where each region's number is written (map coords) — tuned by eye
const LABEL_AT = {
  north: [92, 150],
  east: [214, 196],
  central: [84, 282],
  south: [222, 344],
  sarawak: [650, 318],
  sabah: [846, 168],
};

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
        <text class="m-title" x="468" y="132">MALAYSIA</text>
        <text class="m-sub" x="468" y="156">LAUT CHINA SELATAN</text>
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

  labelsG.innerHTML = REGIONS.map((r) => {
    const [lx, ly] = LABEL_AT[r.key];
    const [ax, ay] = project(...r.anchor);
    const lead = Math.hypot(lx - ax, ly - ay) > 26 ? `<line x1="${ax}" y1="${ay}" x2="${lx}" y2="${ly - 4}" class="lead"/>` : '';
    return `<g class="m-reg" data-r="${r.key}">${lead}
      <g transform="translate(${lx} ${ly})">
        <rect x="-52" y="-34" width="104" height="70" fill="transparent"/>
        <path d="${RING}" class="ring" transform="translate(-62 -46) scale(.8)"/>
        <text class="m-name" y="-14"></text>
        <text class="m-num" y="22"></text>
      </g></g>`;
  }).join('');

  labelsG.addEventListener('click', (e) => {
    const g = e.target.closest('.m-reg');
    if (g && wrap.classList.contains('is-sticky')) onPick(g.dataset.r);
  });

  function update({ stations, regionValues, selected, names }) {
    stationsG.innerHTML = stations
      .map((s) => {
        const [x, y] = project(s.lon, s.lat);
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5" fill="${band(s.api).color}"><title>${s.name} · ${s.api ?? '–'}</title></circle>`;
      })
      .join('');
    labelsG.querySelectorAll('.m-reg').forEach((g) => {
      const k = g.dataset.r;
      g.classList.toggle('is-sel', k === selected);
      g.querySelector('.m-name').textContent = names[k].toUpperCase();
      const v = regionValues[k];
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
