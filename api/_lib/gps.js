// Utilidades compartidas de las funciones serverless GPS (Vercel).
//
// Vercel no admite WebSockets ni mantiene memoria entre peticiones, así que el
// relay funciona así:
//   emisor  --POST /api/gps/push-->  almacén (Redis REST)  <--GET /api/location/latest--  visores
// Sin Redis configurado se usa un Map en memoria: vale para probar en local o
// con una sola instancia caliente, pero NO es fiable en producción.

import { getJson, setJson } from './store.js';
import { recordAnalytics } from './municipal.js';
export { send, readJson } from './http.js';
export { storageMode } from './store.js';

const TOKEN_RE = /^[a-zA-Z0-9_-]{3,128}$/;
const POSITION_TTL_S = 300;
const MIN_INTERVAL_MS = 700;
// Estela del recorrido: se añade un punto cuando la comparsa se ha movido al
// menos TRAIL_MIN_STEP_M, y se conservan los últimos TRAIL_MAX_POINTS.
const TRAIL_MIN_STEP_M = 8;
const TRAIL_MAX_POINTS = 240;
const MAX_ACCURACY_M = Number(process.env.GPS_MAX_ACCURACY_M) || 30;
const FIRST_FIX_MAX_ACCURACY_M = 100;
const DEMO_MAX_ACCURACY_M = Number(process.env.GPS_DEMO_MAX_ACCURACY_M) || 500;
const GEOFENCE = {
  minLat: Number(process.env.GEOFENCE_MIN_LAT ?? 41.4),
  maxLat: Number(process.env.GEOFENCE_MAX_LAT ?? 41.8),
  minLng: Number(process.env.GEOFENCE_MIN_LNG ?? -1.1),
  maxLng: Number(process.env.GEOFENCE_MAX_LNG ?? -0.7),
};
const ALLOW_DEMO_OUTSIDE = /^(1|true|yes)$/i.test(String(process.env.GPS_DEMO_ALLOW_OUTSIDE_GEOFENCE || '').trim());

/**
 * Tokens de PRUEBAS: una vez autorizados (siguen exigiendo estar en
 * AUTHORIZED_GPS_DEVICES o GPS_DEMO_TOKENS), cualquier coordenada válida se
 * guarda: sin geovalla ni umbral de precisión, para que el primer fix lento de
 * un móvil en interior no bloquee la demo. Quitar de aquí al pasar a real.
 */
const OPEN_TEST_TOKENS = new Set(['cmp_prueba_barrio']);

export const isValidTokenFormat = (t) => typeof t === 'string' && TOKEN_RE.test(t.trim());

/** Quita comillas/espacios que se cuelan al pegar valores en el panel de Vercel. */
const cleanEnv = (v) => String(v || '').trim().replace(/^['"]|['"]$/g, '');

function parseAuthorized() {
  try {
    const parsed = JSON.parse(cleanEnv(process.env.AUTHORIZED_GPS_DEVICES) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function parseDemo() {
  const out = {};
  for (const entry of cleanEnv(process.env.GPS_DEMO_TOKENS).split(',')) {
    const item = entry.trim();
    if (!item) continue;
    const i = item.indexOf(':');
    const token = (i === -1 ? item : item.slice(0, i)).trim();
    const name = i === -1 ? '' : item.slice(i + 1).trim();
    if (isValidTokenFormat(token)) out[token] = { name, demo: true };
  }
  return out;
}

/** @returns {{ok:boolean, name:string, demo:boolean}} */
export function authorize(rawToken) {
  const token = String(rawToken || '').trim();
  if (!isValidTokenFormat(token)) return { ok: false, name: '', demo: false };
  const prod = parseAuthorized()[token];
  if (prod) {
    return { ok: true, name: (typeof prod === 'object' && prod.name) || 'Comparsa', demo: false, open: OPEN_TEST_TOKENS.has(token) };
  }
  const demo = parseDemo()[token];
  if (demo) return { ok: true, name: demo.name || 'Comparsa (demo)', demo: true, open: OPEN_TEST_TOKENS.has(token) };
  return { ok: false, name: '', demo: false };
}

// ---------------------------------------------------------------- almacén ---
const key = (token) => `pcx:gps:${token}`;
const readRoom = (token) => getJson(key(token));
const writeRoom = (token, value) => setJson(key(token), value, POSITION_TTL_S);
export { readRoom };

// -------------------------------------------------------------- validación ---
export function validatePosition(body, auth, previous) {
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return 'invalid_coordinates';
  }
  if (auth.open) return null; // token de pruebas: cualquier coordenada válida
  const insideFence =
    lat >= GEOFENCE.minLat && lat <= GEOFENCE.maxLat && lng >= GEOFENCE.minLng && lng <= GEOFENCE.maxLng;
  if (!insideFence && !(auth.demo && ALLOW_DEMO_OUTSIDE)) return 'outside_geofence';
  const accuracy = Number(body.accuracy);
  const limit = auth.demo ? DEMO_MAX_ACCURACY_M : previous ? MAX_ACCURACY_M : FIRST_FIX_MAX_ACCURACY_M;
  if (Number.isFinite(accuracy) && accuracy > limit) return 'low_accuracy';
  return null;
}

const rad = Math.PI / 180;
function distanceM(aLat, aLng, bLat, bLng) {
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(h));
}

/** Añade el punto a la estela si hay desplazamiento real (5 decimales ≈ 1 m). */
function nextTrail(trail, lat, lng) {
  const list = Array.isArray(trail) ? trail : [];
  const last = list[list.length - 1];
  if (last && distanceM(last[0], last[1], lat, lng) < TRAIL_MIN_STEP_M) return list;
  const point = [Math.round(lat * 1e5) / 1e5, Math.round(lng * 1e5) / 1e5];
  return [...list, point].slice(-TRAIL_MAX_POINTS);
}

export async function pushPosition(token, auth, body) {
  const now = Date.now();
  const room = await readRoom(token);
  const previous = room?.lastPosition || null;
  if (room && now - room.lastSeen < MIN_INTERVAL_MS) return { ok: true, skipped: 'rate_limited' };
  const problem = validatePosition(body, auth, previous);
  if (problem) return { ok: false, error: problem };
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const lastPosition = {
    lat: Number(body.lat),
    lng: Number(body.lng),
    accuracy: num(body.accuracy),
    speed: Math.max(0, num(body.speed)),
    heading: num(body.heading),
    altitude: num(body.altitude),
    timestamp: now,
  };
  await writeRoom(token, {
    senderId: `sender-${token.slice(0, 8)}`,
    label: auth.name,
    connectedAt: room?.connectedAt || now,
    lastSeen: now,
    lastPosition,
    trail: nextTrail(room?.trail, lastPosition.lat, lastPosition.lng),
  });
  // Analítica municipal: nunca debe tumbar la emisión.
  try {
    await recordAnalytics(token, { lat: lastPosition.lat, lng: lastPosition.lng, speed: lastPosition.speed, at: now });
  } catch (err) {
    console.error('[analytics]', err);
  }
  return { ok: true };
}

export async function snapshot(token) {
  const room = await readRoom(token);
  const live = room?.lastPosition
    ? [{ type: 'gps', senderId: room.senderId, label: room.label, ...room.lastPosition }]
    : [];
  return {
    type: 'room_info',
    tokenRoomId: token,
    sendersCount: room ? 1 : 0,
    receiversCount: 0,
    senders: room
      ? [{ senderId: room.senderId, label: room.label, connectedAt: room.connectedAt, lastSeen: room.lastSeen, lastPosition: room.lastPosition }]
      : [],
    transport: 'poll',
    trail: room?.trail || [],
    live,
    timestamp: Date.now(),
  };
}

