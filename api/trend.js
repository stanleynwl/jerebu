// GET /api/trend?states=10,14,16 → last ~24 h of hourly API per station.
import { fetchDoe, mytHour } from './_lib.js';

export default async function handler(req, res) {
  const states = String(req.query.states || '')
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 16)
    .slice(0, 6);
  if (!states.length) return res.status(400).json({ error: 'states=1..16 required' });

  const dt = mytHour();
  const results = await Promise.allSettled(
    states.map((id) => fetchDoe(`apitablehourly?stateid=${id}&datetime=${dt}&`))
  );
  const series = {};
  for (const r of results) {
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
