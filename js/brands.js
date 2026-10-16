// Cigarette styles for the "brand" picker. These are the site's own parody
// house brand ("Jerebu ___"), not real tobacco trademarks: Malaysia bans
// advertising and promoting smoking products.
//
// paper/filter: SVG fills (may reference patterns in scene.js defs)
// w: stick width, L: full length, fl: filter length (0 = no filter)
// deco: an extra ring at `at` px from the filter end (thread, capsule, label)
// solid: flat colours used for butts in the ashtray and the picker icon
export const BRANDS = [
  {
    key: 'klasik', en: 'Classic', ms: 'Klasik',
    paper: '#f5f2eb', filter: 'url(#cork)', band: '#c9a24a', w: 16, L: 285, fl: 80,
    solid: { paper: '#f5f2eb', filter: '#d68c3d' }, ash: '#8f8b86', smoke: '236,238,244',
    pack: { body: '#f4f1ea', top: '#b8862f', ink: '#3a2a12', topInk: '#fff8e6' },
  },
  {
    key: 'merah', en: 'Red', ms: 'Merah',
    paper: '#f7f5f0', filter: '#efebe3', band: '#c8102e', deco: { fill: '#c8102e', at: 0, w: 9 }, w: 16, L: 285, fl: 80,
    solid: { paper: '#f7f5f0', filter: '#efebe3' }, ash: '#8f8b86', smoke: '236,238,244',
    pack: { body: '#f7f5f0', top: '#c8102e', ink: '#5a0a12', topInk: '#ffffff' },
  },
  {
    key: 'mentol', en: 'Menthol', ms: 'Mentol',
    paper: '#f8fbf8', filter: 'url(#mint)', band: '#1f9d55', deco: { fill: '#1f9d55', at: 34, w: 5 }, w: 16, L: 285, fl: 80,
    solid: { paper: '#f8fbf8', filter: '#dcefe2' }, ash: '#8f9590', smoke: '230,244,240',
    pack: { body: '#eaf6ee', top: '#1f9d55', ink: '#0f4a2a', topInk: '#ffffff' },
  },
  {
    key: 'kretek', en: 'Kretek', ms: 'Kretek',
    paper: 'url(#kretek)', filter: 'url(#corkDark)', band: '#d4a63a', w: 16, L: 280, fl: 70, sparks: true,
    solid: { paper: '#5a3a22', filter: '#9a5a26' }, ash: '#6d655d', smoke: '230,222,206',
    pack: { body: '#7a1f1f', top: '#d4a63a', ink: '#f6e2b0', topInk: '#3a1608' },
  },
  {
    key: 'daun', en: 'Nipah leaf', ms: 'Rokok daun',
    paper: 'url(#nipah)', filter: 'none', band: 'none', deco: { fill: '#b3261e', at: 36, w: 3 }, w: 14, L: 270, fl: 0,
    solid: { paper: '#d6c08a', filter: '#d6c08a' }, ash: '#9a9288', smoke: '226,222,210',
    pack: { body: '#cdb98a', top: '#6b4b2a', ink: '#3b2a14', topInk: '#f4e6c4' },
  },
  {
    key: 'slim', en: 'Gold slim', ms: 'Slim emas',
    paper: '#fbfaf6', filter: 'url(#goldF)', band: '#a8822b', w: 11, L: 320, fl: 64,
    solid: { paper: '#fbfaf6', filter: '#d4b05a' }, ash: '#8f8b86', smoke: '238,238,242',
    pack: { body: '#fbfaf6', top: '#c9a24a', ink: '#3a2a12', topInk: '#ffffff' },
  },
  {
    key: 'hitam', en: 'Black', ms: 'Hitam',
    paper: '#1f1d1c', filter: 'url(#goldF)', band: '#e8c66a', w: 15, L: 290, fl: 72,
    solid: { paper: '#1f1d1c', filter: '#d4b05a' }, ash: '#5b5650', smoke: '226,226,230',
    pack: { body: '#1f1d1c', top: '#c9a24a', ink: '#e8c66a', topInk: '#1f1d1c' },
  },
  {
    key: 'cerut', en: 'Cigar', ms: 'Cerut',
    paper: 'url(#cigarLeaf)', filter: 'none', band: 'none', deco: { fill: 'url(#cigarBand)', at: 18, w: 18 }, w: 24, L: 250, fl: 0, smokeMul: 1.4,
    solid: { paper: '#6b4226', filter: '#6b4226' }, ash: '#9b958d', smoke: '214,208,198',
    pack: { body: '#5a3a22', top: '#d4a63a', ink: '#f1e3c6', topInk: '#3a2410' },
  },
];

export const brandByKey = (k) => BRANDS.find((b) => b.key === k) || BRANDS[0];

// little sideways cigarette for the picker chips
export function brandIcon(b) {
  const h = Math.max(5, Math.round(b.w / 2.4));
  const y = (10 - h) / 2;
  const fl = b.fl ? Math.round((b.fl / b.L) * 34) + 2 : 0;
  const ring = b.deco ? `<rect x="${34 - fl - 2 - Math.round(b.deco.at / 9)}" y="${y}" width="${Math.max(1.5, b.deco.w / 5)}" height="${h}" fill="${b.deco.fill.startsWith('url') ? '#b3261e' : b.deco.fill}"/>` : '';
  return `<svg class="bicon" width="40" height="10" viewBox="0 0 40 10" aria-hidden="true">
    <rect x="3" y="${y}" width="${34 - fl}" height="${h}" rx="1" fill="${b.solid.paper}" stroke="rgba(0,0,0,.25)" stroke-width=".5"/>
    ${fl ? `<rect x="${37 - fl}" y="${y}" width="${fl}" height="${h}" rx="1" fill="${b.solid.filter}"/>` : ''}${ring}
    <rect x="1" y="${y + 0.5}" width="3" height="${h - 1}" rx="1" fill="#ff7a2b"/>
  </svg>`;
}
