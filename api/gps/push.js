import { authorize, pushPosition, readJson, send } from '../_lib/gps.js';

// POST /api/gps/push  {token, lat, lng, accuracy, speed, heading, altitude}
export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  const body = await readJson(req);
  const auth = authorize(body.token);
  if (!auth.ok) return send(res, 401, { ok: false, error: 'unauthorized' });
  try {
    const result = await pushPosition(String(body.token).trim(), auth, body);
    return send(res, result.ok ? 200 : 422, result);
  } catch (err) {
    console.error('[gps/push]', err);
    return send(res, 503, { ok: false, error: 'storage_unavailable' });
  }
}
