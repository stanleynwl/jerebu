// City backdrops. Each theme builds the far layer (skyline, hills, water) and
// the mid layer (streets, shore, fields) of the scene from shared parts, and
// picks a flyer and any smoke emitters. Coordinates are in the 1024×1024 world;
// the horizon sits at HZ and the street meets the mamak table at GND.

const W = 1024;
const HZ = 748;
const GND = 908;
const f = (n) => (+n).toFixed(1);

export function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 2147483646) + 1;
}

const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const place = (svg, x, y, s = 1) => `<g transform="translate(${f(x)} ${f(y)}) scale(${s})">${svg}</g>`;
let uidN = 0;
const uid = () => 'u' + (++uidN).toString(36);

// ---------- geometry helpers ----------
function spline(pts) {
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
  }
  return d;
}
const ridge = (pts, base, cls) =>
  `<path class="${cls}" d="${spline(pts)} L${f(pts[pts.length - 1][0])},${base} L${f(pts[0][0])},${base} Z"/>`;

function hills(r, { base = HZ, min = 60, max = 160, n = 7, cls = 'hill-far', x0 = -60, x1 = W + 60 } = {}) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push([x0 + (i * (x1 - x0)) / n, base - (min + r() * (max - min))]);
  return ridge(pts, base + 4, cls);
}

function polygonFromWidths(rows) {
  const left = rows.map(([y, w]) => `${f(-w)},${y}`);
  const right = rows.slice().reverse().map(([y, w]) => `${f(w)},${y}`);
  return left.concat(right).join(' ');
}
function halfFromWidths(rows) {
  return rows.map(([y]) => `0,${y}`).concat(rows.slice().reverse().map(([y, w]) => `${f(w)},${y}`)).join(' ');
}
const tower = (rows) => `<polygon points="${polygonFromWidths(rows)}" class="lm-body"/><polygon points="${halfFromWidths(rows)}" class="lm-lit"/>`;

// mirrored copy of a far-bank landmark, clipped to the water below `axis`
function mirror(svg, axis, y1 = GND) {
  const id = uid();
  return `<clipPath id="${id}"><rect x="-50" y="${axis}" width="${W + 100}" height="${y1 - axis}"/></clipPath>
    <g clip-path="url(#${id})"><g class="refl" transform="translate(0 ${2 * axis}) scale(1 -1)">${svg}</g></g>`;
}

// ---------- generic parts ----------
function city(r, { x0 = -10, x1 = W + 10, base = HZ, minH = 70, maxH = 280, wMin = 34, wMax = 92, ws = 1, wave = true } = {}) {
  let bldg = '', wins = '';
  let x = x0;
  while (x < x1) {
    const w = (wMin + r() * (wMax - wMin)) * ws;
    const k = wave ? 0.55 + 0.45 * Math.sin((x / W) * Math.PI * 1.3 + 0.4) ** 2 : 1;
    const h = minH + r() * (maxH - minH) * k;
    const top = base - h;
    const tone = Math.floor(r() * 3);
    bldg += `<rect x="${f(x)}" y="${f(top)}" width="${f(w)}" height="${f(h + 4)}" class="b${tone}"/>`;
    if (r() > 0.65 && h > 90) bldg += `<rect x="${f(x + w / 2 - 1)}" y="${f(top - 16 * ws)}" width="2" height="${f(16 * ws)}" class="b${tone}"/>`;
    for (let wy = top + 10 * ws; wy < base - 12 * ws; wy += 13 * ws) {
      for (let wx = x + 6 * ws; wx < x + w - 8 * ws; wx += 10 * ws) {
        if (r() > 0.62) {
          wins += `<rect x="${f(wx)}" y="${f(wy)}" width="${f(4 * ws)}" height="${f(6 * ws)}" class="win" style="animation-duration:${(4 + r() * 9).toFixed(1)}s;animation-delay:${(-r() * 12).toFixed(1)}s"/>`;
        }
      }
    }
    x += w + (2 + r() * 10) * ws;
  }
  return `<g>${bldg}</g><g class="far-wins">${wins}</g>`;
}

const SIGNS = ['KEDAI KOPI', 'RESTORAN', 'MAMAK 24 JAM', 'KEDAI RUNCIT', 'FARMASI', 'DOBI', 'NASI KANDAR', 'KEDAI EMAS', 'KEDAI BASIKAL', 'KEDAI GUNTING'];
export const FACADES = ['#e9c99f', '#9cc4b6', '#e2a49c', '#efd99b', '#a7bde0', '#d6b0d1', '#c9d99a', '#f0b98a'];

function shophouses(r, { x0 = -30, x1 = W + 30, base = GND, s = 1 } = {}) {
  let out = '';
  let x = x0, i = Math.floor(r() * 8);
  while (x < x1) {
    const w = (132 + r() * 30) * s, h = (168 + r() * 44) * s, top = base - h;
    const c = `var(--f${i % FACADES.length})`, sign = SIGNS[(i * 3) % SIGNS.length];
    const signBg = ['red', 'green', 'blue'][i % 3];
    const winW = w * 0.24, upY = top + 18 * s;
    out += `<g>
      <rect x="${f(x)}" y="${f(top)}" width="${f(w)}" height="${f(h)}" fill="${c}"/>
      <rect x="${f(x)}" y="${f(top)}" width="${f(w)}" height="${f(h)}" fill="url(#facadeShade)"/>
      <polygon points="${f(x - 8 * s)},${f(top + 2)} ${f(x + w + 8 * s)},${f(top + 2)} ${f(x + w - 4 * s)},${f(top - 20 * s)} ${f(x + 4 * s)},${f(top - 20 * s)}" class="roof"/>
      <rect x="${f(x - 4 * s)}" y="${f(top)}" width="${f(w + 8 * s)}" height="${f(6 * s)}" class="cornice"/>
      ${[0.16, 0.6].map((k) => {
        const wx = x + w * k;
        return `<rect x="${f(wx)}" y="${f(upY)}" width="${f(winW)}" height="${f(h * 0.3)}" rx="${f(winW / 2)}" class="shwin"/>
          <rect x="${f(wx - 9 * s)}" y="${f(upY + 4 * s)}" width="${f(9 * s)}" height="${f(h * 0.3 - 4 * s)}" class="shutter"/>
          <rect x="${f(wx + winW)}" y="${f(upY + 4 * s)}" width="${f(9 * s)}" height="${f(h * 0.3 - 4 * s)}" class="shutter"/>`;
      }).join('')}
      <rect x="${f(x + 10 * s)}" y="${f(top + h * 0.47)}" width="${f(w - 20 * s)}" height="${f(22 * s)}" fill="var(--sign-${signBg})"/>
      <text x="${f(x + w / 2)}" y="${f(top + h * 0.47 + 15.5 * s)}" class="signtxt" style="font-size:${f(11 * s)}px">${sign}</text>
      ${[0, 1, 2].map((k) => {
        const aw = (w - 24 * s) / 3, ax = x + 8 * s + k * (aw + 4 * s), ay = top + h * 0.47 + 30 * s;
        return `<path d="M${f(ax)},${base} V${f(ay + 16 * s)} Q${f(ax + aw / 2)},${f(ay - 6 * s)} ${f(ax + aw)},${f(ay + 16 * s)} V${base} Z" class="arch"/>`;
      }).join('')}
    </g>`;
    x += w + 2;
    i++;
  }
  return out;
}

function palm(x, base, s = 1, flip = false, lean = 0) {
  const fronds = [-150, -118, -86, -54, -22, 12, 40].map((a) =>
    `<path d="M0,0 C30,-26 74,-30 118,-6 C78,-14 42,-8 0,4 Z" transform="rotate(${a}) scale(${0.9 + Math.abs(a) / 600})" class="frond"/>`
  ).join('');
  const tip = 26 + lean;
  return `<g transform="translate(${f(x)} ${base}) scale(${flip ? -s : s} ${s})">
    <path d="M-7,0 C-12,-90 ${-2 + lean / 2},-190 ${tip},-290 L${tip + 10},-288 C${12 + lean / 2},-190 6,-90 7,0 Z" class="trunk"/>
    <g transform="translate(${tip + 5} -292)"><g class="crown" style="animation-delay:${(-(x % 5)).toFixed(1)}s">${fronds}
      <circle cx="-6" cy="8" r="7" class="coco"/><circle cx="6" cy="10" r="7" class="coco"/></g></g>
  </g>`;
}

function banana(x, base, s = 1) {
  const leaves = [-70, -40, -10, 25, 55].map((a) => `<path d="M0,0 C20,-10 60,-14 90,-2 C60,2 24,4 0,0 Z" transform="rotate(${a - 90}) " class="frond"/>`).join('');
  return place(`<rect x="-5" y="-90" width="10" height="90" class="trunk"/><g transform="translate(0 -90)"><g class="crown">${leaves}</g></g>`, x, base, s);
}

function waterBase(y0, y1) {
  return `<rect x="-60" y="${y0}" width="${W + 120}" height="${y1 - y0}" fill="url(#waterGrad)"/>`;
}
function shimmer(r, y0, y1, n = 46) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const k = Math.pow(r(), 1.3);
    const y = y0 + 4 + k * (y1 - y0 - 8);
    const len = 6 + k * 46 * (0.4 + r());
    const x = r() * W;
    s += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x + len)}" y2="${f(y)}" class="shim" style="animation-delay:${(-r() * 4).toFixed(1)}s;animation-duration:${(2.4 + r() * 3).toFixed(1)}s"/>`;
  }
  return `<g>${s}</g>`;
}
const water = (r, y0, y1, reflections = '') => waterBase(y0, y1) + reflections + shimmer(r, y0, y1);

function boat(x, y, s, hull, stripe, delay) {
  return place(`<g class="bob" style="animation-delay:${delay}s">
    <path d="M-52,-16 L52,-16 Q46,-6 38,0 L-38,0 Q-48,-6 -52,-16 Z" fill="var(--ac-${hull})"/>
    <path d="M-50,-12 L50,-12" stroke="var(--ac-${stripe})" stroke-width="3"/>
    <path d="M-52,-16 Q-60,-26 -56,-34 M52,-16 Q60,-26 56,-34" stroke="var(--ac-${hull})" stroke-width="4" fill="none"/>
    <rect x="-14" y="-34" width="26" height="18" fill="var(--ac-white)"/><rect x="-16" y="-37" width="30" height="4" fill="var(--ac-${stripe})"/>
    <line x1="22" y1="-16" x2="22" y2="-58" class="mast"/></g>`, x, y, s);
}
function boats(r, y0, y1, n, scale = 0.8) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const y = y0 + r() * (y1 - y0);
    out += boat(r() * W, y, scale * (0.6 + ((y - y0) / Math.max(1, y1 - y0)) * 0.5), pick(r, ['red', 'blue', 'green', 'teal']), pick(r, ['yellow', 'white', 'red']), (-r() * 3).toFixed(1));
  }
  return out;
}

function ship(y, s, dur, delay, r) {
  let boxes = '';
  for (let c = 0; c < 9; c++) for (let row = 0; row < 3; row++) {
    if (r() > 0.25) boxes += `<rect x="${-120 + c * 22}" y="${-30 - row * 11}" width="21" height="10" fill="var(--ac-${pick(r, ['red', 'blue', 'green', 'orange', 'teal', 'white'])})"/>`;
  }
  return `<g class="sail" style="animation-duration:${dur}s;animation-delay:${delay}s">${place(`
    <path d="M-140,-20 L120,-20 L104,0 L-128,0 Z" class="hull"/>${boxes}
    <rect x="90" y="-62" width="22" height="42" fill="var(--ac-white)"/><rect x="96" y="-74" width="6" height="12" class="hull"/>
    <rect x="92" y="-56" width="18" height="4" class="win-lit"/>`, 0, y, s)}</g>`;
}

function crane(x, base, s, color) {
  return place(`<g class="crane" style="stroke:var(--ac-${color})">
    <path d="M-34,0 L-24,-150 M34,0 L24,-150 M-30,-60 L30,-60 M-27,-110 L27,-110 M-30,-60 L27,-110 M30,-60 L-27,-110" stroke-width="6"/>
    <path d="M-150,-158 L70,-158" stroke-width="9"/>
    <path d="M-24,-150 L0,-222 L24,-150 M0,-222 L-140,-162 M0,-222 L62,-162" stroke-width="3"/></g>
    <rect x="-92" y="-156" width="18" height="12" class="hull"/><line x1="-83" y1="-144" x2="-83" y2="-96" class="mast"/>
    <circle cx="0" cy="-224" r="3.2" class="beacon"/>`, x, base, s);
}

function containers(r, x0, x1, base) {
  let out = '';
  for (let x = x0; x < x1; x += 46) {
    const rows = 1 + Math.floor(r() * 4);
    for (let k = 0; k < rows; k++) out += `<rect x="${x}" y="${base - (k + 1) * 15}" width="44" height="14" fill="var(--ac-${pick(r, ['red', 'blue', 'green', 'orange', 'teal', 'white', 'yellow'])})"/>`;
  }
  return out;
}

function mosque(cx, base, s = 1, dome = 'gold') {
  return place(`
    <rect x="-70" y="-62" width="140" height="62" fill="var(--ac-white)"/>
    ${[-50, -25, 0, 25, 50].map((x) => `<path d="M${x - 7},0 V-24 Q${x},-34 ${x + 7},-24 V0 Z" class="arch"/>`).join('')}
    <rect x="-42" y="-82" width="84" height="20" fill="var(--ac-white)"/>
    <path d="M-42,-82 C-48,-124 -16,-146 0,-156 C16,-146 48,-124 42,-82 Z" fill="var(--ac-${dome})"/>
    <path d="M0,-156 V-170" stroke="var(--ac-${dome})" stroke-width="2.5"/><circle cx="0" cy="-174" r="4" fill="none" stroke="var(--ac-${dome})" stroke-width="2"/>
    <rect x="84" y="-182" width="16" height="182" fill="var(--ac-white)"/>
    <rect x="80" y="-150" width="24" height="6" fill="var(--ac-white)"/><rect x="80" y="-96" width="24" height="5" fill="var(--ac-white)"/>
    <path d="M82,-182 L92,-212 L102,-182 Z" fill="var(--ac-${dome})"/>`, cx, base, s);
}

function clockTower(cx, base, s = 1, color = 'white') {
  return place(`
    <rect x="-18" y="-190" width="36" height="190" fill="var(--ac-${color})"/>
    <rect x="-22" y="-196" width="44" height="8" fill="var(--ac-${color})"/>
    <circle cx="0" cy="-166" r="12" fill="var(--ac-cream)" stroke="var(--ac-black)" stroke-width="2"/>
    <path d="M0,-166 V-174 M0,-166 L6,-162" stroke="var(--ac-black)" stroke-width="2"/>
    <path d="M-22,-196 L0,-236 L22,-196 Z" class="roof"/>
    ${[-120, -80, -40].map((y) => `<rect x="-6" y="${y}" width="12" height="20" class="shwin"/>`).join('')}`, cx, base, s);
}

function kampungHouse(x, base, s = 1, roof = 'zinc', trim = 'teal') {
  return place(`
    ${[-62, -30, 2, 34, 62].map((px) => `<rect x="${px - 3}" y="-44" width="6" height="44" class="wood-dk"/>`).join('')}
    <rect x="-72" y="-112" width="144" height="70" class="wood"/>
    ${[-100, -88, -76, -64, -52].map((y) => `<line x1="-72" y1="${y}" x2="72" y2="${y}" class="plank"/>`).join('')}
    <rect x="-52" y="-98" width="24" height="32" class="kwin"/><rect x="28" y="-98" width="24" height="32" class="kwin"/>
    <rect x="-60" y="-98" width="8" height="32" fill="var(--ac-${trim})"/><rect x="52" y="-98" width="8" height="32" fill="var(--ac-${trim})"/>
    <rect x="-10" y="-96" width="20" height="54" class="wood-dk"/>
    <path d="M-10,-42 L-30,0 M10,-42 L-10,0 M-14,-30 L6,-30 M-20,-16 L0,-16" class="plank" stroke-width="3"/>
    <path d="M-88,-110 L0,-176 L88,-110 Z" class="roof-${roof}"/>
    <path d="M-24,-128 L0,-160 L24,-128 Z" class="wood-dk"/>
    <path d="M-6,-170 L8,-188 M6,-170 L-8,-188" class="plank" stroke-width="3"/>`, x, base, s);
}

function jungle(r, base, layer, { x0 = -60, x1 = W + 60, min = 40, max = 120 } = {}) {
  let out = '';
  let x = x0;
  const cls = 'jg' + layer;
  const blobs = [];
  while (x < x1) {
    const rad = 26 + r() * 34 + layer * 8;
    const top = base - (min + r() * (max - min));
    blobs.push(`<circle cx="${f(x)}" cy="${f(top)}" r="${f(rad)}"/>`);
    x += rad * (0.9 + r() * 0.5);
  }
  out += `<g class="${cls}"><rect x="${x0}" y="${base - min}" width="${x1 - x0}" height="${min + 30}"/>${blobs.join('')}</g>`;
  return out;
}

function mist(r, y, n = 4) {
  let out = '';
  for (let i = 0; i < n; i++) {
    out += `<ellipse cx="${f(r() * W)}" cy="${f(y + (r() - 0.5) * 30)}" rx="${f(160 + r() * 200)}" ry="${f(14 + r() * 16)}" class="mist" style="animation-duration:${(30 + r() * 30).toFixed(0)}s;animation-delay:${(-r() * 40).toFixed(0)}s"/>`;
  }
  return out;
}

function grass(y0, y1 = GND) {
  return `<rect x="-60" y="${y0}" width="${W + 120}" height="${y1 - y0 + 4}" class="grass"/>`;
}

function paddy(r, y0, y1 = GND) {
  let out = '';
  let y = y0, k = 0;
  while (y < y1) {
    const h = 3 + (y - y0) * 0.075;
    out += `<rect x="-60" y="${f(y)}" width="${W + 120}" height="${f(h + 1)}" class="paddy${k % 2 ? '2' : ''}"/>`;
    y += h;
    k++;
  }
  for (let i = -14; i <= 14; i++) out += `<line x1="${512 + i * 14}" y1="${y0}" x2="${512 + i * 150}" y2="${y1}" class="furrow"/>`;
  return out;
}

function egrets(r, y0, y1, n) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const y = y0 + r() * (y1 - y0), s = 0.5 + ((y - y0) / (y1 - y0)) * 0.7;
    out += place(`<ellipse cx="0" cy="-10" rx="9" ry="5" fill="var(--ac-white)"/><path d="M6,-12 Q10,-24 14,-24" stroke="var(--ac-white)" stroke-width="2.5" fill="none"/><path d="M14,-24 L20,-22" stroke="var(--ac-yellow)" stroke-width="2"/><path d="M-2,-6 L-3,2 M2,-6 L3,2" stroke="var(--ac-black)" stroke-width="1.2"/>`, r() * W, y, s);
  }
  return out;
}

function dangau(x, base, s = 1) {
  return place(`${[-34, 34].map((px) => `<rect x="${px - 3}" y="-70" width="6" height="70" class="wood-dk"/>`).join('')}
    <rect x="-40" y="-56" width="80" height="8" class="wood"/>
    <path d="M-56,-66 L0,-104 L56,-66 Z" class="roof-attap"/>`, x, base, s);
}

function industry(r, { base = HZ + 20, spheres = false, flare = true } = {}) {
  let out = '';
  const emitters = [];
  // storage tanks
  for (let x = -20; x < W; x += 70 + r() * 80) {
    if (spheres && r() > 0.4) {
      const rad = 30 + r() * 16;
      out += `<rect x="${f(x - rad * 0.7)}" y="${f(base - rad)}" width="4" height="${f(rad)}" class="steel"/><rect x="${f(x + rad * 0.7 - 4)}" y="${f(base - rad)}" width="4" height="${f(rad)}" class="steel"/><circle cx="${f(x)}" cy="${f(base - rad * 1.6)}" r="${f(rad)}" class="tank"/><path d="M${f(x - rad)},${f(base - rad * 1.6)} A${f(rad)},${f(rad * 0.3)} 0 0 0 ${f(x + rad)},${f(base - rad * 1.6)}" class="tank-line"/>`;
    } else {
      const w = 50 + r() * 50, h = 30 + r() * 40;
      out += `<rect x="${f(x)}" y="${f(base - h)}" width="${f(w)}" height="${f(h)}" class="tank"/><ellipse cx="${f(x + w / 2)}" cy="${f(base - h)}" rx="${f(w / 2)}" ry="6" class="tank-top"/><line x1="${f(x)}" y1="${f(base - h * 0.5)}" x2="${f(x + w)}" y2="${f(base - h * 0.5)}" class="tank-line"/>`;
    }
  }
  // columns + chimneys
  for (let i = 0; i < 5; i++) {
    const x = 60 + r() * (W - 120), h = 120 + r() * 120;
    out += `<rect x="${f(x)}" y="${f(base - h)}" width="10" height="${f(h)}" class="steel"/>${[0.3, 0.6].map((k) => `<rect x="${f(x - 4)}" y="${f(base - h * k)}" width="18" height="3" class="steel"/>`).join('')}`;
  }
  for (const x of [180 + r() * 80, 720 + r() * 120]) {
    const h = 230 + r() * 70;
    out += `<rect x="${f(x - 9)}" y="${f(base - h)}" width="18" height="${f(h)}" class="steel"/>${[0, 18, 36].map((d) => `<rect x="${f(x - 9)}" y="${f(base - h + d)}" width="18" height="9" fill="var(--ac-red)"/>`).join('')}<circle cx="${f(x)}" cy="${f(base - h - 4)}" r="2.5" class="beacon"/>`;
    emitters.push({ x, y: base - h - 6, kind: 'chimney' });
  }
  if (flare) {
    const x = 560 + r() * 60, h = 260;
    out += `<path d="M${f(x - 7)},${base} L${f(x - 2)},${f(base - h)} L${f(x + 2)},${f(base - h)} L${f(x + 7)},${base}" class="lattice"/>
      <g transform="translate(${f(x)} ${f(base - h)})"><circle r="22" class="flare-glow"/><g class="flame"><path d="M0,0 C-10,-14 -6,-30 0,-46 C6,-30 10,-14 0,0 Z" fill="var(--flame)"/><path d="M0,0 C-5,-8 -3,-18 0,-26 C3,-18 5,-8 0,0 Z" fill="#fff2b0"/></g></g>`;
  }
  // night lights
  let lights = '';
  for (let i = 0; i < 70; i++) lights += `<circle cx="${f(r() * W)}" cy="${f(base - r() * 180)}" r="1.6" class="win" style="animation-duration:${(3 + r() * 6).toFixed(1)}s;animation-delay:${(-r() * 8).toFixed(1)}s"/>`;
  out += `<g class="far-wins">${lights}</g>`;
  return { svg: out, emitters };
}

function wau(x, y, s, c1, c2, len) {
  return `<g transform="translate(${f(x)} ${f(y)})"><path d="M0,0 L${f(-len * 0.35)},${f(len)}" class="kite-string"/>
    <g class="kite" style="animation-delay:${(-(x % 3)).toFixed(1)}s"><g transform="scale(${s})">
      <path d="M0,-40 C-30,-38 -62,-22 -70,0 C-46,-6 -24,-8 0,-6 C24,-8 46,-6 70,0 C62,-22 30,-38 0,-40 Z" fill="var(--ac-${c1})"/>
      <path d="M0,-6 L0,30" stroke="var(--ac-${c2})" stroke-width="4"/>
      <path d="M0,22 C-24,24 -40,40 -36,56 C-20,44 -10,40 0,40 C10,40 20,44 36,56 C40,40 24,24 0,22 Z" fill="var(--ac-${c2})"/>
      <circle cx="0" cy="-20" r="7" fill="var(--ac-${c2})"/><path d="M-70,0 Q-80,-30 -60,-40 M70,0 Q80,-30 60,-40" stroke="var(--ac-${c1})" stroke-width="2" fill="none"/>
    </g></g></g>`;
}

// ---------- landmarks (drawn at x=0 on base y=0) ----------
const petronas = () => {
  const rows = [[0, 30], [-146, 30], [-146, 27], [-226, 27], [-226, 24], [-276, 24], [-276, 20], [-316, 20], [-316, 16],
    [-346, 16], [-346, 11], [-368, 11], [-376, 6], [-384, 3], [-384, 1.8], [-466, 0.6]];
  let fins = '';
  for (let i = -2; i <= 2; i++) fins += `<line x1="${i * 9}" y1="0" x2="${i * 4}" y2="-348"/>`;
  return `${tower(rows)}<g class="lm-fins">${fins}</g>`;
};
const twinTowers = () => `${place(petronas(), -47, 0)}${place(petronas(), 47, 0)}
  <rect x="-20" y="-162" width="40" height="7" class="lm-body"/><path d="M-18,-155 L0,-108 L18,-155" class="lm-band" fill="none"/>`;

const merdeka = () => {
  const rows = [[0, 40], [-108, 38], [-208, 34], [-298, 29], [-368, 23], [-418, 17], [-448, 11], [-464, 6], [-464, 2.6], [-598, 0.5]];
  let facets = '';
  for (let y = -8; y > -428; y -= 34) {
    const w = 40 + y * 0.055;
    facets += `<polyline points="${f(-w)},${y} 0,${y - 22} ${f(w)},${y}"/>`;
  }
  return `${tower(rows)}<g class="lm-fins">${facets}</g>`;
};

const klTower = () => `<polygon points="${polygonFromWidths([[0, 15], [-48, 9], [-148, 6], [-286, 5]])}" class="lm-body"/>
  <path d="M-6,-286 C-22,-290 -31,-302 -30,-316 C-29,-330 -22,-342 -9,-348 L9,-348 C22,-342 29,-330 30,-316 C31,-302 22,-290 6,-286 Z" class="lm-body"/>
  <path d="M-29,-316 L29,-316" class="lm-band"/>
  <polygon points="${polygonFromWidths([[-348, 3.4], [-380, 2.4], [-380, 1.3], [-456, 0.5]])}" class="lm-body"/><circle cx="0" cy="-456" r="2.6" class="beacon"/>`;

const blueMosque = () => {
  const minaret = (x, h) => `<rect x="${x - 5}" y="${-h}" width="10" height="${h}" fill="var(--ac-white)"/>
    <rect x="${x - 8}" y="${-h + 34}" width="16" height="6" fill="var(--ac-white)"/><rect x="${x - 7}" y="${-h * 0.6}" width="14" height="5" fill="var(--ac-white)"/>
    <path d="M${x - 6},${-h} L${x},${-h - 30} L${x + 6},${-h} Z" fill="var(--ac-blue)"/>`;
  let ribs = '';
  for (let i = -3; i <= 3; i++) ribs += `<path d="M${i * 22},-100 Q${i * 14},-170 0,-202" stroke="var(--ac-white)" stroke-opacity=".25" fill="none"/>`;
  return `${minaret(-112, 300)}${minaret(112, 300)}${minaret(-160, 340)}${minaret(160, 340)}
    <rect x="-130" y="-70" width="260" height="70" fill="var(--ac-white)"/>
    ${[-100, -70, -40, -10, 20, 50, 80].map((x) => `<path d="M${x},0 V-30 Q${x + 10},-44 ${x + 20},-30 V0 Z" class="arch"/>`).join('')}
    <rect x="-84" y="-102" width="168" height="32" fill="var(--ac-white)"/>
    <path d="M-84,-102 C-86,-172 -42,-202 0,-204 C42,-202 86,-172 84,-102 Z" fill="var(--ac-blue)"/>${ribs}
    <path d="M0,-204 V-224" stroke="var(--ac-gold)" stroke-width="3"/>`;
};

const putraMosque = () => {
  let ribs = '';
  for (let i = -3; i <= 3; i++) ribs += `<path d="M${i * 19},-64 Q${i * 13},-140 0,-188" stroke="var(--ac-white)" stroke-opacity=".3" fill="none"/>`;
  const tiers = [[0, -120, 15], [-120, -200, 12], [-200, -262, 10], [-262, -300, 8]];
  return `<rect x="-130" y="-64" width="260" height="64" fill="var(--ac-rose)"/>
    ${[-110, -80, -50, -20, 10, 40, 70, 100].map((x) => `<path d="M${x},0 V-28 Q${x + 9},-40 ${x + 18},-28 V0 Z" class="arch"/>`).join('')}
    <path d="M-120,-64 C-124,-90 -100,-104 -88,-104 C-76,-104 -54,-90 -58,-64 Z M120,-64 C124,-90 100,-104 88,-104 C76,-104 54,-90 58,-64 Z" fill="var(--ac-pink)"/>
    <path d="M-72,-64 C-82,-136 -40,-182 0,-188 C40,-182 82,-136 72,-64 Z" fill="var(--ac-pink)"/>${ribs}
    <path d="M0,-188 V-204" stroke="var(--ac-gold)" stroke-width="3"/>
    <g transform="translate(176 0)">${tiers.map(([y0, y1, w]) => `<rect x="${-w}" y="${y1}" width="${w * 2}" height="${y0 - y1}" fill="var(--ac-rose)"/><rect x="${-w - 4}" y="${y1}" width="${w * 2 + 8}" height="5" fill="var(--ac-white)"/>`).join('')}
      <path d="M-8,-300 L0,-336 L8,-300 Z" fill="var(--ac-pink)"/></g>`;
};

const perdanaPutra = () => `<rect x="-150" y="-80" width="300" height="80" fill="var(--ac-cream)"/>
  ${[-130, -100, -70, -40, 20, 50, 80, 110].map((x) => `<rect x="${x}" y="-66" width="16" height="44" class="arch"/>`).join('')}
  <rect x="-44" y="-112" width="88" height="32" fill="var(--ac-cream)"/>
  <path d="M-44,-112 C-56,-150 -22,-178 0,-196 C22,-178 56,-150 44,-112 Z" fill="var(--ac-green)"/>
  <path d="M0,-196 V-214" stroke="var(--ac-gold)" stroke-width="3"/>`;

const komtar = () => {
  let bands = '';
  for (let y = -12; y > -380; y -= 12) bands += `<line x1="-34" y1="${y}" x2="34" y2="${y}"/>`;
  return `<rect x="-34" y="-390" width="68" height="390" class="lm-body"/><rect x="0" y="-390" width="34" height="390" class="lm-lit"/>
    <g class="lm-fins">${bands}</g><rect x="-26" y="-412" width="52" height="22" class="lm-body"/><rect x="-6" y="-440" width="12" height="28" class="lm-body"/>
    <circle cx="0" cy="-440" r="2.6" class="beacon"/>
    <path d="M60,0 A56,56 0 0 1 172,0 Z" class="lm-body"/><path d="M74,0 L116,-56 L158,0 M88,-36 L144,-36 M116,-56 L116,0" class="lm-fins"/>`;
};

const christChurch = () => `
  <rect x="-80" y="-170" width="160" height="170" fill="var(--ac-red)"/>
  <path d="M-92,-168 L0,-232 L92,-168 Z" fill="var(--ac-red)"/><path d="M-92,-168 L0,-232 L92,-168" stroke="var(--ac-cream)" stroke-width="5" fill="none"/>
  <rect x="-16" y="-262" width="32" height="34" fill="var(--ac-red)"/><path d="M-20,-262 L0,-284 L20,-262 Z" class="roof"/>
  <path d="M0,-300 V-284 M-7,-294 H7" stroke="var(--ac-white)" stroke-width="3"/>
  ${[-52, 36].map((x) => `<path d="M${x},-60 V-120 Q${x + 8},-134 ${x + 16},-120 V-60 Z" fill="var(--ac-cream)"/>`).join('')}
  <path d="M-18,0 V-70 Q0,-92 18,-70 V0 Z" class="arch"/><circle cx="0" cy="-150" r="10" fill="var(--ac-cream)"/>`;

const stadthuys = () => `<rect x="0" y="-150" width="260" height="150" fill="var(--ac-red)"/><path d="M-6,-148 L266,-148 L250,-176 L10,-176 Z" class="roof"/>
  ${[20, 60, 100, 140, 180, 220].map((x) => `<rect x="${x}" y="-128" width="18" height="34" fill="var(--ac-cream)"/><rect x="${x}" y="-66" width="18" height="40" fill="var(--ac-cream)"/>`).join('')}`;

const windmill = () => `<path d="M-26,0 L-16,-150 L16,-150 L26,0 Z" fill="var(--ac-cream)"/>
  <path d="M-22,-150 L0,-180 L22,-150 Z" class="roof"/><path d="M-8,0 V-30 Q0,-40 8,-30 V0 Z" class="arch"/>
  <g transform="translate(0 -160)"><g class="spin">${[0, 90, 180, 270].map((a) => `<g transform="rotate(${a})"><rect x="-3" y="-118" width="6" height="118" class="wood-dk"/><rect x="3" y="-112" width="22" height="90" class="sail-cloth"/></g>`).join('')}<circle r="7" class="wood-dk"/></g></g>`;

const tamingSari = () => `<rect x="-6" y="-330" width="12" height="330" class="lm-body"/><rect x="-10" y="-344" width="20" height="14" class="lm-body"/>
  <g class="cabin"><rect x="-30" y="-46" width="60" height="16" rx="8" fill="var(--ac-white)"/><rect x="-26" y="-42" width="52" height="5" class="win-lit"/></g>`;

const abuBakarMosque = () => `
  ${[-120, -60, 60, 120].map((x) => `<rect x="${x - 9}" y="-150" width="18" height="150" fill="var(--ac-white)"/><path d="M${x - 11},-150 Q${x},-176 ${x + 11},-150 Z" fill="var(--ac-blue)"/><rect x="${x - 12}" y="-100" width="24" height="5" fill="var(--ac-white)"/>`).join('')}
  <rect x="-130" y="-80" width="260" height="80" fill="var(--ac-white)"/>
  <path d="M-136,-80 L-100,-104 L100,-104 L136,-80 Z" fill="var(--ac-blue)"/>
  <rect x="-30" y="-124" width="60" height="22" fill="var(--ac-white)"/><path d="M-34,-124 Q0,-170 34,-124 Z" fill="var(--ac-blue)"/>
  ${[-100, -70, -40, 30, 60, 90].map((x) => `<path d="M${x},0 V-36 Q${x + 6},-46 ${x + 12},-36 V0 Z" class="arch"/>`).join('')}`;

const ipohStation = () => `
  <rect x="-260" y="-110" width="520" height="110" fill="var(--ac-white)"/>
  ${Array.from({ length: 16 }, (_, i) => -250 + i * 32).map((x) => `<path d="M${x},0 V-40 Q${x + 12},-58 ${x + 24},-40 V0 Z" class="arch"/>`).join('')}
  ${Array.from({ length: 16 }, (_, i) => -250 + i * 32).map((x) => `<rect x="${x + 6}" y="-92" width="12" height="22" class="shwin"/>`).join('')}
  <rect x="-60" y="-150" width="120" height="40" fill="var(--ac-white)"/>
  <path d="M-46,-150 C-50,-190 -18,-214 0,-222 C18,-214 50,-190 46,-150 Z" fill="var(--ac-white)"/>
  ${[-240, -150, 150, 240].map((x) => `<rect x="${x - 12}" y="-140" width="24" height="30" fill="var(--ac-white)"/><path d="M${x - 14},-140 Q${x},-170 ${x + 14},-140 Z" fill="var(--ac-white)"/>`).join('')}
  <path d="M-260,-110 L260,-110" stroke="var(--ac-cream)" stroke-width="4"/>`;

const zahirMosque = () => `<rect x="-110" y="-60" width="220" height="60" fill="var(--ac-white)"/>
  ${[-80, 0, 80].map((x, i) => `<rect x="${x - 26}" y="-76" width="52" height="16" fill="var(--ac-white)"/><path d="M${x - 26},-76 C${x - 30},${i === 1 ? -126 : -110} ${x + 30},${i === 1 ? -126 : -110} ${x + 26},-76 Z" fill="var(--ac-black)"/>`).join('')}
  ${[-130, 130].map((x) => `<rect x="${x - 6}" y="-150" width="12" height="150" fill="var(--ac-white)"/><path d="M${x - 8},-150 Q${x},-170 ${x + 8},-150 Z" fill="var(--ac-black)"/>`).join('')}`;

const kuantan188 = () => `<polygon points="${polygonFromWidths([[0, 12], [-200, 7], [-230, 6]])}" class="lm-body"/>
  <path d="M-26,-230 L26,-250 L26,-272 L-26,-262 Z" class="lm-body"/><path d="M-4,-266 L0,-320 L4,-266 Z" class="lm-body"/><circle cx="0" cy="-320" r="2.4" class="beacon"/>`;

const crystalMosque = () => `
  ${[-120, -66, 66, 120].map((x) => `<rect x="${x - 6}" y="-200" width="12" height="200" class="glass"/><path d="M${x - 8},-200 L${x},-236 L${x + 8},-200 Z" class="glass"/>`).join('')}
  <rect x="-100" y="-80" width="200" height="80" class="glass"/>
  ${[-80, -50, -20, 10, 40, 70].map((x) => `<line x1="${x}" y1="-80" x2="${x}" y2="0" class="glass-line"/>`).join('')}
  <path d="M-58,-80 C-66,-136 -24,-168 0,-176 C24,-168 66,-136 58,-80 Z" class="glass"/>
  <path d="M0,-176 V-196" stroke="var(--ac-gold)" stroke-width="3"/>
  <g class="crystal-glow"><ellipse cx="0" cy="-90" rx="150" ry="110"/></g>`;

const kinabalu = () => {
  const pts = [[-360, 0], [-250, -60], [-170, -130], [-120, -200], [-96, -238], [-80, -222], [-62, -268], [-44, -246], [-28, -288], [-12, -270], [4, -300], [18, -262], [34, -282], [48, -244], [64, -262], [86, -214], [126, -160], [200, -90], [290, -36], [380, 0]];
  return `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" class="mtn"/>
    <polygon points="-120,-200 -96,-238 -80,-222 -62,-268 -44,-246 -28,-288 -12,-270 4,-300 18,-262 34,-282 48,-244 64,-262 86,-214 60,-200 30,-226 0,-212 -30,-236 -60,-206" class="mtn-rock"/>`;
};

const dunKuching = () => {
  let pleats = '';
  for (let i = -4; i <= 4; i++) pleats += `<path d="M${i * 34},-56 Q${i * 22},-120 0,-196" stroke="var(--ac-black)" stroke-opacity=".18" fill="none"/>`;
  return `<rect x="-140" y="-56" width="280" height="56" fill="var(--ac-white)"/>
    ${[-120, -90, -60, -30, 0, 30, 60, 90].map((x) => `<rect x="${x + 4}" y="-46" width="14" height="36" class="shwin"/>`).join('')}
    <path d="M-170,-54 Q-140,-80 -116,-74 Q-96,-122 -60,-114 Q-36,-176 0,-198 Q36,-176 60,-114 Q96,-122 116,-74 Q140,-80 170,-54 Z" fill="var(--ac-gold)"/>${pleats}
    <path d="M0,-198 V-220" stroke="var(--ac-gold)" stroke-width="3"/>`;
};

const darulHana = () => {
  const twr = (x) => `<rect x="${x - 7}" y="-210" width="14" height="210" class="lm-body"/><path d="M${x - 14},-210 L${x},-250 L${x + 14},-210 Z" class="lm-body"/>
    <rect x="${x - 12}" y="-170" width="24" height="10" fill="var(--ac-gold)"/>`;
  return `${twr(-90)}${twr(90)}<path d="M-230,-20 C-150,-46 -60,-40 0,-30 C60,-20 150,-14 230,-36" class="deck"/>`;
};

const wismaSanyan = () => `<rect x="-30" y="-300" width="60" height="300" class="lm-body"/><rect x="0" y="-300" width="30" height="300" class="lm-lit"/>
  <path d="M-30,-300 L0,-336 L30,-300 Z" class="lm-body"/><path d="M-2,-336 L0,-380 L2,-336 Z" class="lm-body"/><circle cx="0" cy="-380" r="2.4" class="beacon"/>`;

const derrick = () => `<path d="M-30,0 L-6,-150 L6,-150 L30,0 M-24,-36 L24,-36 M-18,-74 L18,-74 M-12,-112 L12,-112 M-24,-36 L18,-74 M24,-36 L-18,-74 M-18,-74 L12,-112 M18,-74 L-12,-112" class="lattice"/>
  <rect x="-10" y="-160" width="20" height="10" class="wood-dk"/>`;

const minangkabau = () => {
  const roof = (s, y) => `<path transform="translate(0 ${y}) scale(${s})" d="M-120,0 Q-100,-24 -132,-74 Q-70,-40 -40,-44 Q-34,-70 -48,-104 Q-14,-70 0,-70 Q14,-70 48,-104 Q34,-70 40,-44 Q70,-40 132,-74 Q100,-24 120,0 Z" class="roof-minang"/>`;
  return `<rect x="-110" y="-90" width="220" height="90" class="wood"/>
    ${[-90, -50, 30, 70].map((x) => `<rect x="${x}" y="-70" width="20" height="36" class="kwin"/>`).join('')}
    <rect x="-14" y="-70" width="28" height="70" class="wood-dk"/>
    ${roof(1, -88)}`;
};

const rainTree = (s = 1) => place(`<path d="M-8,0 C-10,-60 -4,-110 -30,-150 M8,0 C10,-60 6,-110 40,-150 M0,-60 C10,-100 0,-130 10,-160" class="branch"/>
  ${[[-150, -160, 70], [-80, -190, 80], [0, -205, 90], [90, -190, 80], [160, -160, 70], [-40, -150, 70], [60, -150, 70]].map(([x, y, rr]) => `<ellipse cx="${x}" cy="${y}" rx="${rr}" ry="${rr * 0.55}" class="jg1"/>`).join('')}`, 0, 0, s);

const longhouse = (len = 460) => {
  const n = Math.floor(len / 56);
  return `${Array.from({ length: n + 1 }, (_, i) => -len / 2 + i * (len / n)).map((x) => `<rect x="${x - 3}" y="-50" width="6" height="50" class="wood-dk"/>`).join('')}
    <rect x="${-len / 2}" y="-104" width="${len}" height="56" class="wood"/>
    ${Array.from({ length: n }, (_, i) => -len / 2 + 18 + i * (len / n)).map((x) => `<rect x="${x}" y="-92" width="18" height="34" class="kwin"/>`).join('')}
    <path d="M${-len / 2 - 20},-100 L${-len / 2 + 30},-150 L${len / 2 - 30},-150 L${len / 2 + 20},-100 Z" class="roof-attap"/>
    <rect x="${-len / 2}" y="-52" width="${len}" height="6" class="wood-dk"/>`;
};

const lighthouse = () => `<path d="M-12,0 L-8,-110 L8,-110 L12,0 Z" fill="var(--ac-white)"/><rect x="-11" y="-74" width="22" height="10" fill="var(--ac-red)"/>
  <rect x="-10" y="-126" width="20" height="16" class="win-lit"/><path d="M-12,-126 L0,-140 L12,-126 Z" fill="var(--ac-red)"/>
  <g transform="translate(0 -118)"><g class="beam"><path d="M0,0 L420,-40 L420,40 Z" class="beam-light"/></g></g>`;

// ---------- reusable compositions ----------
function townFar(r, opts = {}) {
  return hills(r, { min: 80, max: 190, cls: 'hill-far' }) + city(r, { minH: 30, maxH: 120, wave: false, ws: 0.8, ...opts });
}
function townMid(r, { dome = pick(r, ['gold', 'green', 'blue']), mosqueX = 760 + r() * 80, clockX = 120 + r() * 60 } = {}) {
  return shophouses(r, { s: 0.74, x0: -30, x1: W + 30 }) + mosque(mosqueX, GND, 0.9, dome) + clockTower(clockX, GND, 0.85) + palm(1000, GND, 0.85, true);
}
function shoreMid(r, { sand = 866, palms = 2 } = {}) {
  let out = `<rect x="-60" y="${sand}" width="${W + 120}" height="${GND - sand + 4}" class="sand"/>
    <path d="M-60,${sand} ${Array.from({ length: 24 }, (_, i) => `q 25,-5 50,0`).join(' ')}" class="foam"/>`;
  out += boat(140 + r() * 80, sand + 26, 0.7, 'blue', 'yellow', -1);
  for (let i = 0; i < palms; i++) out += palm(i ? 980 : 40, GND, 0.95, !!i, 34);
  return out;
}

// ---------- the themes ----------
function T(en, ms, flyer, build) { return { en, ms, flyer, build }; }

export const THEMES = {
  kl: T('Petronas Twin Towers · Merdeka 118', 'Menara Berkembar Petronas · Merdeka 118', 'plane', (r) => ({
    far: city(r) + place(klTower(), 122, HZ) + place(merdeka(), 300, HZ) + place(twinTowers(), 753, HZ),
    mid: palm(42, GND, 1.02) + shophouses(r) + palm(994, GND, 0.95, true),
  })),
  shahalam: T('Blue Mosque', 'Masjid Biru', 'plane', (r) => ({
    far: hills(r, { min: 60, max: 150 }) + city(r, { minH: 40, maxH: 150 }) + place(blueMosque(), 700, HZ),
    mid: palm(42, GND, 1) + shophouses(r) + palm(994, GND, 0.95, true),
  })),
  pj: T('Federal Highway', 'Lebuhraya Persekutuan', 'plane', (r) => {
    const deckY = 792;
    const car = (x, y, c, dir) => `<rect x="${f(x)}" y="${y}" width="16" height="7" rx="2" fill="var(--ac-${c})"/><rect x="${f(dir > 0 ? x : x + 13)}" y="${y + 2}" width="3" height="3" class="${dir > 0 ? 'tail' : 'head'}"/>`;
    const lane = (y, dir) => {
      let pat = '';
      for (let x = 0; x < 400; x += 22 + r() * 46) pat += car(x, y, pick(r, ['red', 'blue', 'white', 'yellow', 'black', 'teal']), dir);
      return `<g class="cars ${dir > 0 ? 'cars-r' : 'cars-l'}">${[-1, 0, 1, 2, 3].map((k) => `<g transform="translate(${k * 400} 0)">${pat}</g>`).join('')}</g>`;
    };
    let pillars = '';
    for (let x = 30; x < W; x += 150) pillars += `<rect x="${x}" y="${deckY + 14}" width="20" height="${GND - deckY - 14}" class="concrete-dk"/>`;
    return {
      far: city(r, { minH: 30, maxH: 110, ws: 0.6 }) + place(klTower(), 230, HZ, 0.5) + place(twinTowers(), 330, HZ, 0.55) + place(merdeka(), 160, HZ, 0.5)
        + city(r, { x0: 520, base: 800, minH: 120, maxH: 260, wave: false }),
      mid: shophouses(r, { s: 0.55 }) + pillars + lane(deckY - 16, 1) + lane(deckY - 8, -1)
        + `<rect x="-20" y="${deckY}" width="${W + 40}" height="14" class="concrete"/><rect x="-20" y="${deckY - 4}" width="${W + 40}" height="4" class="concrete-dk"/>`
        + palm(30, GND, 0.8) + palm(1000, GND, 0.8, true),
    };
  }),
  port: T('Container port', 'Pelabuhan kontena', 'plane', (r) => ({
    far: hills(r, { base: 728, min: 30, max: 90 }) + city(r, { base: 728, minH: 20, maxH: 70, ws: 0.6, wave: false })
      + water(r, 728, 884) + ship(742, 0.55, 140, -20, r) + ship(760, 0.75, 110, -80, r),
    mid: `<rect x="-60" y="878" width="${W + 120}" height="34" class="concrete"/>` + containers(r, -40, 300, 880) + containers(r, 680, 1060, 880)
      + crane(110, 880, 1.1, 'red') + crane(300, 880, 1.05, 'blue') + crane(740, 880, 1.1, 'red') + crane(930, 880, 1.05, 'blue'),
  })),
  fireflies: T('Fireflies · Bukit Melawati', 'Kelip-kelip · Bukit Melawati', 'birds', (r) => {
    let flies = '';
    for (let i = 0; i < 46; i++) flies += `<circle cx="${f(r() * W)}" cy="${f(800 + r() * 90)}" r="2.2" class="firefly" style="animation-delay:${(-r() * 3).toFixed(1)}s;animation-duration:${(1.4 + r() * 2).toFixed(1)}s"/>`;
    let mangroves = '';
    for (let x = -40; x < W + 40; x += 30 + r() * 40) mangroves += `<ellipse cx="${f(x)}" cy="${f(856 + r() * 10)}" rx="${f(30 + r() * 30)}" ry="${f(20 + r() * 18)}" class="jg2"/>`;
    return {
      far: hills(r, { min: 40, max: 100 }) + ridge([[-40, HZ - 20], [60, 600], [180, 572], [300, 620], [400, HZ - 10]], HZ + 4, 'hill-mid') + place(lighthouse(), 190, 578)
        + water(r, HZ, 880),
      mid: mangroves + kampungHouse(860, 880, 0.8, 'zinc') + `<g class="flies">${flies}</g>`,
    };
  }),
  putrajaya: T('Putra Mosque', 'Masjid Putra', 'plane', (r) => {
    const bank = place(perdanaPutra(), 250, HZ, 0.8) + place(putraMosque(), 660, HZ, 1.05);
    return {
      far: hills(r, { min: 50, max: 120 }) + city(r, { minH: 30, maxH: 110, ws: 0.7, wave: false }) + bank + water(r, HZ, 892, mirror(bank, HZ)),
      mid: `<rect x="-60" y="890" width="${W + 120}" height="22" class="concrete"/>` + palm(60, GND, 0.9) + palm(980, GND, 0.9, true)
        + [200, 820].map((x) => `<rect x="${x}" y="800" width="4" height="100" class="steel"/><circle cx="${x + 2}" cy="798" r="6" class="lamp"/>`).join(''),
    };
  }),
  georgetown: T('Komtar · Penang Hill', 'Komtar · Bukit Bendera', 'plane', (r) => ({
    far: ridge([[-60, 560], [120, 470], [300, 520], [460, 450], [640, 540], [820, 500], [1084, 590]], HZ + 4, 'hill-far')
      + city(r, { minH: 50, maxH: 170 }) + place(komtar(), 680, HZ),
    mid: palm(42, GND, 0.95) + shophouses(r) + palm(990, GND, 0.9, true),
  })),
  bridge: T('Penang Bridge', 'Jambatan Pulau Pinang', 'plane', (r) => {
    const deckY = 752;
    let piers = '', cables = '';
    for (let x = -20; x < W + 20; x += 64) piers += `<rect x="${x}" y="${deckY + 6}" width="8" height="34" class="concrete-dk"/>`;
    for (const px of [700, 900]) {
      for (let k = 1; k <= 6; k++) cables += `<line x1="${px}" y1="${deckY - 116}" x2="${px - k * 18}" y2="${deckY}"/><line x1="${px}" y1="${deckY - 116}" x2="${px + k * 18}" y2="${deckY}"/>`;
    }
    let lights = '';
    for (let x = 0; x < 400; x += 26 + r() * 30) lights += `<rect x="${f(x)}" y="${deckY - 6}" width="10" height="5" rx="2" fill="var(--ac-${pick(r, ['red', 'white', 'blue', 'yellow'])})"/>`;
    return {
      far: ridge([[-60, 640], [140, 560], [320, 600], [520, 590], [700, 650], [1084, 680]], HZ - 20, 'hill-far') + city(r, { base: HZ - 26, minH: 20, maxH: 80, ws: 0.55, wave: false })
        + place(komtar(), 470, HZ - 26, 0.42) + water(r, HZ - 26, 900)
        + piers + `<g class="cables">${cables}</g>` + [700, 900].map((px) => `<rect x="${px - 10}" y="${deckY - 120}" width="7" height="160" class="concrete"/><rect x="${px + 3}" y="${deckY - 120}" width="7" height="160" class="concrete"/><rect x="${px - 10}" y="${deckY - 90}" width="20" height="6" class="concrete"/>`).join('')
        + `<g class="cars cars-r">${[-1, 0, 1, 2, 3].map((k) => `<g transform="translate(${k * 400} 0)">${lights}</g>`).join('')}</g>`
        + `<rect x="-20" y="${deckY}" width="${W + 40}" height="8" class="concrete"/>`,
      mid: boats(r, 850, 890, 3) + grass(892),
    };
  }),
  ipoh: T('Ipoh Railway Station', 'Stesen Kereta Api Ipoh', 'plane', (r) => {
    let karst = '';
    for (let x = -40; x < W + 60; x += 110 + r() * 90) {
      const w = 70 + r() * 70, h = 170 + r() * 170;
      karst += `<path d="M${f(x - w)},${HZ + 4} C${f(x - w * 1.05)},${f(HZ - h * 0.6)} ${f(x - w * 0.8)},${f(HZ - h)} ${f(x)},${f(HZ - h)} C${f(x + w * 0.8)},${f(HZ - h)} ${f(x + w * 1.05)},${f(HZ - h * 0.6)} ${f(x + w)},${HZ + 4} Z" class="karst"/>
        <path d="M${f(x - w * 0.3)},${f(HZ - h * 0.85)} V${HZ} M${f(x + w * 0.25)},${f(HZ - h * 0.8)} V${HZ}" class="karst-streak"/>`;
    }
    return {
      far: karst + city(r, { minH: 20, maxH: 80, ws: 0.7, wave: false }) + mist(r, HZ - 60, 3),
      mid: shophouses(r, { x0: -30, x1: 380 }) + place(ipohStation(), 720, GND, 0.86) + palm(1000, GND, 0.85, true),
    };
  }),
  taiping: T('Lake Gardens', 'Taman Tasik Taiping', 'birds', (r) => ({
    far: ridge([[-60, 560], [160, 440], [360, 500], [560, 420], [760, 520], [1084, 560]], HZ + 4, 'hill-far') + mist(r, 560, 4)
      + hills(r, { min: 30, max: 80, cls: 'hill-mid' }) + water(r, HZ, GND),
    mid: place(rainTree(1.1), 90, GND) + place(rainTree(1.2), 930, GND) + boat(640, 880, 0.55, 'red', 'white', -1),
  })),
  alorsetar: T('Menara Alor Setar · paddy fields', 'Menara Alor Setar · sawah padi', 'birds', (r) => ({
    far: ridge([[-60, HZ - 10], [120, 600], [280, 500], [420, 590], [560, HZ - 20]], HZ + 4, 'hill-far') + city(r, { x0: 520, minH: 20, maxH: 90, ws: 0.7, wave: false })
      + place(zahirMosque(), 620, HZ, 0.6) + place(klTower(), 830, HZ, 0.72) + paddy(r, HZ),
    mid: dangau(860, GND - 10, 0.9) + egrets(r, 780, 890, 7) + palm(30, GND, 0.9),
  })),
  paddy: T('Paddy fields · Gunung Jerai', 'Sawah padi · Gunung Jerai', 'birds', (r) => ({
    far: ridge([[-60, HZ - 20], [140, 610], [300, 492], [460, 600], [640, HZ - 30], [1084, HZ - 30]], HZ + 4, 'hill-far') + hills(r, { min: 20, max: 60, cls: 'hill-mid' })
      + paddy(r, HZ),
    mid: kampungHouse(130, GND - 20, 0.55, 'zinc') + dangau(880, GND - 10, 0.85) + egrets(r, 780, 890, 8) + palm(1000, GND, 0.85, true),
  })),
  paddykarst: T('Paddy fields · limestone hills', 'Sawah padi · bukit batu kapur', 'birds', (r) => {
    let karst = '';
    for (const x of [140, 420, 760, 960]) {
      const w = 60 + r() * 60, h = 110 + r() * 120;
      karst += `<path d="M${f(x - w)},${HZ + 4} C${f(x - w)},${f(HZ - h * 0.7)} ${f(x - w * 0.6)},${f(HZ - h)} ${f(x)},${f(HZ - h)} C${f(x + w * 0.6)},${f(HZ - h)} ${f(x + w)},${f(HZ - h * 0.7)} ${f(x + w)},${HZ + 4} Z" class="karst"/>`;
    }
    return { far: hills(r, { min: 30, max: 80 }) + karst + paddy(r, HZ), mid: dangau(860, GND - 10, 0.9) + egrets(r, 780, 890, 6) + palm(40, GND, 0.9) };
  }),
  langkawi: T('Mat Cincang cable car', 'Kereta kabel Gunung Mat Cincang', 'eagle', (r) => ({
    far: ridge([[-60, HZ - 40], [160, 640], [360, 560], [500, 470], [620, 400], [720, 430], [820, 520], [1084, 640]], HZ + 4, 'hill-mid')
      + `<path d="M420,${HZ - 70} L640,412" class="cable"/>` + [0, 1, 2].map((k) => `<g class="gondola" style="animation-delay:${-k * 6}s"><rect x="414" y="${HZ - 74}" width="14" height="12" rx="2" fill="var(--ac-red)"/></g>`).join('')
      + `<path d="M600,404 Q640,388 690,400" class="deck"/>` + water(r, HZ, 900) + ridge([[40, HZ], [120, HZ - 26], [200, HZ]], HZ + 2, 'hill-far'),
    mid: shoreMid(r) + boats(r, 820, 860, 2, 0.6),
  })),
  seremban: T('Minangkabau roofs', 'Bumbung Minangkabau', 'plane', (r) => ({
    far: hills(r, { min: 90, max: 200 }) + hills(r, { min: 40, max: 90, cls: 'hill-mid' }) + city(r, { minH: 20, maxH: 90, ws: 0.7, wave: false }),
    mid: shophouses(r, { s: 0.7, x0: 280, x1: 640 }) + place(minangkabau(), 150, GND, 0.95) + place(minangkabau(), 820, GND, 1.15) + palm(1004, GND, 0.8, true),
  })),
  melaka: T('Christ Church · Stadthuys', 'Gereja Christ · Stadthuys', 'plane', (r) => ({
    far: city(r, { minH: 40, maxH: 130, wave: false, ws: 0.8 }) + ridge([[-60, HZ], [80, 650], [200, 630], [340, HZ]], HZ + 4, 'hill-mid')
      + `<path d="M150,640 V600 H200 V640" class="ruin"/>` + place(tamingSari(), 860, HZ),
    mid: place(windmill(), 215, GND, 0.9) + clockTower(70, GND, 0.95, 'red') + place(christChurch(), 690, GND) + place(stadthuys(), 790, GND, 0.9) + palm(560, GND, 0.75),
  })),
  jb: T('Sultan Abu Bakar Mosque · Johor Strait', 'Masjid Sultan Abu Bakar · Selat Tebrau', 'plane', (r) => ({
    far: city(r, { x0: 430, minH: 80, maxH: 270 }) + ridge([[-60, HZ - 30], [120, HZ - 90], [320, HZ - 100], [460, HZ - 20]], HZ + 4, 'hill-mid')
      + place(abuBakarMosque(), 220, HZ - 92, 0.9) + water(r, HZ, 896) + boats(r, 770, 820, 3, 0.55),
    mid: `<rect x="-60" y="892" width="${W + 120}" height="20" class="concrete"/>` + palm(60, GND, 0.95) + palm(960, GND, 0.95, true),
  })),
  industrial: T('Industrial zone', 'Kawasan perindustrian', 'plane', (r) => {
    const ind = industry(r);
    return { far: hills(r, { min: 40, max: 110 }) + ind.svg, mid: grass(860) + `<path d="M-20,858 H${W + 20}" class="fence"/>` + palm(40, GND, 0.85) + palm(990, GND, 0.85, true), emitters: ind.emitters };
  }),
  lng: T('LNG plant', 'Loji LNG', 'hornbill', (r) => {
    const ind = industry(r, { base: HZ - 10, spheres: true });
    return { far: hills(r, { min: 40, max: 100 }) + ind.svg + water(r, HZ, 892), mid: grass(888) + boats(r, 830, 870, 2, 0.6), emitters: ind.emitters };
  }),
  waterfall: T('Kota Tinggi Falls', 'Air Terjun Kota Tinggi', 'hornbill', (r) => {
    let streams = '';
    for (let i = 0; i < 9; i++) streams += `<line x1="${650 + i * 9}" y1="${HZ - 250}" x2="${646 + i * 10}" y2="${HZ + 50}" class="fall" style="animation-delay:${(-r()).toFixed(2)}s"/>`;
    return {
      far: jungle(r, HZ - 120, 0, { min: 80, max: 180 }) + mist(r, HZ - 140, 3) + jungle(r, HZ, 1, { min: 40, max: 120 })
        + `<path d="M560,${HZ + 60} L590,${HZ - 270} L770,${HZ - 280} L790,${HZ + 60} Z" class="rock"/>` + `<g>${streams}</g>`
        + water(r, HZ + 50, 900),
      mid: jungle(r, GND, 2, { min: 20, max: 70, x0: -60, x1: 380 }) + jungle(r, GND, 2, { min: 20, max: 70, x0: 820, x1: W + 60 }),
      emitters: [{ x: 690, y: HZ + 50, kind: 'mist' }],
    };
  }),
  kuantan: T('Teluk Cempedak · Kuantan 188', 'Teluk Cempedak · Kuantan 188', 'birds', (r) => ({
    far: ridge([[-60, HZ - 10], [60, 640], [200, 660], [300, HZ - 4]], HZ + 4, 'hill-mid') + city(r, { x0: 560, minH: 30, maxH: 120, ws: 0.7, wave: false })
      + place(kuantan188(), 800, HZ) + water(r, HZ, 866) + boats(r, 770, 830, 2, 0.5),
    mid: shoreMid(r),
  })),
  rainforest: T('Rainforest', 'Hutan hujan', 'hornbill', (r) => ({
    far: jungle(r, HZ - 150, 0, { min: 60, max: 170 }) + mist(r, HZ - 160, 3) + jungle(r, HZ - 40, 1, { min: 40, max: 130 }) + mist(r, HZ - 50, 3)
      + water(r, HZ + 60, 900) + `<g class="sail" style="animation-duration:70s;animation-delay:-20s">${place(`<path d="M-60,-8 L60,-8 L50,0 L-52,0 Z" class="wood-dk"/><circle cx="20" cy="-18" r="5" class="wood-dk"/><rect x="16" y="-14" width="8" height="8" class="wood-dk"/>`, 0, 860, 0.9)}</g>`,
    mid: jungle(r, GND, 2, { min: 10, max: 60, x0: -60, x1: 340 }) + jungle(r, GND, 2, { min: 10, max: 60, x0: 840, x1: W + 60 }),
  })),
  longhouse: T('Longhouse on the Rajang', 'Rumah panjang di Sungai Rajang', 'hornbill', (r) => ({
    far: jungle(r, HZ - 120, 0, { min: 60, max: 170 }) + mist(r, HZ - 130, 3) + jungle(r, HZ - 20, 1, { min: 30, max: 110 }) + water(r, HZ + 20, 900)
      + `<g class="sail" style="animation-duration:60s;animation-delay:-10s">${place(`<path d="M-60,-8 L60,-8 L50,0 L-52,0 Z" class="wood-dk"/><circle cx="20" cy="-18" r="5" class="wood-dk"/>`, 0, 820, 0.8)}</g>`,
    mid: place(longhouse(520), 800, 876) + jungle(r, GND, 2, { min: 10, max: 50, x0: -60, x1: 300 }),
  })),
  beach: T('Seaside', 'Tepi pantai', 'birds', (r) => ({
    far: (r() > 0.5 ? ridge([[-60, HZ], [80, HZ - 50], [220, HZ - 30], [320, HZ]], HZ + 2, 'hill-far') : '') + water(r, HZ, 866) + boats(r, 760, 830, 3, 0.5),
    mid: shoreMid(r),
  })),
  islands: T('Perhentian Islands', 'Pulau Perhentian', 'birds', (r) => ({
    far: ridge([[560, HZ], [660, HZ - 70], [760, HZ - 54], [860, HZ - 80], [980, HZ]], HZ + 2, 'hill-mid') + ridge([[200, HZ], [280, HZ - 40], [380, HZ]], HZ + 2, 'hill-far')
      + water(r, HZ, 866) + boats(r, 760, 840, 4, 0.5),
    mid: shoreMid(r),
  })),
  crystal: T('Crystal Mosque', 'Masjid Kristal', 'birds', (r) => {
    const bank = place(crystalMosque(), 700, HZ + 10);
    return {
      far: city(r, { minH: 20, maxH: 90, ws: 0.6, wave: false }) + bank + water(r, HZ + 10, 896, mirror(bank, HZ + 10)) + boats(r, 800, 850, 2, 0.6),
      mid: `<rect x="-60" y="892" width="${W + 120}" height="20" class="concrete"/>` + palm(50, GND, 0.9) + palm(990, GND, 0.9, true),
    };
  }),
  wau: T('Wau bulan kites', 'Wau bulan', 'birds', (r) => ({
    far: hills(r, { min: 40, max: 110 }) + city(r, { minH: 20, maxH: 70, ws: 0.6, wave: false }) + grass(HZ)
      + wau(700, 300, 0.9, 'red', 'yellow', 460) + wau(880, 380, 0.7, 'blue', 'yellow', 380) + wau(220, 260, 0.75, 'green', 'red', 500),
    mid: kampungHouse(130, GND, 0.85, 'red', 'yellow') + kampungHouse(880, GND, 0.8, 'zinc') + palm(1004, GND, 0.85, true),
  })),
  kampung: T('Kampung', 'Kampung', 'birds', (r) => ({
    far: hills(r, { min: 60, max: 150 }) + hills(r, { min: 20, max: 60, cls: 'hill-mid' }) + grass(HZ)
      + [120, 360, 620, 860].map((x) => palm(x + r() * 60, HZ + 10, 0.5, r() > 0.5)).join(''),
    mid: kampungHouse(150, GND, 0.95, pick(r, ['zinc', 'red', 'attap'])) + kampungHouse(860, GND, 0.85, pick(r, ['zinc', 'red'])) + banana(330, GND, 0.9) + banana(700, GND, 0.8) + palm(1004, GND, 0.85, true),
    emitters: [{ x: 210, y: GND - 150, kind: 'cook' }],
  })),
  kk: T('Mount Kinabalu', 'Gunung Kinabalu', 'plane', (r) => ({
    far: place(kinabalu(), 600, HZ - 10, 1.05) + mist(r, HZ - 120, 3) + ridge([[-60, HZ], [60, HZ - 60], [200, HZ - 40], [300, HZ]], HZ + 2, 'hill-mid')
      + city(r, { x0: 760, base: HZ, minH: 30, maxH: 130, ws: 0.6, wave: false }) + water(r, HZ, 900),
    mid: waterVillage(r, 880, [-30, 300]) + waterVillage(r, 880, [700, 1060]) + boats(r, 830, 870, 2, 0.6),
  })),
  watervillage: T('Water village', 'Kampung air', 'birds', (r) => ({
    far: hills(r, { min: 60, max: 140 }) + city(r, { minH: 20, maxH: 80, ws: 0.6, wave: false }) + water(r, HZ, 900),
    mid: waterVillage(r, 870, [-30, 1060]) + boats(r, 880, 895, 1, 0.6),
  })),
  valley: T('Crocker Range', 'Banjaran Crocker', 'birds', (r) => ({
    far: hills(r, { min: 160, max: 300, cls: 'hill-far' }) + mist(r, HZ - 200, 3) + hills(r, { min: 80, max: 160, cls: 'hill-mid' }) + paddy(r, HZ),
    mid: kampungHouse(140, GND - 10, 0.6, 'zinc') + dangau(880, GND - 10, 0.85) + egrets(r, 790, 890, 5),
  })),
  kuching: T('Sarawak River · DUN building', 'Sungai Sarawak · Bangunan DUN', 'hornbill', (r) => {
    const dun = place(dunKuching(), 700, HZ + 6);
    return {
      far: hills(r, { min: 30, max: 90 }) + city(r, { minH: 20, maxH: 100, ws: 0.6, wave: false }) + dun + water(r, HZ + 6, 896, mirror(dun, HZ + 6)) + place(darulHana(), 300, HZ + 30)
        + boats(r, 820, 860, 2, 0.55),
      mid: `<rect x="-60" y="892" width="${W + 120}" height="20" class="concrete"/>` + [140, 860].map((x) => `<rect x="${x}" y="800" width="4" height="96" class="steel"/><circle cx="${x + 2}" cy="798" r="6" class="lamp"/>`).join('') + palm(40, GND, 0.85),
    };
  }),
  miri: T('Canada Hill · Grand Old Lady', 'Bukit Kanada · Grand Old Lady', 'birds', (r) => ({
    far: waterBase(HZ - 70, HZ) + shimmer(r, HZ - 70, HZ, 16) + city(r, { minH: 30, maxH: 120, ws: 0.7, wave: false })
      + ridge([[540, HZ], [680, HZ - 120], [820, HZ - 168], [960, HZ - 130], [1084, HZ - 80]], HZ + 4, 'hill-mid') + place(derrick(), 820, HZ - 166),
    mid: shophouses(r, { s: 0.7 }) + palm(1004, GND, 0.85, true),
  })),
  sibu: T('Rajang River · Wisma Sanyan', 'Sungai Rajang · Wisma Sanyan', 'hornbill', (r) => {
    const bank = place(wismaSanyan(), 740, HZ);
    return {
      far: hills(r, { min: 30, max: 80 }) + city(r, { minH: 30, maxH: 110, ws: 0.7, wave: false }) + bank + water(r, HZ, 896, mirror(bank, HZ))
        + `<g class="sail" style="animation-duration:45s;animation-delay:-12s">${place(`<path d="M-90,-12 L90,-12 L80,0 L-84,0 Z" fill="var(--ac-white)"/><rect x="-70" y="-24" width="130" height="12" fill="var(--ac-blue)"/><rect x="-64" y="-21" width="118" height="5" class="win-lit"/>`, 0, 830, 0.8)}</g>`,
      mid: `<rect x="-60" y="892" width="${W + 120}" height="20" class="wood"/>` + palm(40, GND, 0.85) + palm(990, GND, 0.85, true),
    };
  }),
  town: T('', '', 'plane', (r) => ({ far: townFar(r), mid: townMid(r) })),
};

function waterVillage(r, y, [x0, x1]) {
  let out = '';
  out += `<rect x="${x0}" y="${y - 30}" width="${x1 - x0}" height="5" class="wood-dk"/>`;
  for (let x = x0 + 40; x < x1 - 30; x += 110 + r() * 40) {
    const s = 0.55 + r() * 0.15;
    out += place(`${[-50, -20, 10, 40].map((px) => `<rect x="${px}" y="-60" width="5" height="70" class="wood-dk"/>`).join('')}
      <rect x="-60" y="-120" width="120" height="62" class="wood"/><rect x="-36" y="-104" width="22" height="26" class="kwin"/><rect x="14" y="-104" width="22" height="26" class="kwin"/>
      <path d="M-74,-118 L0,-166 L74,-118 Z" class="roof-${pick(r, ['zinc', 'red', 'zinc'])}"/>`, x, y, s);
  }
  return out;
}

// city → theme; cities not listed fall back to their state's default
const CITY_THEME = {
  'Cheras': 'kl', 'Batu Muda': 'kl',
  'Shah Alam': 'shahalam', 'Petaling Jaya': 'pj', 'Klang': 'port', 'Johan Setia': 'port', 'Banting': 'kampung', 'Kuala Selangor': 'fireflies',
  'Putrajaya': 'putrajaya',
  'George Town': 'georgetown', 'Seberang Perai': 'bridge', 'Balik Pulau': 'kampung',
  'Ipoh': 'ipoh', 'Taiping': 'taiping', 'Seri Manjung': 'beach', 'Tanjung Malim': 'town',
  'Alor Setar': 'alorsetar', 'Sungai Petani': 'paddy', 'Kulim': 'industrial', 'Langkawi': 'langkawi', 'Kangar': 'paddykarst',
  'Seremban': 'seremban', 'Nilai': 'town', 'Port Dickson': 'beach',
  'Melaka City': 'melaka', 'Bukit Rambai': 'town', 'Alor Gajah': 'kampung',
  'Johor Bahru': 'jb', 'Pasir Gudang': 'industrial', 'Pengerang': 'industrial', 'Kota Tinggi': 'waterfall',
  'Batu Pahat': 'town', 'Kluang': 'town', 'Segamat': 'town', 'Tangkak': 'town',
  'Kuantan': 'kuantan', 'Temerloh': 'rainforest', 'Jerantut': 'rainforest', 'Rompin': 'beach',
  'Kuala Terengganu': 'crystal', 'Kemaman': 'beach', 'Paka': 'industrial', 'Besut': 'islands',
  'Kota Bharu': 'wau', 'Tanah Merah': 'paddy',
  'Kota Kinabalu': 'kk', 'Sandakan': 'watervillage', 'Tawau': 'beach', 'Keningau': 'valley', 'Kimanis': 'beach',
  'Kuching': 'kuching', 'Miri': 'miri', 'Sibu': 'sibu', 'Bintulu': 'lng', 'Samarahan': 'kampung', 'Serian': 'rainforest',
  'Sri Aman': 'rainforest', 'Sarikei': 'rainforest', 'Mukah': 'beach', 'Kapit': 'longhouse', 'Limbang': 'rainforest', 'Samalaju': 'industrial',
  'Labuan': 'port',
};
const STATE_THEME = { 14: 'kl', 10: 'shahalam', 16: 'putrajaya', 7: 'georgetown', 8: 'ipoh', 2: 'alorsetar', 9: 'paddykarst', 5: 'seremban', 4: 'melaka', 1: 'jb', 6: 'kuantan', 11: 'crystal', 3: 'wau', 12: 'kk', 13: 'kuching', 15: 'port' };

export function themeFor(stateId, cityKey) {
  const key = (cityKey && CITY_THEME[cityKey]) || STATE_THEME[stateId] || 'kl';
  return { key, seed: hashSeed(cityKey || 'state-' + stateId) };
}

// flyers that cross the sky now and then
export const FLYERS = {
  plane: { svg: '<path d="M0,0 L26,-2 L34,-9 L37,-9 L33,-1 L46,0 L33,1 L37,9 L34,9 L26,2 Z" class="planeBody"/><circle cx="46" cy="0" r="2" class="planeLight"/>', y0: 170, y1: 110, s: 0.8, period: 50, blink: true },
  eagle: { svg: '<g class="flap"><path d="M0,0 C-14,-12 -36,-14 -56,-6 C-38,-4 -18,0 0,4 Z"/><path d="M0,0 C14,-12 36,-14 56,-6 C38,-4 18,0 0,4 Z"/></g><ellipse cx="0" cy="2" rx="9" ry="4.5"/><circle cx="9" cy="0" r="4" class="eagle-head"/><path d="M-8,3 L-18,8 L-6,7 Z"/>', y0: 230, y1: 200, s: 1, period: 34, cls: 'eagle' },
  hornbill: { svg: '<g class="flap"><path d="M0,0 C-12,-14 -34,-16 -52,-8 C-34,-4 -16,0 0,4 Z"/></g><ellipse cx="0" cy="2" rx="11" ry="5"/><path d="M-10,2 L-28,6 L-10,6 Z" class="hb-tail"/><circle cx="11" cy="-1" r="4"/><path d="M13,-3 L30,2 L14,2 Z" class="hb-bill"/><path d="M13,-5 Q20,-9 26,-2 L14,-2 Z" class="hb-casque"/>', y0: 250, y1: 210, s: 1.1, period: 40, cls: 'hornbill' },
  birds: { svg: [[0, 0], [-22, -10], [-22, 10], [-44, -20], [-44, 20]].map(([x, y]) => `<g transform="translate(${x} ${y})"><g class="flap"><path d="M-10,-2 Q-5,-8 0,0 Q5,-8 10,-2" class="bird"/></g></g>`).join(''), y0: 260, y1: 220, s: 1, period: 38 },
};
