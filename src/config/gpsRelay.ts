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

const VIEWER_ID_KEY = 'pcx_viewer_id';
const VIEWER_PING_EVERY_MS = 20_000;
let lastViewerPing = 0;

function viewerId(): string {
  try {
    let id = sessionStorage.getItem(VIEWER_ID_KEY);
    if (!id) {
      id = `v${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`;
      sessionStorage.setItem(VIEWER_ID_KEY, id);
    }
    return id;
  } catch {
    return `v${Math.random().toString(36).slice(2, 14)}`;
  }
}

/**
 * Latido anónimo de espectador (cada 20 s como máximo). Alimenta el indicador
 * de afluencia del panel municipal; no envía datos personales y nunca rompe
 * la vista si falla.
 */
export function pingViewer(token: string): void {
  const now = Date.now();
  if (!token || now - lastViewerPing < VIEWER_PING_EVERY_MS) return;
  lastViewerPing = now;
  void fetch(`${configuredRelayOrigin()}/api/viewers/ping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, viewerId: viewerId() }),
    keepalive: true,
  }).catch(() => undefined);
}
