// Panel municipal B2G sobre Vercel: autenticación, analítica y paradas en Redis.
// Reutiliza la lógica pura de /server (misma que usa server.js en Render).

import { readFileSync } from 'node:fs';
import { leerTokenConfigurado, extraerTokenCabecera, compararTokens } from '../../server/municipalAuth.js';
import {
  registrarFix,
  registrarAudiencia,
  exportarSala,
  importarSala,
  reiniciar,
  resumen,
  listarSalas,
  resolverPorHash,
  INTERVALO_AUDIENCIA_MS,
  MUNICIPAL_TTL_MS,
} from '../../server/municipalAnalytics.js';
import { normalizarStore, construirStore, storeVacio } from '../../server/paradasStore.js';
import { getJson, setJson, setAdd, setMembers, countViewers } from './store.js';
import { send } from './http.js';

const ROOMS_KEY = 'pcx:muni:rooms';
const roomKey = (token) => `pcx:muni:${token}`;
const PARADAS_KEY = 'pcx:paradas';

// ------------------------------------------------------------------ auth ---
/** @returns {boolean} true si la petición puede continuar (si no, ya respondió). */
export function requirePanel(req, res, { allow = ['GET'] } = {}) {
  if (!allow.includes(req.method)) {
    res.setHeader('Allow', allow.join(', '));
    send(res, 405, { error: 'method_not_allowed' });
    return false;
  }
  const credencial = leerTokenConfigurado();
  if (!credencial.presente) {
    send(res, 503, { error: 'panel_no_configurado' });
    return false;
  }
  if (!compararTokens(extraerTokenCabecera(req.headers), credencial.token)) {
    send(res, 401, { error: 'no_autorizado' });
    return false;
  }
  return true;
}

// ------------------------------------------------------------- analítica ---
/**
 * Registra una posición ya aceptada. Todo el tramo importar->operar->exportar
 * es síncrono: el estado global del módulo no se comparte entre peticiones.
 */
export async function recordAnalytics(token, fix) {
  const stored = await getJson(roomKey(token));
  let audience = null;
  if (!stored || fix.at - (stored.audienciaAt || 0) >= INTERVALO_AUDIENCIA_MS) {
    audience = await countViewers(token).catch(() => 0);
  }
  reiniciar();
  if (stored?.sala) importarSala(token, stored.sala);
  registrarFix({ roomId: token, ...fix });
  let audienciaAt = stored?.audienciaAt || 0;
  if (audience !== null) {
    registrarAudiencia({ roomId: token, espectadores: audience, at: fix.at });
    audienciaAt = fix.at;
  }
  const sala = exportarSala(token);
  reiniciar();
  if (!sala) return;
  await setJson(roomKey(token), { sala, audienciaAt }, Math.round(MUNICIPAL_TTL_MS / 1000));
  await setAdd(ROOMS_KEY, token);
}

/** Carga todas las salas, ejecuta `fn` de forma síncrona y limpia el estado. */
export async function withAnalytics(fn) {
  const tokens = await setMembers(ROOMS_KEY);
  const loaded = await Promise.all(tokens.map(async (t) => [t, await getJson(roomKey(t))]));
  reiniciar();
  try {
    for (const [t, data] of loaded) if (data?.sala) importarSala(t, data.sala);
    return fn({ resumen, listarSalas, resolverPorHash });
  } finally {
    reiniciar();
  }
}

// --------------------------------------------------------------- paradas ---
export async function leerParadas() {
  try {
    return normalizarStore(await getJson(PARADAS_KEY));
  } catch {
    return storeVacio();
  }
}

export async function guardarParadas(store) {
  const limpio = construirStore(store);
  await setJson(PARADAS_KEY, limpio);
  return limpio;
}

/** Catálogo de comercios válidos (public/api/comercios.json) o `undefined`. */
export function catalogoComercios() {
  try {
    const raw = readFileSync(new URL('../../public/api/comercios.json', import.meta.url), 'utf8');
    const lista = JSON.parse(raw)?.comercios;
    return Array.isArray(lista) ? new Set(lista.map((p) => String(p.id))) : undefined;
  } catch {
    return undefined;
  }
}
