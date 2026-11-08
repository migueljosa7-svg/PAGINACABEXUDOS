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
    return { ok: true, name: (typeof prod === 'object' && prod.name) || 'Comparsa', demo: false };
  }
  const demo = parseDemo()[token];
  if (demo) return { ok: true, name: demo.name || 'Comparsa (demo)', demo: true };
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
  const insideFence =
    lat >= GEOFENCE.minLat && lat <= GEOFENCE.maxLat && lng >= GEOFENCE.minLng && lng <= GEOFENCE.maxLng;
  if (!insideFence && !(auth.demo && ALLOW_DEMO_OUTSIDE)) return 'outside_geofence';
  const accuracy = Number(body.accuracy);
  const limit = auth.demo ? DEMO_MAX_ACCURACY_M : previous ? MAX_ACCURACY_M : FIRST_FIX_MAX_ACCURACY_M;
  if (Number.isFinite(accuracy) && accuracy > limit) return 'low_accuracy';
  return null;
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
    live,
    timestamp: Date.now(),
  };
}

