import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../styles/recorridos.css';
// v3.1: fórmula y umbrales desde telemetryUtils (única fuente de verdad matemática)
import {
  haversineMeters,
  EMITTER_MIN_SEND_DISTANCE_M,
  EMITTER_HEARTBEAT_MS,
  EMITTER_MAX_ACCURACY_M,
  SPEED_SMOOTH_WINDOW,
} from '../services/position/telemetryUtils';
import { smoothSpeed } from '../services/position/metricsUtils';

type ServerMessage =
  | { type: 'room_info'; tokenRoomId?: string; sendersCount?: number; receiversCount?: number; senders?: any[] }
  | { type: 'gps_authorized'; authorized: boolean; token: string; label?: string }
  | { type: 'gps_unauthorized' }
  | { type: 'gps'; senderId: string; label?: string; lat: number; lng: number }
  | { type: 'server_shutdown' }
  | { type: string; [k: string]: any };

const getWsRelayUrl = () => {
  // Prioridad a VITE_WS_RELAY_URL (despliegue split frontend/relay en Render).
  // Si no está definida, mismo origen (servidor unificado server.js).
  try {
    const fromEnv = (import.meta as any)?.env?.VITE_WS_RELAY_URL;
    if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
      const v = fromEnv.trim().replace(/\/+$/, '');
      return v.endsWith('/') ? v : `${v}/`;
    }
  } catch {
    // ignore: sin env disponible
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Always use same host/port and the relay endpoint path will be handled by the server.
  return `${protocol}//${window.location.host}/`;
};

// Endpoint seguro para mostrar en errores: sin query string (nunca expone ?token=).
const sanitizeWsEndpoint = (rawUrl: string): string => {
  try {
    const u = new URL(rawUrl);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return 'relay';
  }
};

// --- Filtro Haversine de ahorro de batería/red (aditivo) ---
// v3.1: la fórmula (haversineMeters) y los umbrales
// (EMITTER_MIN_SEND_DISTANCE_M / EMITTER_HEARTBEAT_MS) viven ahora en
// src/services/position/telemetryUtils.ts — única fuente de verdad matemática.

/**
 * Resolucion del token de emision. Prioridad estricta:
 *   1) query string de la URL directa (?token=...), p. ej.
 *      https://paginacabexudos.onrender.com/gps-emisor?token=cmp_prueba_barrio
 *   2) token guardado en localStorage (movil de la comparsa, sobrevive a cierres)
 *   3) token de build (solo desarrollo; ver src/config/gpsDeviceAuth.ts)
 *
 * El token NUNCA se muestra en la URL del WebSocket ni en los logs del cliente:
 * viaja en el handshake (query del WS) porque es lo que espera el relay.
 */
const TOKEN_FORMAT_RE = /^[a-zA-Z0-9_-]{3,128}$/;
const TOKEN_STORAGE_KEY = 'pcx_gps_token';

function readTokenFromStorage(): string {
  try {
    return (localStorage.getItem(TOKEN_STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
}

function resolveEmitterToken(): string {
  // 1) Query string de la URL directa (prioritario, lectura tolerante).
  let fromUrl = '';
  try {
    const raw = new URLSearchParams(window.location.search).get('token');
    if (raw) fromUrl = decodeURIComponent(raw).trim();
  } catch {
    // Query mal formada (%): se intenta la lectura laxa de abajo.
    fromUrl = (window.location.search.match(/[?&]token=([^&]+)/)?.[1] || '').trim();
  }
  if (fromUrl && TOKEN_FORMAT_RE.test(fromUrl)) {
    // Persiste para que una recarga no pierda el enlace directo.
    try { localStorage.setItem(TOKEN_STORAGE_KEY, fromUrl); } catch { /* modo privado */ }
    return fromUrl;
  }
  // 2) Token persistido del propio dispositivo.
  const stored = readTokenFromStorage();
  if (stored && TOKEN_FORMAT_RE.test(stored)) return stored;
  // 3) Token de build (solo dev).
  return '';
}

export const GpsEmisor: React.FC = () => {
  const token = useMemo(() => resolveEmitterToken(), []);
  // Token con formato NO valido: se avisa en claro para no fallar en silencio.
  const tokenFormatError = token ? '' : 'Falta o es invalido el token (?token=...). Solicitalo a coordinacion.';

  const [wsState, setWsState] = useState<'disconnected' | 'connecting' | 'authorized' | 'unauthorized'>('disconnected');
  const [gpsState, setGpsState] = useState<'inactive' | 'active'>('inactive');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const sendingRef = useRef(false);
  // Última posición enviada (para el filtro Haversine de ahorro de batería).
  const lastSentRef = useRef<{ lat: number; lng: number; t: number } | null>(null);
  // Media movil de velocidad: ultimas 5 lecturas aceptadas (no picos instantaneos).
  const speedSamplesRef = useRef<number[]>([]);
  const [smoothedKmh, setSmoothedKmh] = useState(0);
  // --- Reconexión automática aditiva (no altera el contrato GPS) ---
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const unmountedRef = useRef(false);
  // Marca que el servidor rechazó el token: no tiene sentido reconectar.
  const unauthorizedRef = useRef(false);
  // Unica peticion de despertar la instancia de Render por sesion. Antes se
  // repetia en CADA intento de WebSocket, saturando la pestana Network.
  const isServerAwakeRef = useRef(false);
  // Evita que dos connect() simultaneos (StrictMode / reconexion rapida) creen
  // dos sockets en paralelo para el mismo token.
  const socketCreatingRef = useRef(false);
  // Ultima posicion GPS leida antes de estar autorizado: se reenvia en cuanto
  // el relay autoriza, para no perder el primer fix (arranque instantaneo).
  const pendingFixRef = useRef<Record<string, unknown> | null>(null);
  const MAX_RECONNECT_DELAY_MS = 30000;
  // Referencia estable a connect(): evita dependencias circulares con scheduleReconnect.
  const connectRef = useRef<() => void>(() => {});

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  const serverWsBase = useMemo(() => getWsRelayUrl(), []);

  const stopGps = useCallback(() => {
    if (watchIdRef.current !== null) {
      try {
        navigator.geolocation.clearWatch(watchIdRef.current);
      } catch {
        // ignore
      }
    }
    watchIdRef.current = null;
    sendingRef.current = false;
    setGpsState('inactive');
  }, []);

  const startGps = useCallback(() => {
    // Idempotente: el GPS se pide al montar Y al autorizar el socket. Sin este
    // guard, React StrictMode (doble montaje en dev) o la carrera
    // "montar + autorizar" crearian DOS watchers de geolocalizacion y cada fix
    // se enviaria dos veces (disparando el rate-limit 4029 del servidor).
    if (watchIdRef.current !== null) return;
    if (!navigator.geolocation) {
      setError('❌ Este dispositivo no soporta geolocalización');
      return;
    }

    if (typeof window.isSecureContext === 'boolean' ? !window.isSecureContext : window.location.protocol !== 'https:') {
      setError('❌ HTTPS requerido para pedir ubicación');
      return;
    }

    setGpsState('active');
    sendingRef.current = true;
    // Reinicia el filtro Haversine y la media movil: la primera posicion de la
    // sesion siempre envia y la velocidad arranca en 0.
    lastSentRef.current = null;
    speedSamplesRef.current = [];
    setSmoothedKmh(0);

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 2000,
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (!sendingRef.current) return;
        const { latitude, longitude, accuracy, speed, heading, altitude } = position.coords;

        // Anti-jitter: una precision pobre (>30 m) no aporta posicion fiable.
        // Se descarta ANTES de tocar el acumulador para no sumar metros ni
        // introducir ruido en la media movil de velocidad.
        if (accuracy != null && Number.isFinite(accuracy) && accuracy > EMITTER_MAX_ACCURACY_M) {
          return;
        }

        // Filtro Haversine (ahorro de bateria/red): si la comparsa esta parada
        // (<3 m de desplazamiento) NO se envia nada... salvo heartbeat cada 10 s
        // para que los visores no la den por perdida (timeout de 15 s).
        const last = lastSentRef.current;
        const now = Date.now();
        if (last) {
          const moved = haversineMeters(last.lat, last.lng, latitude, longitude);
          const elapsed = now - last.t;
          if (moved < EMITTER_MIN_SEND_DISTANCE_M && elapsed < EMITTER_HEARTBEAT_MS) return;
        }
        lastSentRef.current = { lat: latitude, lng: longitude, t: now };

        // --- Media movil de velocidad (ultimas 5 lecturas) ---
        // Se prioriza la velocidad del chip GPS (m/s -> km/h) cuando es
        // plausible; si no, se deriva del desplazamiento real / tiempo. Asi el
        // emisor transmite y muestra ritmo de caminata (3.5-5 km/h) en lugar de
        // picos instantaneos de 20+ km/h por un mal fix.
        const movedFromLast = last ? haversineMeters(last.lat, last.lng, latitude, longitude) : 0;
        const dtSec = last ? (now - last.t) / 1000 : 0;
        const chipKmh = typeof speed === 'number' && Number.isFinite(speed) && speed >= 0 ? speed * 3.6 : null;
        const derivedKmh = dtSec > 0 ? (movedFromLast / dtSec) * 3.6 : 0;
        const sampleKmh = chipKmh != null && chipKmh <= 30 ? chipKmh : derivedKmh;
        const samples = speedSamplesRef.current;
        samples.push(Math.max(0, sampleKmh));
        if (samples.length > SPEED_SMOOTH_WINDOW) samples.shift();
        speedSamplesRef.current = samples;
        setSmoothedKmh(smoothSpeed(samples, SPEED_SMOOTH_WINDOW));

        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
             ws.send(
               JSON.stringify({
                 type: 'gps',
                 lat: latitude,
                 lng: longitude,
                 accuracy: accuracy ?? 0,
                 speed: speed ?? 0,
                 heading: heading ?? 0,
                 altitude: altitude ?? 0,
                 timestamp: Date.now(),
               })
             );
             pendingFixRef.current = null;
        } else {
          // El GPS ya esta leyendo pero el socket aun no esta listo (arranque
          // en frio o reconexion). Se guarda el ultimo fix para enviarlo en
          // cuanto se autorice: el marcador aparece de inmediato, sin esperar
          // al siguiente muestreo del GPS (que puede tardar 10-30 s).
          pendingFixRef.current = {
            type: 'gps',
            lat: latitude,
            lng: longitude,
            accuracy: accuracy ?? 0,
            speed: speed ?? 0,
            heading: heading ?? 0,
            altitude: altitude ?? 0,
            timestamp: Date.now(),
          };
        }
      },
      (e) => {
        setError(`⚠️ Error GPS (${e && (e as any).code}): ${(e && e.message) || ''}`.trim());
      },
      geoOptions
    );
  }, []);

  // --- Wake-up contra cold-start de Render (plan gratuito) ---
  // Antes de abrir el WS se hace un GET a /health para despertar el contenedor.
  // Sin esto, el primer handshake WS da timeout y el navegador reporta
  // "WebSocket is closed before the connection is established".
  const wakeUpServer = useCallback(async () => {
    // UNA sola peticion por sesion de pagina. Render apaga las instancias del
    // plan gratuito tras unos minutos: este GET las despierta, pero repetirlo en
    // CADA reconexion del WS saturaba la pestana Network sin aportar nada.
    if (isServerAwakeRef.current) return;
    isServerAwakeRef.current = true;
    try {
      // serverWsBase puede ser ws(s)://... -> convertir a http(s)://... para el fetch.
      const httpBase = serverWsBase.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:');
      const healthUrl = new URL('/health', httpBase).toString();
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      try {
        await fetch(healthUrl, { mode: 'cors', cache: 'no-store', signal: ctrl.signal });
      } finally {
        clearTimeout(timer);
      }
    } catch {
      // El contenedor puede estar despertando: el WS reintentará con backoff.
    }
  }, [serverWsBase]);

  // Reconexión con backoff exponencial (1s, 2s, 4s... hasta 30s) + jitter ±30%.
  // No reconecta si el token fue rechazado (4001) ni si el componente se desmontó.
  // El jitter evita el thundering-herd cuando Render despierta y miles de
  // clientes reintentan a la vez.
  const scheduleReconnect = useCallback(() => {
    if (unmountedRef.current || unauthorizedRef.current) return;
    if (reconnectTimerRef.current) return;
    reconnectAttemptsRef.current += 1;
    const base = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), MAX_RECONNECT_DELAY_MS);
    const jitter = base * (0.7 + Math.random() * 0.6); // ±30%
    const delay = Math.round(Math.min(jitter, MAX_RECONNECT_DELAY_MS));
    setWsState('connecting');
    setError(`🔌 Conexión perdida. Reintentando en ${Math.round(delay / 1000)}s...`);
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connectRef.current();
    }, delay);
  }, []);

  const openSenderSocket = useCallback((wsUrl: string, safeEndpoint: string) => {
    // Guard de instancia unica: si otro connect() esta creando el socket en
    // este mismo tick (doble montaje de StrictMode), no crear un segundo.
    if (socketCreatingRef.current) return;
    socketCreatingRef.current = true;
    try {
      const ws = new WebSocket(wsUrl.toString());
      wsRef.current = ws;

      ws.onopen = () => {
        // El socket ya es una instancia viva: el guard puede liberarse.
        socketCreatingRef.current = false;
        // Connection opened, waiting for auth message
      };

      ws.onmessage = (event) => {
        let msg: ServerMessage;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        if (msg.type === 'gps_authorized') {
          if (!msg.authorized) {
            stopGps();
            unauthorizedRef.current = true;
            setWsState('unauthorized');
            setError('Dispositivo no autorizado: el token no está en la lista de dispositivos autorizados');
            try {
              ws.close(1000, 'unauthorized');
            } catch {
              // ignore
            }
            return;
          }

          // Conexión validada: reinicia el backoff y arranca el watchPosition de siempre.
          unauthorizedRef.current = false;
          reconnectAttemptsRef.current = 0;
          clearReconnectTimer();
          setWsState('authorized');
          setError(null);
          startGps();

          // Envia el fix que el GPS ya leyo mientras el socket se abria: evita
          // esperar al siguiente muestreo y hace que el marcador aparezca al
          // instante, que es justo el comportamiento "abrir y transmits".
          const pending = pendingFixRef.current;
          if (pending && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(pending));
            pendingFixRef.current = null;
          }
          return;
        }

        if (msg.type === 'gps_unauthorized') {
          stopGps();
          unauthorizedRef.current = true;
          setWsState('unauthorized');
          setError('Dispositivo no autorizado');
          return;
        }

        if (msg.type === 'server_shutdown') {
          stopGps();
        }
      };

      ws.onclose = (event) => {
        stopGps();

        // Token rechazado por el servidor (fail-secure 4001): no tiene sentido reintentar.
        if (event.code === 4001 || unauthorizedRef.current) {
          unauthorizedRef.current = true;
          setWsState('unauthorized');
          setError('Dispositivo no autorizado: el token no está en la lista de dispositivos autorizados');
          return;
        }

        // Cierre limpio (fin de sesión / desmontaje): no reconectar.
        if (event.code === 1000 || event.code === 1005) {
          setWsState('disconnected');
          return;
        }

        // 4001: token NO autorizado. Es un rechazo DEFINITIVO: reintentar cada
        // pocos segundos no lo va a arreglar y solo satura el relay. Se para el
        // bucle y se pide el enlace correcto al usuario.
        if (event.code === 4001) {
          unauthorizedRef.current = true;
          stopGps();
          setWsState('unauthorized');
          setError('Token no autorizado. Comprueba el enlace recibido o solicítalo a coordinación.');
          return;
        }

        // 4009: otra sesión con el mismo token/barrio tomó el relevo. Reconectar
        // ahora solo provocaría un bucle de expulsiones mutuas, así que se
        // detiene la emisión y se avisa (el relevo ya está transmitiendo).
        if (event.code === 4009) {
          unauthorizedRef.current = true;
          stopGps();
          setWsState('unauthorized');
          setError('Esta sesión fue reemplazada por otra con el mismo token. No se puede emitir dos veces a la vez.');
          return;
        }

        // 4029: rate-limit (más de 1 paquete de ubicación por segundo). Se corta
        // y no se reintenta en bucle: el usuario debe parar y volver a empezar.
        if (event.code === 4029) {
          setWsState('disconnected');
          setError('Demasiados envíos de ubicación. Se ha cortado la emisión para proteger el servidor.');
          return;
        }

        // Microcorte de la red móvil del porteador: backoff exponencial.
        socketCreatingRef.current = false;
        setWsState('disconnected');
        if (event.code === 1006) {
          setError(`Conexión perdida. Endpoint: ${safeEndpoint}`);
        } else {
          setError(`Conexión cerrada (código: ${event.code}). Endpoint: ${safeEndpoint}`);
        }
        scheduleReconnect();
      };

      ws.onerror = () => {
        // The event doesn't contain the actual error, but we can check readyState
        const readyState = ws.readyState;
        const readyStateText = {
          0: 'CONNECTING',
          1: 'OPEN',
          2: 'CLOSING',
          3: 'CLOSED',
        }[readyState] || 'UNKNOWN';
        // Solo el endpoint saneado: nunca la query string con ?token=.
        setError(`⚠️ Error de WebSocket (${readyStateText}). Endpoint: ${safeEndpoint}`);
      };
    } catch (err) {
      setWsState('disconnected');
      setError(`❌ Error al conectar: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      scheduleReconnect();
    }
  }, [scheduleReconnect, startGps, stopGps]);

  const connect = useCallback(() => {
    if (!token || token.length < 3) {
      setWsState('unauthorized');
      setError('Dispositivo no autorizado: token vacío o muy corto');
      return;
    }

    // Evita sockets duplicados si ya hay uno abierto o conectando.
    const current = wsRef.current;
    if (current && (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    unauthorizedRef.current = false;

    const wsUrl = new URL(serverWsBase);
    wsUrl.searchParams.set('role', 'sender');
    wsUrl.searchParams.set('token', token);
    // Nunca se imprime en UI: solo el endpoint, sin query string (no expone ?token=).
    const safeEndpoint = sanitizeWsEndpoint(wsUrl.toString());

    // Solo limpia el error en un intento inicial; durante reconexión se mantiene el aviso.
    if (reconnectAttemptsRef.current === 0) setError(null);
    setWsState('connecting');

    // Wake-up HTTP previo (despierta Render dormido) + apertura del socket.
    // openSenderSocket es síncrono; el wake-up no bloquea el handshake si falla.
    void wakeUpServer().finally(() => {
      if (unmountedRef.current || unauthorizedRef.current) return;
      // Segundo guard: el wake-up es asíncrono y otro intento puede haber ganado.
      const latest = wsRef.current;
      if (latest && (latest.readyState === WebSocket.OPEN || latest.readyState === WebSocket.CONNECTING)) return;
      openSenderSocket(wsUrl.toString(), safeEndpoint);
    });
  }, [token, serverWsBase, openSenderSocket, wakeUpServer]);

  // Referencia estable para que scheduleReconnect pueda relanzar la conexión
  // sin crear dependencias circulares.
  connectRef.current = connect;

  // Ciclo de vida: conecta al montar y limpia TODO al desmontar
  // (no hay listeners ni timers huérfanos -> sin fugas de memoria).
  useEffect(() => {
    unmountedRef.current = false;
    // Rastreo GPS inmediato: no espera al WebSocket. El navegador empieza a
    // pedir la ubicacion en el segundo 0 y el primer fix queda encolado
    // (pendingFixRef) para enviarlo en cuanto el relay autorice. Asi el
    // marcador aparece de inmediato en vez de "Conectado" sin posicion.
    if (token && 'geolocation' in navigator) {
      startGps();
    }
    connect();

    return () => {
      unmountedRef.current = true;
      clearReconnectTimer();
      stopGps();
      // Libera el guard de socket: sin esto, el doble montaje de StrictMode
      // dejaria el flag en true y el segundo montaje NO abriria socket.
      socketCreatingRef.current = false;

      const ws = wsRef.current;
      wsRef.current = null;
      if (ws) {
        // Neutraliza los handlers para no disparar reconexión.
        // CRÍTICO: nunca llamar a .close() en CONNECTING (0): aborta el
        // handshake y el navegador reporta "closed before established".
        // Si está conectando, se deja que el handshake termine solo (el guard
        // de unmountedRef impide que onclose reintente) o se cierra al abrir.
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CLOSING) {
          try {
            ws.close(1000, 'unmount');
          } catch {
            // ignore
          }
        } else if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => {
            try {
              ws.close(1000, 'unmount-after-open');
            } catch {
              // ignore
            }
          };
        } else {
          ws.onopen = null;
        }
      }
    };
    // Solo debe reconectar si cambian token/endpoint, nunca por estado de UI.
  }, [connect, clearReconnectTimer, stopGps]);

  const statusDotClass =
    wsState === 'authorized'
      ? 'connected'
      : wsState === 'unauthorized'
        ? 'disconnected'
        : wsState === 'connecting'
          ? 'sending'
          : 'disconnected';

  return (
    <div
      className="recorridos-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#0f0f1a',
        color: '#e0e0e0',
        padding: 16,
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: '100%',
          background: '#1a1a2e',
          borderRadius: 20,
          padding: 20,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <h1 style={{ fontSize: '1.2rem', textAlign: 'center', marginBottom: 8, color: '#f0c040' }}>📍 GPS Emisor</h1>
        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', marginBottom: 16 }}>
          Envia tu ubicación en tiempo real al mapa de seguimiento.
        </p>

        <div style={{ background: '#16213e', borderRadius: 16, padding: 16, marginBottom: 14, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <span
              className={`status-dot ${statusDotClass}`}
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                borderRadius: 999,
                background:
                  statusDotClass === 'connected'
                    ? '#4ade80'
                    : statusDotClass === 'sending'
                      ? '#facc15'
                      : '#f87171',
              }}
            />
            <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>
              {wsState === 'authorized' ? 'Conectado' : wsState === 'connecting' ? 'Conectando…' : wsState === 'unauthorized' ? 'No autorizado' : 'Desconectado'}
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', marginTop: 10, color: gpsState === 'active' ? '#4ade80' : '#64748b', fontWeight: 700 }}>
            {gpsState === 'active' ? '🛰️ GPS: Activo' : '🛰️ GPS: Inactivo'}
          </div>

          {error && (
            <div
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 12,
                background: '#3b1a1a',
                border: '1px solid #dc2626',
                color: '#f87171',
                fontSize: '0.8rem',
                lineHeight: 1.3,
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'Courier New, monospace', wordBreak: 'break-word' }}>
            Token:{' '}
            <span style={{ color: token ? '#e0e0e0' : '#f87171', fontWeight: 800 }}>{token || 'NO DETECTADO'}</span>
          </div>

          {tokenFormatError && (
            <div style={{ marginTop: 8, fontSize: '0.7rem', color: '#f87171', lineHeight: 1.3 }}>
              {tokenFormatError}
            </div>
          )}

          {gpsState === 'active' && (
            <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#94a3b8' }}>
              Velocidad suavizada:{' '}
              <span style={{ color: '#4ade80', fontWeight: 800 }}>
                {smoothedKmh.toFixed(1).replace('.', ',')} km/h
              </span>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#475569' }}>PAGINACABEXUDOS - GPS Relay</div>
      </div>
    </div>
  );
};

export default GpsEmisor;