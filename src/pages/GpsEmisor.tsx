import React, { useEffect, useMemo, useRef, useState } from 'react';
import '../styles/recorridos.css';

type ServerMessage =
  | { type: 'room_info'; tokenRoomId?: string; sendersCount?: number; receiversCount?: number; senders?: any[] }
  | { type: 'gps_authorized'; authorized: boolean; token: string; label?: string }
  | { type: 'gps_unauthorized' }
  | { type: 'gps'; senderId: string; label?: string; lat: number; lng: number }
  | { type: 'server_shutdown' }
  | { type: string; [k: string]: any };

const getWsRelayUrl = () => {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Always use same host/port as current page.
  // In your setup both frontend + relay are expected to be reachable via the same Render web service.
  return `${proto}//${window.location.host}`;
};

export const GpsEmisor: React.FC = () => {
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const token = (urlParams.get('token') || '').trim();

  const [wsState, setWsState] = useState<'disconnected' | 'connecting' | 'authorized' | 'unauthorized'>('disconnected');
  const [gpsState, setGpsState] = useState<'inactive' | 'active'>('inactive');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const sendingRef = useRef(false);

  const serverWsBase = useMemo(() => getWsRelayUrl(), []);

  const stopGps = () => {
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
  };

  const startGps = () => {
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

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 2000,
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (!sendingRef.current) return;
        const { latitude, longitude, accuracy, speed, heading, altitude } = position.coords;

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
  };

  useEffect(() => {
    if (!token || token.length < 3) {
      setWsState('unauthorized');
      setError('Dispositivo no autorizado: token vacío o muy corto');
      return;
    }

    const wsUrl = new URL(serverWsBase);
    wsUrl.searchParams.set('role', 'sender');
    wsUrl.searchParams.set('token', token);

    setWsState('connecting');
    setError(null);

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
            setWsState('unauthorized');
            setError('Dispositivo no autorizado: el token no está en la lista de dispositivos autorizados');
            try {
              ws.close();
            } catch {
              // ignore
            }
            return;
          }

          setWsState('authorized');
          setError(null);
          startGps();
          return;
        }

        if (msg.type === 'gps_unauthorized') {
          stopGps();
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
        if (wsState !== 'unauthorized') {
          setWsState('disconnected');
          if (event.code === 1006) {
            setError(`Conexión cerrada (código: 1006, sin razón). URL: ${wsUrl.toString()}`);
          } else if (event.code !== 1000 && event.code !== 1005) {
            setError(`Conexión cerrada (código: ${event.code}, razón: ${event.reason || 'sin razón'}). URL: ${wsUrl.toString()}`);
          }
        }
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
setError(`⚠️ Error de WebSocket (${readyStateText}). URL: ${wsUrl.toString()}`);
      };
    } catch (err) {
      setWsState('disconnected');
      setError(`❌ Error al conectar: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    }

    return () => {
      stopGps();
      try {
        wsRef.current?.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, serverWsBase]);

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