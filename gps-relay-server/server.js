/**
 * GPS Relay Server — v3.0 (Token-based)
 *
 * Contract (WebSocket query params)
 *   Sender  (mobile):  role=sender&token=<TOKEN>
 *   Receiver (browser): role=receiver&token=<TOKEN>
 *
 *
 * Payload from sender:
 *   { type: 'gps', lat: number, lng: number, accuracy?: number, speed?: number, heading?: number, altitude?: number }
 *
 * Relay forwards to receivers (same token room):
 *   { type: 'gps', senderId: 'token:<TOKEN>', label?: string, lat, lng, accuracy, speed, heading, altitude, timestamp }
 *
 * Authorization:
 *   Uses AUTHORIZED_GPS_DEVICES env var (JSON format)
 */

import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

// =============================================================================
// Configuration
// =============================================================================

const __dirname = join(fileURLToPath(import.meta.url), '..');
const PUBLIC_DIR = join(__dirname, 'public');

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
// Rooms model
// =============================================================================

/** @type {Map<string, { senders: Map<string, any>, receivers: Set<WebSocket>, createdAt: number, lastActivityAt: number }>} */
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
// HTTP server (serves React app + health endpoint)
// =============================================================================

// Path to the built React app (relative to server.js location)
// When running from project root: ./dist
// When running from gps-relay-server: ../dist
const DIST_DIR = process.env.DIST_DIR || join(fileURLToPath(import.meta.url), '..', '..', 'dist');
// Log the resolved path for debugging (after log function is defined)
// Note: This will be logged at startup in the main block

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
        version: '3.0.0',
        rooms: roomStats,
        totalSenders: roomStats.reduce((acc, r) => acc + r.senders, 0),
        totalReceivers: roomStats.reduce((acc, r) => acc + r.receivers, 0),
      })
    );
    return;
  }

  // Serve React app for all other routes (SPA fallback)
  const urlPath = (req.url || '/').split('?')[0];
  let filePath = join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);
  
  // Security check
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // If file doesn't exist, serve index.html (SPA fallback)
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
// Authorization helpers (AUTHORIZED_GPS_DEVICES)
// =============================================================================

/**
 * Contract:
 *   AUTHORIZED_GPS_DEVICES is parsed as JSON.
 *
 * Supported shapes:
 *  1) Token allowlist
 *     { "cmp_prueba_barrio": true, "anotherToken": true }
 *  2) Token objects
 *     { "cmp_prueba_barrio": { "deviceToken": "cmp_prueba_barrio", "name": "Prueba Barrio" } }
 */
function parseAuthorizedDevices() {
  const raw = process.env.AUTHORIZED_GPS_DEVICES;
  if (!raw) {
    // Fallback dev (keeps local flows usable without env config)
    return {
      cmp_prueba_barrio: true,
    };
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



// =============================================================================
// WebSocket relay (token-based rooms)
// =============================================================================

const wss = new WebSocketServer({ server: httpServer });


wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const role = url.searchParams.get('role') || 'receiver';


  // New contract (production):
  // - Sender validates by token in server.
  // - Receiver listens to updates for the selected token.
  const token = (url.searchParams.get('token') || '').trim();

  // Sender/Receiver are now token-based.
  // - Sender authenticates on server using AUTHORIZED_GPS_DEVICES
  // - Receiver subscribes to updates for the token

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

    // Enforce single active sender per token room (latest ws wins)
    if (room.senders.has(senderId)) {
      const oldSender = room.senders.get(senderId);
      try { oldSender.ws.close(); } catch {}
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

    // Push last position immediately if we already have one
    if (senderInfo.lastPosition) {
      broadcastToReceivers(room, { type: 'gps', senderId, label: senderInfo.label, ...senderInfo.lastPosition });
    }

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
        const { latitude, longitude, lat, lng, accuracy, speed, heading, altitude, timestamp } = message || {};
        const nextLat = typeof lat === 'number' ? lat : latitude;
        const nextLng = typeof lng === 'number' ? lng : longitude;

        if (typeof nextLat !== 'number' || typeof nextLng !== 'number' || !isFinite(nextLat) || !isFinite(nextLng)) return;

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

        // Maintain latest position per token and re-broadcast to all receivers
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
    // receiver
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

    // Immediately send last known position(s) for this token to this receiver
    for (const s of room.senders.values()) {
      if (s.lastPosition) {
        ws.send(JSON.stringify({ type: 'gps', senderId: s.senderId, label: s.label, ...s.lastPosition }));
      }
    }

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'ping') ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      } catch {
        // ignore
      }
    });

    ws.on('close', () => {
      room.receivers.delete(ws);
      room.lastActivityAt = Date.now();
    });
  }

  ws.on('error', (err) => {
    log('error', `[#${clientId}] ws error: ${err?.message || err}`);
  });


  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
});

// =============================================================================
// Heartbeat interval (detect dead connections)
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
// Room cleanup
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

  httpServer.close(() => {
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// =============================================================================
// Start
// =============================================================================

httpServer.listen(PORT, HOST, () => {
  // Log DIST_DIR for debugging
  log('info', `DIST_DIR resolved to: ${DIST_DIR}`);
  log('info', `dist/index.html exists: ${existsSync(join(DIST_DIR, 'index.html'))}`);
  
  log('info', `\n╔══════════════════════════════════════════════════╗`);
  log('info', `║     🌐 GPS Relay Server v3.0 (token-based)      ║`);
  log('info', `║     Running on ws://${HOST}:${PORT}                     ║`);

  log('info', `╠══════════════════════════════════════════════════╣`);
  log('info', `║  Health:  http://${HOST}:${PORT}/health                  ║`);
  log('info', `║  Sender:  /gps-emisor?token=<TOKEN> (React route)   ║`);

  log('info', `╚══════════════════════════════════════════════════╝\n`);
  log('info', 'Waiting for connections...');
});

