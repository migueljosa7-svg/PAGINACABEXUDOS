import { authorize, readJson, send } from '../_lib/gps.js';

// POST /api/gps/auth  {token}  ->  200 {ok,name} | 401
export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  const { token } = await readJson(req);
  const auth = authorize(token);
  if (!auth.ok) return send(res, 401, { ok: false, error: 'unauthorized' });
  return send(res, 200, { ok: true, name: auth.name });
}
