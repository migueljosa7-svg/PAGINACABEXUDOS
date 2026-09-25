/**
 * PAGINACABEXUDOS - Production Server
 * 
 * Serves the React frontend and GPS Relay WebSocket on the same server.
 * Used for Render Web Service deployment.
 */

import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { gzipSync } from 'zlib';

// =============================================================================
// Configuration
// =============================================================================

const __dirname = join(fileURLToPath(import.meta.url), '..');
const DIST_DIR = join(__dirname, 'dist');

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
// Rooms model + HYBRID v5 helpers
// =============================================================================

/** @type {Map<string, any>} */
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
// HTTP server (serves React app + health endpoint)
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

// --- Servido estático v3.1: pre-carga en memoria al arrancar -----------------
// Elimina los readFileSync en caliente (bloqueaban el event loop compartido con
// los WebSockets bajo picos: 100 móviles entrando a la vez = carga bloqueante).
// dist/ entero cabe en RAM (~1 MB). Claves = rutas exactas → el path traversal
// es imposible por construcción (sin concatenación de rutas).
/** @type {Map<string, { content: Buffer, type: string, isAsset: boolean }>} */
const STATIC_CACHE = new Map();
const NO_CACHE_PATHS = new Set(['/index.html', '/sw.js', '/manifest.webmanifest']);

function preloadStaticDir(dir, relBase = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      preloadStaticDir(full, rel);
    } else {
      const content = readFileSync(full);
      const type = MIME_TYPES[extname(entry.name)] || 'application/octet-stream';
      const isAsset = rel.startsWith('assets/');
      // Pre-compresión gzip en memoria (solo texto): ~70% menos bytes en
      // wire sin coste de CPU en caliente. El event loop queda libre para WS/SSE.
      const compressible = /^(text\/|application\/(javascript|json)|image\/svg\+xml|font\/)/.test(type);
      const gzip = compressible && content.length > 1024 ? gzipSync(content, { level: 6 }) : null;
      STATIC_CACHE.set(`/${rel}`, { content, gzip, type, isAsset });
    }
  }
}

try {
  preloadStaticDir(DIST_DIR);
  log('info', `Static preloaded: ${STATIC_CACHE.size} files from dist/`);
} catch (err) {
  log('error', `Static preload failed: ${err?.message || err}`);
}

// --- Helmet-lite (sin dependencias): cabeceras de seguridad en cada respuesta.
function applySecurityHeaders(req, res, { isSse = false } = {}) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  if ((req.headers['x-forwarded-proto'] || '').includes('https') || req.socket?.encrypted) {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  }
  if (!isSse) {
    // CSP estricta pero compatible: Leaflet/tiles/fonts/AdSense por dominios.
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://www.googletagservices.com https://www.googletagmanager.com https://partner.googleadservices.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com data:; " +
      "img-src 'self' data: blob: https://tile.openstreetmap.de https://*.tile.openstreetmap.org https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net; " +
      "connect-src 'self' wss: ws: https://tile.openstreetmap.de; " +
      "frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com; " +
      "object-src 'none'; base-uri 'self'; frame-ancestors 'self'"
    );
  }
}

/** Sirve una entrada estática con gzip negociado (Accept-Encoding). */
function serveStatic(entry, req, res, cacheControl) {
  const acceptEncoding = String(req.headers['accept-encoding'] || '');
  const headers = { 'Content-Type': entry.type, 'Cache-Control': cacheControl, Vary: 'Accept-Encoding' };
  if (entry.gzip && acceptEncoding.includes('gzip')) {
    headers['Content-Encoding'] = 'gzip';
    headers['Content-Length'] = entry.gzip.length;
    res.writeHead(200, headers);
    res.end(entry.gzip);
  } else {
    headers['Content-Length'] = entry.content.length;
    res.writeHead(200, headers);
    res.end(entry.content);
  }
}

function handleHttpRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  applySecurityHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url || '/health', `http://${req.headers.host || 'localhost'}`);
  // Alias /healthz (convención Render/K8s) para el wake-up previo al WS.
  if (reqUrl.pathname === '/health' || reqUrl.pathname === '/healthz') {
    const HEALTH_TOKEN = process.env.HEALTH_TOKEN || '';
    const provided = reqUrl.searchParams.get('key') || '';
    const authorized = !HEALTH_TOKEN || (provided && provided === HEALTH_TOKEN);
    if (!authorized) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      return;
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

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: '5.0.0-hybrid',
        transport: 'ws-sender/sse-receivers',
        rooms: roomStats,
        totalSenders: roomStats.reduce((acc, r) => acc + r.senders, 0),
        totalReceivers: roomStats.reduce((acc, r) => acc + r.receivers, 0),
        totalSseViewers: sseClients.size,
      })
    );
    return;
  }

  // === SSE viewers: GET /api/stream/location?token=<TOKEN> ===
  // Canal unidireccional para miles de espectadores: sin handshake WS por visor,
  // reconexion nativa de EventSource (retry: 3000) y keep-alive anti-proxy.
  if (reqUrl.pathname === '/api/stream/location' && req.method === 'GET') {
    const token = (reqUrl.searchParams.get('token') || '').trim();
    if (!isValidTokenFormat(token)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'missing_token' }));
      return;
    }
    // Misma clave de sala que el WS (token en claro): emisores y receptores
    // comparten room en el modelo de rooms, mientras que la salud/logs siguen
    // usando la huella (tokenFingerprint) para no exponer el token.
    const tokenRoomId = token;
    getOrCreateRoom(tokenRoomId).lastActivityAt = Date.now();
    const clientId = ++sseClientIdCounter;
    // Cabeceras de hardening ANTES de writeHead: setHeader no puede aplicarse
    // una vez enviada la cabecera de respuesta.
    applySecurityHeaders(req, res, { isSse: true });
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write('retry: 3000\n\n');
    res.write('data: ' + JSON.stringify(sseSnapshot(tokenRoomId)) + '\n\n');
    if (typeof res.flushHeaders === 'function') { try { res.flushHeaders(); } catch (e) {} }
    sseClients.set(clientId, { res: res, tokenRoomId: tokenRoomId, connectedAt: Date.now() });
    log('info', '[sse#' + clientId + '] viewer connected (total=' + sseClients.size + ')');
    req.on('close', function() { sseClients.delete(clientId); const room = rooms.get(tokenRoomId); if (room) room.lastActivityAt = Date.now(); });
    return;
  }

  // Serve React app for all other routes (SPA fallback) — v3.1 desde memoria.
  const urlPath = (req.url || '/').split('?')[0];
  const entry = STATIC_CACHE.get(urlPath) || STATIC_CACHE.get('/index.html');
  if (!entry) { res.writeHead(500); res.end('Internal Server Error'); return; }
  const cacheControl = entry.isAsset ? 'public, max-age=31536000, immutable' : ((NO_CACHE_PATHS.has(urlPath) || urlPath === '/') ? 'no-cache' : 'public, max-age=3600');
  try { serveStatic(entry, req, res, cacheControl); } catch (err) { res.writeHead(500); res.end('Internal Server Error'); }
}

// Envoltura defensiva: el relay sirve a la vez WS (emisores) y SSE (miles de
// visores) en el MISMO proceso, asi que un fallo aislado en una peticion no
// puede tumbar el servicio. Antes, un error de cabeceras mataba el proceso.
const httpServer = createServer((req, res) => {
  try {
    handleHttpRequest(req, res);
  } catch (err) {
    log('error', `HTTP error: ${err?.message || err}`);
    try {
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end('{"error":"internal_error"}');
    } catch {
      // La respuesta ya estaba cerrada: no hay nada mas que hacer.
    }
  }
});

// =============================================================================
// Authorization helpers (AUTHORIZED_GPS_DEVICES)
// =============================================================================

/**
 * Contract:
 *   AUTHORIZED_GPS_DEVICES is parsed as JSON (required in production).
 *
 * Supported shapes:
 *  1) Token allowlist
 *     { "<64-hex-token>": true }
 *  2) Token objects
 *     { "<64-hex-token>": { "name": "Recorrido Oficial" } }
 *
 * Fail-secure: sin variable configurada NO se autoriza a nadie.
 * Generar con: npm run generate-env
 */
function parseAuthorizedDevices() {
  const raw = process.env.AUTHORIZED_GPS_DEVICES;
  if (!raw) {
    // Fail-secure: sin env no hay emisores autorizados (sin fallback de prueba).
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

// --- Sanitización de labels en origen (v3.1, defensa en profundidad anti-XSS).
//     El label viaja a TODOS los visores: se limpia UNA sola vez aquí, no en
//     cada consumidor. El fallback nunca expone el token en claro.
const MAX_LABEL_LENGTH = 40;
function sanitizeLabel(raw) {
  return String(raw ?? '')
    .replace(/[<>&"'`]/g, '')        // metacaracteres HTML / atributos
    .replace(/[\x00-\x1F\x7F]/g, '') // caracteres de control
    .trim()
    .slice(0, MAX_LABEL_LENGTH);
}

function getDeviceName(token) {
  const device = authorizedDevices[token];
  // Fallback seguro: NUNCA el token en claro (solo su huella de 8 hex).
  if (device === true) return `Comparsa ${tokenFingerprint(token)}`;
  return sanitizeLabel(device?.name) || `Comparsa ${tokenFingerprint(token)}`;
}

// =============================================================================
// Seguridad aditiva GPS (wrappers: no alteran el contrato watchPosition->ws->broadcast)
// =============================================================================
const GPS_MIN_INTERVAL_MS = 1500;
const lastGpsMsgAt = new Map(); // senderId -> timestamp (throttle anti-flood)

function sonCoordenadasValidas(lat, lng, msg) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  for (const k of ['accuracy', 'speed', 'heading', 'altitude']) {
    const v = msg?.[k];
    if (v !== undefined && v !== null && (typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > 1e6)) {
      return false;
    }
  }
  return true;
}

function tokenFingerprint(token) {
  return createHash('sha256').update(String(token || '')).digest('hex').slice(0, 8);
}

// Forma del token de visor del canal SSE. La sala se abre con el token en claro
// (igual que el receptor WS), por lo que solo se exige un identificador
// plausible: acotado, sin espacios ni caracteres de control.
const TOKEN_MIN_LENGTH = 3;
const TOKEN_MAX_LENGTH = 128;
const TOKEN_SAFE_RE = /^[A-Za-z0-9._:-]+$/;
function isValidTokenFormat(token) {
  if (typeof token !== 'string') return false;
  const value = token.trim();
  return value.length >= TOKEN_MIN_LENGTH && value.length <= TOKEN_MAX_LENGTH && TOKEN_SAFE_RE.test(value);
}

// =============================================================================
// WebSocket relay (token-based rooms)
// =============================================================================

// --- Anti-DoS v3.1 (aditivo): límites de conexiones por IP y totales ---------
const MAX_CONN_PER_IP = parseInt(process.env.MAX_CONN_PER_IP || '10', 10);
const MAX_TOTAL_CLIENTS = parseInt(process.env.MAX_TOTAL_CLIENTS || '500', 10);
/** @type {Map<string, number>} ip -> sockets abiertos (decremento en 'close') */
const ipConnections = new Map();

const wss = new WebSocketServer({ server: httpServer, maxPayload: 4096 });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const role = url.searchParams.get('role') || 'receiver';

  const token = (url.searchParams.get('token') || '').trim();
  const tokenRoomId = token || 'missing-token';
  const clientId = ++clientIdCounter;

  // --- Límite de conexiones (ANTES de auth: no gasta salas ni validaciones) ---
  // Render está tras proxy: la IP real llega en x-forwarded-for (primer salto).
  const clientIp = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket?.remoteAddress
    || 'unknown';
  let totalClients = 0;
  for (const n of ipConnections.values()) totalClients += n;
  if ((ipConnections.get(clientIp) || 0) >= MAX_CONN_PER_IP || totalClients >= MAX_TOTAL_CLIENTS) {
    log('warn', `[#${clientId}] rejected: connection limit (ip=${clientIp} ipConns=${ipConnections.get(clientIp) || 0}/${MAX_CONN_PER_IP} total=${totalClients}/${MAX_TOTAL_CLIENTS})`);
    ws.close(4008, 'Too many connections');
    return;
  }
  ipConnections.set(clientIp, (ipConnections.get(clientIp) || 0) + 1);
  ws.on('close', () => {
    // Refcount: el Map no crece sin límite (mismo patrón anti-fuga que rooms).
    const remaining = (ipConnections.get(clientIp) || 1) - 1;
    if (remaining <= 0) ipConnections.delete(clientIp);
    else ipConnections.set(clientIp, remaining);
  });

  // --- Anti-flood v3.1: token-bucket por socket (30 msg / 10 s, recarga continua)
  const FLOOD_CAPACITY = 30;
  const FLOOD_REFILL_MS = 10000;
  let floodTokens = FLOOD_CAPACITY;
  let floodLastRefill = Date.now();
  const allowMessage = () => {
    const nowMs = Date.now();
    floodTokens = Math.min(
      FLOOD_CAPACITY,
      floodTokens + ((nowMs - floodLastRefill) / FLOOD_REFILL_MS) * FLOOD_CAPACITY
    );
    floodLastRefill = nowMs;
    if (floodTokens < 1) return false;
    floodTokens -= 1;
    return true;
  };

  log('info', `[#${clientId}] connection role=${role} room=${tokenFingerprint(tokenRoomId)}`);

  // Auth ANTES de crear sala: evita rooms basura y enumeración (aditivo, mismo contrato).
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
      // Anti-flood v3.1: cierra (1008) si supera el token-bucket por socket.
      if (!allowMessage()) {
        log('warn', `[#${clientId}] flood: rate limit excedido, cerrando (1008)`);
        try { ws.close(1008, 'Flood detected'); } catch { /* ignore */ }
        return;
      }
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

        // Filtro aditivo: validación + rate-limit. El flujo válido pasa intacto.
        if (!sonCoordenadasValidas(nextLat, nextLng, message)) return;
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
      room.senders.delete(senderId);
      lastGpsMsgAt.delete(clientId); // v3.1: purga el rate-limit del socket muerto
      broadcastAll(room, {
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

    // Immediately send last known position(s) for this token to this receiver
    for (const s of room.senders.values()) {
      if (s.lastPosition) {
        ws.send(JSON.stringify({ type: 'gps', senderId: s.senderId, label: s.label, ...s.lastPosition }));
      }
    }

    ws.on('message', (data) => {
      // Anti-flood v3.1: el receptor también tiene token-bucket propio.
      if (!allowMessage()) {
        log('warn', `[#${clientId}] flood: rate limit excedido, cerrando (1008)`);
        try { ws.close(1008, 'Flood detected'); } catch { /* ignore */ }
        return;
      }
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
    // SSE viewers también retienen la sala: no borrar con miles mirando.
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

  httpServer.close(() => {
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Red de seguridad del proceso: con miles de visores SSE conectados, un fallo
// no capturado en una ruta no debe derribar el relay (los emisores perderian
// el enlace). Se registra y se sigue sirviendo; Render solo reinicia si el
// proceso muere.
process.on('uncaughtException', (err) => {
  log('error', `uncaughtException: ${err?.stack || err}`);
});
process.on('unhandledRejection', (reason) => {
  log('error', `unhandledRejection: ${reason?.stack || reason}`);
});

// =============================================================================
// Start
// =============================================================================

httpServer.listen(PORT, HOST, () => {
  // Log DIST_DIR for debugging
  log('info', `DIST_DIR resolved to: ${DIST_DIR}`);
  log('info', `dist/index.html exists: ${existsSync(join(DIST_DIR, 'index.html'))}`);
  
  log('info', `\n╔══════════════════════════════════════════════════╗`);
  log('info', `║     🌐 PAGINACABEXUDOS - Full Server v3.0       ║`);
  log('info', `║     Running on http://${HOST}:${PORT}                      ║`);

  log('info', `╠══════════════════════════════════════════════════╣`);
  log('info', `║  Health:  http://${HOST}:${PORT}/health                  ║`);
  log('info', `║  Sender:  /gps-emisor?token=<TOKEN> (React route)   ║`);

  log('info', `╚══════════════════════════════════════════════════╝\n`);
  log('info', 'Waiting for connections...');
});
