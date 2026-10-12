// The animated scene: a KL skyline seen from a mamak table, a hand holding
// today's cigarettes, drifting haze and smoke. Everything lives in a 1024×1024
// "world" that is scaled to cover the stage.

const W = 1024;
const MAX_CIGS = 15;

// ---------- small helpers ----------
function rng(seed) {
  let s = seed % 2147483647;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => '#' + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => toHex(hex(a).map((v, i) => lerp(v, hex(b)[i], clamp(t, 0, 1))));

// Sky palettes through a Malaysian day (hour in MYT).
const NIGHT = { top: '#070f26', bot: '#1d2850', day: 0 };
const DAWN = { top: '#33417a', bot: '#f0a466', day: 0.45 };
const DAY = { top: '#4b93d3', bot: '#d3e8f2', day: 1 };
const DUSK = { top: '#2a2d69', bot: '#ef8650', day: 0.4 };
const SKY_KEYS = [[0, NIGHT], [5.7, NIGHT], [6.7, DAWN], [8.2, DAY], [17.6, DAY], [19, DUSK], [20, NIGHT], [24, NIGHT]];

function skyAt(hour) {
  for (let i = 1; i < SKY_KEYS.length; i++) {
    const [h0, a] = SKY_KEYS[i - 1], [h1, b] = SKY_KEYS[i];
    if (hour <= h1) {
      const t = (hour - h0) / (h1 - h0);
      return { top: mix(a.top, b.top, t), bot: mix(a.bot, b.bot, t), day: lerp(a.day, b.day, t) };
    }
  }
  return NIGHT;
}

export function malaysiaHour() {
  const q = new URLSearchParams(location.search).get('hour');
  if (q !== null && !Number.isNaN(+q)) return +q % 24;
  const d = new Date();
  return (d.getUTCHours() + 8 + d.getUTCMinutes() / 60) % 24;
}

// ---------- static SVG markup ----------
function halfFromWidths(cx, rows) {
  const mid = rows.map(([y]) => `${cx},${y}`);
  const right = rows.slice().reverse().map(([y, w]) => `${(cx + w).toFixed(1)},${y}`);
  return mid.concat(right).join(' ');
}

function polygonFromWidths(cx, rows) {
  const left = rows.map(([y, w]) => `${(cx - w).toFixed(1)},${y}`);
  const right = rows.slice().reverse().map(([y, w]) => `${(cx + w).toFixed(1)},${y}`);
  return left.concat(right).join(' ');
}

function petronas(cx) {
  const rows = [[748, 30], [602, 30], [602, 27], [522, 27], [522, 24], [472, 24], [472, 20], [432, 20], [432, 16],
    [402, 16], [402, 11], [380, 11], [372, 6], [364, 3], [364, 1.8], [282, 0.6]];
  const pts = polygonFromWidths(cx, rows);
  let fins = '';
  for (let i = -2; i <= 2; i++) fins += `<line x1="${cx + i * 9}" y1="748" x2="${cx + i * 4}" y2="400" />`;
  return `<g class="lm"><polygon points="${pts}" class="lm-body"/>
    <polygon points="${halfFromWidths(cx, rows)}" class="lm-lit"/>
    <g class="lm-fins">${fins}</g></g>`;
}

function merdeka(cx) {
  const rows = [[748, 40], [640, 38], [540, 34], [450, 29], [380, 23], [330, 17], [300, 11], [284, 6], [284, 2.6], [150, 0.5]];
  const pts = polygonFromWidths(cx, rows);
  let facets = '';
  for (let y = 740; y > 320; y -= 34) {
    const w = 40 - (748 - y) * 0.055;
    facets += `<polyline points="${cx - w},${y} ${cx},${y - 22} ${cx + w},${y}" />`;
  }
  return `<g class="lm"><polygon points="${pts}" class="lm-body"/><polygon points="${halfFromWidths(cx, rows)}" class="lm-lit"/><g class="lm-fins">${facets}</g></g>`;
}

function klTower(cx) {
  const shaft = polygonFromWidths(cx, [[748, 15], [700, 9], [600, 6], [462, 5]]);
  const pod = `M${cx - 6},462 C${cx - 22},458 ${cx - 31},446 ${cx - 30},432 C${cx - 29},418 ${cx - 22},406 ${cx - 9},400
    L${cx + 9},400 C${cx + 22},406 ${cx + 29},418 ${cx + 30},432 C${cx + 31},446 ${cx + 22},458 ${cx + 6},462 Z`;
  const mast = polygonFromWidths(cx, [[400, 3.4], [368, 2.4], [368, 1.3], [292, 0.5]]);
  return `<g class="lm"><polygon points="${shaft}" class="lm-body"/><path d="${pod}" class="lm-body"/>
    <path d="M${cx - 29},432 L${cx + 29},432" class="lm-band"/>
    <polygon points="${mast}" class="lm-body"/><circle cx="${cx}" cy="292" r="2.6" class="beacon"/></g>`;
}

function farCity() {
  const r = rng(118);
  let bldg = '', wins = '';
  let x = -10;
  while (x < W + 10) {
    const w = 34 + r() * 58;
    const h = 70 + r() * 210 * (0.55 + 0.45 * Math.sin((x / W) * Math.PI * 1.3 + 0.4) ** 2);
    const top = 748 - h;
    const tone = Math.floor(r() * 3);
    bldg += `<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${w.toFixed(1)}" height="${h + 4}" class="b b${tone}"/>`;
    if (r() > 0.6) bldg += `<rect x="${(x + w / 2 - 1).toFixed(1)}" y="${(top - 18).toFixed(1)}" width="2" height="18" class="b b${tone}"/>`;
    for (let wy = top + 10; wy < 735; wy += 13) {
      for (let wx = x + 6; wx < x + w - 8; wx += 10) {
        if (r() > 0.62) {
          const dur = (4 + r() * 9).toFixed(1), delay = (-r() * 12).toFixed(1);
          wins += `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="4" height="6" class="win" style="animation-duration:${dur}s;animation-delay:${delay}s"/>`;
        }
      }
    }
    x += w + 2 + r() * 10;
  }
  return `<g class="far-bldg">${bldg}</g><g class="far-wins">${wins}</g>`;
}

const SIGNS = ['KEDAI KOPI', 'RESTORAN', 'MAMAK 24 JAM', 'KEDAI RUNCIT', 'FARMASI', 'DOBI', 'NASI KANDAR', 'KEDAI EMAS'];
const FACADES = ['#e9c99f', '#9cc4b6', '#e2a49c', '#efd99b', '#a7bde0', '#d6b0d1', '#c9d99a', '#f0b98a'];

function shophouses() {
  const r = rng(57);
  let out = '';
  let x = -30, i = 0;
  while (x < W + 30) {
    const w = 132 + r() * 30, h = 168 + r() * 44, base = 908, top = base - h;
    const c = `var(--f${i % FACADES.length})`, sign = SIGNS[(i * 3) % SIGNS.length];
    const signBg = i % 3 === 0 ? '#b3261e' : i % 3 === 1 ? '#1f5f3f' : '#14306b';
    const winW = w * 0.24, upY = top + 18;
    out += `<g class="sh">
      <rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${c}"/>
      <rect x="${x}" y="${top}" width="${w}" height="${h}" fill="url(#facadeShade)"/>
      <polygon points="${x - 8},${top + 2} ${x + w + 8},${top + 2} ${x + w - 4},${top - 20} ${x + 4},${top - 20}" class="roof"/>
      <rect x="${x - 4}" y="${top}" width="${w + 8}" height="6" class="cornice"/>
      ${[0.16, 0.6].map((f) => {
        const wx = x + w * f;
        return `<rect x="${wx}" y="${upY}" width="${winW}" height="${h * 0.3}" rx="${winW / 2}" class="shwin"/>
          <rect x="${wx - 9}" y="${upY + 4}" width="9" height="${h * 0.3 - 4}" class="shutter"/>
          <rect x="${wx + winW}" y="${upY + 4}" width="9" height="${h * 0.3 - 4}" class="shutter"/>`;
      }).join('')}
      <rect x="${x + 10}" y="${top + h * 0.47}" width="${w - 20}" height="22" fill="${signBg}"/>
      <text x="${x + w / 2}" y="${top + h * 0.47 + 15.5}" class="signtxt">${sign}</text>
      ${[0, 1, 2].map((k) => {
        const aw = (w - 24) / 3, ax = x + 8 + k * (aw + 4), ay = top + h * 0.47 + 30;
        return `<path d="M${ax},${base} V${ay + 16} Q${ax + aw / 2},${ay - 6} ${ax + aw},${ay + 16} V${base} Z" class="arch"/>`;
      }).join('')}
    </g>`;
    x += w + 2;
    i++;
  }
  return out;
}

function palm(x, base, scale, flip) {
  const fronds = [-150, -118, -86, -54, -22, 12, 40].map((a) =>
    `<path d="M0,0 C30,-26 74,-30 118,-6 C78,-14 42,-8 0,4 Z" transform="rotate(${a}) scale(${0.9 + Math.abs(a) / 600})" class="frond"/>`
  ).join('');
  return `<g transform="translate(${x} ${base}) scale(${flip ? -scale : scale} ${scale})">
    <path d="M-7,0 C-12,-90 -2,-190 26,-290 L36,-288 C12,-190 6,-90 7,0 Z" class="trunk"/>
    <g transform="translate(31 -292)"><g class="crown">${fronds}
      <circle cx="-6" cy="8" r="7" class="coco"/><circle cx="6" cy="10" r="7" class="coco"/></g></g>
  </g>`;
}

function backSvg() {
  return `<svg class="layer" viewBox="0 0 ${W} ${W}" aria-hidden="true">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop id="skyTop" offset="0"/><stop id="skyBot" offset="0.78"/>
    </linearGradient>
    <radialGradient id="sunGlow"><stop offset="0" stop-color="#fff2c0" stop-opacity=".85"/><stop offset=".35" stop-color="#ffd27a" stop-opacity=".35"/><stop offset="1" stop-color="#ffb35c" stop-opacity="0"/></radialGradient>
    <linearGradient id="hzFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="hzc" stop-opacity=".25"/><stop offset=".4" class="hzc" stop-opacity=".85"/><stop offset=".72" class="hzc" stop-opacity="1"/><stop offset="1" class="hzc" stop-opacity="1"/></linearGradient>
    <linearGradient id="hzMid" x1="0" y1="0" x2="0" y2="1"><stop offset=".35" class="hzc" stop-opacity="0"/><stop offset=".7" class="hzc" stop-opacity=".8"/><stop offset="1" class="hzc" stop-opacity="1"/></linearGradient>
    <linearGradient id="facadeShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".0"/><stop offset=".85" stop-color="#000" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
  </defs>
  <rect width="${W}" height="${W}" fill="url(#sky)"/>
  <g id="stars"></g>
  <g id="sun"><circle r="150" fill="url(#sunGlow)" id="sunGlowC"/><circle r="44" id="sunDisc"/></g>
  <g id="moon"><circle r="70" fill="url(#sunGlow)" opacity=".35"/><circle r="24" fill="#f2edd9"/><circle cx="-7" cy="-5" r="5" fill="#d9d2b8"/><circle cx="8" cy="7" r="3.5" fill="#d9d2b8"/></g>
  <g id="plane"><path d="M0,0 L26,-2 L34,-9 L37,-9 L33,-1 L46,0 L33,1 L37,9 L34,9 L26,2 Z" class="planeBody"/><circle cx="46" cy="0" r="2" class="planeLight"/></g>
  <g id="far">${farCity()}${klTower(122)}${merdeka(300)}${petronas(706)}${petronas(800)}
    <rect x="733" y="586" width="40" height="7" class="lm-body"/><path d="M735,593 L753,640 L771,593" class="lm-band" fill="none"/>
  </g>
  <rect id="hazeFar" y="0" width="${W}" height="${W}" fill="url(#hzFar)"/>
  <g id="mid">${palm(42, 912, 1.02, false)}${shophouses()}${palm(994, 912, 0.95, true)}</g>
  <rect id="hazeMid" y="0" width="${W}" height="${W}" fill="url(#hzMid)"/>
</svg>`;
}

function cigMarkup(i) {
  return `<g class="cig" id="cig${i}">
    <g class="cigBody">
      <rect class="cpaper" y="-8" height="16"/>
      <rect class="filter" x="-95" y="-8" width="80" height="16" fill="url(#cork)"/>
      <rect class="band" x="-97" y="-8" width="3" height="16"/>
      <rect class="ash" y="-7.5" width="11" height="15" rx="3"/>
      <circle class="glow" r="22" fill="url(#ember)"/>
      <circle class="core" r="6.5"/>
    </g>
  </g>`;
}

function frontSvg() {
  const FINGERS = [[-80, -72, 132, 42], [-82, -34, 130, 41], [-77, 4, 124, 40], [-68, 41, 112, 37]];
  const fingers = FINGERS.map(([x, y, w, h]) => `<g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" class="finger"/>
      <path d="M${x + 14},${y + 7} H${x + w - 30}" class="fhi"/>
      <path d="M${x + 40},${y + 7} q-6,${h / 2 - 7} 0,${h - 14}" class="crease"/>
      <path d="M${x + 86},${y + 9} q-5,${h / 2 - 9} 0,${h - 18}" class="crease soft"/>
    </g>`).join('');
  let cigs = '';
  for (let i = 0; i < MAX_CIGS; i++) cigs += cigMarkup(i);
  return `<svg class="layer" viewBox="0 0 ${W} ${W}" aria-hidden="true">
  <defs>
    <linearGradient id="tableTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ece6d8"/><stop offset="1" stop-color="#c9c0ac"/></linearGradient>
    <linearGradient id="tea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1e3c6"/><stop offset=".16" stop-color="#e3c79a"/><stop offset=".2" stop-color="#b9783f"/><stop offset="1" stop-color="#7d4a26"/></linearGradient>
    <linearGradient id="skin" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e0a57c"/><stop offset=".55" stop-color="#c88b5e"/><stop offset="1" stop-color="#a9704a"/></linearGradient>
    <linearGradient id="armSkin" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d49a6e"/><stop offset="1" stop-color="#9c6440"/></linearGradient>
    <radialGradient id="ember"><stop offset="0" stop-color="#fff1a8" stop-opacity="1"/><stop offset=".25" stop-color="#ff9a3c" stop-opacity=".9"/><stop offset=".6" stop-color="#ff4d1a" stop-opacity=".35"/><stop offset="1" stop-color="#ff3000" stop-opacity="0"/></radialGradient>
    <pattern id="cork" width="10" height="8" patternUnits="userSpaceOnUse"><rect width="10" height="8" fill="#d68c3d"/><circle cx="2" cy="2" r="1" fill="#b86e27"/><circle cx="7" cy="5" r="1.1" fill="#e9a659"/><circle cx="5" cy="1" r=".7" fill="#b86e27"/></pattern>
    <pattern id="batik" width="56" height="56" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
      <rect width="56" height="56" fill="#1b3a6b"/>
      <g transform="translate(28 28)" fill="#e8b84a">${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse rx="4" ry="10" transform="rotate(${a}) translate(0 -10)"/>`).join('')}<circle r="4.5" fill="#c4342d"/></g>
      <g fill="#2fa696"><circle cx="0" cy="0" r="3"/><circle cx="56" cy="0" r="3"/><circle cx="0" cy="56" r="3"/><circle cx="56" cy="56" r="3"/></g>
      <path d="M0,28 q14,-10 28,0 M28,0 q10,14 0,28" stroke="#e8b84a" stroke-width="1.4" fill="none" opacity=".55"/>
    </pattern>
    <clipPath id="cigClip"><rect x="-700" y="-400" width="652" height="800"/></clipPath>
  </defs>
  <g id="table">
    <rect x="0" y="904" width="${W}" height="${W - 904}" fill="url(#tableTop)"/>
    <rect x="0" y="904" width="${W}" height="5" fill="#f8f4ea" opacity=".9"/>
    <path d="M60,960 C200,940 300,990 460,968 M600,1000 C720,975 820,1010 990,985" class="vein"/>
    <g id="ashtray" transform="translate(178 948)">
      <ellipse rx="78" ry="20" fill="#6e7378" opacity=".35" transform="translate(4 8)"/>
      <ellipse rx="76" ry="20" fill="#9aa3a8"/><ellipse rx="58" ry="13" fill="#5e666b"/>
      <g id="butts"></g>
    </g>
    <g id="pack" transform="translate(310 905)" opacity="0">
      <rect x="0" y="-62" width="58" height="70" rx="4" fill="#f4f1ea"/><rect x="0" y="-62" width="58" height="26" rx="4" fill="#b3261e"/>
      <text x="29" y="-12" class="packtxt" id="packTxt">+0</text>
    </g>
    <g id="mug" transform="translate(888 0)">
      <ellipse cx="0" cy="912" rx="40" ry="9" fill="#000" opacity=".12"/>
      <path d="M26,826 C58,826 60,880 24,884" class="mugHandle"/>
      <path d="M-32,792 L32,792 L27,910 L-27,910 Z" fill="url(#tea)"/>
      <path d="M-32,792 L32,792 L27,910 L-27,910 Z" class="glass"/>
      <path d="M-24,800 L-20,902" stroke="#fff" stroke-width="5" opacity=".35" stroke-linecap="round"/>
    </g>
  </g>
  <g id="rig">
    <path d="M18,62 C44,150 74,230 96,340 L262,340 C226,226 172,124 122,36 Z" fill="url(#armSkin)"/>
    <path d="M44,196 L176,140 C210,200 248,270 292,350 L92,358 C78,300 62,246 44,196 Z" fill="url(#batik)"/>
    <path d="M44,196 L176,140" stroke="#e8b84a" stroke-width="9" stroke-linecap="round"/>
    <path d="M47,206 L180,150" stroke="#7a1f2b" stroke-width="4" stroke-linecap="round"/>
    <path d="M-22,-96 C44,-114 116,-84 124,-12 C130,50 112,94 62,112 C18,124 -24,104 -34,62 Z" fill="url(#skin)"/>
    <g clip-path="url(#cigClip)" id="cigs">${cigs}</g>
    ${fingers}
    <g transform="rotate(-7 -24 -98)">
      <rect x="-90" y="-120" width="128" height="40" rx="20" class="finger"/>
      <rect x="-86" y="-115" width="28" height="28" rx="11" class="nail"/>
      <path d="M-82,-110 q6,-3 14,0" stroke="#fff" stroke-width="2" opacity=".5" fill="none" stroke-linecap="round"/>
    </g>
  </g>
</svg>`;
}

// ---------- the scene ----------
export function createScene(stage) {
  const world = document.createElement('div');
  world.className = 'world';
  world.innerHTML = `${backSvg()}<canvas class="layer" id="hazeCv" width="512" height="512"></canvas>${frontSvg()}
    <canvas class="layer" id="smokeCv" width="${W}" height="${W}"></canvas><div class="vig"></div>`;
  stage.prepend(world);

  const $ = (id) => world.querySelector('#' + id);
  const [backEl, frontEl] = world.querySelectorAll('svg');
  const hazeCv = $('hazeCv'), smokeCv = $('smokeCv');
  const hctx = hazeCv.getContext('2d'), sctx = smokeCv.getContext('2d');
  // Reduced motion keeps the ambient smoke and haze but calms the hand and parallax.
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.3 : 1;

  // stars
  const sr = rng(7);
  let stars = '';
  for (let i = 0; i < 46; i++) {
    stars += `<circle cx="${(sr() * W).toFixed(0)}" cy="${(sr() * 420).toFixed(0)}" r="${(0.6 + sr() * 1.3).toFixed(1)}" class="star" style="animation-delay:${(-sr() * 5).toFixed(1)}s"/>`;
  }
  $('stars').innerHTML = stars;

  // cigarettes
  const SLOT_Y = [-82, -32, 6, 44, 80];
  const SLOT_A = [30, 15, 1, -13, -27];
  const ORDER = [2, 1, 3, 0, 4];
  const LAYER_A = [0, 9, -9];
  const cigs = [...Array(MAX_CIGS)].map((_, i) => {
    const slot = ORDER[i % 5], layer = Math.floor(i / 5);
    const el = $('cig' + i);
    return {
      el, body: el.firstElementChild,
      paper: el.querySelector(".cpaper"), ash: el.querySelector('.ash'),
      glow: el.querySelector('.glow'), core: el.querySelector('.core'),
      px: -48, py: SLOT_Y[slot] + layer * 3, a: SLOT_A[slot] + LAYER_A[layer] + (i % 2 ? 1.5 : -1.5),
      L: 285, targetL: 0, slide: 300, phase: Math.random() * 6.28,
      puff: 0, nextPuff: 1 + Math.random() * 6, visible: false,
    };
  });
  cigs.forEach((c) => {
    c.el.setAttribute('transform', `translate(${c.px} ${c.py}) rotate(${c.a})`);
    c.el.style.display = 'none';
  });

  // haze blobs (world coords)
  const hr = rng(33);
  const blobs = [...Array(16)].map(() => ({
    x: hr() * W * 1.3 - 150, y: 330 + hr() * 620, r: 160 + hr() * 260, v: 4 + hr() * 10, a: 0.35 + hr() * 0.5,
  }));

  // sprites
  const sprite = (rgb, size = 64) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, `rgba(${rgb},1)`);
    grd.addColorStop(0.45, `rgba(${rgb},.45)`);
    grd.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    return c;
  };
  const smokeSprite = sprite('236,238,244');
  const steamSprite = sprite('255,255,255');
  let hazeSprite = sprite('190,170,125', 128);
  let hazeTint = '';

  const state = {
    api: 60, cigs: 1.6, h: 0.2, hour: malaysiaHour(), day: 1,
    px: 0, py: 0, tx: 0, ty: 0,
    drop: 0, dropTo: 0,
  };
  const particles = [];
  const steam = [];

  // ---------- level / time updates ----------
  function applyLook() {
    const { h } = state;
    const sky = skyAt(state.hour);
    state.day = sky.day;
    const hazeDay = '#c4ad7f', hazeNight = '#4d4236';
    const hz = mix(hazeNight, hazeDay, sky.day);
    $('skyTop').setAttribute('stop-color', mix(sky.top, hz, h * 0.72));
    $('skyBot').setAttribute('stop-color', mix(sky.bot, hz, h * 0.9));
    const hzFar = $('hazeFar'), hzMid = $('hazeMid');
    world.querySelectorAll('.hzc').forEach((st) => st.setAttribute('stop-color', hz));
    hzFar.setAttribute('opacity', (0.05 + h * 0.8).toFixed(3));
    hzMid.setAttribute('opacity', (h * 0.45).toFixed(3));
    world.style.setProperty('--night', (1 - sky.day).toFixed(3));
    world.style.setProperty('--clear', (1 - h).toFixed(3));
    const d = sky.day;
    world.style.setProperty('--b0', mix('#1a2340', '#6f7e99', d));
    world.style.setProperty('--b1', mix('#202a47', '#7b8aa4', d));
    world.style.setProperty('--b2', mix('#28334f', '#8897b0', d));
    world.style.setProperty('--lm', mix('#2f3b5c', '#95a4bd', d));
    world.style.setProperty('--arch', mix('#f2b75e', '#3b2b25', d));
    world.style.setProperty('--roof', mix('#4a2219', '#8c3a28', d));
    world.style.setProperty('--trunk', mix('#2e2418', '#6b5135', d));
    world.style.setProperty('--frond', mix('#1b3020', '#3f7a3a', d));
    FACADES.forEach((f, i) => world.style.setProperty('--f' + i, mix(f, '#161c38', (1 - d) * 0.62)));
    backEl.style.filter = `blur(${(h * 1.8).toFixed(2)}px) saturate(${(1 - h * 0.35).toFixed(2)})`;

    // sun / moon on an arc
    const hr24 = state.hour;
    const isDay = hr24 > 6.3 && hr24 < 19.3;
    const p = isDay ? (hr24 - 6.3) / 13 : ((hr24 - 19.3 + 24) % 24) / 11;
    const sx = 70 + p * 880, sy = 640 - Math.sin(Math.PI * p) * 470;
    $('sun').style.display = isDay ? '' : 'none';
    $('moon').style.display = isDay ? 'none' : '';
    $(isDay ? 'sun' : 'moon').setAttribute('transform', `translate(${sx.toFixed(1)} ${sy.toFixed(1)})`);
    $('sunDisc').setAttribute('fill', mix('#fff4cf', '#ff6a2b', h * 1.1));
    $('sunDisc').setAttribute('opacity', (1 - h * 0.35).toFixed(2));
    $('sunGlowC').setAttribute('opacity', (0.9 - h * 0.3).toFixed(2));

    // haze sprite tint follows time of day
    const tint = hex(hz).join(',');
    if (tint !== hazeTint) {
      hazeSprite = sprite(tint, 128);
      hazeTint = tint;
    }
    hazeCv.style.opacity = (h * 0.95).toFixed(3);

    // ashtray butts and the overflow pack
    const butts = Math.min(9, Math.floor(state.cigs * 0.8));
    let b = '';
    for (let i = 0; i < butts; i++) {
      const bx = -40 + ((i * 37) % 80), by = -4 + ((i * 13) % 9), ang = -30 + ((i * 47) % 70);
      b += `<g transform="translate(${bx} ${by}) rotate(${ang})"><rect x="-14" y="-3" width="20" height="6" rx="2" fill="#d68c3d"/><rect x="6" y="-3" width="6" height="6" rx="2" fill="#efe9dc"/><rect x="11" y="-3" width="3" height="6" fill="#55504a"/></g>`;
    }
    $('butts').innerHTML = b;
    const extra = Math.max(0, Math.round(state.cigs) - MAX_CIGS);
    $('pack').setAttribute('opacity', extra > 0 ? 1 : 0);
    $('packTxt').textContent = '+' + extra;
  }

  function setLevel(api, cigCount) {
    state.api = api;
    state.cigs = cigCount;
    state.h = clamp(Math.pow(clamp((api - 15) / 240, 0, 1.15), 0.85), 0, 1.1);
    const full = Math.min(MAX_CIGS, Math.floor(cigCount));
    const frac = cigCount - Math.floor(cigCount);
    cigs.forEach((c, i) => {
      if (i < full) c.targetL = 285;
      else if (i === full && full < MAX_CIGS && frac > 0.04) c.targetL = 115 + frac * 170;
      else c.targetL = 0;
    });
    applyLook();
  }

  function setHour(hour) {
    state.hour = hour;
    applyLook();
  }

  // ---------- layout ----------
  // Scale the world to cover the stage, then slide it so the hand and its
  // cigarettes (around x≈330, y≈600) stay in view on narrow or wide stages.
  const FOCUS = { x: 330, y: 600 };
  function fit() {
    const r = stage.getBoundingClientRect();
    const s = Math.max(r.width / W, r.height / W);
    const spareX = (W * s - r.width) / 2, spareY = (W * s - r.height) / 2;
    const dx = clamp((W / 2 - FOCUS.x) * s, -spareX, spareX);
    const dy = clamp((W / 2 - FOCUS.y) * s, -spareY, spareY);
    world.style.setProperty('--s', s.toFixed(4));
    world.style.setProperty('--dx', dx.toFixed(1) + 'px');
    world.style.setProperty('--dy', dy.toFixed(1) + 'px');
  }
  new ResizeObserver(fit).observe(stage);
  fit();

  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    state.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    state.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
  });
  stage.addEventListener('pointerleave', () => { state.tx = 0; state.ty = 0; });

  // ---------- animation loop ----------
  const RIG = { x: 492, y: 772, s: 1.12 };
  const farG = $('far'), midG = $('mid'), rigG = $('rig'), planeG = $('plane');
  let last = performance.now(), t = 0, running = true;

  function rigPoint(lx, ly, sway, ox, oy) {
    const rad = (sway * Math.PI) / 180, cs = Math.cos(rad), sn = Math.sin(rad);
    const x = lx * RIG.s, y = ly * RIG.s;
    return [x * cs - y * sn + RIG.x + ox, x * sn + y * cs + RIG.y + oy];
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;

    // parallax
    state.px = lerp(state.px, state.tx * calm, 0.04);
    state.py = lerp(state.py, state.ty * calm, 0.04);
    farG.setAttribute('transform', `translate(${(-state.px * 6).toFixed(2)} ${(-state.py * 3).toFixed(2)})`);
    midG.setAttribute('transform', `translate(${(-state.px * 14).toFixed(2)} ${(-state.py * 5).toFixed(2)})`);

    // hand sway, a little heavier when holding more
    const load = clamp(state.cigs / 10, 0, 1);
    const sway = calm * (1.7 * Math.sin(t * 0.62) + 0.6 * Math.sin(t * 1.73 + 1) + load * 0.8 * Math.sin(t * 3.1));
    const bob = calm * (5 * Math.sin(t * 0.9) + load * 3);
    state.drop = lerp(state.drop, state.dropTo, 0.09);
    const ox = state.px * 22, oy = state.py * 10 + bob + state.drop;
    rigG.setAttribute('transform', `translate(${(RIG.x + ox).toFixed(2)} ${(RIG.y + oy).toFixed(2)}) rotate(${sway.toFixed(3)}) scale(${RIG.s})`);

    // plane crossing every ~50 s
    const pc = (t % 50) / 50;
    if (pc < 0.7) {
      const p = pc / 0.7;
      planeG.style.display = '';
      planeG.setAttribute('transform', `translate(${(-80 + p * 1200).toFixed(1)} ${(170 - p * 60).toFixed(1)}) scale(.8)`);
      planeG.querySelector('.planeLight').setAttribute('opacity', Math.sin(t * 9) > 0.6 ? 1 : 0.15);
    } else planeG.style.display = 'none';

    // cigarettes: length + slide tweening, ember flicker, smoke emission
    const wind = 0.35 + 0.25 * Math.sin(t * 0.21);
    cigs.forEach((c) => {
      const want = c.targetL > 0;
      if (want) {
        c.L = lerp(c.L, c.targetL, 0.06);
        c.slide = lerp(c.slide, 0, 0.07);
      } else {
        c.slide = lerp(c.slide, c.L + 20, 0.07);
      }
      const vis = c.slide < c.L + 10;
      if (vis !== c.visible) {
        c.el.style.display = vis ? '' : 'none';
        c.visible = vis;
      }
      if (!vis) return;
      const L = c.L;
      c.paper.setAttribute('x', (-L).toFixed(1));
      c.paper.setAttribute('width', Math.max(0, L - 95).toFixed(1));
      c.ash.setAttribute('x', (-L - 9).toFixed(1));
      c.glow.setAttribute('cx', (-L - 7).toFixed(1));
      c.core.setAttribute('cx', (-L - 6).toFixed(1));
      c.body.setAttribute('transform', `translate(${c.slide.toFixed(1)} 0)`);

      c.nextPuff -= dt;
      if (c.nextPuff <= 0) { c.puff = 1; c.nextPuff = 3 + Math.random() * 7; }
      c.puff = Math.max(0, c.puff - dt * 0.8);
      const e = clamp(0.5 + 0.22 * Math.sin(t * 2.3 + c.phase) + 0.1 * Math.sin(t * 7.1 + c.phase * 2) + c.puff * 0.55, 0, 1.2);
      c.glow.setAttribute('opacity', e.toFixed(3));
      c.core.setAttribute('fill', mix('#a8321a', '#ffd166', e));

      // smoke from the tip
      if (c.slide < 30 && state.drop < 60) {
        const rad = (c.a * Math.PI) / 180;
        const tx = -(L + 9) + c.slide;
        const [wx, wy] = rigPoint(c.px + tx * Math.cos(rad), c.py + tx * Math.sin(rad), sway, ox, oy);
        const rate = 11 + c.puff * 30;
        if (Math.random() < rate * dt && particles.length < 520) {
          particles.push({ x: wx, y: wy, vx: (Math.random() - 0.5) * 6, vy: -18 - Math.random() * 14, r: 4 + Math.random() * 3, life: 0, max: 4.5 + Math.random() * 3, seed: Math.random() * 10 });
        }
      }
    });

    // tea steam
    if (Math.random() < 5 * dt && steam.length < 60) {
      steam.push({ x: 888 + (Math.random() - 0.5) * 34, y: 792, vx: 0, vy: -12 - Math.random() * 8, r: 5, life: 0, max: 3 + Math.random() * 2, seed: Math.random() * 10 });
    }

    // draw smoke + steam
    sctx.clearRect(0, 0, W, W);
    const drawSet = (arr, spr, alpha, grow) => {
      for (let i = arr.length - 1; i >= 0; i--) {
        const p = arr[i];
        p.life += dt;
        if (p.life > p.max) { arr.splice(i, 1); continue; }
        const k = p.life / p.max;
        p.vx += (Math.sin(t * 1.4 + p.seed + p.life * 1.7) * 10 + wind * 14) * dt;
        p.vy -= 3 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.r += grow * dt * (1 - k * 0.5);
        const a = alpha * Math.pow(1 - k, 1.6) * Math.min(1, p.life * 3);
        sctx.globalAlpha = a;
        sctx.drawImage(spr, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
    };
    drawSet(particles, smokeSprite, 0.5, 15);
    drawSet(steam, steamSprite, 0.22, 9);
    sctx.globalAlpha = 1;

    // drifting haze
    hctx.clearRect(0, 0, 512, 512);
    if (state.h > 0.02) {
      for (const b of blobs) {
        b.x += (b.v + wind * 8) * dt;
        if (b.x - b.r > W) b.x = -b.r - 50;
        hctx.globalAlpha = b.a * (0.6 + 0.4 * Math.sin(t * 0.3 + b.y));
        hctx.drawImage(hazeSprite, (b.x - b.r) / 2, (b.y - b.r * 0.55) / 2, b.r, b.r * 0.55);
      }
      hctx.globalAlpha = 1;
    }

    requestAnimationFrame(frame);
  }

  let paused = false;
  function syncRunning() {
    const want = !document.hidden && !paused;
    world.classList.toggle('is-paused', paused);
    if (want && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    else if (!want) running = false;
  }
  document.addEventListener('visibilitychange', syncRunning);
  function setPaused(p) { paused = p; syncRunning(); }
  setInterval(() => setHour(malaysiaHour()), 60_000);

  applyLook();
  requestAnimationFrame(frame);
  // lower the cigarette hand while the map is held up
  function setMapMode(on) { state.dropTo = on ? 560 : 0; }

  return { setLevel, setHour, setPaused, setMapMode, isPaused: () => paused, state };
}
