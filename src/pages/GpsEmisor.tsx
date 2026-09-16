import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../styles/recorridos.css';
// v3.1: fórmula y umbrales desde telemetryUtils (única fuente de verdad matemática)
import {
  haversineMeters,
  EMITTER_MIN_SEND_DISTANCE_M,
  EMITTER_HEARTBEAT_MS,
} from '../services/position/telemetryUtils';

type ServerMessage =
  | { type: 'room_info'; tokenRoomId?: string; sendersCount?: number; receiversCount?: number; senders?: any[] }
  | { type: 'gps_authorized'; authorized: boolean; token: string; label?: string }
  | { type: 'gps_unauthorized' }
  | { type: 'gps'; senderId: string; label?: string; lat: number; lng: number }
  | { type: 'server_shutdown' }
  | { type: string; [k: string]: any };

const getWsRelayUrl = () => {
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

export const GpsEmisor: React.FC = () => {
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const token = (urlParams.get('token') || '').trim();

  const [wsState, setWsState] = useState<'disconnected' | 'connecting' | 'authorized' | 'unauthorized'>('disconnected');
  const [gpsState, setGpsState] = useState<'inactive' | 'active'>('inactive');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const sendingRef = useRef(false);
  // Última posición enviada (para el filtro Haversine de ahorro de batería).
  const lastSentRef = useRef<{ lat: number; lng: number; t: number } | null>(null);
  // --- Reconexión automática aditiva (no altera el contrato GPS) ---
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const unmountedRef = useRef(false);
  // Marca que el servidor rechazó el token: no tiene sentido reconectar.
  const unauthorizedRef = useRef(false);
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
    // Reinicia el filtro Haversine: la primera posición de la sesión siempre envía.
    lastSentRef.current = null;

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 2000,
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (!sendingRef.current) return;
        const { latitude, longitude, accuracy, speed, heading, altitude } = position.coords;

        // Filtro Haversine (ahorro de batería/red): si la comparsa está parada
        // (<2m de desplazamiento) NO se envía nada… salvo heartbeat cada 10s
        // para que los visores no la den por perdida (timeout de 15s).
        const last = lastSentRef.current;
        const now = Date.now();
        if (last) {
          const moved = haversineMeters(last.lat, last.lng, latitude, longitude);
          const elapsed = now - last.t;
          if (moved < EMITTER_MIN_SEND_DISTANCE_M && elapsed < EMITTER_HEARTBEAT_MS) return;
        }
        lastSentRef.current = { lat: latitude, lng: longitude, t: now };

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
        }
      },
      (e) => {
        setError(`⚠️ Error GPS (${e && (e as any).code}): ${(e && e.message) || ''}`.trim());
      },
      geoOptions
    );
  }, []);

  // Reconexión con backoff exponencial (1s, 2s, 4s... hasta 30s).
  // No reconecta si el token fue rechazado (4001) ni si el componente se desmontó.
  const scheduleReconnect = useCallback(() => {
    if (unmountedRef.current || unauthorizedRef.current) return;
    if (reconnectTimerRef.current) return;
    reconnectAttemptsRef.current += 1;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), MAX_RECONNECT_DELAY_MS);
    setWsState('connecting');
    setError(`🔌 Conexión perdida. Reintentando en ${Math.round(delay / 1000)}s...`);
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connectRef.current();
    }, delay);
  }, []);

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

    try {
      const ws = new WebSocket(wsUrl.toString());
      wsRef.current = ws;

      ws.onopen = () => {
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

        // Microcorte de la red móvil del porteador: backoff exponencial.
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
  }, [token, serverWsBase, scheduleReconnect, startGps, stopGps]);

  // Referencia estable para que scheduleReconnect pueda relanzar la conexión
  // sin crear dependencias circulares.
  connectRef.current = connect;

  // Ciclo de vida: conecta al montar y limpia TODO al desmontar
  // (no hay listeners ni timers huérfanos -> sin fugas de memoria).
  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      clearReconnectTimer();
      stopGps();

      const ws = wsRef.current;
      wsRef.current = null;
      if (ws) {
        // Neutraliza los handlers y cierra limpio (1000) para no disparar reconexión.
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        try {
          ws.close(1000, 'unmount');
        } catch {
          // ignore
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
            Token: <span style={{ color: '#e0e0e0', fontWeight: 800 }}>{token || '--'}</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#475569' }}>PAGINACABEXUDOS - GPS Relay</div>
      </div>
    </div>
  );
};

export default GpsEmisor;