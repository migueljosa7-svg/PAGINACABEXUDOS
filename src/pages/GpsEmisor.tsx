import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../styles/recorridos.css';
import {
  haversineMeters,
  EMITTER_MIN_SEND_DISTANCE_M,
  EMITTER_HEARTBEAT_MS,
  EMITTER_MAX_ACCURACY_M,
  SPEED_SMOOTH_WINDOW,
} from '../services/position/telemetryUtils';
import { smoothSpeed } from '../services/position/metricsUtils';
import { getGpsRelayHttpBase } from '../config/gpsRelay';
import { attachResumeListeners, isDocumentVisible } from '../services/mobileResilience';

/**
 * Emisor GPS (móvil de la comparsa).
 *
 * Arquitectura Vercel: no hay WebSocket. Cada posición válida se envía con
 * POST /api/gps/push y los visores la leen con GET /api/location/latest.
 * Es más robusto en móvil: un microcorte solo pierde un paquete, no la sesión.
 */

type AuthState = 'checking' | 'authorized' | 'unauthorized' | 'offline';

const TOKEN_FORMAT_RE = /^[a-zA-Z0-9_-]{3,128}$/;
const TOKEN_STORAGE_KEY = 'pcx_gps_token';
const AUTO_STOP_OPTIONS_MINUTES = [120, 135, 150] as const;
const FIRST_FIX_MAX_ACCURACY_M = 100;
const FAST_FIX_TIMEOUT_MS = 5000;
const WATCH_FIRST_FIX_TIMEOUT_MS = 6000;
const PUSH_TIMEOUT_MS = 8000;
const AUTH_RETRY_MS = 4000;

type GpsDiagnostic = { code: number; message: string };

const describeGeolocationError = (error: GeolocationPositionError): GpsDiagnostic => {
  switch (error.code) {
    case 1:
      return { code: 1, message: 'Permiso de ubicación denegado. Actívalo para este sitio en los ajustes del navegador y vuelve a intentarlo.' };
    case 2:
      return { code: 2, message: 'Posición no disponible. Buscando señal GPS del dispositivo.' };
    case 3:
      return { code: 3, message: 'Se agotó el tiempo de búsqueda GPS.' };
    default:
      return { code: error.code || 0, message: error.message || 'Error desconocido de geolocalización.' };
  }
};

/** Prioridad: ?token= de la URL (se guarda) > token guardado en el dispositivo. */
function resolveEmitterToken(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('token')) {
      const fromUrl = (params.get('token') || '').trim();
      if (!TOKEN_FORMAT_RE.test(fromUrl)) return '';
      try { localStorage.setItem(TOKEN_STORAGE_KEY, fromUrl); } catch { /* modo privado */ }
      return fromUrl;
    }
    const stored = (localStorage.getItem(TOKEN_STORAGE_KEY) || '').trim();
    return TOKEN_FORMAT_RE.test(stored) ? stored : '';
  } catch {
    return '';
  }
}

async function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(`${getGpsRelayHttpBase()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    keepalive: true,
    signal: AbortSignal.timeout(PUSH_TIMEOUT_MS),
  });
}

export const GpsEmisor: React.FC = () => {
  const token = useMemo(() => resolveEmitterToken(), []);

  const [authState, setAuthState] = useState<AuthState>(token ? 'checking' : 'unauthorized');
  const [deviceName, setDeviceName] = useState('');
  const [emitting, setEmitting] = useState(false);
  const [hasGpsFix, setHasGpsFix] = useState(false);
  const [usingNetworkFallback, setUsingNetworkFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gpsDiagnostic, setGpsDiagnostic] = useState<GpsDiagnostic | null>(null);
  const [autoStopMinutes, setAutoStopMinutes] = useState<number>(135);
  const [sessionEndsAt, setSessionEndsAt] = useState<number | null>(null);
  const [countdownNow, setCountdownNow] = useState(Date.now());
  const [smoothedKmh, setSmoothedKmh] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const [wakeLockOn, setWakeLockOn] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstFixWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendingRef = useRef(false);
  const unmountedRef = useRef(false);
  const authorizedRef = useRef(false);
  const lastSentRef = useRef<{ lat: number; lng: number; t: number } | null>(null);
  const firstFixDoneRef = useRef(false);
  const speedSamplesRef = useRef<number[]>([]);
  const pushInFlightRef = useRef(false);
  const failedPushesRef = useRef(0);
  const sessionEndsAtRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const startGpsRef = useRef<(highAccuracy?: boolean) => boolean>(() => false);

  // ---- Pantalla encendida (Wake Lock) ---------------------------------------
  // Si el móvil bloquea la pantalla el navegador congela el GPS: es la causa nº1
  // de "se ha parado la emisión". Se pide al emitir y se renueva al volver.
  const acquireWakeLock = useCallback(async () => {
    try {
      if (!('wakeLock' in navigator) || wakeLockRef.current) return;
      const lock = await navigator.wakeLock.request('screen');
      wakeLockRef.current = lock;
      setWakeLockOn(true);
      lock.addEventListener('release', () => {
        wakeLockRef.current = null;
        setWakeLockOn(false);
      });
    } catch {
      // Sin soporte o denegado: la emisión sigue, solo hay que dejar la pantalla encendida.
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    const lock = wakeLockRef.current;
    wakeLockRef.current = null;
    setWakeLockOn(false);
    if (lock) void lock.release().catch(() => undefined);
  }, []);

  // ---- Autorización del token -------------------------------------------------
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const check = async () => {
      try {
        const res = await postJson('/api/gps/auth', { token });
        if (cancelled) return;
        if (res.status === 401) {
          authorizedRef.current = false;
          setAuthState('unauthorized');
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { name?: string };
        authorizedRef.current = true;
        setDeviceName(data.name || '');
        setAuthState('authorized');
        setError(null);
      } catch {
        if (cancelled) return;
        setAuthState('offline');
        retry = setTimeout(check, AUTH_RETRY_MS);
      }
    };
    void check();
    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
    };
  }, [token]);

  // ---- Envío de posiciones ----------------------------------------------------
  const pushPosition = useCallback(async (payload: Record<string, unknown>) => {
    if (pushInFlightRef.current) return; // nunca dos POST a la vez: el siguiente fix lo sustituye
    pushInFlightRef.current = true;
    try {
      const res = await postJson('/api/gps/push', { token, ...payload });
      if (unmountedRef.current) return;
      if (res.status === 401) {
        authorizedRef.current = false;
        setAuthState('unauthorized');
        setError('Dispositivo no autorizado: el token no está en la lista de dispositivos autorizados.');
        return;
      }
      if (res.status === 422) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        failedPushesRef.current = 0;
        setError(
          data.error === 'outside_geofence'
            ? 'La ubicación está fuera de Zaragoza: el servidor no la publica.'
            : data.error === 'low_accuracy'
              ? 'Señal GPS demasiado imprecisa: esperando una lectura mejor.'
              : 'El servidor ha descartado esta posición.',
        );
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      failedPushesRef.current = 0;
      setError(null);
      setSentCount((n) => n + 1);
      setLastSentAt(Date.now());
    } catch {
      failedPushesRef.current += 1;
      if (failedPushesRef.current >= 2) setError('Sin conexión con el servidor. Se reintentará con la siguiente posición.');
    } finally {
      pushInFlightRef.current = false;
    }
  }, [token]);

  // ---- Geolocalización ----------------------------------------------------------
  const clearTimers = useCallback(() => {
    if (firstFixWatchdogRef.current !== null) { clearTimeout(firstFixWatchdogRef.current); firstFixWatchdogRef.current = null; }
    if (fallbackTimerRef.current !== null) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; }
  }, []);

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      try { navigator.geolocation.clearWatch(watchIdRef.current); } catch { /* ignore */ }
      watchIdRef.current = null;
    }
  }, []);

  const stopEmission = useCallback((message?: string) => {
    clearWatch();
    clearTimers();
    if (autoStopTimerRef.current !== null) { clearTimeout(autoStopTimerRef.current); autoStopTimerRef.current = null; }
    sendingRef.current = false;
    sessionEndsAtRef.current = null;
    lastSentRef.current = null;
    firstFixDoneRef.current = false;
    speedSamplesRef.current = [];
    releaseWakeLock();
    setEmitting(false);
    setHasGpsFix(false);
    setUsingNetworkFallback(false);
    setSessionEndsAt(null);
    setSmoothedKmh(0);
    setGpsDiagnostic(null);
    setError(message ?? null);
  }, [clearTimers, clearWatch, releaseWakeLock]);

  const handleGeoSuccess = useCallback((position: GeolocationPosition) => {
    if (!sendingRef.current) return;
    if (firstFixWatchdogRef.current !== null) { clearTimeout(firstFixWatchdogRef.current); firstFixWatchdogRef.current = null; }
    setGpsDiagnostic(null);
    setError((current) => (current?.startsWith('⚠️ GPS') ? null : current));

    const { latitude, longitude, accuracy, speed, heading, altitude } = position.coords;
    const isFirstFix = !firstFixDoneRef.current;
    const acc = Number.isFinite(accuracy) ? accuracy : 0;
    if (acc > (isFirstFix ? FIRST_FIX_MAX_ACCURACY_M : EMITTER_MAX_ACCURACY_M)) return;
    setHasGpsFix(true);
    setAccuracyM(Math.round(acc));

    // Ahorro de batería/red: parado (<3 m) solo se envía un latido cada 10 s.
    const last = lastSentRef.current;
    const now = Date.now();
    if (!isFirstFix && last) {
      const moved = haversineMeters(last.lat, last.lng, latitude, longitude);
      if (moved < EMITTER_MIN_SEND_DISTANCE_M && now - last.t < EMITTER_HEARTBEAT_MS) return;
    }
    firstFixDoneRef.current = true;

    // Velocidad suavizada (media móvil) para mostrar ritmo de caminata, no picos.
    const moved = last ? haversineMeters(last.lat, last.lng, latitude, longitude) : 0;
    const dt = last ? (now - last.t) / 1000 : 0;
    const chipKmh = typeof speed === 'number' && Number.isFinite(speed) && speed >= 0 ? speed * 3.6 : null;
    const sample = chipKmh !== null && chipKmh <= 30 ? chipKmh : dt > 0 ? (moved / dt) * 3.6 : 0;
    const samples = speedSamplesRef.current;
    samples.push(Math.max(0, sample));
    if (samples.length > SPEED_SMOOTH_WINDOW) samples.shift();
    setSmoothedKmh(smoothSpeed(samples, SPEED_SMOOTH_WINDOW));

    lastSentRef.current = { lat: latitude, lng: longitude, t: now };
    void pushPosition({
      lat: latitude,
      lng: longitude,
      accuracy: acc,
      speed: speed ?? 0,
      heading: heading ?? 0,
      altitude: altitude ?? 0,
    });
  }, [pushPosition]);

  const handleGeoError = useCallback((geoError: GeolocationPositionError) => {
    const diagnostic = describeGeolocationError(geoError);
    setGpsDiagnostic(diagnostic);
    if (diagnostic.code === 1) {
      stopEmission(`⚠️ GPS 1: ${diagnostic.message}`);
      return;
    }
    // Un timeout de alta precisión no significa "sin ubicación": en interiores se
    // resuelve por red/WiFi. Se reintenta UNA vez con precisión estándar.
    if (!fallbackTimerRef.current && watchIdRef.current !== null && !firstFixDoneRef.current) {
      clearWatch();
      clearTimers();
      setGpsDiagnostic({ code: diagnostic.code, message: 'Sin señal GPS de alta precisión; reintentando por red/WiFi…' });
      fallbackTimerRef.current = setTimeout(() => {
        fallbackTimerRef.current = null;
        if (!unmountedRef.current && sendingRef.current) startGpsRef.current(false);
      }, 250);
    }
  }, [clearTimers, clearWatch, stopEmission]);

  const startGps = useCallback((highAccuracy = true): boolean => {
    if (watchIdRef.current !== null) return true;
    if (!navigator.geolocation) {
      setError('❌ Este dispositivo no soporta geolocalización.');
      return false;
    }
    if (!window.isSecureContext) {
      setError('❌ Se necesita HTTPS para pedir la ubicación.');
      return false;
    }
    sendingRef.current = true;
    setUsingNetworkFallback(!highAccuracy);
    setGpsDiagnostic({
      code: 0,
      message: highAccuracy ? 'Buscando señal GPS de alta precisión…' : 'Buscando ubicación por red/WiFi…',
    });

    if (highAccuracy) {
      // Arranque híbrido: lectura rápida + watcher continuo escriben en el mismo
      // manejador; el primero en llegar gana.
      try {
        navigator.geolocation.getCurrentPosition(handleGeoSuccess, handleGeoError, {
          enableHighAccuracy: true, timeout: FAST_FIX_TIMEOUT_MS, maximumAge: 0,
        });
      } catch { /* el watcher sigue */ }
      // En interiores el chip GPS puede quedarse mudo: se degrada a red/WiFi.
      firstFixWatchdogRef.current = setTimeout(() => {
        firstFixWatchdogRef.current = null;
        if (unmountedRef.current || !sendingRef.current || firstFixDoneRef.current) return;
        setGpsDiagnostic({ code: 3, message: 'El GPS de alta precisión no responde; activando ubicación por red/WiFi…' });
        clearWatch();
        startGpsRef.current(false);
      }, WATCH_FIRST_FIX_TIMEOUT_MS);
    }

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(handleGeoSuccess, handleGeoError, {
        enableHighAccuracy: highAccuracy, timeout: 10000, maximumAge: 0,
      });
      return true;
    } catch (e) {
      sendingRef.current = false;
      setError(`No se pudo iniciar la ubicación: ${e instanceof Error ? e.message : 'error del navegador'}`);
      return false;
    }
  }, [clearWatch, handleGeoError, handleGeoSuccess]);

  useEffect(() => { startGpsRef.current = startGps; });

  const startEmission = useCallback(() => {
    if (authState !== 'authorized' || emitting) return;
    setError(null);
    if (!startGps()) return;
    const endsAt = Date.now() + autoStopMinutes * 60 * 1000;
    sessionEndsAtRef.current = endsAt;
    setSessionEndsAt(endsAt);
    setCountdownNow(Date.now());
    setEmitting(true);
    setSentCount(0);
    void acquireWakeLock();
    autoStopTimerRef.current = setTimeout(
      () => stopEmission('La emisión se ha detenido automáticamente por seguridad.'),
      endsAt - Date.now(),
    );
  }, [acquireWakeLock, authState, autoStopMinutes, emitting, startGps, stopEmission]);

  // ---- Reanudación al volver a primer plano --------------------------------------
  useEffect(() => {
    return attachResumeListeners(() => {
      if (unmountedRef.current || !isDocumentVisible() || !sendingRef.current) return;
      const endsAt = sessionEndsAtRef.current;
      if (endsAt !== null && Date.now() >= endsAt) {
        stopEmission('La emisión se ha detenido automáticamente por seguridad.');
        return;
      }
      // iOS/Android congelan el watcher con la pantalla apagada: se revive.
      if (watchIdRef.current === null) startGpsRef.current();
      void acquireWakeLock();
    });
  }, [acquireWakeLock, stopEmission]);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      clearWatch();
      clearTimers();
      if (autoStopTimerRef.current !== null) clearTimeout(autoStopTimerRef.current);
      releaseWakeLock();
    };
  }, [clearTimers, clearWatch, releaseWakeLock]);

  useEffect(() => {
    if (sessionEndsAt === null) return;
    const timer = window.setInterval(() => setCountdownNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [sessionEndsAt]);

  // ---- Presentación ---------------------------------------------------------------
  const remainingSeconds = sessionEndsAt === null ? 0 : Math.max(0, Math.ceil((sessionEndsAt - countdownNow) / 1000));
  const remainingLabel = `${Math.floor(remainingSeconds / 3600)} h ${Math.floor((remainingSeconds % 3600) / 60)} min`;
  const lastSentAgo = lastSentAt === null ? null : Math.max(0, Math.round((countdownNow - lastSentAt) / 1000));

  const statusLabel =
    authState === 'unauthorized' ? 'Token no autorizado'
    : authState === 'checking' ? 'Validando dispositivo…'
    : authState === 'offline' ? 'Sin conexión'
    : emitting ? (hasGpsFix ? 'Emitiendo ubicación' : 'Buscando ubicación GPS')
    : 'Dispositivo autorizado';
  const statusTone =
    authState === 'unauthorized' ? 'is-error'
    : authState === 'authorized' && emitting && hasGpsFix ? 'is-ok'
    : 'is-warn';

  const connectionText =
    !token ? 'Falta un token válido en el enlace. Solicítalo a coordinación.'
    : authState === 'authorized' ? `Credencial validada${deviceName ? ` · ${deviceName}` : ''}. Ya puedes iniciar la emisión.`
    : authState === 'unauthorized' ? 'El enlace no está autorizado. Contacta con coordinación para validar el acceso.'
    : authState === 'offline' ? 'No se puede contactar con el servidor. Reintentando automáticamente…'
    : 'Validando el enlace seguro con el servicio GPS…';

  return (
    <main className="gps-emisor-page min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-xl">
        <header className="mb-6 text-center">
          <p className="gps-emisor-eyebrow">Fiestas de Zaragoza</p>
          <h1 className="gps-emisor-title">Emisión de ubicación</h1>
          <p className="gps-emisor-lead">
            Comparte la posición de la comparsa con el mapa público. La ubicación solo se solicita cuando pulses «Iniciar emisión».
          </p>
        </header>

        <section className="gps-emisor-card" aria-labelledby="gps-status-title">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 id="gps-status-title" className="gps-emisor-h2">Estado del dispositivo</h2>
            <span className={`gps-emisor-pill ${statusTone}`} role="status" aria-live="polite">{statusLabel}</span>
          </div>

          <div className="gps-emisor-box mb-5">
            <p className="gps-emisor-box-title">Conexión con el servicio</p>
            <p className="gps-emisor-box-text">{connectionText}</p>
          </div>

          {error && <p className="gps-emisor-alert is-error" role="alert">{error}</p>}
          {gpsDiagnostic && (
            <p
              className={`gps-emisor-alert ${gpsDiagnostic.code === 0 ? 'is-ok' : 'is-warn'}`}
              role={gpsDiagnostic.code === 0 ? 'status' : 'alert'}
              aria-live="polite"
            >
              {gpsDiagnostic.message}
            </p>
          )}

          <label htmlFor="gps-auto-stop" className="gps-emisor-label">Cierre automático de seguridad</label>
          <select
            id="gps-auto-stop"
            value={autoStopMinutes}
            onChange={(event) => setAutoStopMinutes(Number(event.target.value))}
            disabled={emitting}
            className="gps-emisor-select"
          >
            {AUTO_STOP_OPTIONS_MINUTES.map((minutes) => (
              <option key={minutes} value={minutes}>
                {`${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ''}`.trim()}
              </option>
            ))}
          </select>
          <p className="gps-emisor-hint">La emisión se detendrá automáticamente tras el tiempo elegido. También puedes detenerla antes en cualquier momento.</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={startEmission} disabled={authState !== 'authorized' || emitting} className="gps-emisor-btn is-primary">
              Iniciar emisión
            </button>
            <button type="button" onClick={() => stopEmission()} disabled={!emitting} className="gps-emisor-btn is-secondary">
              Detener emisión
            </button>
          </div>

          {emitting && (
            <dl className="gps-emisor-stats" aria-live="polite">
              <div><dt>Cierre en</dt><dd className="tabular-nums">{remainingLabel}</dd></div>
              <div><dt>Velocidad</dt><dd>{smoothedKmh.toFixed(1).replace('.', ',')} km/h</dd></div>
              <div><dt>Precisión</dt><dd>{accuracyM === null ? '—' : `±${accuracyM} m`}</dd></div>
              <div><dt>Último envío</dt><dd>{lastSentAgo === null ? '—' : `hace ${lastSentAgo} s`}</dd></div>
            </dl>
          )}
          {emitting && (
            <p className="gps-emisor-meta">
              {usingNetworkFallback ? 'Ubicación asistida por red' : 'GPS de alta precisión'} · {sentCount} posiciones enviadas
              {wakeLockOn ? ' · pantalla activa' : ' · mantén la pantalla encendida'}
            </p>
          )}
        </section>

        <p className="gps-emisor-foot">
          Mantén esta página abierta durante el recorrido. El navegador solicitará permiso de ubicación y puedes revocarlo desde los ajustes del dispositivo.
        </p>
      </div>
    </main>
  );
};

export default GpsEmisor;
