// GET /api/trend?states=10,14,16 → last ~24 h of hourly API per station.
// State 99 is Singapore (24-hour PSI per NEA region).
import { fetchDoe, mytHour, singaporeTrend, SG_STATE } from './_lib.js';

export default async function handler(req, res) {
  const states = String(req.query.states || '')
    .split(',')
    .map(Number)
    .filter((n) => (Number.isInteger(n) && n >= 1 && n <= 16) || n === SG_STATE)
    .slice(0, 6);
  if (!states.length) return res.status(400).json({ error: 'states=1..16 or 99 required' });

  const dt = mytHour();
  const doeStates = states.filter((n) => n !== SG_STATE);
  const [doe, sg] = await Promise.all([
    Promise.allSettled(doeStates.map((id) => fetchDoe(`apitablehourly?stateid=${id}&datetime=${dt}&`))),
    states.includes(SG_STATE) ? singaporeTrend().catch(() => ({})) : Promise.resolve({}),
  ]);
  const series = { ...sg };
  for (const r of doe) {
    if (r.status !== 'fulfilled') continue;
    for (const row of r.value.api_table_hourly || []) {
      (series[row.STATION_ID] ||= []).push([row.DATETIME, row.API == null ? null : +row.API]);
    }
  }
  for (const k in series) series[k].sort((a, b) => (a[0] < b[0] ? -1 : 1));

  if (!Object.keys(series).length) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'Trend unavailable' });
  }
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  return res.status(200).json({ series });
}
