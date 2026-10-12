// GET /api/air → latest API reading for every DOE station.
// DOE's endpoint only allows its own origin via CORS, so we proxy it and let
// Vercel's edge cache absorb the traffic.
import { fetchDoe, normalizeDoe, openMeteoFallback } from './_lib.js';

export default async function handler(req, res) {
  let body;
  try {
    const j = await fetchDoe('mapcaqm?_ts=' + Date.now());
    const data = normalizeDoe(j.data || []);
    if (!data.stations.some((s) => s.api != null)) throw new Error('DOE returned no readings');
    body = { source: 'doe', ...data };
  } catch (err) {
    console.error('[air] DOE failed:', err.message);
    try {
      body = { source: 'model', ...(await openMeteoFallback()) };
    } catch (err2) {
      console.error('[air] fallback failed:', err2.message);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(502).json({ error: 'Air quality sources are unavailable right now.' });
    }
  }
  body.fetchedAt = new Date().toISOString();
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
  return res.status(200).json(body);
}
