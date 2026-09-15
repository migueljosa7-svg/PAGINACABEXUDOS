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

function isValidToken(token) {
  if (!token) return false;
  return !!authorizedDevices[token];
}

function getDeviceName(token) {
  const device = authorizedDevices[token];
  if (device === true) return token;
  return device?.name || token;
}

// --- Seguridad aditiva GPS (mismo contrato, wrappers sin breaking changes) ---
const GPS_MIN_INTERVAL_MS = 1500;
const lastGpsMsgAt = new Map();

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
app.get('/health', (req, res) => {
  const HEALTH_TOKEN = process.env.HEALTH_TOKEN || '';
  const provided = req.query.key || '';
  const authorized = !HEALTH_TOKEN || (provided && provided === HEALTH_TOKEN);
  if (!authorized) {
    return res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }
  const roomStats = [];
  for (const [routeId, room] of rooms.entries()) {
    roomStats.push({
      roomHash: createHash('sha256').update(String(routeId)).digest('hex').slice(0, 12),
      senders: room.senders.size,
      receivers: room.receivers.size,
      lastActivityAt: new Date(room.lastActivityAt).toISOString(),
    });
  }

  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '4.0.0',
    rooms: roomStats,
    totalSenders: roomStats.reduce((acc, r) => acc + r.senders, 0),
    totalReceivers: roomStats.reduce((acc, r) => acc + r.receivers, 0),
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

    // latest sender wins per token room
    if (room.senders.has(senderId)) {
      const oldSender = room.senders.get(senderId);
      try {
        oldSender.ws.close();
      } catch {}
      room.senders.delete(senderId);
    }

    const senderInfo = {
      ws,
      senderId,
      token,
      label: senderLabel || token,
      lastPosition: null,
      lastSeen: Date.now(),
      connectedAt: Date.now(),
    };

    room.senders.set(senderId, senderInfo);

    broadcastToReceivers(room, {
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

        // Filtro aditivo: validación + rate-limit. Flujo válido intacto.
        if (!sonCoordenadasValidas(nextLat, nextLng, message)) {
          return;
        }
        const now = Date.now();
        if (now - (lastGpsMsgAt.get(clientId) || 0) < GPS_MIN_INTERVAL_MS) return;
        lastGpsMsgAt.set(clientId, now);

        const pos = {
          lat: nextLat,
          lng: nextLng,
          accuracy: (accuracy ?? 0) || 0,
          speed: (speed ?? 0) || 0,
          heading: (heading ?? 0) || 0,
          altitude: (altitude ?? 0) || 0,
          timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
        };

        senderInfo.lastPosition = pos;

        broadcastToReceivers(room, {
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
      room.senders.delete(senderId);
      broadcastToReceivers(room, {
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
    if (idleTime > ROOM_IDLE_TTL && room.senders.size === 0 && room.receivers.size === 0) {
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

  const shutdownMsg = JSON.stringify({ type: 'server_shutdown', timestamp: Date.now() });
  for (const [, room] of rooms.entries()) {
    broadcastToReceivers(room, shutdownMsg);
  }

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
