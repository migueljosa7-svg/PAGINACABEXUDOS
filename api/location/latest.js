import { isValidTokenFormat, send, snapshot } from '../_lib/gps.js';

// GET /api/location/latest?token=...  ->  snapshot de la sala (mismo formato que el SSE antiguo)
export default async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' });
  const token = String(req.query?.token || '').trim();
  if (!isValidTokenFormat(token)) return send(res, 400, { error: 'invalid_token' });
  try {
    const body = await snapshot(token);
    // Caché de borde de 1 s: con cientos de espectadores, Redis recibe ~1 lectura/s.
    res.setHeader('Cache-Control', 'public, s-maxage=1, stale-while-revalidate=2');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify(body));
  } catch (err) {
    console.error('[location/latest]', err);
    return send(res, 503, { error: 'storage_unavailable' });
  }
}
