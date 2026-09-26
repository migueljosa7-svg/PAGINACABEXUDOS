/**
 * Resiliencia de sesion en dispositivos moviles (GpsEmisor).
 *
 * Resuelve los tres fallos que congelaban la emision en el telefono:
 *
 *   1. SUSPENSION DE PESTAÑA. Al apagar la pantalla o cambiar de app, iOS y
 *      Android congelan el hilo de JavaScript y el WebSocket muere (1006/1001).
 *      `visibilitychange` / `pageshow` / `online` son la unica senal fiable de
 *      que el hilo vuelve a estar vivo: ahi se reconecta de inmediato en vez de
 *      esperar al backoff (o, peor, quedarse en estado zombi "Conectado").
 *
 *   2. ESTADO ZOMBI. Un socket puede seguir en readyState OPEN con la red
 *      caida: el navegador no emite `close` y la UI muestra "Conectado" sin
 *      enviar nada. Un latido periodico con deteccion de silencio lo destapa.
 *
 *   3. CORTE DE PORTADOR. Movistar/Vodafone/Orange cierran conexiones TCP
 *      inactivas. Un `{"type":"ping"}` cada 15 s mantiene viva la sesion; el
 *      relay ya responde `pong` (ver server.js).
 *
 * Modulo sin dependencias de React ni de Leaflet: lo puede usar el emisor, el
 * visor o cualquier pagina con socket.
 */

/** Periodo del latido cliente -> servidor, muy por debajo del corte de los operadores. */
export const CLIENT_KEEPALIVE_MS = 15000;

/**
 * Silencio maximo tolerado del servidor. Tres latidos perdidos sin respuesta ya
 * no son "red lenta": es un socket zombi y hay que rehacerlo.
 */
export const CLIENT_PONG_TIMEOUT_MS = 45000;

/** Motivo que dispara la reanudacion (util para el diagnostico). */
export type ResumeReason = 'visibilitychange' | 'pageshow' | 'online' | 'focus';

/**
 * `true` si la pestana esta a la vista. Sin Page Visibility API (o sin DOM) se
 * asume visible: nunca se bloquea la emision por no tener la API.
 */
export function isDocumentVisible(): boolean {
  if (typeof document === 'undefined') return true;
  if (typeof document.visibilityState !== 'string') return true;
  return document.visibilityState === 'visible';
}

/** `true` solo si el socket existe y esta listo para enviar. */
export function isSocketOpen(ws: WebSocket | null | undefined): boolean {
  if (!ws) return false;
  if (typeof WebSocket === 'undefined') return false;
  return ws.readyState === WebSocket.OPEN;
}

/**
 * `true` si el socket esta muerto o cerrandose: no es recuperable, hay que
 * crear uno nuevo. CONNECTING (0) NO se considera muerto (el handshake sigue
 * vivo) ni OPEN (1), que es el estado sano.
 */
export function isSocketDead(ws: WebSocket | null | undefined): boolean {
  if (!ws) return true;
  if (typeof WebSocket === 'undefined') return true;
  return ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING;
}

/**
 * Registra los eventos de "vuelvo a primer plano" y llama a `onResume` UNA vez
 * por reactivacion real.
 *
 * Al desbloquear el telefono esos eventos llegan en rafaga (`pageshow` +
 * `visibilitychange` + `online` a la vez). Sin coalescer, cada uno reconectaria
 * por su cuenta y se abririan varios sockets para el mismo token. Se colapsan
 * en un unico disparo por frame de animacion.
 *
 * Devuelve la funcion de limpieza.
 */
export function attachResumeListeners(onResume: (reason: ResumeReason) => void): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  let queued = false;
  let lastReason: ResumeReason = 'visibilitychange';

  const fire = (reason: ResumeReason) => {
    lastReason = reason;
    if (queued) return;
    queued = true;
    const run = () => {
      queued = false;
      onResume(lastReason);
    };
    // requestAnimationFrame no se programa en pestanas ocultas: si el evento
    // llega con la pestana todavia oculta, el frame se pospone hasta que vuelve
    // a pintarse, que es justo el momento en que hay que reconectar.
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(run);
    } else {
      setTimeout(run, 0);
    }
  };

  const handleVisibility = () => {
    // `hidden` -> `visible` es la senal clasica de desbloqueo de pantalla.
    if (isDocumentVisible()) fire('visibilitychange');
  };
  const handlePageShow = () => fire('pageshow');
  const handleOnline = () => {
    // La red volvio: si estaba caida, el socket tambien lo estaba.
    if (typeof navigator === 'undefined' || navigator.onLine !== false) fire('online');
  };
  const handleFocus = () => {
    if (isDocumentVisible()) fire('focus');
  };

  document.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('pageshow', handlePageShow);
  window.addEventListener('online', handleOnline);
  window.addEventListener('focus', handleFocus);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibility);
    window.removeEventListener('pageshow', handlePageShow);
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('focus', handleFocus);
  };
}


export interface SocketKeepAliveOptions {
  /** Devuelve el socket vivo actual (se consulta en cada latido). */
  getSocket: () => WebSocket | null;
  /** Se invoca cuando el socket sigue OPEN pero lleva demasiado tiempo mudo. */
  onZombie: () => void;
  /** Periodo del latido (por defecto 15 s). */
  intervalMs?: number;
  /** Silencio maximo tolerado (por defecto 45 s). */
  pongTimeoutMs?: number;
}

export interface SocketKeepAliveController {
  /** Registra actividad entrante (`pong` o cualquier trama) y reinicia el reloj. */
  markActivity: () => void;
  /** Detiene el latido y libera el intervalo. */
  stop: () => void;
}

/**
 * Latido de cliente: envia `{"type":"ping"}` cada 15 s mientras el socket este
 * OPEN y detecta el estado zombi (socket OPEN al que nadie responde).
 *
 * El estado se reinicia solo cuando `getSocket()` devuelve una instancia
 * distinta: al reconectar hay un socket nuevo y vuelve a valer el margen.
 */
export function attachSocketKeepAlive(options: SocketKeepAliveOptions): SocketKeepAliveController {
  const intervalMs = options.intervalMs ?? CLIENT_KEEPALIVE_MS;
  const pongTimeoutMs = options.pongTimeoutMs ?? CLIENT_PONG_TIMEOUT_MS;

  let lastActivityAt = Date.now();
  let trackedSocket: WebSocket | null = null;
  let zombieReported = false;
  let stopped = false;

  const markActivity = () => {
    lastActivityAt = Date.now();
  };

  const timer = setInterval(() => {
    if (stopped) return;
    const ws = options.getSocket();
    if (!ws || !isSocketOpen(ws)) return;

    // Instancia nueva = conexion nueva: el margen de silencio se reinicia.
    if (ws !== trackedSocket) {
      trackedSocket = ws;
      zombieReported = false;
      lastActivityAt = Date.now();
      return;
    }

    if (!zombieReported && Date.now() - lastActivityAt > pongTimeoutMs) {
      // OPEN pero mudo: el clasico "Conectado" sin enviar nada. Se avisa una
      // sola vez; quien lo reciba cerrara el socket y reconectara.
      zombieReported = true;
      options.onZombie();
      return;
    }

    try {
      ws.send(JSON.stringify({ type: 'ping' }));
    } catch {
      // El socket se esta muriendo: el `onclose` que vendra dispara el
      // backoff normal. No hace falta forzar nada aqui.
    }
  }, intervalMs);

  return {
    markActivity,
    stop: () => {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
    },
  };
}
