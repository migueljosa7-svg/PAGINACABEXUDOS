import { isValidTokenFormat, send, snapshot } from '../_lib/gps.js';

// GET /api/location/latest?token=...  ->  snapshot de la sala (mismo formato que el SSE antiguo)
export default async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' });
  const token = String(req.query?.token || '').trim();
  if (!isValidTokenFormat(token)) return send(res, 400, { error: 'invalid_token' });
  try {
    return send(res, 200, await snapshot(token));
  } catch (err) {
    console.error('[location/latest]', err);
    return send(res, 503, { error: 'storage_unavailable' });
  }
}
