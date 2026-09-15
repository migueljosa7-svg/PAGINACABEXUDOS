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

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { createComparsaIcon, comparsaLogoUrl, MapZoomWatcher } from '../components/mapIcons';
import '../styles/comparsaMarker.css';
import {
  FaLocationArrow,
  FaUsers,
  FaSignal,
} from 'react-icons/fa';

// =============================================================================
// Types
// =============================================================================

interface SenderPosition {
  senderId: string;
  label: string;
  lat: number;
  lng: number;
  accuracy: number;
  speed: number;
  heading: number;
  timestamp: number;
  lastSeen: number;
}

interface SenderInfo {
  senderId: string;
  label: string;
  connectedAt: number;
  lastSeen: number;
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
const GPS_TIMEOUT_MS = 15000; // Consider sender lost after 15s no data
const SMOOTH_FACTOR = 0.15; // Lerp factor for smooth animation (lower = smoother)
// Token de solo lectura para el visor: se inyecta en build (VITE_GPS_TOKEN) o ?token=.
// Sin token configurado el visor NO conecta (sin fallback de prueba).
const DEFAULT_TOKEN = (import.meta.env.VITE_GPS_TOKEN as string | undefined)?.trim() || '';

// Map zoom configuration - similar to Google Maps
const MAP_MIN_ZOOM = 3;
const MAP_MAX_ZOOM = 20;
const MAP_ZOOM_SNAP = 1;
const MAP_ZOOM_DELTA = 1;

// =============================================================================
// Smooth Marker Component
// =============================================================================

interface SmoothMarkerProps {
  position: [number, number];
  icon: L.DivIcon;
  heading: number;
  onClick?: () => void;
}

const SmoothMarker: React.FC<SmoothMarkerProps> = ({ position, icon, heading, onClick }) => {
  const markerRef = useRef<L.Marker | null>(null);
  const currentPos = useRef<[number, number]>(position);
  const targetPos = useRef<[number, number]>(position);
  const animFrameRef = useRef<number | null>(null);
  const currentHeading = useRef<number>(heading);
  const targetHeading = useRef<number>(heading);

  // Animate smoothly towards target
  const animate = useCallback(() => {
    const [curLat, curLng] = currentPos.current;
    const [targetLat, targetLng] = targetPos.current;

    const newLat = curLat + (targetLat - curLat) * SMOOTH_FACTOR;
    const newLng = curLng + (targetLng - curLng) * SMOOTH_FACTOR;

    // Smooth heading rotation
    let newHeading = currentHeading.current + (targetHeading.current - currentHeading.current) * SMOOTH_FACTOR;
    
    // Normalize heading to 0-360
    while (newHeading < 0) newHeading += 360;
    while (newHeading >= 360) newHeading -= 360;

    // If close enough, snap to target
    if (Math.abs(newLat - targetLat) < 0.000001 && Math.abs(newLng - targetLng) < 0.000001) {
      currentPos.current = [targetLat, targetLng];
    } else {
      currentPos.current = [newLat, newLng];
    }

    // Snap heading if close enough
    if (Math.abs(newHeading - targetHeading.current) < 1) {
      currentHeading.current = targetHeading.current;
    } else {
      currentHeading.current = newHeading;
    }

    if (markerRef.current) {
      markerRef.current.setLatLng(currentPos.current);
      // Apply rotation to the marker element
      const element = markerRef.current.getElement();
      if (element) {
        const iconElement = element.querySelector('.comparsa-marker-ring') as HTMLElement;
        if (iconElement) {
          iconElement.style.transform = `rotate(${currentHeading.current}deg)`;
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);
  }, []);

  // Update target when position changes
  useEffect(() => {
    targetPos.current = position;
    targetHeading.current = heading;
    if (!animFrameRef.current) {
      animFrameRef.current = requestAnimationFrame(animate);
    }
  }, [position, heading, animate]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return (
    <Marker
      ref={markerRef}
      position={currentPos.current}
      icon={icon}
      eventHandlers={onClick ? { click: onClick } : undefined}
    >
      <Popup>
        <div style={{ textAlign: 'center', minWidth: 120 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#666' }}>
            Última posición recibida
          </div>
          <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
            Lat: {position[0].toFixed(6)}<br />
            Lng: {position[1].toFixed(6)}
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

// =============================================================================
// Map Controller Component - handles mobile rendering and follow mode
// =============================================================================

interface MapControllerProps {
  followMode: boolean;
  followPosition: [number, number] | null;
  mapRef: React.RefObject<L.Map | null>;
}

const MapController: React.FC<MapControllerProps> = ({ followMode, followPosition, mapRef }) => {
  const map = useMap();
  
  // Store map reference
  useEffect(() => {
    if (mapRef) {
      (mapRef as React.MutableRefObject<L.Map | null>).current = map;
    }
  }, [map]);

  // Handle mobile rendering - invalidateSize on mount and when container resizes
  useEffect(() => {
    // Initial invalidate size after map is ready
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Handle visibility change (when user switches tabs and returns)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(() => map.invalidateSize(), 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Use ResizeObserver to detect container size changes (mobile orientation, etc.)
    const mapContainer = map.getContainer();
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainer);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      resizeObserver.disconnect();
    };
  }, [map]);

  // Follow mode with smooth panTo
  const prevPositionRef = useRef<[number, number] | null>(null);
  
  useEffect(() => {
    if (followMode && followPosition && mapRef.current) {
      const mapInstance = mapRef.current;
      const currentCenter = mapInstance.getCenter();
      const newCenter = L.latLng(followPosition[0], followPosition[1]);
      
      // Only pan if moved more than ~10 meters to avoid micro-adjustments
      const distance = currentCenter.distanceTo(newCenter);
      if (distance > 10) {
        mapInstance.panTo(followPosition, { animate: true, duration: 0.5 });
      }
      prevPositionRef.current = followPosition;
    }
  }, [followMode, followPosition, mapRef]);

  return null;
};

// =============================================================================
// Sender Icon Factory (delegado en el helper compartido de comparsas)
// =============================================================================

function createSenderIcon(label: string, color: string = '#D1121F', _senderId?: string, zoom?: number): L.DivIcon {
  const initial = label.charAt(0).toUpperCase();
  // Convención de assets: /icons/comparsas/<slug-del-nombre>.png (con
  // fallback automático a default.svg y a la inicial si no existe el logo).
  // _senderId se mantiene en la firma por compatibilidad con llamadas previas.
  return createComparsaIcon(comparsaLogoUrl(label), {
    zoom,
    color,
    label,
    fallbackText: initial,
    pulse: true,
  });
}

const SENDER_COLORS = [
  '#D1121F', '#0288D1', '#2E7D32', '#F57C00',
  '#7B1FA2', '#00838F', '#C62828', '#1565C0',
  '#558B2F', '#E65100', '#4527A0', '#00695C',
];

function getSenderColor(index: number): string {
  return SENDER_COLORS[index % SENDER_COLORS.length];
}

// =============================================================================
// Main Component
// =============================================================================

export const GpsLive: React.FC = () => {
  // ---- WebSocket State ----
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const [wsConnected, setWsConnected] = useState(false);
  const getInitialToken = () => {
    try {
      const fromQuery = new URLSearchParams(window.location.search).get('token')?.trim();
      if (fromQuery) return fromQuery;
    } catch { /* sin query disponible: usar default */ }
    return DEFAULT_TOKEN;
  };
  const [token] = useState(getInitialToken);
  const [sendersCount, setSendersCount] = useState(0);
  const [receiversCount, setReceiversCount] = useState(0);

  // ---- Senders State ----
  const [senders, setSenders] = useState<Map<string, SenderInfo>>(new Map());
  const [positions, setPositions] = useState<Map<string, SenderPosition>>(new Map());
  const sendersRef = useRef<Map<string, SenderInfo>>(new Map());
  const positionsRef = useRef<Map<string, SenderPosition>>(new Map());

  // ---- UI State ----
  const [followMode, setFollowMode] = useState(true);
  // Ref espejo de followMode: el handler del WS la lee sin re-crear connect()
  // (si followMode estuviera en las deps de connect, cada toggle reconectaría
  // el WebSocket y se perdería el estado de emisores).
  const followModeRef = useRef(true);
  useEffect(() => {
    followModeRef.current = followMode;
  }, [followMode]);
  const [serverUrl, setServerUrl] = useState(getWsRelayUrl());

  // ---- Map ----
  const [mapCenter, setMapCenter] = useState<[number, number]>([41.6568, -0.8783]);
  const mapRef = useRef<L.Map | null>(null);
  // Zoom actual del mapa: tamaño adaptativo de los iconos de comparsa.
  const [mapZoom, setMapZoom] = useState(16);

  // ---- Connection Info ----
  const [connectionInfo, setConnectionInfo] = useState<string>('Desconectado');

  // =========================================================================
  // WebSocket Connection
  // =========================================================================

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (!token) {
      setConnectionInfo('Sin token de visor configurado (VITE_GPS_TOKEN o ?token=).');
      return;
    }
    const url = `${serverUrl}?role=receiver&token=${encodeURIComponent(token)}`;
    setConnectionInfo('Conectando...');

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        setConnectionInfo('Conectado');
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'room_info') {
            setSendersCount(data.sendersCount);
            setReceiversCount(data.receiversCount);

            const newSenders = new Map(sendersRef.current);
            if (data.senders && Array.isArray(data.senders)) {
              data.senders.forEach((s: SenderInfo) => {
                newSenders.set(s.senderId, s);
              });
            }
            sendersRef.current = newSenders;
            setSenders(new Map(newSenders));
          } else if (data.type === 'sender_connected') {
            const newSenders = new Map(sendersRef.current);
            newSenders.set(data.senderId, {
              senderId: data.senderId,
              label: data.label || data.senderId,
              connectedAt: Date.now(),
              lastSeen: Date.now(),
            });
            sendersRef.current = newSenders;
            setSenders(new Map(newSenders));
            setSendersCount((prev) => prev + 1);
          } else if (data.type === 'sender_disconnected') {
            const newSenders = new Map(sendersRef.current);
            newSenders.delete(data.senderId);
            sendersRef.current = newSenders;
            setSenders(new Map(newSenders));
            setSendersCount((prev) => Math.max(0, prev - 1));

            const newPositions = new Map(positionsRef.current);
            newPositions.delete(data.senderId);
            positionsRef.current = newPositions;
            setPositions(new Map(newPositions));
          } else if (data.type === 'gps') {
            const now = Date.now();
            const pos: SenderPosition = {
              senderId: data.senderId,
              label: data.label || data.senderId,
              lat: data.lat,
              lng: data.lng,
              accuracy: data.accuracy || 0,
              speed: data.speed || 0,
              heading: data.heading || 0,
              timestamp: data.timestamp || now,
              lastSeen: now,
            };

            const newPositions = new Map(positionsRef.current);
            newPositions.set(data.senderId, pos);
            positionsRef.current = newPositions;
            setPositions(new Map(newPositions));

            // Update sender lastSeen
            const newSenders = new Map(sendersRef.current);
            const existing = newSenders.get(data.senderId);
            if (existing) {
              existing.lastSeen = now;
              newSenders.set(data.senderId, existing);
              sendersRef.current = newSenders;
              setSenders(new Map(newSenders));
            }

            // Auto-follow first sender
            if (followModeRef.current && data.senderId === Array.from(positionsRef.current.keys())[0]) {
              setMapCenter([data.lat, data.lng]);
            }
          } else if (data.type === 'sender_updated') {
            const newSenders = new Map(sendersRef.current);
            const existing = newSenders.get(data.senderId);
            if (existing) {
              existing.label = data.label;
              newSenders.set(data.senderId, existing);
              sendersRef.current = newSenders;
              setSenders(new Map(newSenders));
            }
          } else if (data.type === 'pong') {
            // heartbeat received
          }
        } catch {}
      };

      ws.onclose = () => {
        setWsConnected(false);
        setConnectionInfo('Desconectado');
        scheduleReconnect();
      };

      ws.onerror = () => {
        setConnectionInfo('Error de conexión');
      };
    } catch (err) {
      setConnectionInfo(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      scheduleReconnect();
    }
  }, [serverUrl, token]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsConnected(false);
    setConnectionInfo('Desconectado');
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) return;
    reconnectAttempts.current += 1;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
    setConnectionInfo(`Reconectando en ${Math.round(delay / 1000)}s...`);
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connect();
    }, delay);
  }, [connect]);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Heartbeat ping every 15s
  useEffect(() => {
    if (!wsConnected) return;
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
        const updated = [...trail, newPoint].slice(-50); // Keep last 50 points
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
  const activeSenderCount = senderPositions.filter(
    (p) => Date.now() - p.lastSeen < GPS_TIMEOUT_MS
  ).length;

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
  // Estado "EN DIRECTO" (badge del panel + precisión GPS)
  // =========================================================================

  // Emisores con señal fresca (dentro del timeout de 15s).
  const freshSenderPositions = useMemo(
    () => senderPositions.filter((p) => Date.now() - p.lastSeen < GPS_TIMEOUT_MS),
    [senderPositions]
  );
  const hasLiveSignal = freshSenderPositions.length > 0;
  // Precisión GPS del emisor más reciente (para el chip ±Xm).
  const gpsAccuracy = useMemo(() => {
    if (freshSenderPositions.length === 0) return null;
    const freshest = freshSenderPositions.reduce((best, p) => (p.lastSeen > best.lastSeen ? p : best));
    return Math.round(freshest.accuracy || 0);
  }, [freshSenderPositions]);

  // Estado del badge: EN DIRECTO / RECONECTANDO / SIN SEÑAL / DESCONECTADO.
  const liveBadge = useMemo(() => {
    if (wsConnected && hasLiveSignal) return { label: 'EN DIRECTO', tone: 'live' as const };
    if (connectionInfo.includes('Reconectando')) return { label: 'RECONECTANDO', tone: 'reconnecting' as const };
    if (wsConnected) return { label: 'SIN SEÑAL', tone: 'idle' as const };
    return { label: 'DESCONECTADO', tone: 'disconnected' as const };
  }, [wsConnected, hasLiveSignal, connectionInfo]);

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="gps-live-page" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <style>{`
        /* GPS Live Page Styles */
        .gps-live-container {
          display: grid;
          grid-template-columns: 340px 1fr;
          height: calc(100vh - var(--header-height));
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

        /* ---- Badge EN DIRECTO / RECONECTANDO / DESCONECTADO + precisión ---- */
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

        @media (max-width: 768px) {
          .gps-live-container {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
            height: calc(100vh - var(--header-height) - var(--nav-height-mobile));
          }
          .gps-live-sidebar {
            max-height: 250px;
            padding: 12px;
            gap: 10px;
            border-right: none;
            border-bottom: 1px solid hsl(var(--color-border));
          }
        }
      `}</style>

      <div className="gps-live-container">
        {/* Left Sidebar */}
        <aside className="gps-live-sidebar">
          {/* Connection Card */}
          <div className="gps-connection-card">
            <div className="gps-status-row">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className={`gps-status-dot ${wsConnected ? 'connected' : connectionInfo.includes('Reconectando') ? 'reconnecting' : 'disconnected'}`} />
                <span className="gps-status-text">{connectionInfo}</span>
              </div>
              <FaSignal style={{ color: wsConnected ? '#4ade80' : '#f87171', fontSize: '0.9rem' }} />
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
                🔍
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
            <div className="gps-route-id">📍 {token}</div>
            <div className="gps-route-stats">
              <span>📡 {sendersCount} emisor(es)</span>
              <span>🖥️ {receiversCount} receptor(es)</span>
            </div>
          </div>

          {/* Follow Toggle */}
          <button
            className={`gps-follow-btn ${followMode ? 'active' : ''}`}
            onClick={() => setFollowMode(!followMode)}
          >
            <FaLocationArrow />
            <span>{followMode ? 'Siguiendo' : 'Cámara libre'}</span>
          </button>

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
                  : 'Conéctate al servidor para ver participantes'}
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
                      <div className="gps-sender-meta">Sin posición aún</div>
                    )}
                    {pos && (
                      <div className="gps-sender-meta">
                        {pos.accuracy < 10 ? '🟢' : pos.accuracy < 50 ? '🟡' : '🔴'} ±{Math.round(pos.accuracy)}m
                        {pos.speed > 0 && ` · ${(pos.speed * 3.6).toFixed(1)} km/h`}
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
          {/* Badge de estado en vivo + precisión GPS (overlay superior) */}
          <div className="gps-live-badge-bar" role="status" aria-live="polite">
            <span className={`gps-live-badge tone-${liveBadge.tone}`}>
              <span className="gps-live-badge-dot" />
              {liveBadge.label}
            </span>
            {gpsAccuracy !== null && (
              <span className="gps-accuracy-chip" title="Precisión GPS del emisor más reciente">
                📡 ±{gpsAccuracy}m
              </span>
            )}
          </div>

          <MapContainer
            center={mapCenter}
            zoom={16}
            scrollWheelZoom={true}
            minZoom={MAP_MIN_ZOOM}
            maxZoom={MAP_MAX_ZOOM}
            zoomSnap={MAP_ZOOM_SNAP}
            zoomDelta={MAP_ZOOM_DELTA}
            style={{ height: '100%', width: '100%' }}
          >
            {/* Mirror oficial de OpenStreetMap (Alemania): sin marcas de agua
                ni bloqueos 403 por cuota. Gratuito, sin API key. */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.de/{z}/{x}/{y}.png"
              maxZoom={19}
            />

{/* Map Controller for mobile rendering and follow mode */}
            <MapController followMode={followMode} followPosition={followPosition} mapRef={mapRef} />
            <MapZoomWatcher onZoomChange={setMapZoom} />

            {/* Trails */}
            {Array.from(trails.entries()).map(([senderId, trail]) => (
              <Polyline
                key={`trail-${senderId}`}
                positions={trail}
                pathOptions={{
                  color: getSenderColor(Array.from(senders.keys()).indexOf(senderId)),
                  weight: 3,
                  opacity: 0.5,
                  dashArray: '5, 8',
                }}
              />
            ))}

            {/* Sender Markers with smooth animation */}
            {senderPositions
              .filter((p) => Date.now() - p.lastSeen < GPS_TIMEOUT_MS)
              .map((pos, idx) => (
                <SmoothMarker
                  key={pos.senderId}
                  position={[pos.lat, pos.lng]}
                  icon={createSenderIcon(pos.label, getSenderColor(idx), pos.senderId, mapZoom)}
                  heading={pos.heading}
                />
              ))}
          </MapContainer>
        </section>
      </div>
    </div>
  );
};

export default GpsLive;