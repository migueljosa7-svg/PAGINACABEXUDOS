/**
 * GPS Live Tracking Page
 * 
 * Real-time GPS tracking page that connects as a WebSocket receiver to the
 * GPS Relay Server and displays all connected senders' positions on an
 * interactive Leaflet map.
 * 
 * Features:
 *   - Real-time WebSocket connection to the GPS Relay Server
 *   - Multiple sender support (each Comparsa participant appears as a marker)
 *   - Smooth marker animation using requestAnimationFrame (lerp interpolation)
 *   - Follow-mode camera tracking with panTo/flyTo
 *   - Sender status panel showing all participants
 *   - Auto-reconnection with exponential backoff
 *   - Ready for production with public server IP
 *   - Custom icons per comparsa with automatic rotation
 */

import React, { Suspense, lazy, useEffect, useRef, useState, useCallback, useMemo } from 'react';
// Code-splitting: la pagina NO importa Leaflet en tiempo de ejecucion, solo sus
// tipos. El motor de mapas (~150 kB) viaja en un chunk aparte que se descarga
// con React.lazy DESPUES de que la pagina haya pintado su panel de estado, el
// mapa de situacion y la telemetria. En 4G/5G son segundos de pantalla en
// blanco que ya no se pierden.
import type * as L from 'leaflet';
import { resolveRoom } from '../config/liveRooms';
import { GPS_TIMEOUT_MS, getSenderColor, fmtEsInt, fmtEsDecimal } from '../components/maps/shared';
import type { SenderPosition } from '../components/maps/shared';
import type { MapLayerKey } from '../components/maps/mapLayers';
// v3.1: telemetria unificada (misma matematica que Recorridos: GPS/simulacion/relay)
import { DistanceAccumulator, readTelemetry } from '../services/position/telemetryUtils';
import type { TelemetryReading } from '../services/position/telemetryUtils';
import {
  FaLocationArrow,
  FaRoute,
  FaUsers,
  FaSignal,
  FaMapMarkedAlt,
} from 'react-icons/fa';
import { useGpsLiveStatusContext } from '../hooks/useGpsLiveStatus';
import {
  GPS_STATUS_LABEL,
  signalAgeSeconds,
} from '../services/gpsStatus';
import {
  POI_CATEGORIES,
  POI_CATEGORY_COLOR,
  POI_CATEGORY_LABEL,
  STATIC_POIS,
} from '../data/pois';
import type { PoiCategory } from '../data/pois';
import {
  ETA_HISTORY_MAX,
  computeEta,
  formatEta,
} from '../data/waypoints';
import type { EtaSample, EtaState } from '../data/waypoints';

/**
 * Subarbol del mapa, cargado bajo demanda (incluye leaflet + react-leaflet).
 * `shared.ts` es lo unico que comparte la pagina con el (tipos, colores y
 * formateadores), y a proposito no importa Leaflet.
 */
const GpsLiveMap = lazy(() => import('../components/maps/GpsLiveMap'));

// =============================================================================
// Types
// =============================================================================

// `SenderPosition` vive en components/maps/shared.ts (lo consumen la pagina y su
// subarbol de mapa lazy). Aqui solo los tipos que son exclusivos del visor.

interface SenderInfo {
  senderId: string;
  label: string;
  connectedAt: number;
  lastSeen: number;
}

// Trama entrante del relay. WS (receiver legacy) y SSE (visor masivo) emiten
// los mismos tipos de mensaje, pero el contrato JSON es abierto: los campos van
// tipados como opcionales y cada rama valida lo que necesita antes de usarlo.
interface RelayFrame {
  type: string;
  senderId?: string;
  label?: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp?: number;
  sendersCount?: number;
  receiversCount?: number;
  sseViewers?: number;
  senders?: SenderInfo[];
  live?: RelayFrame[];
}

// =============================================================================
// Configuration
// =============================================================================

// Get WebSocket URL - use same origin when served by the relay server
const getWsRelayUrl = () => {
  const fromEnv = import.meta.env.VITE_WS_RELAY_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = window.location.port ? `:${window.location.port}` : '';
  return `${proto}//${host}${port}`;
};
// `GPS_TIMEOUT_MS` se importa de components/maps/shared.ts.
// Transporte fijo del visor: el contrato de esta vista es SSE (stream 1:N).
// Se evita que una variable de entorno antigua vuelva a cambiarlo a WebSocket.
const VIEWER_TRANSPORT: 'sse' = 'sse';

// URL del stream SSE derivada de la base del relay (ws(s)://host -> http(s)://host)
// y del token de la sala que se quiere escuchar.
const getSseStreamUrl = (wsBase: string, token: string) => {
  const httpBase = wsBase.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:').replace(/\/+$/, '');
  return `${httpBase}/api/stream/location?token=${encodeURIComponent(token)}`;
};
// =============================================================================
// Main Component
// =============================================================================

export const GpsLive: React.FC = () => {
  // ---- WebSocket State ----
  const wsRef = useRef<WebSocket | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const [wsConnected, setWsConnected] = useState(false);
  // Sala a escuchar. Se resuelve UNA vez del token de la URL (?token=...) y
  // permite que varias comparsas salgan en paralelo: cada enlace apunta a su
  // propio token. Sin token, cae en la sala demo institucional.
  const [room] = useState(() => resolveRoom(new URLSearchParams(window.location.search).get('token')));
  const [token] = useState(room.token);
  const [sendersCount, setSendersCount] = useState(0);
  const [receiversCount, setReceiversCount] = useState(0);

  // ---- Senders State ----
  const [senders, setSenders] = useState<Map<string, SenderInfo>>(new Map());
  const [positions, setPositions] = useState<Map<string, SenderPosition>>(new Map());
  const sendersRef = useRef<Map<string, SenderInfo>>(new Map());
  const positionsRef = useRef<Map<string, SenderPosition>>(new Map());

  // ---- TelemetrÃ­a en vivo (v3.1): distancia acumulada + velocidades suavizadas
  // Los acumuladores viven en refs (no re-renderizan por mensaje); la UI lee de
  // un snapshot que se refresca a 1 Hz (ver efecto mÃ¡s abajo).
  const telemetryRef = useRef<Map<string, DistanceAccumulator>>(new Map());
  const [telemetry, setTelemetry] = useState<Map<string, TelemetryReading>>(new Map());

  // ---- UI State ----
  const [followMode, setFollowMode] = useState(true);
  // Modo "vista limpia / solo mapa": oculta paneles secundarios y deja el mapa
  // a pantalla completa para uso en calle con una mano.
  const [cleanMap, setCleanMap] = useState(false);
  // POIs: visibilidad global + filtro por categoria (filtros independientes).
  const [poisVisible, setPoisVisible] = useState(true);
  const [poiFilters, setPoiFilters] = useState<Record<PoiCategory, boolean>>({
    agua: true,
    socorro: true,
    violeta: true,
    banos: true,
    pmr: true,
  });
  // Ref espejo de followMode: el handler del WS la lee sin re-crear connect()
  // (si followMode estuviera en las deps de connect, cada toggle reconectarÃ­a
  // el WebSocket y se perderÃ­a el estado de emisores).
  const followModeRef = useRef(true);
  useEffect(() => {
    followModeRef.current = followMode;
  }, [followMode]);
  // ---- Capa base del mapa ----
  // El usuario alterna entre calle (OpenStreetMap) y satelite (Esri). La
  // definicion vive en components/maps/mapLayers.ts, que NO importa Leaflet:
  // por eso esta pagina puede rotar la capa sin dejar de ser lazy.
  const [mapLayer, setMapLayer] = useState<MapLayerKey>('estandar');
  const handleLayerChange = useCallback((key: MapLayerKey) => {
    setMapLayer(key);
  }, []);

  const [serverUrl, setServerUrl] = useState(getWsRelayUrl());


  // ---- Map ----
  // Centro inicial: el de la sala (Plaza del Pilar para la demo). En cuanto
  // llega la primera posición real, la cámara reencuadra sobre el emisor con
  // un `flyTo`, que es lo que ve el público.
  const [mapCenter, setMapCenter] = useState<[number, number]>(room.center);
  const mapRef = useRef<L.Map | null>(null);
  // Peticion de reencuadre sobre la posicion real. La consume el mapa lazy.
  const [frameRequest, setFrameRequest] = useState<{ target: [number, number]; nonce: number } | null>(null);
  // Marca de que ya se pidio encuadrar en esta sesion (evita repetir el vuelo).
  const frameNonceRef = useRef(0);
  // Zoom actual del mapa: tamaño adaptativo de los iconos de comparsa.
  const [mapZoom, setMapZoom] = useState(17);

  // ---- Connection Info ----
  const [connectionInfo, setConnectionInfo] = useState<string>('Desconectado');

  // =========================================================================
  // WebSocket Connection
  // =========================================================================

  const connectRef = useRef(() => {});
  const unmountedRef = useRef(false);

  const wakeUpServer = useCallback(async () => {
    // Wake-up HTTP previo: despierta el contenedor de Render antes del handshake
    // WS. Sin esto el primer intento da timeout ("closed before established").
    try {
      const httpBase = serverUrl.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:');
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
  }, [serverUrl]);

  const scheduleReconnect = useCallback(() => {
    if (unmountedRef.current) return;
    if (reconnectTimerRef.current) return;
    reconnectAttempts.current += 1;
    // Backoff exponencial + jitter ±30%: evita el thundering-herd cuando
    // Render despierta y cientos de visores reintentan a la vez.
    const base = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
    const jitter = base * (0.7 + Math.random() * 0.6);
    const delay = Math.round(Math.min(jitter, 30000));
    setConnectionInfo(`Conexión perdida. Reintentando en ${Math.round(delay / 1000)}s...`);
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connectRef.current();
    }, delay);
  }, []);

  // Dispatcher unico de tramas del relay: la MISMA ruta procesa el WebSocket
  // (receiver legacy 1:1) y el stream SSE (visor masivo 1:N), de modo que el
  // estado de la UI nunca puede divergir entre transportes.
  const dispatchServerMessage = useCallback((data: RelayFrame) => {
    if (!data || typeof data.type !== 'string') return;
    if (data.type === 'room_info') {
      setSendersCount(
        typeof data.sendersCount === 'number' && Number.isFinite(data.sendersCount) ? data.sendersCount : 0
      );
      // El canal SSE reporta espectadores (sseViewers); el WS legacy, receiversCount.
      const viewerCount =
        typeof data.sseViewers === 'number' && Number.isFinite(data.sseViewers)
          ? data.sseViewers
          : typeof data.receiversCount === 'number' && Number.isFinite(data.receiversCount)
            ? data.receiversCount
            : 0;
      setReceiversCount(viewerCount);

      const newSenders = new Map(sendersRef.current);
      if (data.senders && Array.isArray(data.senders)) {
        data.senders.forEach((s: SenderInfo) => {
          newSenders.set(s.senderId, s);
        });
      }
      sendersRef.current = newSenders;
      setSenders(new Map(newSenders));
    } else if (data.type === 'sender_connected') {
      const senderId = data.senderId;
      if (!senderId) return; // trama sin emisor identificable
      const newSenders = new Map(sendersRef.current);
      newSenders.set(senderId, {
        senderId,
        label: data.label || senderId,
        connectedAt: Date.now(),
        lastSeen: Date.now(),
      });
      sendersRef.current = newSenders;
      setSenders(new Map(newSenders));
      setSendersCount((prev) => prev + 1);
    } else if (data.type === 'sender_disconnected') {
      const senderId = data.senderId;
      if (!senderId) return; // trama sin emisor identificable
      const newSenders = new Map(sendersRef.current);
      newSenders.delete(senderId);
      sendersRef.current = newSenders;
      setSenders(new Map(newSenders));
      setSendersCount((prev) => Math.max(0, prev - 1));

      const newPositions = new Map(positionsRef.current);
      newPositions.delete(senderId);
      positionsRef.current = newPositions;
      setPositions(new Map(newPositions));

      // v3.1: purga la telemetría del emisor desconectado (sin fugas)
      if (telemetryRef.current.delete(senderId)) {
        setTelemetry((prevTelemetry) => {
          const next = new Map(prevTelemetry);
          next.delete(senderId);
          return next;
        });
      }
      // ETA: purga el historial del emisor desconectado (sin fugas)
      if (etaHistoryRef.current.delete(senderId)) {
        setEtaStates((prev) => {
          const next = new Map(prev);
          next.delete(senderId);
          return next;
        });
      }
    } else if (data.type === 'gps') {
      const senderId = data.senderId;
      if (!senderId) return; // trama GPS sin emisor identificable
      const now = Date.now();
      const pos: SenderPosition = {
        senderId,
        label: data.label || senderId,
        lat: data.lat ?? 0,
        lng: data.lng ?? 0,
        accuracy: data.accuracy || 0,
        speed: data.speed || 0,
        heading: data.heading || 0,
        timestamp: data.timestamp || now,
        lastSeen: now,
      };

      const newPositions = new Map(positionsRef.current);
      newPositions.set(senderId, pos);
      positionsRef.current = newPositions;
      setPositions(new Map(newPositions));

      // v3.1: telemetrÃ­a â€” distancia real (Haversine filtrada) + velocidades
      // amortiguadas. Los heartbeats (parado) entran con stepâ‰ˆ0 â†’ registran
      // vâ‰ˆ0 (zeroSpeedOnReject) y la velocidad decae a cero en vez de
      // congelarse en el Ãºltimo valor en movimiento.
      let acc = telemetryRef.current.get(senderId);
      if (!acc) {
        acc = new DistanceAccumulator({ zeroSpeedOnReject: true });
        telemetryRef.current.set(senderId, acc);
      }
      acc.push({
        lat: pos.lat,
        lng: pos.lng,
        accuracy: data.accuracy || 0,
        t: pos.timestamp || now,
        speedMs: typeof data.speed === 'number' && Number.isFinite(data.speed) ? data.speed : null,
      });

      // ETA: historial corto por emisor (ultimas N muestras, ref sin render).
      const etaSamples = etaHistoryRef.current.get(senderId) ?? [];
      etaSamples.push({ lat: pos.lat, lng: pos.lng, t: pos.timestamp || now });
      while (etaSamples.length > ETA_HISTORY_MAX) etaSamples.shift();
      etaHistoryRef.current.set(senderId, etaSamples);

      // Update sender lastSeen
      const newSenders = new Map(sendersRef.current);
      const existing = newSenders.get(senderId);
      if (existing) {
        existing.lastSeen = now;
        newSenders.set(senderId, existing);
        sendersRef.current = newSenders;
        setSenders(new Map(newSenders));
      }

      // Auto-follow first sender
      if (followModeRef.current && senderId === Array.from(positionsRef.current.keys())[0]) {
        setMapCenter([pos.lat, pos.lng]);
        // Primera posicion real util de la sesion: se PIDE reencuadrar el mapa
        // sobre ella. La peticion la consume MapAutoFrame DENTRO del mapa, que
        // es lo unico que funciona de forma fiable: aqui `mapRef.current` suele
        // ser null porque el mapa es lazy y la trama SSE llega antes de que se
        // descargue, de modo que un flyTo desde la pagina se perderia para siempre
        // y el mapa se quedaria clavado en el centro por defecto.
        if (!frameNonceRef.current) {
          frameNonceRef.current = 1;
          setFrameRequest({ target: [pos.lat, pos.lng], nonce: 1 });
        }
      }
    } else if (data.type === 'sender_updated') {
      const senderId = data.senderId;
      if (!senderId) return; // trama sin emisor identificable
      const newSenders = new Map(sendersRef.current);
      const existing = newSenders.get(senderId);
      if (existing) {
        existing.label = data.label || senderId;
        newSenders.set(senderId, existing);
        sendersRef.current = newSenders;
        setSenders(new Map(newSenders));
      }
    } else if (data.type === 'pong') {
      // heartbeat received
    }
  }, []);

  // Visor masivo 1:N: un unico GET SSE por espectador (sin handshake WS por
  // cliente). El navegador reconecta solo ante microcortes; si el stream queda
  // cerrado definitivamente (servidor caido) se relanza con backoff + jitter.
  const openSseStream = useCallback((url: string) => {
    try {
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        if (unmountedRef.current) return;
        setWsConnected(true);
        setConnectionInfo('Conectado (SSE)');
        reconnectAttempts.current = 0;
      };

      es.onmessage = (event) => {
        if (unmountedRef.current) return;
        let payload: RelayFrame;
        try {
          payload = JSON.parse(event.data) as RelayFrame;
        } catch {
          return; // trama parcial/keep-alive: se ignora
        }
        // El snapshot SSE trae las posiciones vigentes embebidas en `live`:
        // se aplican como tramas GPS normales (misma ruta de estado).
        if (payload && payload.type === 'room_info' && Array.isArray(payload.live)) {
          const liveFrames = payload.live;
          const snapshot = { ...payload };
          delete snapshot.live;
          dispatchServerMessage(snapshot);
          for (const frame of liveFrames) dispatchServerMessage(frame);
          return;
        }
        dispatchServerMessage(payload);
      };

      es.onerror = () => {
        if (unmountedRef.current) return;
        setWsConnected(false);
        if (es.readyState === EventSource.CLOSED) {
          // El navegador ha agotado sus reintentos internos: backoff propio.
          eventSourceRef.current = null;
          setConnectionInfo('Conexión perdida. Reintentando...');
          scheduleReconnect();
        } else {
          // Reconexión nativa en curso (retry del servidor).
          setConnectionInfo('Reconectando transmisión en vivo...');
        }
      };
    } catch (err) {
      setConnectionInfo(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      scheduleReconnect();
    }
  }, [dispatchServerMessage, scheduleReconnect]);

  const openReceiverSocket = useCallback((url: string) => {
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        setConnectionInfo('Conectado');
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        if (unmountedRef.current) return;
        try {
          dispatchServerMessage(JSON.parse(event.data) as RelayFrame);
        } catch {
          // Trama invalida o parcial: se ignora y el canal sigue vivo.
        }
      };

      ws.onclose = () => {
        // Desmontaje: no tocar estado ni reintentar.
        if (unmountedRef.current) return;
        setWsConnected(false);
        setConnectionInfo('Conexión perdida. Reintentando...');
        scheduleReconnect();
      };

      ws.onerror = () => {
        setConnectionInfo('Error de conexión');
      };
    } catch (err) {
      setConnectionInfo(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      scheduleReconnect();
    }
  }, [scheduleReconnect, dispatchServerMessage]);



  const connect = useCallback(() => {
    // Evita canales duplicados segun el transporte activo.
    if (eventSourceRef.current) return;
    const current = wsRef.current;
    if (current && (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (!token) {
      setConnectionInfo('Sin token de visor configurado (VITE_GPS_TOKEN o ?token=).');
      return;
    }
    const url = `${serverUrl}?role=receiver&token=${encodeURIComponent(token)}`;
    setConnectionInfo('Conectando...');
    void wakeUpServer().finally(() => {
      if (unmountedRef.current) return;
      if (VIEWER_TRANSPORT === 'sse') {
        if (eventSourceRef.current) return;
        // La conexión SSE escucha la sala exacta de esta comparsa.
        openSseStream(getSseStreamUrl(serverUrl, token));
        return;
      }
      const latest = wsRef.current;
      if (latest && (latest.readyState === WebSocket.OPEN || latest.readyState === WebSocket.CONNECTING)) return;
      openReceiverSocket(url);
    });
  }, [serverUrl, token, openReceiverSocket, openSseStream, wakeUpServer]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    const es = eventSourceRef.current;
    eventSourceRef.current = null;
    if (es) {
      // EventSource reconecta solo: hay que neutralizar los handlers antes de
      // cerrar para que el desmontaje/desconexion manual no relance el backoff.
      es.onopen = null;
      es.onmessage = null;
      es.onerror = null;
      try {
        es.close();
      } catch {
        // ignore
      }
    }
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws) {
      // Nunca .close() en CONNECTING: aborta el handshake
      // ("closed before established"). Se neutraliza onclose para no reintentar
      // y, si aún está conectando, se cierra al abrirse.
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
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
    setWsConnected(false);
    setConnectionInfo('Desconectado');
    // v3.1: reinicia la telemetrÃ­a al desconectar manualmente
    telemetryRef.current.clear();
    setTelemetry(new Map());
  }, []);



  // Referencia estable: scheduleReconnect (definido después de openReceiverSocket)
  // relanza connect() sin dependencias circulares en los hooks.
  connectRef.current = connect;

  // Connect on mount
  useEffect(() => {
    unmountedRef.current = false;
    connect();
    return () => {
      unmountedRef.current = true;
      disconnect();
    };
  }, [connect, disconnect]);

  // Heartbeat ping every 15s (solo transporte WebSocket: el SSE mantiene el
  // canal abierto con los keep-alive del servidor).
  useEffect(() => {
    if (!wsConnected || VIEWER_TRANSPORT === 'sse') return;
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [wsConnected]);

  // =========================================================================
  // Cleanup stale positions (no data for GPS_TIMEOUT_MS)
  // =========================================================================

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      const newPositions = new Map(positionsRef.current);

      for (const [senderId, pos] of newPositions) {
        if (now - pos.lastSeen > GPS_TIMEOUT_MS) {
          newPositions.delete(senderId);
          changed = true;
        }
      }

      if (changed) {
        positionsRef.current = newPositions;
        setPositions(new Map(newPositions));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // =========================================================================
  // TelemetrÃ­a v3.1: snapshot a 1 Hz para la UI (barato: getters puros del
  // acumulador). Mantiene la tarjeta viva (decaimiento a 0) incluso entre
  // heartbeats de 10 s cuando el emisor estÃ¡ parado.
  // =========================================================================

  useEffect(() => {
    if (!wsConnected) return;
    const telemetryInterval = setInterval(() => {
      const snapshot = new Map<string, TelemetryReading>();
      for (const [senderId, acc] of telemetryRef.current) {
        snapshot.set(senderId, readTelemetry(acc));
      }
      setTelemetry(snapshot);
    }, 1000);
    return () => clearInterval(telemetryInterval);
  }, [wsConnected]);

  // =========================================================================
  // Generate route polyline from positions (trail)
  // =========================================================================

  const positionHistoryRef = useRef<Map<string, [number, number][]>>(new Map());
  const [trails, setTrails] = useState<Map<string, [number, number][]>>(new Map());

  // Update trails when positions change
  useEffect(() => {
    const newTrails = new Map(trails);
    for (const [senderId, pos] of positions) {
      const trail = positionHistoryRef.current.get(senderId) || [];
      const lastPos = trail[trail.length - 1];
      const newPoint: [number, number] = [pos.lat, pos.lng];

      // Only add if moved more than 5 meters (approx 0.00005 deg)
      if (!lastPos || Math.abs(lastPos[0] - pos.lat) > 0.00005 || Math.abs(lastPos[1] - pos.lng) > 0.00005) {
        const updated = [...trail, newPoint].slice(-100); // Keep last 100 points (v3.1)
        positionHistoryRef.current.set(senderId, updated);
        newTrails.set(senderId, updated);
      }
    }
    setTrails(new Map(newTrails));
  }, [positions]);

  // =========================================================================
  // Derived Data
  // =========================================================================

  const senderList = Array.from(senders.values());
  const senderPositions = Array.from(positions.values());
  // Orden de emisores: fija el color por indice y lo comparten el mapa (lazy)
  // y el panel de participantes, para que un mismo emisor conserve el color.
  const senderOrder = useMemo(() => Array.from(senders.keys()), [senders]);
  // Contexto semantico de estado GPS (badge, pulso, textos accesibles).
  const statusCtx = useGpsLiveStatusContext({ wsConnected, connectionInfo, senderPositions });
  void statusCtx.lastSeenAt;
  const statusKind = statusCtx.status.kind;
  const statusLabel = GPS_STATUS_LABEL[statusKind];
  const ageText =
    typeof statusCtx.status.ageMs === 'number'
      ? `hace ${Math.round(statusCtx.status.ageMs / 1000)}s`
      : '';
  const activeSenderCount = senderPositions.filter(
    (p) => Date.now() - p.lastSeen < GPS_TIMEOUT_MS
  ).length;
  const lastSignalAt = useMemo(() => {
    let latest = 0;
    positions.forEach((pos) => { if (pos.lastSeen > latest) latest = pos.lastSeen; });
    return latest;
  }, [positions]);
  const [frozenAgeSec, setFrozenAgeSec] = useState(0);
  const [sunMode, setSunMode] = useState(false);

  // ---- ETA por velocidad media (cliente) ----
  // Historial corto en refs (sin re-renders por trama): el snapshot visible
  // se refresca a 1 Hz con el mismo patron que la telemetria/frozenAgeSec.
  const etaHistoryRef = useRef<Map<string, EtaSample[]>>(new Map());
  const [etaStates, setEtaStates] = useState<Map<string, EtaState>>(new Map());

  // Tick UI de 1 Hz: congela la edad visible entre tramas ("hace Xs" legible)
  // y refresca el ETA desde refs. setState solo dentro del intervalo -> sin
  // renders en cascada por cada trama del WebSocket.
  useEffect(() => {
    const uiTick = setInterval(() => {
      setFrozenAgeSec(Math.max(0, Math.round((Date.now() - Math.max(lastSignalAt, 1)) / 1000)));
      if (!wsConnected) return;
      const snapshot = new Map<string, EtaState>();
      for (const [senderId, samples] of etaHistoryRef.current) {
        snapshot.set(senderId, computeEta(samples));
      }
      setEtaStates(snapshot);
    }, 1000);
    return () => clearInterval(uiTick);
  }, [wsConnected, lastSignalAt]);

  // POIs visibles segun filtro global + por categoria. En cleanMap los POIs
  // se ocultan (criterio de aceptacion: capas desactivadas en mapa limpio).
  const visiblePois = useMemo(
    () =>
      (poisVisible && !cleanMap)
        ? STATIC_POIS.filter((poi) => poiFilters[poi.category])
        : [],
    [poisVisible, cleanMap, poiFilters],
  );

  // =========================================================================
  // Follow position (first active sender)
  // =========================================================================

  const followPosition = useMemo(() => {
    const firstActive = senderPositions.find(
      (p) => Date.now() - p.lastSeen < GPS_TIMEOUT_MS
    );
    return firstActive ? [firstActive.lat, firstActive.lng] as [number, number] : null;
  }, [senderPositions]);

  // =========================================================================
  // Estado "EN DIRECTO" (badge del panel + precisiÃ³n GPS)
  // =========================================================================

  // Emisores con seÃ±al fresca (dentro del timeout de 15s).
  const freshSenderPositions = useMemo(
    () => senderPositions.filter((p) => Date.now() - p.lastSeen < GPS_TIMEOUT_MS),
    [senderPositions]
  );
  const hasLiveSignal = freshSenderPositions.length > 0;
  // PrecisiÃ³n GPS del emisor mÃ¡s reciente (para el chip Â±Xm).
  const gpsAccuracy = useMemo(() => {
    if (freshSenderPositions.length === 0) return null;
    const freshest = freshSenderPositions.reduce((best, p) => (p.lastSeen > best.lastSeen ? p : best));
    return Math.round(freshest.accuracy || 0);
  }, [freshSenderPositions]);

  const liveLocationText = useMemo(() => {
    if (freshSenderPositions.length === 0) return 'Sin emisores conectados';
    const freshest = freshSenderPositions.reduce((best, p) => (p.lastSeen > best.lastSeen ? p : best));
    const ageSec = Math.round(signalAgeSeconds(freshest.lastSeen));
    const acc =
      freshest.accuracy != null && Number.isFinite(freshest.accuracy)
        ? ' ±' + Math.round(freshest.accuracy) + 'm'
        : '';
    const ageClause =
      statusCtx.status.kind === 'directo'
        ? ' · actualizado hace ' + ageSec + 's'
        : statusCtx.status.kind === 'debil'
          ? ' · señal débil (hace ' + ageSec + 's)'
          : '';
    return (
      freshest.label +
      ' se encuentra cerca de ' +
      freshest.lat.toFixed(5) +
      ', ' +
      freshest.lng.toFixed(5) +
      acc +
      ageClause
    );
  }, [freshSenderPositions, statusCtx]);


  // Estado del badge: semantica callejera. La edad visible se congela entre
  // tramas (frozenAgeSec) para que sea legible caminando entre la multitud.
  const liveBadge = useMemo(() => {
    if (wsConnected && hasLiveSignal) return { label: GPS_STATUS_LABEL.directo, tone: 'live' as const, sublabel: `hace ${frozenAgeSec}s` };
    if (connectionInfo.includes('Reconectando')) return { label: GPS_STATUS_LABEL.buscando, tone: 'reconnecting' as const };
    if (wsConnected) return { label: GPS_STATUS_LABEL.debil, tone: 'idle' as const };
    return { label: GPS_STATUS_LABEL.desconectado, tone: 'disconnected' as const };
  }, [wsConnected, hasLiveSignal, connectionInfo, frozenAgeSec]);

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className={`gps-live-page${sunMode ? ' gps-sun-mode' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <style>{`
        /* GPS Live Page Styles */
        .gps-live-container {
          display: grid;
          grid-template-columns: 340px 1fr;
          height: calc(100vh - var(--header-height));
          height: calc(100dvh - var(--header-height));
          overflow: hidden;
        }

        .gps-live-sidebar {
          background: hsl(var(--color-bg-card));
          border-right: 1px solid hsl(var(--color-border));
          padding: 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .gps-live-map {
          position: relative;
          height: 100%;
          width: 100%;
        }

        /* Connection Status */
        .gps-connection-card {
          background: hsl(var(--color-bg-secondary));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 14px;
        }

        .gps-status-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .gps-status-dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 6px;
        }
        .gps-status-dot.connected { background: #4ade80; box-shadow: 0 0 8px #4ade8066; }
        .gps-status-dot.disconnected { background: #f87171; }
        .gps-status-dot.reconnecting { background: #facc15; animation: gps-pulse 1s infinite; }

        @keyframes gps-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        /* ---- Badge EN DIRECTO / RECONECTANDO / DESCONECTADO + precisiÃ³n ---- */
        .gps-live-badge-bar {
          position: absolute;
          top: 10px;
          left: 10px;
          z-index: 1000; /* sobre el mapa Leaflet (panes < 1000) */
          display: flex;
          align-items: center;
          gap: 8px;
          pointer-events: none;
        }
        .gps-live-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          backdrop-filter: blur(6px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
          pointer-events: auto;
        }
        .gps-live-badge-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
        }
        .gps-live-badge.tone-live {
          color: #065f46;
          background: rgba(74, 222, 128, 0.92);
        }
        .gps-live-badge.tone-live .gps-live-badge-dot {
          animation: gps-pulse 1.2s infinite;
        }
        .gps-live-badge.tone-reconnecting {
          color: #7c2d12;
          background: rgba(250, 204, 21, 0.92);
        }
        .gps-live-badge.tone-reconnecting .gps-live-badge-dot {
          animation: gps-pulse 0.8s infinite;
        }
        .gps-live-badge.tone-idle {
          color: #1f2937;
          background: rgba(148, 163, 184, 0.92);
        }
        .gps-live-badge.tone-disconnected {
          color: #7f1d1d;
          background: rgba(248, 113, 113, 0.92);
        }
        .gps-accuracy-chip {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 800;
          color: hsl(var(--color-text-primary));
          background: color-mix(in srgb, hsl(var(--color-bg-card)) 88%, transparent);
          border: 1px solid hsl(var(--color-border));
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(6px);
          pointer-events: auto;
        }
        @media (prefers-reduced-motion: reduce) {
          .gps-live-badge .gps-live-badge-dot {
            animation: none;
          }
        }

        .gps-status-text {
          font-size: 0.8rem;
          font-weight: 700;
        }

        .gps-server-input {
          width: 100%;
          padding: 8px 10px;
          font-size: 0.75rem;
          font-family: monospace;
          border-radius: var(--border-radius-sm);
          border: 1px solid hsl(var(--color-border));
          background: hsl(var(--color-bg-card));
          color: hsl(var(--color-text-primary));
          margin-top: 8px;
          outline: none;
        }
        .gps-server-input:focus {
          border-color: hsl(var(--color-primary));
        }

        .gps-connect-btn {
          width: 100%;
          margin-top: 6px;
          padding: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          border-radius: var(--border-radius-sm);
          border: 1px solid hsl(var(--color-primary));
          background: hsl(var(--color-primary));
          color: white;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .gps-connect-btn:hover { opacity: 0.9; }
        .gps-connect-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Route info */
        .gps-route-info {
          background: hsl(var(--color-bg-secondary));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 12px;
          text-align: center;
        }
        .gps-route-id {
          font-weight: 800;
          font-size: 0.9rem;
          color: hsl(var(--color-primary));
        }
        .gps-route-stats {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-top: 6px;
          font-size: 0.75rem;
          color: hsl(var(--color-text-secondary));
        }

        /* Senders List */
        .gps-senders-section {
          flex: 1;
        }
        .gps-senders-title {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: hsl(var(--color-text-secondary));
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .gps-sender-card {
          background: hsl(var(--color-bg-secondary));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-sm);
          padding: 10px;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: border-color 0.2s;
        }
        .gps-sender-card.active {
          border-color: #4ade80;
        }
        .gps-sender-card.inactive {
          opacity: 0.5;
          border-color: hsl(var(--color-border));
        }

        .gps-sender-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 800;
          font-size: 0.9rem;
          flex-shrink: 0;
        }

        .gps-sender-info {
          flex: 1;
          min-width: 0;
        }
        .gps-sender-name {
          font-weight: 700;
          font-size: 0.85rem;
        }
        .gps-sender-coords {
          font-size: 0.65rem;
          color: hsl(var(--color-text-muted));
          font-family: monospace;
        }
        .gps-sender-meta {
          font-size: 0.65rem;
          color: hsl(var(--color-text-secondary));
        }

        .gps-sender-status {
          font-size: 0.6rem;
          padding: 2px 6px;
          border-radius: 6px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .gps-status-online { background: #4ade8033; color: #2e7d32; }
        .gps-status-offline { background: #f8717133; color: #c62828; }

        /* Follow button */
        .gps-follow-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          border-radius: var(--border-radius-sm);
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          color: hsl(var(--color-text-secondary));
          cursor: pointer;
          transition: all 0.2s;
        }
        .gps-follow-btn.active {
          background: rgba(2, 136, 209, 0.1);
          color: #0288d1;
          border-color: #0288d1;
        }

        /* Nota: los estilos del marcador de comparsa viven ahora en
           src/styles/comparsaMarker.css (compartido con Recorridos). */

        /* Server URL input group */
        .gps-url-group {
          display: flex;
          gap: 4px;
        }
        .gps-url-group .gps-server-input {
          flex: 1;
        }
        .gps-detect-btn {
          padding: 6px 10px;
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-sm);
          background: hsl(var(--color-bg-card));
          color: hsl(var(--color-text-secondary));
          cursor: pointer;
          font-size: 0.8rem;
        }
        .gps-detect-btn:hover {
          background: hsl(var(--color-bg-secondary));
        }

        /* TelemetrÃ­a en vivo (v3.1) */
        .gps-telemetry-card {
          background: hsl(var(--color-bg-secondary));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 14px;
        }
        .gps-telemetry-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0 2px;
        }
        .gps-telemetry-row + .gps-telemetry-row {
          border-top: 1px dashed hsl(var(--color-border));
        }
        .gps-telemetry-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .gps-telemetry-main { min-width: 0; }
        .gps-telemetry-distance {
          font-size: 1.3rem;
          font-weight: 800;
          line-height: 1.1;
          font-variant-numeric: tabular-nums;
        }
        .gps-telemetry-distance small {
          font-size: 0.75rem;
          font-weight: 600;
          color: hsl(var(--color-text-secondary));
        }
        .gps-telemetry-meta {
          font-size: 0.72rem;
          color: hsl(var(--color-text-secondary));
          margin-top: 2px;
        }

        @media (max-width: 768px) {
          .gps-live-container {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
            height: calc(100vh - var(--header-height) - var(--nav-height-mobile));
            height: calc(100dvh - var(--header-height) - var(--nav-height-mobile));
          }
          .gps-live-sidebar {
            max-height: 250px;
            padding: 12px;
            gap: 10px;
            border-right: none;
            border-bottom: 1px solid hsl(var(--color-border));
          }
        }

        /* Botones flotantes: 48x48 minimo para uso con una mano en calle */
        .gps-map-actions {
          position: absolute;
          top: 54px;
          right: 12px;
          z-index: 1100;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* BotÃ³n flotante: vista limpia / solo mapa (Sprint 2) */
        .gps-map-actions .gps-clean-map-btn {
          position: static;
        }
        .gps-clean-map-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 2px solid hsl(var(--color-border));
          background: color-mix(in srgb, hsl(var(--color-bg-card)) 92%, transparent);
          backdrop-filter: blur(8px);
          color: hsl(var(--color-text-primary));
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
          transition: transform 0.15s ease, background 0.15s ease, opacity 0.15s ease;
          font-size: 1.15rem;
        }
        .gps-clean-map-btn[aria-pressed="true"] {
          border-color: hsl(var(--color-primary));
          color: hsl(var(--color-primary));
        }
        .gps-clean-map-btn:hover {
          transform: scale(1.06);
          background: hsl(var(--color-bg-card));
        }
        .gps-clean-map-btn:focus-visible {
          outline: 3px solid hsl(var(--color-primary));
          outline-offset: 2px;
        }

        /* Modo â€œsolo mapaâ€ (clean map): oculta paneles secundarios y deja el mapa a pantalla completa */
        .gps-live-container.clean-map {
          grid-template-columns: 1fr;
          grid-template-rows: 1fr;
        }
        .gps-live-container.clean-map .gps-live-sidebar {
          display: none;
        }
        .gps-live-container.clean-map .gps-live-map {
          height: 100%;
        }

        /* Modo sol / alto contraste para exteriores: fondo claro, texto grueso */
        .gps-sun-mode .gps-live-sidebar,
        .gps-sun-mode .gps-connection-card,
        .gps-sun-mode .gps-route-info,
        .gps-sun-mode .gps-telemetry-card {
          background: #ffffff;
          color: #111111;
        }
        .gps-sun-mode .gps-status-text,
        .gps-sun-mode .gps-sender-name,
        .gps-sun-mode .gps-senders-title,
        .gps-sun-mode .gps-telemetry-distance {
          font-weight: 900;
          color: #111111;
        }
        .gps-sun-mode .gps-live-badge {
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.55);
        }
        .gps-live-container.clean-map .gps-clean-map-btn {
          display: none;
        }

        /* Placeholder mientras se descarga el chunk del mapa (code-splitting):
           el panel ya esta pintado, solo falta Leaflet. */
        .gps-map-placeholder {
          height: 100%;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: hsl(var(--color-bg-base));
          color: hsl(var(--color-text-secondary));
          font-size: 0.85rem;
          font-weight: 700;
        }

        /* Touch target minimo en controles frecuentes del mapa */
        .gps-follow-btn,
        .gps-connect-btn,
        .gps-clean-map-btn,
        .gps-detect-btn,
        .gps-sender-card,
        .gps-poi-toggle,
        .gps-poi-chip {
          min-height: 48px;
          min-width: 48px;
        }
        .gps-follow-btn span,
        .gps-sender-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* POIs: marcadores vectoriales ligeros por categoria */
        .gps-poi-wrapper {
          background: none !important;
          border: none !important;
        }
        .gps-poi-marker {
          border-radius: 50%;
          background: var(--poi-color, #0288d1);
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 900;
          line-height: 1;
          pointer-events: auto;
        }
        .gps-poi-marker.is-sun {
          background: #ffffff;
          color: #111111;
          border: 3px solid #111111;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
        }
        .gps-poi-glyph {
          user-select: none;
        }

        /* POIs: panel de filtros en el sidebar */
        .gps-poi-card {
          background: hsl(var(--color-bg-secondary));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .gps-poi-title {
          font-size: 0.8rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .gps-poi-toggle {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          justify-content: space-between;
          width: 100%;
          padding: 6px 10px;
          border-radius: var(--border-radius-sm);
          border: 1px solid hsl(var(--color-border));
          background: hsl(var(--color-bg-card));
          color: hsl(var(--color-text-primary));
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
        }
        .gps-poi-toggle[aria-pressed="true"] {
          border-color: hsl(var(--color-primary));
        }
        .gps-poi-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .gps-poi-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 2px solid var(--poi-color, hsl(var(--color-border)));
          background: hsl(var(--color-bg-card));
          color: hsl(var(--color-text-primary));
          font-size: 0.72rem;
          font-weight: 800;
          cursor: pointer;
          opacity: 0.45;
        }
        .gps-poi-chip[aria-pressed="true"] {
          opacity: 1;
        }
        .gps-poi-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--poi-color, hsl(var(--color-border)));
          flex-shrink: 0;
        }

        /* ETA: linea destacada en la ficha del emisor */
        .gps-eta-line {
          font-size: 0.75rem;
          font-weight: 800;
          color: hsl(var(--color-text-primary));
          margin-top: 4px;
        }
        .gps-eta-line.is-stopped {
          font-weight: 700;
          color: hsl(var(--color-text-secondary));
        }
      `}</style>

      <div className={`gps-live-container${cleanMap ? ' clean-map' : ''}`}>
        {/* Left Sidebar */}
        <aside className="gps-live-sidebar">
          {/* Connection Card */}
          <div className="gps-connection-card">
            {/* SemÃ¡ntica accesible para estado GPS en vivo */}
            <div aria-live="polite" aria-atomic="true" className="gps-status-live">
              <div className="gps-status-row">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span
                    className={`gps-status-dot ${
                      statusKind === 'directo'
                        ? 'connected'
                        : statusKind === 'debil' || statusKind === 'buscando'
                        ? 'reconnecting'
                        : 'disconnected'
                    }`}
                  />
                  <span className="gps-status-text">
                    {statusLabel}
                    {ageText ? ` (${ageText})` : ''}
                  </span>
                </div>
                <FaSignal
                  style={{
                    color:
                      statusKind === 'directo'
                        ? '#4ade80'
                        : statusKind === 'debil' || statusKind === 'buscando'
                        ? '#facc15'
                        : '#f87171',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
              {gpsAccuracy != null ? (
                <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'hsl(var(--color-text-secondary))' }}>
                  PrecisiÃ³n Â±{gpsAccuracy} m
                </div>
              ) : null}
              <div
                style={{
                  marginTop: 8,
                  fontSize: '0.72rem',
                  color: 'hsl(var(--color-text-muted))',
                  fontFamily: 'monospace',
                }}
              >
                {liveLocationText}
              </div>
            </div>

            {/* Server URL */}
            <div className="gps-url-group">
              <input
                className="gps-server-input"
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="ws://IP_DEL_SERVIDOR:3001"
              />
              <button
                className="gps-detect-btn"
                onClick={() => {
                  const detected = `ws://${window.location.hostname}:3001`;
                  setServerUrl(detected);
                }}
                title="Detectar servidor"
              >
                ðŸ”
              </button>
            </div>

            <button
              className="gps-connect-btn"
              onClick={wsConnected ? disconnect : connect}
            >
              {wsConnected ? 'Desconectar' : 'Conectar'}
            </button>
          </div>

          {/* Token Info */}
          <div className="gps-route-info">
            <div className="gps-route-id">ðŸ“ {token}</div>
            <div className="gps-route-stats">
              <span>ðŸ“¡ {sendersCount} emisor(es)</span>
              <span>ðŸ–¥ï¸ {receiversCount} {VIEWER_TRANSPORT === 'sse' ? 'espectador(es)' : 'receptor(es)'}</span>
            </div>
          </div>

          {/* Follow Toggle */}
          <button
            className={`gps-follow-btn ${followMode ? 'active' : ''}`}
            onClick={() => setFollowMode(!followMode)}
            aria-pressed={followMode}
          >
            <FaLocationArrow />
            <span>{followMode ? 'Siguiendo' : 'Camara libre'}</span>
          </button>

          {/* Acciones de calle: modo sol + mapa limpio (48px, una mano) */}
          <div className="gps-street-actions" style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={`gps-follow-btn ${sunMode ? 'active' : ''}`}
              onClick={() => setSunMode((v) => !v)}
              aria-pressed={sunMode}
              title="Modo sol: alto contraste para exteriores"
            >
              <span>{sunMode ? 'Modo sol: ON' : 'Modo sol'}</span>
            </button>
            <button
              type="button"
              className={`gps-follow-btn ${cleanMap ? 'active' : ''}`}
              onClick={() => setCleanMap((v) => !v)}
              aria-pressed={cleanMap}
              title="Mapa limpio: oculta el panel para ver solo el mapa"
            >
              <span>{cleanMap ? 'Ver panel' : 'Mapa limpio'}</span>
            </button>
          </div>

          {/* POIs: control de capas (global + por categoria) */}
          <div className="gps-poi-card">
            <div className="gps-poi-title">
              <span>Puntos de interes</span>
              <button
                type="button"
                className="gps-poi-toggle"
                style={{ width: 'auto' }}
                onClick={() => setPoisVisible((v) => !v)}
                aria-pressed={poisVisible}
                aria-label={poisVisible ? 'Ocultar todos los POIs' : 'Mostrar todos los POIs'}
              >
                <span>{poisVisible ? 'Capa ON' : 'Capa OFF'}</span>
              </button>
            </div>
            {poisVisible && (
              <div className="gps-poi-chips">
                {POI_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className="gps-poi-chip"
                    style={{ '--poi-color': POI_CATEGORY_COLOR[cat] } as React.CSSProperties}
                    onClick={() =>
                      setPoiFilters((prev) => ({ ...prev, [cat]: !prev[cat] }))
                    }
                    aria-pressed={poiFilters[cat]}
                    aria-label={`${poiFilters[cat] ? 'Ocultar' : 'Mostrar'} ${POI_CATEGORY_LABEL[cat]}`}
                  >
                    <span className="gps-poi-dot" aria-hidden="true" />
                    <span>{POI_CATEGORY_LABEL[cat]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* TelemetrÃ­a en vivo (v3.1): distancia acumulada + velocidades */}
          {freshSenderPositions.length > 0 && (
            <div className="gps-telemetry-card">
              <div className="gps-senders-title">
                <FaRoute />
                <span>TelemetrÃ­a en vivo</span>
              </div>
              {freshSenderPositions.map((pos, idx) => {
                const reading = telemetry.get(pos.senderId);
                return (
                  <div key={pos.senderId} className="gps-telemetry-row">
                    <span
                      className="gps-telemetry-dot"
                      style={{ background: getSenderColor(idx) }}
                    />
                    <div className="gps-telemetry-main">
                      <div className="gps-telemetry-distance">
                        {fmtEsInt.format(Math.round(reading?.distanceM ?? 0))} <small>m</small>
                      </div>
                      <div className="gps-telemetry-meta">
                        âš¡ {fmtEsDecimal.format(reading?.instantKmh ?? 0)} km/h
                        {' Â· '}Media 10s: {fmtEsDecimal.format(reading?.avg10sKmh ?? 0)} km/h
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Senders List */}
          <div className="gps-senders-section">
            <div className="gps-senders-title">
              <FaUsers />
              <span>Participantes ({activeSenderCount}/{senderList.length})</span>
            </div>

            {senderList.length === 0 && (
              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--color-text-muted))', textAlign: 'center', padding: 12 }}>
                {wsConnected
                  ? 'Esperando participantes...'
                  : 'ConÃ©ctate al servidor para ver participantes'}
              </div>
            )}

            {senderList.map((sender, idx) => {
              const pos = senderPositions.find((p) => p.senderId === sender.senderId);
              const isActive = pos && Date.now() - pos.lastSeen < GPS_TIMEOUT_MS;
              const color = getSenderColor(idx);

              return (
                <div
                  key={sender.senderId}
                  className={`gps-sender-card ${isActive ? 'active' : 'inactive'}`}
                >
                  <div
                    className="gps-sender-avatar"
                    style={{ background: color }}
                  >
                    {sender.label.charAt(0).toUpperCase()}
                  </div>

                  <div className="gps-sender-info">
                    <div className="gps-sender-name">{sender.label}</div>
                    {pos ? (
                      <div className="gps-sender-coords">
                        {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
                      </div>
                    ) : (
                      <div className="gps-sender-meta">Sin posiciÃ³n aÃºn</div>
                    )}
                    {pos && (
                      <div className="gps-sender-meta">
                        {pos.accuracy < 10 ? 'ðŸŸ¢' : pos.accuracy < 50 ? 'ðŸŸ¡' : 'ðŸ”´'} Â±{Math.round(pos.accuracy)}m
                        {pos.speed > 0 && ` Â· ${(pos.speed * 3.6).toFixed(1)} km/h`}
                      </div>
                    )}
                    {pos && (
                      <div className={`gps-eta-line${etaStates.get(sender.senderId)?.kind === 'stopped' ? ' is-stopped' : ''}`}>
                        {formatEta(
                          etaStates.get(sender.senderId) ?? { kind: 'idle', reason: 'sin-datos' },
                        )}
                      </div>
                    )}
                  </div>

                  <span className={`gps-sender-status ${isActive ? 'gps-status-online' : 'gps-status-offline'}`}>
                    {isActive ? 'Online' : 'Offline'}
                  </span>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Map */}
        <section className="gps-live-map">
          {/* Badge de estado en vivo + precisiÃ³n GPS (overlay superior) */}
          <div className="gps-live-badge-bar" role="status" aria-live="polite">
            <span className={`gps-live-badge tone-${liveBadge.tone}`}>
              <span className="gps-live-badge-dot" />
              {liveBadge.label}
            </span>
            {gpsAccuracy !== null && (
              <span className="gps-accuracy-chip" title="PrecisiÃ³n GPS del emisor mÃ¡s reciente">
                ðŸ“¡ Â±{gpsAccuracy}m
              </span>
            )}
          </div>

          {/* Botones flotantes de mapa: recentrar + mapa limpio (48px) */}
          <div className="gps-map-actions">
            <button
              type="button"
              className="gps-clean-map-btn"
              onClick={() => setFollowMode((v) => !v)}
              aria-pressed={followMode}
              aria-label={followMode ? 'Dejar de seguir a la comparsa' : 'Centrar en la comparsa'}
              title={followMode ? 'Dejar de seguir' : 'Centrar en la comparsa'}
            >
              <FaLocationArrow />
            </button>
            <button
              type="button"
              className="gps-clean-map-btn"
              onClick={() => setCleanMap((v) => !v)}
              aria-pressed={cleanMap}
              aria-label={cleanMap ? 'Mostrar panel lateral' : 'Mapa limpio: ocultar panel'}
              title={cleanMap ? 'Mostrar panel' : 'Mapa limpio'}
            >
              <FaMapMarkedAlt />
            </button>
          </div>
          {cleanMap && (
            <button
              type="button"
              className="gps-clean-map-btn gps-clean-map-exit"
              onClick={() => setCleanMap(false)}
              aria-label="Volver a la vista completa"
              title="Volver a la vista completa"
              style={{
                position: 'absolute',
                bottom: 14,
                right: 14,
                top: 'auto',
                zIndex: 1100,
                boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              }}
            >
              <FaMapMarkedAlt />
            </button>
          )}

          <Suspense fallback={<div className="gps-map-placeholder" role="status" aria-live="polite">Cargando mapa en vivo...</div>}>
            <GpsLiveMap
              center={mapCenter}
              layer={mapLayer}
              onLayerChange={handleLayerChange}
              frameRequest={frameRequest}
              followMode={followMode}
              followPosition={followPosition}
              mapRef={mapRef}
              onZoomChange={setMapZoom}
              pois={visiblePois}
              sunMode={sunMode}
              trails={trails}
              senderOrder={senderOrder}
              senderPositions={senderPositions}
              statusCtx={statusCtx}
              mapZoom={mapZoom}
            />
          </Suspense>
        </section>
      </div>
    </div>
  );
};

export default GpsLive;
