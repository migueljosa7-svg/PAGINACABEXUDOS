import { leerParadas } from './_lib/municipal.js';
import { send } from './_lib/gps.js';
import { paradasActivas } from '../server/paradasStore.js';

// GET /api/paradas[?ruta=<id>]  — público (las paradas ya son información pública).
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return send(res, 405, { error: 'method_not_allowed' });
  }
  const store = await leerParadas();
  const ruta = String(req.query?.ruta || '');
  return send(
    res,
    200,
    ruta
      ? { ruta, paradas: paradasActivas(store, ruta), actualizadoAt: store.actualizadoAt }
      : { paradas: store.paradas, actualizadoAt: store.actualizadoAt },
  );
}
