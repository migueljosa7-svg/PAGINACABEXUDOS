import { requirePanel, withAnalytics } from '../_lib/municipal.js';
import { send } from '../_lib/gps.js';

// GET /api/municipal/salas  (cabecera x-panel-token). Solo huellas, nunca tokens.
export default async function handler(req, res) {
  if (!requirePanel(req, res)) return;
  try {
    const salas = await withAnalytics(({ listarSalas }) => listarSalas());
    return send(res, 200, { salas });
  } catch (err) {
    console.error('[municipal/salas]', err);
    return send(res, 503, { error: 'storage_unavailable' });
  }
}
