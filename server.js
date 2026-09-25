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
function roomInfo(room, tokenRoomId) {
  const senders = room ? Array.from(room.senders.values()).map(function(x) {
    return { senderId: x.senderId, label: x.label, connectedAt: x.connectedAt, lastSeen: x.lastSeen, lastPosition: x.lastPosition };
  }) : [];
  const sseViewers = countSseViewers(tokenRoomId);
  return {
    type: 'room_info',
    tokenRoomId: tokenRoomId,
    sendersCount: room ? room.senders.size : 0,
    receiversCount: (room ? room.receivers.size : 0) + sseViewers,
    sseViewers: sseViewers,
    senders: senders,
  };
}
function broadcastRoomInfo(room, tokenRoomId) {
  if (!room) return;
  const payload = JSON.stringify(roomInfo(room, tokenRoomId));
  for (const receiver of room.receivers) {
    try {
      if (receiver.readyState === 1) receiver.send(payload);
    } catch { /* ignore disconnected receiver */ }
  }
  for (const sender of room.senders.values()) {
    try {
      if (sender.ws && sender.ws.readyState === 1) sender.ws.send(payload);
    } catch { /* ignore disconnected sender */ }
  }
  broadcastToSSE(room, roomInfo(room, tokenRoomId));
}
function sseSnapshot(tokenRoomId) {
  const room = rooms.get(tokenRoomId);
  const live = [];
  if (room) { for (const x of room.senders.values()) { if (x.lastPosition) live.push(Object.assign({ type: 'gps', senderId: x.senderId, label: x.label }, x.lastPosition)); } }
  return Object.assign(roomInfo(room, tokenRoomId), { transport: 'sse', live: live, timestamp: Date.now() });
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
    if (!isPlausibleTokenFormat(token)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'missing_token' }));
      return;
    }
    // Rate-limit de apertura de streams por IP: corta los scripts que abren
    // miles de streams seguidos sin penalizar a la audiencia real (cada
    // espectador abre 1 stream; CGNAT movil tolera el limite con holgura).
    const viewerIp = getClientIp(req);
    if (!allowSseViewer(viewerIp)) {
      log('warn', `[sse] viewer rate limit excedido ip=${viewerIp}`);
      res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '60' });
      res.end(JSON.stringify({ error: 'rate_limited' }));
      return;
    }
    // Misma clave de sala que el WS (token en claro): emisores y receptores
    // comparten room en el modelo de rooms, mientras que la salud/logs siguen
    // usando la huella (tokenFingerprint) para no exponer el token.
    const tokenRoomId = token;
    const room = getOrCreateRoom(tokenRoomId);
    room.lastActivityAt = Date.now();
    const clientId = ++sseClientIdCounter;
    const client = { res: res, tokenRoomId: tokenRoomId, connectedAt: Date.now() };
    sseClients.set(clientId, client);
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
    broadcastRoomInfo(room, tokenRoomId);
    log('info', '[sse#' + clientId + '] viewer connected (total=' + sseClients.size + ')');
    req.on('close', function() {
      sseClients.delete(clientId);
      const room = rooms.get(tokenRoomId);
      if (room) {
        room.lastActivityAt = Date.now();
        broadcastRoomInfo(room, tokenRoomId);
      }
    });
    return;
  }

  // Serve React app for all other routes (SPA fallback) — v3.1 desde memoria.
  const urlPath = (req.url || '/').split('?')[0];
  const entry = STATIC_CACHE.get(urlPath) || STATIC_CACHE.get('/index.html');
  if (!entry) { res.writeHead(500); res.end('Internal Server Error'); return; }
  const cacheControl = entry.isAsset ? 'public, max-age=31536000, immutable' : ((NO_CACHE_PATHS.has(urlPath) || urlPath === '/') ? 'no-cache' : 'public, max-age=3600');
  try { serveStatic(entry, req, res, cacheControl); } catch (err) { res.writeHead(500); res.end('Internal Server Error'); }
}
/** IP real del cliente (Render va tras proxy: x-forwarded-for, primer salto). */
function getClientIp(req) {
  return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket?.remoteAddress
    || 'unknown';
}

// --- Rate-limit de apertura de streams SSE por IP (anti-abuso del visor) -------
// Cada espectador abre 1 stream, asi que el limite es holgado por defecto para
// no castigar al publico (CGNAT movil) y solo corta scripts que abren cientos.
const SSE_VIEWER_PER_IP_PER_MIN = parseInt(process.env.SSE_VIEWER_PER_IP_PER_MIN || '60', 10);
const SSE_VIEWER_WINDOW_MS = 60000;
/** @type {Map<string, {count: number, resetAt: number}>} */
const sseViewerRate = new Map();
function allowSseViewer(ip) {
  if (!Number.isFinite(SSE_VIEWER_PER_IP_PER_MIN) || SSE_VIEWER_PER_IP_PER_MIN <= 0) return true;
  const now = Date.now();
  const entry = sseViewerRate.get(ip);
  if (!entry || now >= entry.resetAt) {
    sseViewerRate.set(ip, { count: 1, resetAt: now + SSE_VIEWER_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= SSE_VIEWER_PER_IP_PER_MIN;
}
// Purga periodica del mapa (evita crecimiento indefinido de IPs).
const sseViewerSweep = setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of sseViewerRate) if (now >= entry.resetAt) sseViewerRate.delete(ip);
}, SSE_VIEWER_WINDOW_MS);
if (sseViewerSweep.unref) sseViewerSweep.unref();

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
    if (!parsed || typeof parsed !== 'object') return {};
    // Filtra entradas cuyo token no cumple el formato admitido. Sin esto, un
    // token mal escrito en el panel de Render fallaria SOLO en runtime (error de
    // conexion por URL) sin ninguna pista en los logs de arranque.
    const valid = {};
    let rejected = 0;
    for (const [token, device] of Object.entries(parsed)) {
      if (isValidTokenFormat(token)) valid[token] = device;
      else {
        rejected += 1;
        console.warn(`[gps] token de dispositivo con formato NO valido (ignorado): ${tokenFingerprint(token)}`);
      }
    }
    if (rejected > 0) {
      console.warn(`[gps] ${rejected} token(es) de AUTHORIZED_GPS_DEVICES descartados por formato.`);
    }
    return valid;
  } catch {
    console.warn('[gps] AUTHORIZED_GPS_DEVICES no es JSON valido: se rechazaran todos los senders (4001).');
    return {};
  }
}

const authorizedDevices = parseAuthorizedDevices();

/**
 * Tokens de DEMOSTRACION, separados de la lista de produccion.
 *
 * Se declaran en la variable de entorno GPS_DEMO_TOKENS (lista separada por
 * comas, opcionalmente "token:etiqueta"), por ejemplo:
 *   GPS_DEMO_TOKENS="cmp_prueba_barrio:Comparsa San Jose (demo)"
 *
 * Sirve para abrir el enlace /gps-emisor?token=cmp_prueba_barrio sin tener que
 * editar el JSON de produccion. NO es un token fijo en el codigo: si la variable
 * no esta definida, el comportamiento sigue siendo fail-secure y el token se
 * rechaza con 4001. Editar una variable de entorno es reversible; un token
 * hardcodeado seria una puerta trasera permanente en el repositorio.
 */
function parseDemoTokens() {
  const raw = String(process.env.GPS_DEMO_TOKENS || '').trim();
  if (!raw) return {};
  const demo = {};
  for (const entry of raw.split(',')) {
    const item = entry.trim();
    if (!item) continue;
    const sep = item.indexOf(':');
    const token = (sep === -1 ? item : item.slice(0, sep)).trim();
    const name = sep === -1 ? '' : item.slice(sep + 1).trim();
    if (isValidTokenFormat(token)) demo[token] = name ? { name } : true;
    else console.warn(`[gps] GPS_DEMO_TOKENS: token con formato NO valido (ignorado): ${tokenFingerprint(token)}`);
  }
  return demo;
}

const demoDevices = parseDemoTokens();

/**
 * Autorizacion real del emisor (fail-secure): el token de la URL debe existir en
 * AUTHORIZED_GPS_DEVICES (produccion) o en GPS_DEMO_TOKENS (demo). Un token con
 * formato valido pero no registrado en ninguna de las dos se rechaza con 4001.
 */
function isValidToken(token) {
  if (!token) return false;
  if (!isValidTokenFormat(token)) return false;
  return !!authorizedDevices[token] || !!demoDevices[token];
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
  // Busca primero en produccion y luego en los tokens de demo.
  const device = authorizedDevices[token] ?? demoDevices[token];
  // Fallback seguro: NUNCA el token en claro (solo su huella de 8 hex).
  if (device === true) return `Comparsa ${tokenFingerprint(token)}`;
  return sanitizeLabel(device?.name) || `Comparsa ${tokenFingerprint(token)}`;
}

// =============================================================================
// Seguridad GPS: geofence + anti-spoofing + anti-teleport + rate-limit
// Todos los umbrales son configurables por entorno (valores por defecto = los
// exigidos en el pliego). 0 desactiva el rate-limit correspondiente.
// =============================================================================
const numEnv = (name, fallback) => {
  const parsed = parseInt(process.env[name] || String(fallback), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};
// OJO: el geofence es decimal, por eso necesita parseFloat (parseInt("41.4")
// devolveria 41 y dejaria fuera la franja 41.4-42.0 del municipio).
const floatEnv = (name, fallback) => {
  const parsed = Number.parseFloat(process.env[name] ?? String(fallback));
  return Number.isFinite(parsed) ? parsed : fallback;
};
// Rate-limit adicional por IP de origen (varias salas/tokens bajo la misma IP:
// una PYME o un CGNAT movil comparten salida, asi que el tope es holgado y solo
// corta scripts que saturan el relay desde una sola maquina).
const GPS_PACKETS_PER_IP_PER_MIN = parseInt(process.env.GPS_PACKETS_PER_IP_PER_MIN || '120', 10);
const GPS_IP_WINDOW_MS = 60000;
/** @type {Map<string, {count: number, resetAt: number}>} */
const gpsIpRate = new Map();
function allowGpsPacketForIp(ip) {
  if (!Number.isFinite(GPS_PACKETS_PER_IP_PER_MIN) || GPS_PACKETS_PER_IP_PER_MIN <= 0) return true;
  const now = Date.now();
  const entry = gpsIpRate.get(ip);
  if (!entry || now >= entry.resetAt) {
    gpsIpRate.set(ip, { count: 1, resetAt: now + GPS_IP_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= GPS_PACKETS_PER_IP_PER_MIN;
}
const gpsIpSweep = setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of gpsIpRate) if (now >= entry.resetAt) gpsIpRate.delete(ip);
}, GPS_IP_WINDOW_MS);
if (gpsIpSweep.unref) gpsIpSweep.unref();

const GPS_MIN_INTERVAL_MS = numEnv('GPS_MIN_INTERVAL_MS', 1000); // max. 1 paquete de ubicacion por emisor y segundo
const lastGpsMsgAt = new Map();               // clientId -> timestamp (throttle anti-flood)

const GPS_FIRST_FIX_MAX_ACCURACY_M = 100;  // el primer fix admite imprecisión inicial
const GPS_MAX_ACCURACY_M = numEnv('GPS_MAX_ACCURACY_M', 30);  // anti-jitter: accuracy > 30 m se descarta
const TELEPORT_MIN_WINDOW_MS = 3000;           // ventana del test de salto (>100 m en <3 s)
const TELEPORT_MAX_STEP_M = 100;               // salto maximo admitido dentro de esa ventana
const TELEPORT_MAX_SPEED_MS = 30 / 3.6;        // 30 km/h = 8.333 m/s
// Presupuesto de rafagas: tolera 5 tramas seguidas en <1 s antes de expulsar (4029).
// Un GPS movil real puede despertar con varias lecturas casi simultaneas: lo que
// se persigue es la saturacion sostenida, no el rafagon de arranque.
const GPS_RATE_VIOLATION_BUDGET = numEnv('GPS_RATE_VIOLATION_BUDGET', 5);
// Geofence: termino municipal de Zaragoza y alrededores (bbox generosa).
const GEOFENCE = {
  minLat: floatEnv('GEOFENCE_MIN_LAT', 41.4),
  maxLat: floatEnv('GEOFENCE_MAX_LAT', 41.8),
  minLng: floatEnv('GEOFENCE_MIN_LNG', -1.1),
  maxLng: floatEnv('GEOFENCE_MAX_LNG', -0.7),
};
const EARTH_RADIUS_M = 6371000;

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

/**
 * Anti-teleport contra la ultima trama ACEPTADA del emisor.
 * Rechaza si supera 30 km/h o si en menos de 3 s salta mas de 100 m.
 * @returns {{ok: true, distanceM: number} | {ok: false, reason: string, distanceM: number}}
 */
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

// =============================================================================
// Seguridad aditiva GPS (wrappers: no alteran el contrato watchPosition->ws->broadcast)
// =============================================================================
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
/**
 * Valida el FORMATO del token de una URL directa (emisor y visor).
 * Acepta alfanumerico, guiones y guiones bajos (p. ej. `cmp_prueba_barrio`)
 * ademas de los tokens hexadecimales oficiales generados por `npm run generate-env`.
 * Sigue siendo fail-secure: validar el formato NO autoriza a nadie; la
 * autorizacion real la resuelve `isValidToken` contra AUTHORIZED_GPS_DEVICES.
 */
const TOKEN_SAFE_RE = /^[A-Za-z0-9_-]+$/;
const TOKEN_DOT_RE = /^[A-Za-z0-9._:-]+$/; // legado: tokens previos con '.' o ':'
function isValidTokenFormat(token) {
  if (!token || typeof token !== 'string') return false;
  return /^[a-zA-Z0-9_\-]{3,128}$/.test(token.trim());
}

/**
 * Variante tolerante usada para NO romper tokens oficiales ya emitidos que
 * contengan '.' o ':' (compatibilidad hacia atras con enlaces ya entregados).
 */
function isPlausibleTokenFormat(token) {
  if (typeof token !== 'string') return false;
  const value = token.trim();
  if (value.length < TOKEN_MIN_LENGTH || value.length > TOKEN_MAX_LENGTH) return false;
  return TOKEN_SAFE_RE.test(value) || TOKEN_DOT_RE.test(value);
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
  // Render está tras proxy: getClientIp resuelve la IP real (x-forwarded-for).
  const clientIp = getClientIp(req);
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

    // Unicidad de emisor por token/barrio (anti-secuestro de emision).
    // Politica "latest wins": el socket nuevo desplaza al anterior y este se
    // cierra con 4009 para que el cliente lo distinga de una caida de red y
    // reintente por su cuenta, sin pedir reautenticacion manual.
    if (room.senders.has(senderId)) {
      const oldSender = room.senders.get(senderId);
      log('info', `[#${clientId}] emisor duplicado para el mismo token/barrio: se expulsa la sesion previa (4009)`);
      try { oldSender.ws.close(4009, 'Reemplazado por una nueva sesion del mismo token'); } catch {}
      room.senders.delete(senderId);
    }

    // Estado de defensa por emisor: ultima trama ACEPTADA (ancla anti-teleport)
    // y contador de rafagas (rate-limit 4029).
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

    ws.send(JSON.stringify(roomInfo(room, tokenRoomId)));

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

        // ==== Canal de auditoria GPS (todas las comprobaciones son en servidor) ====
        // 1) Geometria valida (finitos y rangos globales de la Tierra).
        if (!sonCoordenadasValidas(nextLat, nextLng, message)) return;

        // 2) Geofence municipal: termino de Zaragoza y alrededores.
        if (!isInsideGeofence(nextLat, nextLng)) {
          log('warn', `[#${clientId}] GPS fuera de geofence descartado (sender=${tokenFingerprint(senderId)})`);
          return;
        }

        const now = Date.now();

        // 3) FIRST FIX: el primer paquete puede tener hasta 100 m de
        //    imprecisión (WiFi/IP de escritorio). A partir del fix aceptado,
        //    vuelve a aplicarse la puerta anti-jitter normal de 30 m.
        const accuracyM = (accuracy ?? 0) || 0;
        const accuracyLimitM = senderInfo.lastPosition === null
          ? GPS_FIRST_FIX_MAX_ACCURACY_M
          : GPS_MAX_ACCURACY_M;
        if (accuracyM > accuracyLimitM) {
          log('debug', `[#${clientId}] GPS descartado por precision (accuracy=${Math.round(accuracyM)}m, limit=${accuracyLimitM}m)`);
          return;
        }

        // 4) Rate-limit por emisor: 1 paquete de ubicacion por segundo.
        //    Se tolera un rafagon de arranque de un GPS real; la saturacion
        //    sostenida expulsa la conexion con 4029.
        const lastAt = lastGpsMsgAt.get(clientId) || 0;
        if (now - lastAt < GPS_MIN_INTERVAL_MS) {
          senderInfo.rateViolations += 1;
          if (senderInfo.rateViolations > GPS_RATE_VIOLATION_BUDGET) {
            log('warn', `[#${clientId}] rate limit GPS: emisor expulsado (4029)`);
            try { ws.close(4029, 'Rate limit exceeded: max 1 location packet per second'); } catch {}
            return;
          }
          return; // trama dentro del presupuesto: se ignora sin penalizar mas
        }
        // 4b) Rate-limit agregado por IP de origen.
        if (!allowGpsPacketForIp(clientIp)) {
          log('warn', `[#${clientId}] rate limit GPS por IP: emisor expulsado (4029) ip=${clientIp}`);
          try { ws.close(4029, 'Rate limit exceeded for this IP'); } catch {}
          return;
        }
        lastGpsMsgAt.set(clientId, now);
        senderInfo.rateViolations = 0;

        // 5) Anti-teleport: >30 km/h o >100 m en menos de 3 s contra la ultima
        //    trama ACEPTADA del mismo emisor.
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

        // 6) Anti-replay: el timestamp del cliente es solo informativo; el
        //    reloj de referencia para el visor es el del servidor.
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
      // Solo se purga la sala si el emisor que se va es el vigente: si fue
      // desplazado por otro socket del mismo token, NO debe borrar al nuevo.
      if (room.senders.get(senderId)?.ws === ws) room.senders.delete(senderId);
      lastGpsMsgAt.delete(clientId); // purga el rate-limit del socket muerto
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

    ws.send(JSON.stringify(roomInfo(room, tokenRoomId)));

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

  // Auditoría de seguridad activa: el arranque avisa en voz alta si la
  // configuración deja el canal GPS abierto o mal protegido.
  const demoCount = Object.keys(demoDevices).length;
  if (Object.keys(authorizedDevices).length === 0 && demoCount === 0) {
    log('warn', '⚠️  SIN DISPOSITIVOS AUTORIZADOS: todos los emisores GPS sera rechazados (4001).');
    log('warn', '    Define AUTHORIZED_GPS_DEVICES o GPS_DEMO_TOKENS con al menos un token valido.');
  }
  if (demoCount > 0) {
    log('warn', `🧪 ${demoCount} token(s) de DEMOSTRACION activos (GPS_DEMO_TOKENS). No usarlos en produccion final.`);
  }
  log('info', `🛡️  Geofence Zaragoza: lat [${GEOFENCE.minLat}, ${GEOFENCE.maxLat}] lng [${GEOFENCE.minLng}, ${GEOFENCE.maxLng}]`);
  log('info', `🛡️  Anti-spoofing: first fix <= ${GPS_FIRST_FIX_MAX_ACCURACY_M} m, siguientes <= ${GPS_MAX_ACCURACY_M} m, max ${(TELEPORT_MAX_SPEED_MS * 3.6).toFixed(0)} km/h, max ${TELEPORT_MAX_STEP_M} m / ${TELEPORT_MIN_WINDOW_MS / 1000} s`);
  log('info', `🛡️  Rate-limit: 1 GPS cada ${GPS_MIN_INTERVAL_MS} ms por emisor (${GPS_RATE_VIOLATION_BUDGET} rafagas -> 4029)`);
  log('info', 'Waiting for connections...');
});
