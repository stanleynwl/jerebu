// The animated scene: a city backdrop seen from a mamak table, a hand holding
// today's cigarettes, drifting haze and smoke. Everything lives in a 1024×1024
// "world" that is scaled to cover the stage. Backdrops come from themes.js and
// crossfade when the city changes.
import { THEMES, FLYERS, FACADES, rng } from './themes.js';

const W = 1024;
const MAX_CIGS = 15;

// ---------- small helpers ----------
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

// Day / night colours for the backdrop parts, exposed as CSS variables.
const PALETTE = {
  '--b0': ['#6f7e99', '#1a2340'], '--b1': ['#7b8aa4', '#202a47'], '--b2': ['#8897b0', '#28334f'],
  '--lm': ['#95a4bd', '#2f3b5c'], '--arch': ['#3b2b25', '#f2b75e'], '--roof': ['#8c3a28', '#4a2219'],
  '--trunk': ['#6b5135', '#2e2418'], '--frond': ['#3f7a3a', '#1b3020'],
  '--hill-far': ['#7f9aa3', '#1a2440'], '--hill-mid': ['#5b8468', '#141f2c'], '--karst': ['#8a9e90', '#1d2738'],
  '--mtn': ['#5f7896', '#18223c'], '--mtn-rock': ['#90a3b8', '#28334f'], '--sand': ['#e8d5a6', '#3a3a44'],
  '--paddy': ['#86bd4f', '#1b2a22'], '--paddy2': ['#9dce63', '#22322a'], '--grass': ['#6fa04a', '#17241d'],
  '--wood': ['#8d5c37', '#2a1d18'], '--wood-dk': ['#5e3b22', '#1b120e'], '--zinc': ['#9aa4aa', '#2b3038'],
  '--attap': ['#a07c46', '#2c2219'], '--tile': ['#a8432f', '#3a1a17'], '--minang': ['#3a3a40', '#141418'],
  '--jg0': ['#6a9579', '#17222c'], '--jg1': ['#477d55', '#111c21'], '--jg2': ['#2f6340', '#0d1619'],
  '--concrete': ['#bdbab2', '#363946'], '--concrete-dk': ['#93908a', '#262833'], '--steel': ['#aab2ba', '#2f3644'],
  '--tank': ['#e6e4dd', '#3c404c'], '--rock': ['#7c7a72', '#1f2230'], '--hull': ['#34424f', '#151a26'],
  '--kwin': ['#3a3346', '#ffcf7a'],
};
const ACCENTS = {
  red: '#c7372f', blue: '#2f6fb5', green: '#2f8f4e', orange: '#e07b2a', yellow: '#e9c23a', teal: '#2a9d8f', white: '#f1ede4',
  pink: '#d98ca0', rose: '#efd6d6', gold: '#d4a63a', black: '#2a2a2e', brown: '#7a4a2a', cream: '#efe3c8',
};

// ---------- static SVG markup ----------
function skySvg() {
  return `<svg class="layer sky" viewBox="0 0 ${W} ${W}" aria-hidden="true">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop id="skyTop" offset="0"/><stop id="skyBot" offset="0.78"/></linearGradient>
    <radialGradient id="sunGlow"><stop offset="0" stop-color="#fff2c0" stop-opacity=".85"/><stop offset=".35" stop-color="#ffd27a" stop-opacity=".35"/><stop offset="1" stop-color="#ffb35c" stop-opacity="0"/></radialGradient>
    <linearGradient id="hzFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="hzc" stop-opacity=".25"/><stop offset=".4" class="hzc" stop-opacity=".85"/><stop offset=".72" class="hzc" stop-opacity="1"/><stop offset="1" class="hzc" stop-opacity="1"/></linearGradient>
    <linearGradient id="hzMid" x1="0" y1="0" x2="0" y2="1"><stop offset=".35" class="hzc" stop-opacity="0"/><stop offset=".7" class="hzc" stop-opacity=".8"/><stop offset="1" class="hzc" stop-opacity="1"/></linearGradient>
    <linearGradient id="facadeShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".0"/><stop offset=".85" stop-color="#000" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
    <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="wt"/><stop offset="1" class="wb"/></linearGradient>
  </defs>
  <rect width="${W}" height="${W}" fill="url(#sky)"/>
  <g id="stars"></g>
  <g id="sun"><circle r="150" fill="url(#sunGlow)" id="sunGlowC"/><circle r="44" id="sunDisc"/></g>
  <g id="moon"><circle r="70" fill="url(#sunGlow)" opacity=".35"/><circle r="24" fill="#f2edd9"/><circle cx="-7" cy="-5" r="5" fill="#d9d2b8"/><circle cx="8" cy="7" r="3.5" fill="#d9d2b8"/></g>
  <g id="flyer"></g>
</svg>`;
}

const landSvg = (o) => `<svg class="layer land" viewBox="0 0 ${W} ${W}" aria-hidden="true">
  <g class="far">${o.far}</g>
  <rect class="hazeFar" width="${W}" height="${W}" fill="url(#hzFar)"/>
  <g class="mid">${o.mid}</g>
  <rect class="hazeMid" width="${W}" height="${W}" fill="url(#hzMid)"/>
</svg>`;

function cigMarkup(i) {
  return `<g class="cig" id="cig${i}">
    <g class="cigBody">
      <rect class="cpaper"/><rect class="filter"/><rect class="band"/><rect class="deco"/>
      <rect class="cshade" fill="url(#cylShade)"/>
      <rect class="ash" rx="3"/>
      <circle class="glow" fill="url(#ember)"/><circle class="core"/>
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
    <linearGradient id="cylShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>
    <pattern id="cork" width="10" height="8" patternUnits="userSpaceOnUse"><rect width="10" height="8" fill="#d68c3d"/><circle cx="2" cy="2" r="1" fill="#b86e27"/><circle cx="7" cy="5" r="1.1" fill="#e9a659"/><circle cx="5" cy="1" r=".7" fill="#b86e27"/></pattern>
    <pattern id="corkDark" width="10" height="8" patternUnits="userSpaceOnUse"><rect width="10" height="8" fill="#9a5a26"/><circle cx="2" cy="2" r="1" fill="#6e3d16"/><circle cx="7" cy="5" r="1.1" fill="#b87436"/></pattern>
    <pattern id="mint" width="12" height="8" patternUnits="userSpaceOnUse"><rect width="12" height="8" fill="#eef7f0"/><circle cx="3" cy="2" r="1.1" fill="#7cc79a"/><circle cx="9" cy="6" r="1.1" fill="#7cc79a"/></pattern>
    <pattern id="kretek" width="9" height="8" patternUnits="userSpaceOnUse"><rect width="9" height="8" fill="#5a3a22"/><circle cx="2" cy="3" r=".9" fill="#7a5232"/><circle cx="6" cy="6" r=".8" fill="#3f2816"/><circle cx="7" cy="1.5" r=".7" fill="#7a5232"/></pattern>
    <pattern id="nipah" width="14" height="6" patternUnits="userSpaceOnUse"><rect width="14" height="6" fill="#d6c08a"/><path d="M0,1.5 H14 M0,4.5 H14" stroke="#bfa56a" stroke-width=".7"/></pattern>
    <linearGradient id="goldF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3dc8e"/><stop offset=".5" stop-color="#d4b05a"/><stop offset="1" stop-color="#9c7a2a"/></linearGradient>
    <pattern id="cigarLeaf" width="22" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)"><rect width="22" height="24" fill="#6b4226"/><path d="M0,6 H22 M0,15 H22" stroke="#553220" stroke-width="1.4"/><path d="M0,10 H22" stroke="#7d5232" stroke-width=".8"/></pattern>
    <linearGradient id="cigarBand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4a63a"/><stop offset=".3" stop-color="#b3261e"/><stop offset=".7" stop-color="#b3261e"/><stop offset="1" stop-color="#d4a63a"/></linearGradient>
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
    <g id="pack" transform="translate(290 912) rotate(-6)">
      <rect x="2" y="-94" width="68" height="96" rx="5" fill="#000" opacity=".18" transform="translate(4 2)"/>
      <rect x="0" y="-96" width="68" height="96" rx="5" id="pkBody"/>
      <path d="M0,-91 Q0,-96 5,-96 H63 Q68,-96 68,-91 V-58 H0 Z" id="pkTop"/>
      <text x="34" y="-80" class="pk-brand" id="pkBrand">JEREBU</text>
      <text x="34" y="-66" class="pk-var" id="pkVar">KLASIK</text>
      <rect x="6" y="-52" width="56" height="44" rx="2" class="pk-warn"/>
      <text x="34" y="-37" class="pk-warn-t">AMARAN</text>
      <text x="34" y="-25" class="pk-warn-s">UDARA INI</text>
      <text x="34" y="-15" class="pk-warn-s">MEMBUNUH</text>
      <g id="pkExtra" opacity="0"><circle cx="66" cy="-94" r="16" fill="#d62828"/><text x="66" y="-88.5" class="pk-extra" id="packTxt">+0</text></g>
    </g>
    <g id="mug" transform="translate(888 0)">
      <ellipse cx="0" cy="912" rx="40" ry="9" fill="#000" opacity=".12"/>
      <path d="M26,826 C58,826 60,880 24,884" class="mugHandle"/>
      <path d="M-32,792 L32,792 L27,910 L-27,910 Z" fill="url(#tea)"/>
      <path d="M-32,792 L32,792 L27,910 L-27,910 Z" class="glass-mug"/>
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
  world.innerHTML = `${skySvg()}<div class="layer lands"></div>
    <canvas class="layer" id="fxCv" width="512" height="512"></canvas>
    <canvas class="layer" id="hazeCv" width="512" height="512"></canvas>${frontSvg()}
    <canvas class="layer" id="smokeCv" width="${W}" height="${W}"></canvas><div class="vig"></div>`;
  stage.prepend(world);

  const $ = (id) => world.querySelector('#' + id);
  const skyEl = world.querySelector('.sky');
  const landsEl = world.querySelector('.lands');
  const hazeCv = $('hazeCv'), smokeCv = $('smokeCv'), fxCv = $('fxCv');
  const hctx = hazeCv.getContext('2d'), sctx = smokeCv.getContext('2d'), fctx = fxCv.getContext('2d');
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
    const q = (c) => el.querySelector(c);
    return {
      el, body: el.firstElementChild,
      paper: q('.cpaper'), filter: q('.filter'), band: q('.band'), deco: q('.deco'), shade: q('.cshade'),
      ash: q('.ash'), glow: q('.glow'), core: q('.core'),
      px: -48, py: SLOT_Y[slot] + layer * 3, a: SLOT_A[slot] + LAYER_A[layer] + (i % 2 ? 1.5 : -1.5),
      L: 285, targetL: 0, slide: 330, phase: Math.random() * 6.28,
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
  let smokeSprite = sprite('236,238,244');
  const steamSprite = sprite('255,255,255');
  const FX = {
    chimney: { spr: sprite('168,168,172'), rate: 6, r: 9, grow: 20, life: 8, vy: -16, spread: 6, alpha: 0.32 },
    cook: { spr: sprite('225,225,225'), rate: 3, r: 3, grow: 8, life: 4.5, vy: -12, spread: 3, alpha: 0.28 },
    mist: { spr: sprite('255,255,255'), rate: 12, r: 10, grow: 18, life: 2.6, vy: -8, spread: 40, alpha: 0.3 },
  };
  let hazeSprite = sprite('190,170,125', 128);
  let hazeTint = '';

  const state = {
    api: 60, cigs: 1.6, h: 0.2, hour: malaysiaHour(), day: 1,
    px: 0, py: 0, tx: 0, ty: 0,
    drop: 0, dropTo: 0,
  };
  const particles = [];
  const steam = [];
  const sparks = [];
  const fxParts = [];
  let emitters = [];
  let brand = null;
  let fEnd = 95, ashW = 11;

  // ---------- backdrop ----------
  const land = { far: null, mid: null };
  const flyerG = $('flyer');
  let flyer = FLYERS.plane, flyerKey = '', flyerLight = null;
  let themeKey = null, themeSeed = null;

  function setFlyer(k) {
    if (k === flyerKey) return;
    flyerKey = k;
    flyer = FLYERS[k] || FLYERS.plane;
    flyerG.innerHTML = flyer.svg;
    flyerG.setAttribute('class', flyer.cls || '');
    flyerLight = flyerG.querySelector('.planeLight');
  }

  function setTheme(key, seed) {
    if (key === themeKey && seed === themeSeed) return;
    themeKey = key;
    themeSeed = seed;
    const th = THEMES[key] || THEMES.kl;
    const o = th.build(rng(seed));
    const tmp = document.createElement('div');
    tmp.innerHTML = landSvg(o);
    const svg = tmp.firstElementChild;
    const olds = [...landsEl.children];
    if (olds.length) svg.classList.add('entering');
    landsEl.appendChild(svg);
    land.far = svg.querySelector('.far');
    land.mid = svg.querySelector('.mid');
    emitters = o.emitters || [];
    fxParts.length = 0;
    setFlyer(th.flyer);
    applyLook();
    if (olds.length) {
      svg.getBoundingClientRect();
      svg.classList.remove('entering');
      setTimeout(() => olds.forEach((el) => el.remove()), 950);
    }
  }

  // ---------- brand ----------
  function setBrand(b) {
    brand = b;
    smokeSprite = sprite(b.smoke);
    const w = b.w, y = (-w / 2).toFixed(1);
    fEnd = 15 + b.fl;
    ashW = Math.max(8, 11 * (w / 16));
    const show = (el, on) => { el.style.display = on ? '' : 'none'; };
    cigs.forEach((c) => {
      for (const el of [c.paper, c.filter, c.band, c.deco, c.shade]) { el.setAttribute('y', y); el.setAttribute('height', w); }
      c.paper.setAttribute('fill', b.paper);
      show(c.filter, b.fl > 0);
      c.filter.setAttribute('x', -fEnd);
      c.filter.setAttribute('width', b.fl);
      c.filter.setAttribute('fill', b.filter);
      show(c.band, b.fl > 0 && b.band !== 'none');
      c.band.setAttribute('x', -fEnd - 2);
      c.band.setAttribute('width', 3);
      c.band.setAttribute('fill', b.band);
      show(c.deco, !!b.deco);
      if (b.deco) {
        c.deco.setAttribute('x', -fEnd - b.deco.at - b.deco.w);
        c.deco.setAttribute('width', b.deco.w);
        c.deco.setAttribute('fill', b.deco.fill);
      }
      c.ash.setAttribute('y', (-w / 2 + 0.5).toFixed(1));
      c.ash.setAttribute('height', w - 1);
      c.ash.setAttribute('width', ashW.toFixed(1));
      c.ash.setAttribute('fill', b.ash);
      c.glow.setAttribute('r', (22 * Math.max(0.8, w / 16)).toFixed(1));
      c.core.setAttribute('r', (6.5 * (w / 16)).toFixed(1));
    });
    const p = b.pack;
    $('pkBody').setAttribute('fill', p.body);
    $('pkTop').setAttribute('fill', p.top);
    $('pkBrand').setAttribute('fill', p.topInk);
    $('pkVar').setAttribute('fill', p.topInk);
    $('pkVar').textContent = b.ms.toUpperCase();
    setTargets();
    applyLook();
  }

  function setTargets() {
    const fullL = brand ? brand.L : 285;
    const full = Math.min(MAX_CIGS, Math.floor(state.cigs));
    const frac = state.cigs - Math.floor(state.cigs);
    cigs.forEach((c, i) => {
      if (i < full) c.targetL = fullL;
      else if (i === full && full < MAX_CIGS && frac > 0.04) c.targetL = 115 + frac * (fullL - 115);
      else c.targetL = 0;
    });
  }

  // ---------- level / time updates ----------
  function applyLook() {
    const { h } = state;
    const sky = skyAt(state.hour);
    state.day = sky.day;
    const d = sky.day, n = 1 - d;
    const hz = mix('#4d4236', '#c4ad7f', d);
    $('skyTop').setAttribute('stop-color', mix(sky.top, hz, h * 0.72));
    $('skyBot').setAttribute('stop-color', mix(sky.bot, hz, h * 0.9));
    world.querySelectorAll('.hzc').forEach((st) => st.setAttribute('stop-color', hz));
    world.querySelectorAll('.hazeFar').forEach((el) => el.setAttribute('opacity', (0.05 + h * 0.8).toFixed(3)));
    world.querySelectorAll('.hazeMid').forEach((el) => el.setAttribute('opacity', (h * 0.45).toFixed(3)));

    const css = world.style;
    css.setProperty('--night', n.toFixed(3));
    css.setProperty('--clear', (1 - h).toFixed(3));
    for (const k in PALETTE) css.setProperty(k, mix(PALETTE[k][1], PALETTE[k][0], d));
    for (const k in ACCENTS) css.setProperty('--ac-' + k, mix(ACCENTS[k], '#141a33', n * 0.62));
    FACADES.forEach((c, i) => css.setProperty('--f' + i, mix(c, '#161c38', n * 0.62)));
    css.setProperty('--wt', mix(mix(sky.bot, '#3f7895', 0.45), hz, h * 0.6));
    css.setProperty('--wb', mix(mix('#21587a', '#0a1630', n), hz, h * 0.4));
    const filter = `blur(${(h * 1.8).toFixed(2)}px) saturate(${(1 - h * 0.35).toFixed(2)})`;
    skyEl.style.filter = filter;
    landsEl.style.filter = filter;

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

    // ashtray butts and the overflow badge on the pack
    const sol = brand ? brand.solid : { paper: '#efe9dc', filter: '#d68c3d' };
    const butts = Math.min(9, Math.floor(state.cigs * 0.8));
    let b = '';
    for (let i = 0; i < butts; i++) {
      const bx = -40 + ((i * 37) % 80), by = -4 + ((i * 13) % 9), ang = -30 + ((i * 47) % 70);
      b += `<g transform="translate(${bx} ${by}) rotate(${ang})"><rect x="-14" y="-3" width="20" height="6" rx="2" fill="${sol.filter}"/><rect x="6" y="-3" width="6" height="6" rx="2" fill="${sol.paper}"/><rect x="11" y="-3" width="3" height="6" fill="#55504a"/></g>`;
    }
    $('butts').innerHTML = b;
    const extra = Math.max(0, Math.round(state.cigs) - MAX_CIGS);
    $('pkExtra').setAttribute('opacity', extra > 0 ? 1 : 0);
    $('packTxt').textContent = '+' + extra;
  }

  function setLevel(api, cigCount) {
    state.api = api;
    state.cigs = cigCount;
    state.h = clamp(Math.pow(clamp((api - 15) / 240, 0, 1.15), 0.85), 0, 1.1);
    setTargets();
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
  const rigG = $('rig');
  let last = performance.now(), t = 0, running = true;

  function rigPoint(lx, ly, sway, ox, oy) {
    const rad = (sway * Math.PI) / 180, cs = Math.cos(rad), sn = Math.sin(rad);
    const x = lx * RIG.s, y = ly * RIG.s;
    return [x * cs - y * sn + RIG.x + ox, x * sn + y * cs + RIG.y + oy];
  }

  function stepParticles(ctx, arr, spr, alpha, grow, wind, scale = 1) {
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.life += dtNow;
      if (p.life > p.max) { arr.splice(i, 1); continue; }
      const k = p.life / p.max;
      p.vx += (Math.sin(t * 1.4 + p.seed + p.life * 1.7) * 10 + wind * 14) * dtNow;
      p.vy -= 3 * dtNow;
      p.x += p.vx * dtNow;
      p.y += p.vy * dtNow;
      p.r += (p.grow ?? grow) * dtNow * (1 - k * 0.5);
      ctx.globalAlpha = (p.alpha ?? alpha) * Math.pow(1 - k, 1.6) * Math.min(1, p.life * 3);
      ctx.drawImage(p.spr || spr, (p.x - p.r) * scale, (p.y - p.r) * scale, p.r * 2 * scale, p.r * 2 * scale);
    }
  }
  let dtNow = 0;

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    dtNow = dt;
    last = now;
    t += dt;

    // parallax
    state.px = lerp(state.px, state.tx * calm, 0.04);
    state.py = lerp(state.py, state.ty * calm, 0.04);
    const fx = -state.px * 6, fy = -state.py * 3;
    if (land.far) {
      land.far.setAttribute('transform', `translate(${fx.toFixed(2)} ${fy.toFixed(2)})`);
      land.mid.setAttribute('transform', `translate(${(-state.px * 14).toFixed(2)} ${(-state.py * 5).toFixed(2)})`);
    }

    // hand sway, a little heavier when holding more
    const load = clamp(state.cigs / 10, 0, 1);
    const sway = calm * (1.7 * Math.sin(t * 0.62) + 0.6 * Math.sin(t * 1.73 + 1) + load * 0.8 * Math.sin(t * 3.1));
    const bob = calm * (5 * Math.sin(t * 0.9) + load * 3);
    state.drop = lerp(state.drop, state.dropTo, 0.09);
    const ox = state.px * 22, oy = state.py * 10 + bob + state.drop;
    rigG.setAttribute('transform', `translate(${(RIG.x + ox).toFixed(2)} ${(RIG.y + oy).toFixed(2)}) rotate(${sway.toFixed(3)}) scale(${RIG.s})`);

    // something crossing the sky now and then
    const pc = (t % flyer.period) / flyer.period;
    if (pc < 0.7) {
      const p = pc / 0.7;
      flyerG.style.display = '';
      flyerG.setAttribute('transform', `translate(${(-80 + p * 1200).toFixed(1)} ${(flyer.y0 + (flyer.y1 - flyer.y0) * p).toFixed(1)}) scale(${flyer.s})`);
      if (flyerLight) flyerLight.setAttribute('opacity', Math.sin(t * 9) > 0.6 ? 1 : 0.15);
    } else flyerG.style.display = 'none';

    // cigarettes: length + slide tweening, ember flicker, smoke emission
    const wind = 0.35 + 0.25 * Math.sin(t * 0.21);
    const smokeMul = brand?.smokeMul || 1;
    cigs.forEach((c) => {
      if (c.targetL > 0) {
        c.L = lerp(c.L, c.targetL, 0.06);
        c.slide = lerp(c.slide, 0, 0.07);
      } else {
        c.slide = lerp(c.slide, c.L + 30, 0.07);
      }
      const vis = c.slide < c.L + 20;
      if (vis !== c.visible) {
        c.el.style.display = vis ? '' : 'none';
        c.visible = vis;
      }
      if (!vis) return;
      const L = c.L;
      c.paper.setAttribute('x', (-L).toFixed(1));
      c.paper.setAttribute('width', Math.max(0, L - fEnd).toFixed(1));
      c.shade.setAttribute('x', (-L).toFixed(1));
      c.shade.setAttribute('width', Math.max(0, L - 15).toFixed(1));
      c.ash.setAttribute('x', (-L - ashW + 2).toFixed(1));
      c.glow.setAttribute('cx', (-L - ashW * 0.6).toFixed(1));
      c.core.setAttribute('cx', (-L - ashW * 0.55).toFixed(1));
      c.body.setAttribute('transform', `translate(${c.slide.toFixed(1)} 0)`);

      c.nextPuff -= dt;
      if (c.nextPuff <= 0) { c.puff = 1; c.nextPuff = 3 + Math.random() * 7; }
      c.puff = Math.max(0, c.puff - dt * 0.8);
      const e = clamp(0.5 + 0.22 * Math.sin(t * 2.3 + c.phase) + 0.1 * Math.sin(t * 7.1 + c.phase * 2) + c.puff * 0.55, 0, 1.2);
      c.glow.setAttribute('opacity', e.toFixed(3));
      c.core.setAttribute('fill', mix('#a8321a', '#ffd166', e));

      // smoke (and kretek crackle) from the tip
      if (c.slide < 30 && state.drop < 60) {
        const rad = (c.a * Math.PI) / 180;
        const tx = -(L + ashW) + c.slide;
        const [wx, wy] = rigPoint(c.px + tx * Math.cos(rad), c.py + tx * Math.sin(rad), sway, ox, oy);
        const rate = (11 + c.puff * 30) * smokeMul;
        if (Math.random() < rate * dt && particles.length < 560) {
          particles.push({ x: wx, y: wy, vx: (Math.random() - 0.5) * 6, vy: -18 - Math.random() * 14, r: (4 + Math.random() * 3) * (brand ? brand.w / 16 : 1), life: 0, max: 4.5 + Math.random() * 3, seed: Math.random() * 10 });
        }
        if (brand?.sparks && c.puff > 0.6 && Math.random() < 14 * dt) {
          sparks.push({ x: wx, y: wy, vx: (Math.random() - 0.5) * 70, vy: -20 - Math.random() * 50, life: 0, max: 0.4 + Math.random() * 0.5 });
        }
      }
    });

    // tea steam + backdrop emitters (chimneys, kitchen smoke, waterfall mist)
    if (Math.random() < 5 * dt && steam.length < 60) {
      steam.push({ x: 888 + (Math.random() - 0.5) * 34, y: 792, vx: 0, vy: -12 - Math.random() * 8, r: 5, life: 0, max: 3 + Math.random() * 2, seed: Math.random() * 10 });
    }
    for (const em of emitters) {
      const k = FX[em.kind];
      if (k && Math.random() < k.rate * dt && fxParts.length < 260) {
        fxParts.push({ x: em.x + fx + (Math.random() - 0.5) * k.spread, y: em.y + fy, vx: (Math.random() - 0.5) * 6, vy: k.vy * (0.7 + Math.random() * 0.6), r: k.r, grow: k.grow, alpha: k.alpha, spr: k.spr, life: 0, max: k.life * (0.7 + Math.random() * 0.6), seed: Math.random() * 10 });
      }
    }

    // draw smoke, steam, sparks
    sctx.clearRect(0, 0, W, W);
    stepParticles(sctx, particles, smokeSprite, 0.5, 15, wind);
    stepParticles(sctx, steam, steamSprite, 0.22, 9, wind);
    if (sparks.length) {
      sctx.globalCompositeOperation = 'lighter';
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life += dt;
        if (s.life > s.max) { sparks.splice(i, 1); continue; }
        s.vy += 90 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        sctx.globalAlpha = 1 - s.life / s.max;
        sctx.fillStyle = '#ffb347';
        sctx.fillRect(s.x - 1.5, s.y - 1.5, 3, 3);
      }
      sctx.globalCompositeOperation = 'source-over';
    }
    sctx.globalAlpha = 1;

    fctx.clearRect(0, 0, 512, 512);
    if (fxParts.length) stepParticles(fctx, fxParts, null, 0.3, 15, wind, 0.5);
    fctx.globalAlpha = 1;

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

  setTheme('kl', 1);
  applyLook();
  requestAnimationFrame(frame);
  // lower the cigarette hand while the map is held up
  function setMapMode(on) { state.dropTo = on ? 560 : 0; }

  return { setLevel, setHour, setTheme, setBrand, setPaused, setMapMode, isPaused: () => paused, state };
}
