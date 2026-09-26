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
// Resiliencia móvil: reanudación al volver a primer plano y latido Keep-Alive.
import {
  attachResumeListeners,
  attachSocketKeepAlive,
  isDocumentVisible,
  isSocketDead,
  isSocketOpen,
} from '../services/mobileResilience';
import type { ResumeReason, SocketKeepAliveController } from '../services/mobileResilience';

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
// El primer fix puede llegar con una señal de red poor (WiFi/IP de escritorio).
// Este límite es exclusivo del arranque; las lecturas posteriores conservan 30 m.
const FIRST_FIX_MAX_ACCURACY_M = 100;

// --- Arranque híbrido de geolocalización (móvil) --------------------------------
// En interiores el chip GPS de alta precisión no entrega fix: watchPosition se
// queda congelado minutos sin llamar al callback de error. Por eso el arranque
// es doble: una lectura rápida por getCurrentPosition (que el navegador resuelve
// por red cuando puede) y, en paralelo, el watcher continuo. Si a los 6 s no ha
// llegado NINGÚN fix, se degrada a precisión estándar para garantizar el
// primer marcador en el mapa.
const FAST_FIX_TIMEOUT_MS = 5000;
const WATCH_FIRST_FIX_TIMEOUT_MS = 6000;

/**
 * Tiempo que una conexion debe sobrevivir para considerarse "estable".
 *
 * Por debajo de este umbral la sesion se conto como fallida y el backoff de
 * reconexion se multiplica. Es la pieza que corta el bucle de 5-10 s: sin ella,
 * `gps_authorized` reiniciaba el contador de reintentos antes de tiempo y el
 * cliente aparentaba un fallo perpetuo aunque el socket se abriera bien.
 */
const STABLE_SESSION_MS = 10000;

type GpsDiagnostic = {
  code: number;
  message: string;
};

const describeGeolocationError = (error: GeolocationPositionError): GpsDiagnostic => {
  switch (error.code) {
    case 1:
      return {
        code: error.code,
        message: 'Permiso de ubicación denegado en el navegador. Activa el permiso de ubicación para este sitio y vuelve a intentarlo.',
      };
    case 2:
      return {
        code: error.code,
        message: 'Posición no disponible. Buscando señal GPS del dispositivo.',
      };
    case 3:
      return {
        code: error.code,
        message: 'Se agotó el tiempo de búsqueda GPS (10 s).',
      };
    default:
      return {
        code: Number.isFinite(error.code) ? error.code : 0,
        message: error.message || 'Error desconocido de geolocalización.',
      };
  }
};

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
  const [usingNetworkFallback, setUsingNetworkFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gpsDiagnostic, setGpsDiagnostic] = useState<GpsDiagnostic | null>(null);

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
  // El primer fix se identifica aunque se haya encolado antes de gps_authorized.
  // Así el umbral de movimiento/precisión solo se relaja para ese paquete.
  const firstFixHandledRef = useRef(false);
  const authorizedRef = useRef(false);
  const geolocationFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usingNetworkFallbackRef = useRef(false);
  const geolocationFallbackReasonRef = useRef<string | null>(null);
  // Vigilante del arranque híbrido: si el watcher no entrega fix, se degrada.
  const firstFixWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Controlador del latido Keep-Alive (ping cada 15 s + deteccion de zombi).
  const keepAliveRef = useRef<SocketKeepAliveController | null>(null);
  // --- Estabilidad de la sesion (antibucle de reconexion) ---
  // Momento en que se creo el socket actual: sirve para saber si murio antes de
  // estabilizarse (handshake fallido) o tras haber funcionado con normalidad.
  const connectedAtRef = useRef<number>(0);
  // Veces que el socket ha muerto antes de `STABLE_SESSION_MS`.
  const unstableAttemptsRef = useRef(0);
  // Anclas de identidad estable para los listeners de reanudacion: se
  // registran una vez y siempre ejecutan la ULTIMA version de la logica.
  const resumeRef = useRef<(reason: ResumeReason) => void>(() => {});
  const handleZombieRef = useRef<() => void>(() => {});
  const MAX_RECONNECT_DELAY_MS = 30000;
  // Referencia estable a connect(): evita dependencias circulares con scheduleReconnect.
  const connectRef = useRef<() => void>(() => {});
  const startGpsRef = useRef<(enableHighAccuracy?: boolean) => void>(() => {});

  // ESTABILIDAD CRITICA: esta funcion SIEMPRE fue una dependencia del efecto de
  // conexion. Al no estar envuelta en useCallback, React creaba una identidad
  // NUEVA en cada render; eso hacia que el array de dependencias cambiara en
  // cada setState (incluido el de `gps_authorized`), el cleanup cerrara el socket
  // recien abierto y el efecto volviera a ejecutarse: bucle infinito de sockets.
  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const serverWsBase = useMemo(() => getWsRelayUrl(), []);

  const clearActiveGeoWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      try {
        navigator.geolocation.clearWatch(watchIdRef.current);
      } catch {
        // ignore
      }
    }
    watchIdRef.current = null;
  }, []);

  const stopGps = useCallback(() => {
    clearActiveGeoWatch();
    if (geolocationFallbackTimerRef.current !== null) {
      clearTimeout(geolocationFallbackTimerRef.current);
      geolocationFallbackTimerRef.current = null;
    }
    if (firstFixWatchdogRef.current !== null) {
      clearTimeout(firstFixWatchdogRef.current);
      firstFixWatchdogRef.current = null;
    }
    watchIdRef.current = null;
    sendingRef.current = false;
    authorizedRef.current = false;
    firstFixHandledRef.current = false;
    pendingFixRef.current = null;
    usingNetworkFallbackRef.current = false;
    setUsingNetworkFallback(false);
    geolocationFallbackReasonRef.current = null;
    setGpsState('inactive');
  }, [clearActiveGeoWatch]);

  /**
   * Lectura válida de geolocalizacion (compartida por el watcher continuo y
   * por la lectura rapida de arranque). Aplica los filtros de primera fix,
   * Haversine de ahorro y media movil de velocidad, y encola/envia el paquete.
   */
  const handleGeoSuccess = useCallback((position: GeolocationPosition) => {
    if (!sendingRef.current) return;
    // El vigilante de arranque ya cumplio su objetivo: hay fix.
    if (firstFixWatchdogRef.current !== null) {
      clearTimeout(firstFixWatchdogRef.current);
      firstFixWatchdogRef.current = null;
    }
    setGpsDiagnostic(null);
    setError((currentError) =>
      currentError?.startsWith('⚠️ GPS ') ? null : currentError,
    );
    const { latitude, longitude, accuracy, speed, heading, altitude } = position.coords;

        // FIRST FIX: la primera lectura válida se acepta con hasta 100 m de
        // imprecisión y sin aplicar todavía el filtro de movimiento de 3 m.
        // Las siguientes lecturas mantienen la puerta anti-jitter habitual.
        const isFirstFix = !firstFixHandledRef.current;
        const accuracyM = typeof accuracy === 'number' && Number.isFinite(accuracy) ? accuracy : 0;
        const accuracyLimitM = isFirstFix ? FIRST_FIX_MAX_ACCURACY_M : EMITTER_MAX_ACCURACY_M;
        if (accuracyM > accuracyLimitM) return;

        // Filtro Haversine (ahorro de bateria/red): si la comparsa esta parada
        // (<3 m de desplazamiento) NO se envia nada... salvo heartbeat cada 10 s
        // para que los visores no la den por perdida (timeout de 15 s).
        const last = lastSentRef.current;
        const now = Date.now();
        if (!isFirstFix && last) {
          const moved = haversineMeters(last.lat, last.lng, latitude, longitude);
          const elapsed = now - last.t;
          if (moved < EMITTER_MIN_SEND_DISTANCE_M && elapsed < EMITTER_HEARTBEAT_MS) return;
        }
        const payload = {
          type: 'gps',
          lat: latitude,
          lng: longitude,
          accuracy: accuracy ?? 0,
          speed: speed ?? 0,
          heading: heading ?? 0,
          altitude: altitude ?? 0,
          timestamp: now,
        };
        if (isFirstFix) {
          // Se marca al construir el paquete: el fix queda pendiente, pero las
          // siguientes lecturas ya respetan los filtros normales.
          firstFixHandledRef.current = true;
          pendingFixRef.current = payload;
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
        if (authorizedRef.current && ws && ws.readyState === WebSocket.OPEN) {
          // Solo se transmite despues de gps_authorized. Si el socket aun no
          // esta autorizado, el paquete queda encolado y se envia al recibir
          // la autorizacion.
          ws.send(JSON.stringify(payload));
          pendingFixRef.current = null;
        } else if (!pendingFixRef.current) {
          // Conserva el primer fix hasta que exista un socket autorizado.
          pendingFixRef.current = payload;
        }
  }, []);

  /**
   * Error de geolocalizacion. Un timeout de alta precisión NO implica que el
   * dispositivo no tenga ubicación: en interiores se resuelve por red/WiFi. Se
   * reintenta UNA sola vez con enableHighAccuracy=false, sin duplicar el
   * watcher original.
   */
  const handleGeoError = useCallback((geoError: GeolocationPositionError) => {
    const diagnostic = describeGeolocationError(geoError);
    setGpsDiagnostic(diagnostic);
    setError(`⚠️ GPS ${diagnostic.code}: ${diagnostic.message}`);

    if (
      !usingNetworkFallbackRef.current &&
      !unmountedRef.current &&
      (diagnostic.code === 3 || diagnostic.code === 2)
    ) {
      usingNetworkFallbackRef.current = true;
      geolocationFallbackReasonRef.current =
        diagnostic.code === 3
          ? 'El GPS de alta precisión agotó el tiempo; reintentando por red/WiFi…'
          : 'Sin señal GPS de alta precisión; reintentando por red/WiFi…';
      setGpsDiagnostic({
        code: diagnostic.code,
        message: geolocationFallbackReasonRef.current,
      });
      // El vigilante de arranque ya no aplica: el error es explicito.
      if (firstFixWatchdogRef.current !== null) {
        clearTimeout(firstFixWatchdogRef.current);
        firstFixWatchdogRef.current = null;
      }
      clearActiveGeoWatch();
      geolocationFallbackTimerRef.current = setTimeout(() => {
        geolocationFallbackTimerRef.current = null;
        if (!unmountedRef.current && sendingRef.current) {
          startGpsRef.current(false);
        }
      }, 250);
    }
  }, [clearActiveGeoWatch]);

  const startGps = useCallback((enableHighAccuracy = true) => {
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
    usingNetworkFallbackRef.current = !enableHighAccuracy;
    setUsingNetworkFallback(!enableHighAccuracy);
    if (enableHighAccuracy) {
      geolocationFallbackReasonRef.current = null;
      // Reinicia el filtro Haversine, la media movil y el estado del primer fix.
      // La primera posicion de cada sesion se envia aunque aun no haya autorizacion.
      lastSentRef.current = null;
      firstFixHandledRef.current = false;
      speedSamplesRef.current = [];
      setSmoothedKmh(0);
    }
    setGpsDiagnostic({
      code: 0,
      message: enableHighAccuracy
        ? 'Buscando señal GPS de alta precisión…'
        : geolocationFallbackReasonRef.current || 'Buscando ubicación por red/WiFi…',
    });

    const geoOptions: PositionOptions = enableHighAccuracy
      ? {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      : {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 0,
        };

    // --- ARRANQUE HÍBRIDO (solo en el primer intento de alta precisión) ---
    // getCurrentPosition resuelve en segundos cuando el navegador puede triangular
    // por red; watchPosition mantiene el rastreo continuo. Los dos escriben en el
    // MISMO manejador, asi que da igual cual llegue antes: el filtro de primera
    // fix y el buffer de pendientes hacen que el primero gane.
    if (enableHighAccuracy) {
      try {
        navigator.geolocation.getCurrentPosition(
          handleGeoSuccess,
          handleGeoError,
          { enableHighAccuracy: true, timeout: FAST_FIX_TIMEOUT_MS, maximumAge: 0 },
        );
      } catch {
        // Algunos navegadores lanzan si la API no está lista: el watcher sigue.
      }

      // Vigilante: si en 6 s no ha llegado NINGÚN fix, el chip GPS de interiors
      // está mudo. Se degrada a precisión estándar en vez de quedarse congelado
      // minutos (el sintoma era "Buscando..." infinito).
      firstFixWatchdogRef.current = setTimeout(() => {
        firstFixWatchdogRef.current = null;
        if (
          unmountedRef.current ||
          !sendingRef.current ||
          firstFixHandledRef.current ||
          usingNetworkFallbackRef.current
        ) {
          return;
        }
        geolocationFallbackReasonRef.current =
          'El GPS de alta precisión no responde; activando ubicación por red/WiFi…';
        setGpsDiagnostic({ code: 3, message: geolocationFallbackReasonRef.current });
        clearActiveGeoWatch();
        startGpsRef.current(false);
      }, WATCH_FIRST_FIX_TIMEOUT_MS);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleGeoSuccess,
      handleGeoError,
      geoOptions,
    );
  }, [clearActiveGeoWatch, handleGeoSuccess, handleGeoError]);

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
  //
  // ANTIBUCLE: si una conexión muere poco después de abrirse (handshake que no
  // llega a completarse, proxy que corta el WebSocket, contenedor de Render que
  // reinicia), el backoff "normal" produces el bucle de 5-10 s que ve el
  // usuario: 1s, 2s, 4s, 8s, 4s... porque `gps_authorized` reinicia el contador
  // antes de que la sesion llegue a ser estable. Se mide cuanto vivió cada
  // conexión y, si no llegó a estabilizarse, el multiplicador de backoff crece.
  const scheduleReconnect = useCallback(() => {
    if (unmountedRef.current || unauthorizedRef.current) return;
    if (reconnectTimerRef.current) return;
    reconnectAttemptsRef.current += 1;

    // Multiplicador por inestabilidad: nunca baja de 1.
    const thrashPenalty = Math.min(Math.pow(2, unstableAttemptsRef.current), 16);
    const base = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), MAX_RECONNECT_DELAY_MS);
    const jitter = base * (0.7 + Math.random() * 0.6); // ±30%
    const delay = Math.round(Math.min(jitter * thrashPenalty, MAX_RECONNECT_DELAY_MS));
    setWsState('connecting');

    const hint = unstableAttemptsRef.current > 2
      ? ' (conexión inestable: esperando más antes de reintentar)'
      : '';
    setError(`🔌 Conexión perdida. Reintentando en ${Math.round(delay / 1000)}s${hint}...`);

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
        connectedAtRef.current = Date.now();
        // Connection opened, waiting for auth message
      };

      ws.onmessage = (event) => {
        // Cualquier trama entrante (incluido `pong`) prueba que el socket sigue
        // vivo: reinicia el reloj de deteccion de zombi.
        keepAliveRef.current?.markActivity();
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
          authorizedRef.current = true;
          clearReconnectTimer();
          setWsState('authorized');
          setError(null);
          startGps();

          // Solo se declara la sesion estable si ha vivido lo suficiente; si se
          // cae en breve, `unstableAttemptsRef` sigue penando el siguiente backoff.
          if (Date.now() - connectedAtRef.current >= STABLE_SESSION_MS) {
            unstableAttemptsRef.current = 0;
          }

          // Envia el fix que el GPS ya leyo mientras el socket se abria: evita
          // esperar al siguiente muestreo y hace que el marcador aparezca al
          // instante, que es justo el comportamiento "abrir y transmits".
          const pending = pendingFixRef.current;
          if (pending && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(pending));
            pendingFixRef.current = null;
            // El paquete encolado es el first fix de esta sesión.
            firstFixHandledRef.current = true;
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
        // Session stability: a connection that dies shortly after opening never
        // really worked. Counting it is what makes the backoff grow and stops
        // the 5-10 s flicker.
        const livedMs = connectedAtRef.current > 0 ? Date.now() - connectedAtRef.current : 0;
        const wasUnstable = connectedAtRef.current > 0 && livedMs < STABLE_SESSION_MS;
        connectedAtRef.current = 0;
        if (wasUnstable) unstableAttemptsRef.current += 1;

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
    authorizedRef.current = false;

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

  /**
   * Socket ZOMBI: readyState OPEN pero sin entregar nada. Es el peor sintoma
   * posible en calle (la UI dice "Conectado" y no se transmite). Se descarta la
   * instancia muerta, se neutralizan sus handlers para que su `onclose` no
   * dispare un backoff en paralelo, y se rehace el handshake de inmediato.
   */
  const handleZombie = useCallback(() => {
    if (unmountedRef.current || unauthorizedRef.current) return;
    const ws = wsRef.current;
    if (!ws) return;
    // CONNECTING: cerrar aqui ABORTA el handshake en curso y provoke el
    // "closed before established" que delata la UI como desconexion. No se toca:
    // el `onclose` del propio intento se encarga del backoff normal.
    if (ws.readyState === WebSocket.CONNECTING) return;
    setWsState('disconnected');
    setError('📡 Conexión sin respuesta (socket inactivo). Reconectando…');
    // Handlers primero: si el cierre provocara onclose, este socket ya no
    // manda nada (nada de stopGps() ni de otro scheduleReconnect).
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    ws.onopen = null;
    wsRef.current = null;
    socketCreatingRef.current = false;
    try {
      ws.close(4000, 'zombie');
    } catch {
      // Si ni siquiera cierra, da igual: la referencia ya no lo usa nadie.
    }
    clearReconnectTimerRef.current();
    reconnectAttemptsRef.current = 0;
    connectRef.current();
  }, []);

  /**
   * Reanudacion al volver a primer plano (desbloqueo de pantalla, cambio de app,
   * vuelta de red). Es la senal que iOS/Android NO dan tras suspender el hilo:
   * el socket suele haber muerto sin emitir `close`, asi que se comprueba
   * readyState y se reconecta de inmediato sin esperar al backoff.
   */
  const resumeSession = useCallback((reason: ResumeReason) => {
    if (unmountedRef.current || unauthorizedRef.current) return;
    if (!isDocumentVisible()) return;

    // 1) GPS: iOS congela el watcher con la pantalla apagada. Si ya no hay
    //    watcher, se vuelve a pedir (el fix se reencola hasta autorizar).
    if (sendingRef.current && watchIdRef.current === null && 'geolocation' in navigator) {
      startGpsRef.current();
    }

    const ws = wsRef.current;
    if (!isSocketDead(ws)) {
      // Socket sano: solo se comprueba su liveness con un latido inmediato.
      if (isSocketOpen(ws) && ws) {
        try {
          ws.send(JSON.stringify({ type: 'ping' }));
          keepAliveRef.current?.markActivity();
        } catch {
          // Se vera en el siguiente latido: el socket esta muriendo.
        }
      }
      return;
    }

    // 2) Socket muerto o inexistente: backoff a cero y reconexion inmediata.
    clearReconnectTimerRef.current();
    reconnectAttemptsRef.current = 0;
    setError(`📱 Reanudando transmisión (${reason})…`);
    connectRef.current();
  }, []);

  // Sincroniza las refs de reanudacion con la logica del ultimo render.
  useEffect(() => {
    resumeRef.current = resumeSession;
    handleZombieRef.current = handleZombie;
  });

  // ---ANCLAS DE IDENTIDAD ESTABLE---
  // El efecto de conexion NO debe depender de funciones recreated en cada render
  // (ver clearReconnectTimer). Estas refs guardan SIEMPRE la ultima version de
  // la logica y tienen identidad estable, asi que el efecto puede declarar
  // unicamente [token] sin quedarse con closures obsoletos.
  const stopGpsRef = useRef(stopGps);
  const clearReconnectTimerRef = useRef(clearReconnectTimer);

  // Sincroniza las refs tras cada render (patron "latest ref"). Se hace en un
  // efecto SIN dependencias para no escribir refs durante el render, que React
  // omite en modo concurrente. connectRef la comparten el backoff
  // (scheduleReconnect) y el efecto de conexion.
  useEffect(() => {
    startGpsRef.current = startGps;
    stopGpsRef.current = stopGps;
    clearReconnectTimerRef.current = clearReconnectTimer;
    connectRef.current = connect;
  });

  // Ciclo de vida: el socket se abre UNA vez por token.
  //
  // Dependencias: SOLO [token]. Cualquier otro valor (estado de conexion, de
  // GPS, velocidad suavizada, label) provocaria que React ejecutara el cleanup
  // y cerrara el socket sano para volver a abrirlo -> cascada de "101
  // Switching Protocols" y parpadeo del marcador.
  useEffect(() => {
    unmountedRef.current = false;
    // Rastreo GPS inmediato: no espera al WebSocket. El navegador empieza a
    // pedir la ubicacion en el segundo 0 y el primer fix queda encolado
    // (pendingFixRef) para enviarlo en cuanto el relay autorice. Asi el
    // marcador aparece de inmediato en vez de "Conectado" sin posicion.
    if (token && 'geolocation' in navigator) {
      startGpsRef.current();
    }
    connectRef.current();

    return () => {
      unmountedRef.current = true;
      clearReconnectTimerRef.current();
      stopGpsRef.current();
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
    // Dependencias MINIMAS a proposito: solo `token`. Si un setState (por
    // ejemplo al recibir `gps_authorized`) cambiara esta lista, el cleanup
    // cerraria el socket recien abierto y abriria otro en cascada.
  }, [token]);

  // --- Latido Keep-Alive (15 s) + deteccion de socket zombi -------------------
  // Un TCP inactivo lo cortan los operadores moviles en cuanto pasan unos
  // segundos sin trafico. Ademas, un socket puede quedarse OPEN con la red
  // caida: el navegador no emite `close` y la app parece conectada sin enviar
  // nada. Este efecto cubre las dos cosas y se detiene al desmontar.
  useEffect(() => {
    const controller = attachSocketKeepAlive({
      getSocket: () => wsRef.current,
      onZombie: () => handleZombieRef.current(),
    });
    keepAliveRef.current = controller;
    return () => {
      controller.stop();
      keepAliveRef.current = null;
    };
  }, [token]);

  // --- Reanudacion al volver a primer plano (movil) ---------------------------
  // Al desbloquear el telefono, o volver de otra app, el hilo de JavaScript se
  // suspende y el WebSocket muere SIN emitir `close` en muchos casos. Estos
  // eventos son la unica senal fiable: al recibirlos se reconecta al instante y
  // se revive el watcher de geolocalizacion, en vez de esperar al backoff.
  useEffect(() => {
    return attachResumeListeners((reason) => {
      resumeRef.current(reason);
    });
  }, []);

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
            {gpsState === 'active'
              ? usingNetworkFallback
                ? '🌐 GPS: Señal por red/WiFi (fallback)'
                : '🛰️ GPS: Activo'
              : '🛰️ GPS: Inactivo'}
          </div>

          {gpsDiagnostic && (
            <div
              role={gpsDiagnostic.code === 0 ? 'status' : 'alert'}
              aria-live={gpsDiagnostic.code === 0 ? 'polite' : 'assertive'}
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 12,
                background: gpsDiagnostic.code === 0 ? '#173b2a' : '#3b1a1a',
                border: `1px solid ${gpsDiagnostic.code === 0 ? '#2f855a' : '#dc2626'}`,
                color: gpsDiagnostic.code === 0 ? '#86efac' : '#fca5a5',
                fontSize: '0.8rem',
                lineHeight: 1.35,
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              {gpsDiagnostic.code === 0
                ? gpsDiagnostic.message
                : `⚠️ GPS código ${gpsDiagnostic.code}: ${gpsDiagnostic.message}`}
            </div>
          )}

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
