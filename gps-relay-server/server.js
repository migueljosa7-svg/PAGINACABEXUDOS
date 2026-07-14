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

import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

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
// Static hosting (SPA fallback)
// =============================================================================

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

const httpServer = createServer((req, res) => {
  // Basic CORS (needed for /health)
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health') {
    const roomStats = [];
    for (const [routeId, room] of rooms.entries()) {
      roomStats.push({
        routeId,
        senders: room.senders.size,
        receivers: room.receivers.size,
        createdAt: new Date(room.createdAt).toISOString(),
        lastActivityAt: new Date(room.lastActivityAt).toISOString(),
      });
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: '4.0.0',
        rooms: roomStats,
        totalSenders: roomStats.reduce((acc, r) => acc + r.senders, 0),
        totalReceivers: roomStats.reduce((acc, r) => acc + r.receivers, 0),
      })
    );
    return;
  }

  const urlPath = (req.url || '/').split('?')[0];
  let filePath = join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);

  // Security check
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // SPA fallback
  if (!existsSync(filePath)) {
    filePath = join(DIST_DIR, 'index.html');
  }

  const ext = extname(filePath);
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(content);
  } catch (err) {
    log('error', `Failed to serve ${filePath}: ${err?.message || err}`);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

// =============================================================================
// Token authorization
// =============================================================================

function parseAuthorizedDevices() {
  const raw = process.env.AUTHORIZED_GPS_DEVICES;
  if (!raw) return { cmp_prueba_barrio: true };

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
// Unified WebSocket (mounted on the SAME httpServer/port)
// =============================================================================

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const role = url.searchParams.get('role') || 'receiver';
  const token = (url.searchParams.get('token') || '').trim();
  const tokenRoomId = token || 'missing-token';

  const clientId = ++clientIdCounter;
  log('info', `[#${clientId}] connection role=${role} tokenRoomId=${tokenRoomId}`);

  const room = getOrCreateRoom(tokenRoomId);
  room.lastActivityAt = Date.now();

  if (role === 'sender') {
    if (!isValidToken(token)) {
      log('warn', `[#${clientId}] rejected sender token=${token ? 'provided' : 'missing'}`);
      ws.close(4001, 'Unauthorized GPS token');
      return;
    }

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

        if (typeof nextLat !== 'number' || typeof nextLng !== 'number' || !isFinite(nextLat) || !isFinite(nextLng)) {
          return;
        }

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
    log('info', `[#${clientId}] receiver registered tokenRoomId=${tokenRoomId}. receivers=${room.receivers.size}`);

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

