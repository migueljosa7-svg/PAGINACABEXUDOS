const PRODUCTION_RELAY_ORIGIN = 'https://paginacabexudos.onrender.com';

function configuredRelayOrigin(): string {
  const configured = import.meta.env.VITE_WS_RELAY_URL?.trim();
  const fallback = import.meta.env.PROD
    ? PRODUCTION_RELAY_ORIGIN
    : window.location.origin;
  const raw = configured || fallback;
  const httpUrl = raw.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:');
  const origin = new URL(httpUrl, window.location.origin).origin;

  // A production client hosted on Vercel must never fall back to a websocket
  // endpoint on that same origin: Vercel serves the static app, not the relay.
  if (
    import.meta.env.PROD &&
    origin === window.location.origin &&
    origin !== PRODUCTION_RELAY_ORIGIN
  ) {
    return PRODUCTION_RELAY_ORIGIN;
  }

  return origin;
}

export function getGpsRelayHttpBase(): string {
  return configuredRelayOrigin();
}

export function getGpsRelayWebSocketBase(): string {
  return configuredRelayOrigin().replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:');
}
