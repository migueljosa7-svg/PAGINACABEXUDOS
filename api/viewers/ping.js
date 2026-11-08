import { isValidTokenFormat, readJson, send } from '../_lib/gps.js';
import { touchViewer } from '../_lib/store.js';

// POST /api/viewers/ping {token, viewerId}  — latido anónimo de un espectador.
// Alimenta el indicador de afluencia del panel municipal. No guarda datos personales.
export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  const { token, viewerId } = await readJson(req);
  const id = String(viewerId || '').slice(0, 40);
  if (!isValidTokenFormat(token) || !/^[a-zA-Z0-9_-]{6,40}$/.test(id)) return send(res, 400, { error: 'invalid' });
  try {
    return send(res, 200, { viewers: await touchViewer(String(token).trim(), id) });
  } catch {
    return send(res, 200, { viewers: 0 });
  }
}
