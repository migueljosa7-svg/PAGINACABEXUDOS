import { requirePanel, withAnalytics } from '../_lib/municipal.js';
import { send } from '../_lib/gps.js';

// GET /api/municipal/resumen[?sala=<hash>]  (cabecera x-panel-token)
export default async function handler(req, res) {
  if (!requirePanel(req, res)) return;
  const paramSala = String(req.query?.sala || '');
  try {
    const body = await withAnalytics(({ resumen, resolverPorHash }) => {
      const sala = paramSala ? resolverPorHash(paramSala) : null;
      return resumen({ roomId: sala, todas: !paramSala });
    });
    return send(res, 200, body);
  } catch (err) {
    console.error('[municipal/resumen]', err);
    return send(res, 503, { error: 'storage_unavailable' });
  }
}
