import { requirePanel, leerParadas, guardarParadas, catalogoComercios } from '../_lib/municipal.js';
import { readJson, send } from '../_lib/gps.js';
import { aplicarOperacion, paradasActivas } from '../../server/paradasStore.js';

// POST /api/municipal/paradas  {tipo: upsert|delete|replace, rutaId, ...}
export default async function handler(req, res) {
  if (!requirePanel(req, res, { allow: ['POST'] })) return;
  const cuerpo = await readJson(req);
  try {
    const resultado = aplicarOperacion(await leerParadas(), {
      ...cuerpo,
      opciones: { catalogo: catalogoComercios() },
    });
    if (!resultado.ok) return send(res, 400, { error: resultado.motivo });
    const guardado = await guardarParadas(resultado.store);
    return send(res, 200, {
      ok: true,
      actualizadoAt: guardado.actualizadoAt,
      paradas: paradasActivas(guardado, String(cuerpo.rutaId ?? '').trim()),
    });
  } catch (err) {
    console.error('[municipal/paradas]', err);
    return send(res, 503, { error: 'storage_unavailable' });
  }
}
