/**
 * PAGINACABEXUDOS — GPS Relay + Frontend Static (Unified)
 * v4.0
 *
 * Single-process contract over the SAME HTTP server/port:
 *   Sender  : /?role=sender&token=<TOKEN>
 *   Receiver: /?role=receiver&token=<TOKEN>
 *
 * Sender payload:
 *   { type: 'gps', lat, lng, accuracy?, speed?, heading?, altitude?, timestamp? }
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { createHash } from 'crypto';

// =============================================================================
// Paths & config
// =============================================================================

const __dirname = join(fileURLToPath(import.meta.url), '..');

// React build at repo root: ./dist
// This file is in ./gps-relay-server/, so ../dist is correct.
const DIST_DIR = process.env.DIST_DIR || join(__dirname, '..', 'dist');

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const CLEANUP_INTERVAL = parseInt(process.env.CLEANUP_INTERVAL || '60000', 10);
const ROOM_IDLE_TTL = parseInt(process.env.ROOM_IDLE_TTL || '300000', 10);

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLogLevel = LOG_LEVELS[LOG_LEVEL] ?? 1;

function log(level, ...args) {
  if (LOG_LEVELS[level] >= currentLogLevel) {
    const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
    if (level === 'error') console.error(prefix, ...args);
    else if (level === 'warn') console.warn(prefix, ...args);
    else console.log(prefix, ...args);
  }
}

// =============================================================================
// Token authorization
// =============================================================================

function parseAuthorizedDevices() {
  const raw = process.env.AUTHORIZED_GPS_DEVICES;
  // Fail-secure: sin env no hay emisores autorizados (sin fallback de prueba).
  // Generar con: npm run generate-env
  if (!raw) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[gps] AUTHORIZED_GPS_DEVICES ausente: se rechazarán todos los senders (4001).');
    }
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

const authorizedDevices = parseAuthorizedDevices();

/**
 * Valida el FORMATO del token de una URL directa: alfanumerico, guiones y
 * guiones bajos (p. ej. `cmp_prueba_barrio`), ademas de los tokens hex
 * oficiales. Validar el formato NO autoriza: eso lo decide `isValidToken`.
 */
function isValidTokenFormat(token) {
  if (!token || typeof token !== 'string') return false;
  return /^[a-zA-Z0-9_\-]{3,128}$/.test(token.trim());
}

function isValidToken(token) {
  if (!token) return false;
  if (!isValidTokenFormat(token)) return false;
  return !!authorizedDevices[token];
}

function getDeviceName(token) {
  const device = authorizedDevices[token];
  if (device === true) return token;
  return device?.name || token;
}

// --- Seguridad aditiva GPS (mismo contrato, wrappers sin breaking changes) ---
const GPS_MIN_INTERVAL_MS = 1000;   // max. 1 paquete de ubicacion por emisor y segundo
const GPS_MAX_ACCURACY_M = 30;      // anti-jitter: accuracy > 30 m se descarta
const TELEPORT_MIN_WINDOW_MS = 3000;
const TELEPORT_MAX_STEP_M = 100;
const TELEPORT_MAX_SPEED_MS = 30 / 3.6; // 30 km/h
const GPS_RATE_VIOLATION_BUDGET = 5;
const GEOFENCE = { minLat: 41.4, maxLat: 41.8, minLng: -1.1, maxLng: -0.7 };
const EARTH_RADIUS_M = 6371000;
const lastGpsMsgAt = new Map();

/** Distancia Haversine canonica (misma formula que telemetryUtils.ts del front). */
function haversineMeters(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

function isInsideGeofence(lat, lng) {
  return lat >= GEOFENCE.minLat && lat <= GEOFENCE.maxLat && lng >= GEOFENCE.minLng && lng <= GEOFENCE.maxLng;
}

/** Anti-teleport: >30 km/h o >100 m en menos de 3 s contra la ultima trama aceptada. */
function checkTeleport(prev, lat, lng, now) {
  if (!prev) return { ok: true, distanceM: 0 };
  const distanceM = haversineMeters(prev.lat, prev.lng, lat, lng);
  const dtMs = now - prev.at;
  if (dtMs <= 0) return { ok: false, reason: 'clock_skew', distanceM };
  if (dtMs < TELEPORT_MIN_WINDOW_MS && distanceM > TELEPORT_MAX_STEP_M) {
    return { ok: false, reason: 'teleport_step', distanceM };
  }
  if (distanceM / (dtMs / 1000) > TELEPORT_MAX_SPEED_MS) {
    return { ok: false, reason: 'teleport_speed', distanceM };
  }
  return { ok: true, distanceM };
}

function sonCoordenadasValidas(lat, lng, msg) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  for (const k of ['accuracy', 'speed', 'heading', 'altitude']) {
    const v = msg?.[k];
    if (v !== undefined && v !== null && (typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > 1e6)) return false;
  }
  return true;
}

function tokenFingerprint(token) {
  return createHash('sha256').update(String(token || '')).digest('hex').slice(0, 8);
}

// =============================================================================
// Rooms model
// =============================================================================

const rooms = new Map();
let clientIdCounter = 0;

// =============================================================================
// HYBRID v5: WS (sender 1:1) + SSE (receivers 1:N)
// =============================================================================
/** Clientes SSE activos: Map<id, { res, tokenRoomId, connectedAt }> */
const sseClients = new Map();
let sseClientIdCounter = 0;
const SSE_KEEPALIVE_MS = 15000;
const SENDER_STALE_MS = 30000;

function roomRouteId(room) { for (const e of rooms.entries()) { if (e[1] === room) return e[0]; } return ''; }
function broadcastAll(room, message) { broadcastToReceivers(room, message); broadcastToSSE(room, message); }
function broadcastToSSE(room, message) {
  if (sseClients.size === 0) return;
  const payload = typeof message === 'string' ? message : JSON.stringify(message);
  const frame = 'data: ' + payload + '\n\n';
  const roomId = roomRouteId(room);
  for (const e of Array.from(sseClients.entries())) {
    const id = e[0]; const client = e[1];
    if (roomId && client.tokenRoomId !== roomId) continue;
    try {
      if (client.res.writableEnded || client.res.destroyed) { sseClients.delete(id); continue; }
      if ((client.res.writableLength || 0) > 262144) { try { client.res.end(); } catch (x) {} sseClients.delete(id); continue; }
      client.res.write(frame);
    } catch (x) { try { client.res.end(); } catch (y) {} sseClients.delete(id); }
  }
}
function countSseViewers(tokenRoomId) { let n = 0; for (const c of sseClients.values()) { if (!tokenRoomId || c.tokenRoomId === tokenRoomId) n += 1; } return n; }
function sseSnapshot(tokenRoomId) {
  const room = rooms.get(tokenRoomId);
  const live = [];
  if (room) { for (const x of room.senders.values()) { if (x.lastPosition) live.push(Object.assign({ type: 'gps', senderId: x.senderId, label: x.label }, x.lastPosition)); } }
  const senders = room ? Array.from(room.senders.values()).map(function(x) { return { senderId: x.senderId, label: x.label, connectedAt: x.connectedAt, lastSeen: x.lastSeen }; }) : [];
  return { type: 'room_info', tokenRoomId: tokenRoomId, sendersCount: room ? room.senders.size : 0, sseViewers: countSseViewers(tokenRoomId), transport: 'sse', senders: senders, live: live, timestamp: Date.now() };
}
const sseKeepAliveTimer = setInterval(function() { for (const e of Array.from(sseClients.entries())) { const id = e[0]; const client = e[1]; try { if (client.res.writableEnded || client.res.destroyed) { sseClients.delete(id); continue; } client.res.write(': keep-alive\n\n'); } catch (x) { try { client.res.end(); } catch (y) {} sseClients.delete(id); } } }, SSE_KEEPALIVE_MS);
if (sseKeepAliveTimer.unref) sseKeepAliveTimer.unref();
const senderSweepTimer = setInterval(function() { const now = Date.now(); for (const room of rooms.values()) { for (const e of Array.from(room.senders.entries())) { const senderId = e[0]; const info = e[1]; if (now - (info ? info.lastSeen : 0) > SENDER_STALE_MS) { try { if (info.ws && info.ws.terminate) info.ws.terminate(); } catch (x) {} try { if (info.ws && info.ws.close) info.ws.close(1000, 'stale-sender'); } catch (x) {} room.senders.delete(senderId); broadcastAll(room, { type: 'sender_disconnected', senderId: senderId, timestamp: now }); } } } }, 15000);
if (senderSweepTimer.unref) senderSweepTimer.unref();

function getOrCreateRoom(routeId) {
  if (!rooms.has(routeId)) {
    rooms.set(routeId, {
      senders: new Map(),
      receivers: new Set(),
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    });
    log('info', `Room created: ${routeId}`);
  }
  return rooms.get(routeId);
}

function broadcastToReceivers(room, message) {
  const payload = typeof message === 'string' ? message : JSON.stringify(message);
  for (const receiver of room.receivers) {
    try {
      if (receiver.readyState === 1) receiver.send(payload);
      else room.receivers.delete(receiver);
    } catch {
      room.receivers.delete(receiver);
    }
  }
}

// =============================================================================
// Express app + Static hosting (SPA fallback)
// =============================================================================

const app = express();

// CORS headers + hardening aditivo
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if ((req.headers['x-forwarded-proto'] || '').includes('https') || req.socket?.encrypted) {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  }
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Health endpoint (ofuscado: sin HEALTH_TOKEN válido solo estado anónimo)
// Alias /healthz (convención Render/K8s) para el wake-up previo al WS.
app.get(['/health', '/healthz'], (req, res) => {
  const HEALTH_TOKEN = process.env.HEALTH_TOKEN || '';
  const provided = req.query.key || '';
  const authorized = !HEALTH_TOKEN || (provided && provided === HEALTH_TOKEN);
  if (!authorized) {
    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      hybrid: { sseViewers: sseClients.size, wsClients: wss ? wss.clients.size : 0 }
    });
  }
  const roomStats = [];
  for (const [routeId, room] of rooms.entries()) {
    roomStats.push({
      roomHash: createHash('sha256').update(String(routeId)).digest('hex').slice(0, 12),
      senders: room.senders.size,
      receivers: room.receivers.size,
      sseViewers: countSseViewers(routeId),
      lastActivityAt: new Date(room.lastActivityAt).toISOString(),
    });
  }

  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '5.0.0-hybrid',
    rooms: roomStats,
    totalSenders: roomStats.reduce((acc, r) => acc + r.senders, 0),
    totalReceivers: roomStats.reduce((acc, r) => acc + r.receivers, 0),
    totalSseViewers: sseClients.size,
  });
});

// =============================================================================
// SSE Stream endpoint para visualizadores masivos (1:N)
// =============================================================================
app.get('/api/stream/location', (req, res) => {
  const token = (req.query.token || '').trim();
  if (!token) {
    res.status(400).json({ error: 'Missing token query parameter' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
  });
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const clientId = ++sseClientIdCounter;
  sseClients.set(clientId, { res, tokenRoomId: token, connectedAt: Date.now() });

  const room = rooms.get(token);
  if (room) room.lastActivityAt = Date.now();

  const snap = sseSnapshot(token);
  res.write('data: ' + JSON.stringify(snap) + '\n\n');

  if (room && room.senders) {
    for (const s of room.senders.values()) {
      if (s.lastPosition) {
        res.write('data: ' + JSON.stringify(Object.assign({ type: 'gps', senderId: s.senderId, label: s.label }, s.lastPosition)) + '\n\n');
      }
    }
  }

  req.on('close', () => {
    sseClients.delete(clientId);
    try { res.end(); } catch (x) {}
  });
});

// Static files from React build
app.use(express.static(DIST_DIR));

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(join(DIST_DIR, 'index.html'));
});

// =============================================================================
// Create HTTP server and mount WebSocket
// =============================================================================

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, maxPayload: 4096 });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const role = url.searchParams.get('role') || 'receiver';
  const token = (url.searchParams.get('token') || '').trim();
  const tokenRoomId = token || 'missing-token';

  const clientId = ++clientIdCounter;
  log('info', `[#${clientId}] connection role=${role} room=${tokenFingerprint(tokenRoomId)}`);

  // Auth ANTES de crear sala (aditivo, mismo contrato).
  if (role === 'sender') {
    if (!isValidToken(token)) {
      log('warn', `[#${clientId}] rejected sender`);
      ws.close(4001, 'Unauthorized GPS token');
      return;
    }
  } else if (!token) {
    ws.close(4401, 'Missing token');
    return;
  }

  const room = getOrCreateRoom(tokenRoomId);
  room.lastActivityAt = Date.now();

  if (role === 'sender') {

    const senderId = `token:${token}`;
    const senderLabel = getDeviceName(token);

    // Unicidad de emisor por token/barrio: el nuevo desplaza al anterior y este
    // se cierra con 4009 (anti-secuestro de emision).
    if (room.senders.has(senderId)) {
      const oldSender = room.senders.get(senderId);
      log('info', `[#${clientId}] emisor duplicado: se expulsa la sesion previa (4009)`);
      try { oldSender.ws.close(4009, 'Reemplazado por una nueva sesion del mismo token'); } catch {}
      room.senders.delete(senderId);
    }

    // Estado de defensa por emisor (ancla anti-teleport + contador de rafagas).
    const senderInfo = {
      ws,
      senderId,
      token,
      label: senderLabel || token,
      lastPosition: null,
      lastFixAt: 0,
      rateViolations: 0,
      lastSeen: Date.now(),
      connectedAt: Date.now(),
    };

    room.senders.set(senderId, senderInfo);

    broadcastAll(room, {
      type: 'sender_connected',
      senderId,
      label: senderInfo.label,
      sendersCount: room.senders.size,
    });

    ws.send(
      JSON.stringify({
        type: 'gps_authorized',
        authorized: true,
        token,
        label: senderInfo.label,
      })
    );

    ws.send(
      JSON.stringify({
        type: 'room_info',
        tokenRoomId,
        sendersCount: room.senders.size,
        receiversCount: room.receivers.size,
        senders: Array.from(room.senders.values()).map((s) => ({
          senderId: s.senderId,
          label: s.label,
          connectedAt: s.connectedAt,
          lastSeen: s.lastSeen,
          lastPosition: s.lastPosition,
        })),
      })
    );

    ws.on('message', (data) => {
      let message;
      try {
        message = JSON.parse(data.toString());
      } catch {
        return;
      }

      room.lastActivityAt = Date.now();
      senderInfo.lastSeen = Date.now();

      if (message.type === 'gps') {
        const {
          latitude,
          longitude,
          lat,
          lng,
          accuracy,
          speed,
          heading,
          altitude,
          timestamp,
        } = message || {};

        const nextLat = typeof lat === 'number' ? lat : latitude;
        const nextLng = typeof lng === 'number' ? lng : longitude;

        // ==== Canal de auditoria GPS (todas las comprobaciones en servidor) ====
        // 1) Geometria valida (finitos y rangos globales de la Tierra).
        if (!sonCoordenadasValidas(nextLat, nextLng, message)) return;

        // 2) Geofence municipal: termino de Zaragoza y alrededores.
        if (!isInsideGeofence(nextLat, nextLng)) {
          log('warn', `[#${clientId}] GPS fuera de geofence descartado`);
          return;
        }

        const now = Date.now();

        // 3) Anti-jitter: precision pobre (>30 m) no es posicion fiable.
        const accuracyM = (accuracy ?? 0) || 0;
        if (accuracyM > GPS_MAX_ACCURACY_M) return;

        // 4) Rate-limit por emisor: 1 paquete de ubicacion por segundo; la
        //    rafaga de arranque se tolera, la saturacion sostenida expulsa (4029).
        const lastAt = lastGpsMsgAt.get(clientId) || 0;
        if (now - lastAt < GPS_MIN_INTERVAL_MS) {
          senderInfo.rateViolations += 1;
          if (senderInfo.rateViolations > GPS_RATE_VIOLATION_BUDGET) {
            log('warn', `[#${clientId}] rate limit GPS: emisor expulsado (4029)`);
            try { ws.close(4029, 'Rate limit exceeded: max 1 location packet per second'); } catch {}
          }
          return;
        }
        lastGpsMsgAt.set(clientId, now);
        senderInfo.rateViolations = 0;

        // 5) Anti-teleport: >30 km/h o >100 m en menos de 3 s.
        const teleport = checkTeleport(
          senderInfo.lastFixAt > 0 ? { lat: senderInfo.lastPosition.lat, lng: senderInfo.lastPosition.lng, at: senderInfo.lastFixAt } : null,
          nextLat,
          nextLng,
          now,
        );
        if (!teleport.ok) {
          log('warn', `[#${clientId}] GPS descartado por anti-spoofing (${teleport.reason}, ${Math.round(teleport.distanceM)}m)`);
          return;
        }

        // 6) Anti-replay: el timestamp del cliente es informativo; el reloj de
        //    referencia para el visor es el del servidor.
        const clientTs = typeof timestamp === 'number' && Number.isFinite(timestamp) ? timestamp : now;

        const pos = {
          lat: nextLat,
          lng: nextLng,
          accuracy: accuracyM,
          speed: (speed ?? 0) || 0,
          heading: (heading ?? 0) || 0,
          altitude: (altitude ?? 0) || 0,
          timestamp: clientTs,
        };

        senderInfo.lastPosition = pos;
        senderInfo.lastFixAt = now;
        senderInfo.lastSeen = now;

        broadcastAll(room, {
          type: 'gps',
          senderId,
          label: senderInfo.label,
          ...pos,
        });
      } else if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    });

    ws.on('close', () => {
      // Solo se purga la sala si el emisor que se va es el vigente (si fue
      // desplazado por otro socket del mismo token, no debe borrar al nuevo).
      if (room.senders.get(senderId)?.ws === ws) room.senders.delete(senderId);
      lastGpsMsgAt.delete(clientId);
      broadcastAll(room, {
        type: 'sender_disconnected',
        senderId,
        label: senderInfo.label,
        sendersCount: room.senders.size,
      });
      room.lastActivityAt = Date.now();
    });
  } else {
    room.receivers.add(ws);
    log('info', `[#${clientId}] receiver registered room=${tokenFingerprint(tokenRoomId)}. receivers=${room.receivers.size}`);

    ws.send(
      JSON.stringify({
        type: 'room_info',
        tokenRoomId,
        sendersCount: room.senders.size,
        receiversCount: room.receivers.size,
        senders: Array.from(room.senders.values()).map((s) => ({
          senderId: s.senderId,
          label: s.label,
          connectedAt: s.connectedAt,
          lastSeen: s.lastSeen,
          lastPosition: s.lastPosition,
        })),
      })
    );

    for (const s of room.senders.values()) {
      if (s.lastPosition) {
        ws.send(
          JSON.stringify({
            type: 'gps',
            senderId: s.senderId,
            label: s.label,
            ...s.lastPosition,
          })
        );
      }
    }

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch {}
    });

    ws.on('close', () => {
      room.receivers.delete(ws);
      room.lastActivityAt = Date.now();
    });
  }

  ws.on('error', (err) => {
    log('error', `[#${clientId}] ws error: ${err?.message || err}`);
  });

  // heartbeat helpers
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
});

// =============================================================================
// Heartbeat interval
// =============================================================================

const HEARTBEAT_INTERVAL = 30000;
const heartbeatTimer = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

wss.on('close', () => clearInterval(heartbeatTimer));

// =============================================================================
// Cleanup idle rooms
// =============================================================================

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [routeId, room] of rooms.entries()) {
    const idleTime = now - room.lastActivityAt;
    const busy = room.senders.size > 0 || room.receivers.size > 0 || countSseViewers(routeId) > 0;
    if (idleTime > ROOM_IDLE_TTL && !busy) {
      rooms.delete(routeId);
      log('info', `Cleaned up idle room: ${routeId}`);
    }
  }
}, CLEANUP_INTERVAL);

// =============================================================================
// Graceful shutdown
// =============================================================================

function shutdown(signal) {
  log('info', `Received ${signal}. Shutting down...`);
  clearInterval(heartbeatTimer);
  clearInterval(cleanupTimer);
  clearInterval(sseKeepAliveTimer);
  clearInterval(senderSweepTimer);

  const shutdownMsg = JSON.stringify({ type: 'server_shutdown', timestamp: Date.now() });
  for (const [, room] of rooms.entries()) {
    broadcastAll(room, shutdownMsg);
  }
  for (const client of sseClients.values()) {
    try { client.res.end('data: {"type":"server_shutdown"}\n\n'); } catch (x) {}
  }
  sseClients.clear();

  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// =============================================================================
// Start
// =============================================================================

httpServer.listen(PORT, HOST, () => {
  log('info', `DIST_DIR resolved to: ${DIST_DIR}`);
  log('info', `dist/index.html exists: ${existsSync(join(DIST_DIR, 'index.html'))}`);
  log('info', `\n╔══════════════════════════════════════════════════╗`);
  log('info', `║     🌐 PAGINACABEXUDOS - GPS Relay + Web         ║`);
  log('info', `║     Running on http://${HOST}:${PORT}           ║`);
  log('info', `╚══════════════════════════════════════════════════╝\n`);
  log('info', 'Waiting for connections...');
});
