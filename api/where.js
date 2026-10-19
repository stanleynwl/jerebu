// GET /api/where → the visitor's approximate location from Vercel's IP
// geolocation headers, so the page can open on their nearest city without a
// permission prompt. Nothing is stored or sent anywhere else, and the answer
// is per-visitor, so it must never be cached.
export default function handler(req, res) {
  const h = req.headers;
  const lat = parseFloat(h['x-vercel-ip-latitude']);
  const lon = parseFloat(h['x-vercel-ip-longitude']);
  res.setHeader('Cache-Control', 'private, no-store');
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return res.status(200).json({});
  let city = null;
  try { city = h['x-vercel-ip-city'] ? decodeURIComponent(h['x-vercel-ip-city']) : null; } catch { /* malformed */ }
  return res.status(200).json({ lat, lon, city, country: h['x-vercel-ip-country'] || null });
}
