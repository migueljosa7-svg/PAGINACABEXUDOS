/**
 * GPS Relay Server — v2.0 (Production)
 * 
 * WebSocket relay that bridges GPS data from mobile senders (each Comparsa
 * participant) to browser receivers (the PAGINACABEXUDOS web app).
 * 
 * Architecture:
 *   Mobile Phone (GPS sender) ──WebSocket──> Relay Server ──WebSocket──> App (receiver)
 *                                         │
 *                                         └──> /health endpoint
 * 
 * Each "room" is identified by a routeId. Multiple senders can connect to
 * the same route (e.g., several Comparsa members), and all receivers of that
 * route will see all senders' positions.
 * 
 * Environment variables:
 *   PORT           - WebSocket server port (default: 3001)
 *   HOST           - Bind address (default: 0.0.0.0)
 *   CORS_ORIGIN    - Allowed origin for health endpoint (default: *)
 *   LOG_LEVEL      - 'debug' | 'info' | 'warn' | 'error' (default: 'info')
 *   MAX_RECONNECT  - Max reconnect interval in ms (default: 30000)
 *   CLEANUP_INTERVAL - Room cleanup interval in ms (default: 60000)
 *   ROOM_IDLE_TTL  - Room TTL with no activity in ms (default: 300000 = 5min)
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

// =============================================================================
// Logger
// =============================================================================

function log(level, ...args) {
  if (LOG_LEVELS[level] >= currentLogLevel) {
    const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
    if (level === 'error') {
      console.error(prefix, ...args);
    } else if (level === 'warn') {
      console.warn(prefix, ...args);
    } else {
      console.log(prefix, ...args);
    }
  }
}

// =============================================================================
// Room model
// =============================================================================

/**
 * @typedef {Object} SenderInfo
 * @property {import('ws').WebSocket} ws
 * @property {string} senderId - Unique sender identifier
 * @property {string} label - Optional human-readable label (e.g. "Migue")
 * @property {Object} lastPosition - Last known GPS position
 * @property {number} lastSeen - Timestamp of last message
 * @property {number} connectedAt - When this sender connected
 */

/**
 * @typedef {Object} Room
 * @property {Map<string, SenderInfo>} senders
 * @property {Set<import('ws').WebSocket>} receivers
 * @property {number} createdAt
 * @property {number} lastActivityAt
 */

/** @type {Map<string, Room>} */
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
      if (receiver.readyState === 1) {
        receiver.send(payload);
      } else {
        room.receivers.delete(receiver);
      }
    } catch {
      room.receivers.delete(receiver);
    }
  }
}

function broadcastToSenders(room, message) {
  const payload = typeof message === 'string' ? message : JSON.stringify(message);
  for (const [senderId, info] of room.senders) {
    try {
      if (info.ws.readyState === 1) {
        info.ws.send(payload);
      } else {
        room.senders.delete(senderId);
      }
    } catch {
      room.senders.delete(senderId);
    }
  }
}

// =============================================================================
// MIME types for static file serving
// =============================================================================

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// =============================================================================
// HTTP Server
// =============================================================================

const httpServer = createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ---- Health endpoint ----
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
    res.end(JSON.stringify({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      rooms: roomStats,
      totalSenders: roomStats.reduce((acc, r) => acc + r.senders, 0),
      totalReceivers: roomStats.reduce((acc, r) => acc + r.receivers, 0),
    }));
    return;
  }

  // ---- Serve sender HTML page ----
  let filePath = join(PUBLIC_DIR, req.url === '/' ? 'sender.html' : req.url);

  // Security: prevent path traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
  res.end(readFileSync(filePath));
});

// =============================================================================
// WebSocket Server
// =============================================================================

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const role = url.searchParams.get('role') || 'receiver';
  const routeId = url.searchParams.get('routeId') || 'default';
  const senderLabel = url.searchParams.get('label') || '';
  const clientId = ++clientIdCounter;

  log('info', `[#${clientId}] New connection: role=${role}, routeId=${routeId}${senderLabel ? `, label="${senderLabel}"` : ''}`);

  const room = getOrCreateRoom(routeId);
  room.lastActivityAt = Date.now();

  if (role === 'sender') {
    // ---- SENDER: Mobile phone sending GPS data ----
    const senderId = url.searchParams.get('senderId') || `sender-${clientId}`;

    // Check for duplicate senderId: replace old one
    if (room.senders.has(senderId)) {
      const oldSender = room.senders.get(senderId);
      log('warn', `[#${clientId}] Replacing existing sender "${senderId}" for route ${routeId}`);
      try { oldSender.ws.close(); } catch {}
      room.senders.delete(senderId);
    }

    const senderInfo = {
      ws,
      senderId,
      label: senderLabel || senderId,
      lastPosition: null,
      lastSeen: Date.now(),
      connectedAt: Date.now(),
    };
    room.senders.set(senderId, senderInfo);
    log('info', `[#${clientId}] Sender registered: ${senderInfo.label} (${senderId}) for route ${routeId}. Total senders: ${room.senders.size}`);

    // Notify receivers that a new sender is available
    broadcastToReceivers(room, {
      type: 'sender_connected',
      senderId,
      label: senderInfo.label,
      sendersCount: room.senders.size,
    });

    // Send current sender list to the newly connected sender
    const senderList = [];
    for (const [sid, info] of room.senders) {
      senderList.push({ senderId: sid, label: info.label, connectedAt: info.connectedAt });
    }
    ws.send(JSON.stringify({
      type: 'room_info',
      routeId,
      sendersCount: room.senders.size,
      receiversCount: room.receivers.size,
      senders: senderList,
    }));

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        room.lastActivityAt = Date.now();
        senderInfo.lastSeen = Date.now();

        if (message.type === 'gps') {
          const { lat, lng, accuracy, speed, heading, altitude } = message;

          if (typeof lat !== 'number' || typeof lng !== 'number' || !isFinite(lat) || !isFinite(lng)) {
            log('warn', `[#${clientId}] Invalid GPS data from ${senderInfo.label}`);
            return;
          }

          // Update last position
          senderInfo.lastPosition = { lat, lng, accuracy, speed, heading, altitude, timestamp: Date.now() };

          const payload = JSON.stringify({
            type: 'gps',
            senderId,
            label: senderInfo.label,
            lat,
            lng,
            accuracy: accuracy || 0,
            speed: speed || 0,
            heading: heading || 0,
            altitude: altitude || 0,
            timestamp: Date.now(),
          });

          // Forward to all receivers in this room
          broadcastToReceivers(room, payload);

          // Also forward to other senders in the room (so they can see each other)
          for (const [sid, info] of room.senders) {
            if (sid !== senderId && info.ws.readyState === 1) {
              try { info.ws.send(payload); } catch {}
            }
          }
        } else if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        } else if (message.type === 'update_label') {
          senderInfo.label = message.label || senderInfo.label;
          log('info', `[#${clientId}] Sender ${senderId} updated label to "${senderInfo.label}"`);
          // Notify receivers
          broadcastToReceivers(room, {
            type: 'sender_updated',
            senderId,
            label: senderInfo.label,
          });
        } else {
          log('debug', `[#${clientId}] Unknown message type from sender: ${message.type}`);
        }
      } catch (err) {
        log('warn', `[#${clientId}] Invalid message from sender ${senderInfo.label}: ${err.message}`);
      }
    });

    ws.on('close', () => {
      log('info', `[#${clientId}] Sender disconnected: ${senderInfo.label} (${senderId}) for route ${routeId}`);
      room.senders.delete(senderId);

      // Notify receivers that this sender left
      broadcastToReceivers(room, {
        type: 'sender_disconnected',
        senderId,
        label: senderInfo.label,
        sendersCount: room.senders.size,
      });

      room.lastActivityAt = Date.now();
    });

  } else {
    // ---- RECEIVER: Web app displaying GPS data ----
    room.receivers.add(ws);
    log('info', `[#${clientId}] Receiver registered for route ${routeId}. Total receivers: ${room.receivers.size}`);

    // Send room info with list of connected senders
    const senderList = [];
    for (const [sid, info] of room.senders) {
      senderList.push({
        senderId: sid,
        label: info.label,
        connectedAt: info.connectedAt,
        lastSeen: info.lastSeen,
      });
    }

    ws.send(JSON.stringify({
      type: 'room_info',
      routeId,
      sendersCount: room.senders.size,
      receiversCount: room.receivers.size,
      senders: senderList,
    }));

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch {}
    });

    ws.on('close', () => {
      log('info', `[#${clientId}] Receiver disconnected for route ${routeId}`);
      room.receivers.delete(ws);
      room.lastActivityAt = Date.now();
    });
  }

  ws.on('error', (err) => {
    log('error', `[#${clientId}] WebSocket error (${role}, ${routeId}):`, err.message);
  });

  // Heartbeat to detect stale connections
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
});

// =============================================================================
// Heartbeat interval (detect dead connections)
// =============================================================================

const HEARTBEAT_INTERVAL = 30000;
const heartbeatTimer = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      log('debug', 'Terminating unresponsive connection');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

wss.on('close', () => {
  clearInterval(heartbeatTimer);
});

// =============================================================================
// Room cleanup
// =============================================================================

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [routeId, room] of rooms.entries()) {
    const idleTime = now - room.lastActivityAt;
    if (idleTime > ROOM_IDLE_TTL && room.senders.size === 0 && room.receivers.size === 0) {
      rooms.delete(routeId);
      log('info', `Cleaned up idle room: ${routeId} (idle ${Math.round(idleTime / 1000)}s)`);
    }
  }
}, CLEANUP_INTERVAL);

// =============================================================================
// Graceful shutdown
// =============================================================================

function shutdown(signal) {
  log('info', `Received ${signal}. Shutting down gracefully...`);
  clearInterval(heartbeatTimer);
  clearInterval(cleanupTimer);

  // Notify all clients
  const shutdownMsg = JSON.stringify({ type: 'server_shutdown', timestamp: Date.now() });
  for (const [routeId, room] of rooms.entries()) {
    broadcastToReceivers(room, shutdownMsg);
    broadcastToSenders(room, shutdownMsg);
  }

  httpServer.close(() => {
    log('info', 'Server closed');
    process.exit(0);
  });

  // Force shutdown after 10s
  setTimeout(() => {
    log('warn', 'Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// =============================================================================
// Start
// =============================================================================

httpServer.listen(PORT, HOST, () => {
  log('info', `\n╔══════════════════════════════════════════════════╗`);
  log('info', `║     🌐 GPS Relay Server v2.0                    ║`);
  log('info', `║     Running on ws://${HOST}:${PORT}                     ║`);
  log('info', `╠══════════════════════════════════════════════════╣`);
  log('info', `║  Health:  http://${HOST}:${PORT}/health                  ║`);
  log('info', `║  Sender:  http://${HOST}:${PORT}/sender.html?routeId=ID  ║`);
  log('info', `╚══════════════════════════════════════════════════╝\n`);
  log('info', 'Waiting for connections...');
  log('info', '  - Mobile senders:  ?role=sender&routeId=ROUTE_ID&label=NAME');
  log('info', '  - App receivers:   ?role=receiver&routeId=ROUTE_ID');
  log('info', `  - Rooms cleanup every ${CLEANUP_INTERVAL / 1000}s (idle TTL: ${ROOM_IDLE_TTL / 1000}s)`);
});