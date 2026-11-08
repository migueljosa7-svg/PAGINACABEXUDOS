/**
 * Origen del relay GPS.
 *
 * En Vercel el relay son funciones serverless (/api/*) del MISMO dominio, así
 * que por defecto se usa el origen actual: sin CORS, sin cold-start cruzado.
 * VITE_WS_RELAY_URL permite apuntar a otro servidor (p. ej. el server.js
 * clásico en Render) si algún día hace falta.
 */
function configuredRelayOrigin(): string {
  const configured = import.meta.env.VITE_WS_RELAY_URL?.trim();
  if (!configured) return window.location.origin;
  const httpUrl = configured.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:');
  return new URL(httpUrl, window.location.origin).origin;
}

export function getGpsRelayHttpBase(): string {
  return configuredRelayOrigin();
}

export function getGpsRelayWebSocketBase(): string {
  return configuredRelayOrigin().replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:');
}
