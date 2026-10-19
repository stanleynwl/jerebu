// GET /api/air → latest reading for every DOE station plus Singapore's five
// NEA regions. DOE's endpoint only allows its own origin via CORS, so we
// proxy it and let Vercel's edge cache absorb the traffic.
import { fetchDoe, normalizeDoe, openMeteoFallback, fetchSingapore, singaporeFallback } from './_lib.js';

async function malaysia() {
  try {
    const j = await fetchDoe('mapcaqm?_ts=' + Date.now());
    const data = normalizeDoe(j.data || []);
    if (!data.stations.some((s) => s.api != null)) throw new Error('DOE returned no readings');
    return { source: 'doe', ...data };
  } catch (err) {
    console.error('[air] DOE failed:', err.message);
    return { source: 'model', ...(await openMeteoFallback()) };
  }
}

async function singapore() {
  try {
    return { source: 'nea', ...(await fetchSingapore()) };
  } catch (err) {
    console.error('[air] NEA failed:', err.message);
    return { source: 'model', ...(await singaporeFallback()) };
  }
}

export default async function handler(req, res) {
  const [my, sg] = await Promise.allSettled([malaysia(), singapore()]);
  if (my.status !== 'fulfilled') {
    console.error('[air] Malaysia unavailable:', my.reason?.message);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'Air quality sources are unavailable right now.' });
  }
  const sgOk = sg.status === 'fulfilled' ? sg.value : null;
  const body = {
    source: my.value.source,
    recordTime: my.value.recordTime,
    sg: sgOk ? { source: sgOk.source, recordTime: sgOk.recordTime } : null,
    stations: [...my.value.stations, ...(sgOk ? sgOk.stations : [])],
    fetchedAt: new Date().toISOString(),
  };
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
  return res.status(200).json(body);
}
