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
 *   - Follow-mode camera tracking
 *   - Sender status panel showing all participants
 *   - Auto-reconnection with exponential backoff
 *   - Ready for production with public server IP
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
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
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) return fromEnv;
  // Use current origin - WebSocket is on the same server
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = window.location.port ? `:${window.location.port}` : '';
  return `${proto}//${host}${port}`;
};
const GPS_TIMEOUT_MS = 15000; // Consider sender lost after 15s no data
const SMOOTH_FACTOR = 0.15; // Lerp factor for smooth animation (lower = smoother)
const DEFAULT_TOKEN = 'cmp_prueba_barrio'; // Default token for demo mode

// =============================================================================
// Smooth Marker Component
// =============================================================================

interface SmoothMarkerProps {
  position: [number, number];
  icon: L.DivIcon;
  heading: number;
  onClick?: () => void;
}

const SmoothMarker: React.FC<SmoothMarkerProps> = ({ position, icon, onClick }) => {
  const markerRef = useRef<L.Marker | null>(null);
  const currentPos = useRef<[number, number]>(position);
  const targetPos = useRef<[number, number]>(position);
  const animFrameRef = useRef<number | null>(null);

  // Animate smoothly towards target
  const animate = useCallback(() => {
    const [curLat, curLng] = currentPos.current;
    const [targetLat, targetLng] = targetPos.current;

    const newLat = curLat + (targetLat - curLat) * SMOOTH_FACTOR;
    const newLng = curLng + (targetLng - curLng) * SMOOTH_FACTOR;

    // If close enough, snap to target
    if (Math.abs(newLat - targetLat) < 0.000001 && Math.abs(newLng - targetLng) < 0.000001) {
      currentPos.current = [targetLat, targetLng];
    } else {
      currentPos.current = [newLat, newLng];
    }

    if (markerRef.current) {
      markerRef.current.setLatLng(currentPos.current);
    }

    animFrameRef.current = requestAnimationFrame(animate);
  }, []);

  // Update target when position changes
  useEffect(() => {
    targetPos.current = position;
    if (!animFrameRef.current) {
      animFrameRef.current = requestAnimationFrame(animate);
    }
  }, [position, animate]);

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
// Follow Mode Component
// =============================================================================

const FollowModeController: React.FC<{ enabled: boolean; position: [number, number] | null }> = ({
  enabled,
  position,
}) => {
  const map = useMap();
  const prevEnabled = useRef(false);

  useEffect(() => {
    if (enabled && position) {
      map.setView(position, map.getZoom(), { animate: true });
      prevEnabled.current = true;
    }
  }, [enabled, position, map]);

  return null;
};

// =============================================================================
// Sender Icon Factory
// =============================================================================

function createSenderIcon(label: string, color: string = '#D1121F'): L.DivIcon {
  const initial = label.charAt(0).toUpperCase();
  return L.divIcon({
    className: 'gps-sender-marker',
    html: `
      <div class="gps-marker-pulse" style="border-color: ${color}">
        <div class="gps-marker-inner" style="background: ${color}">
          <span class="gps-marker-letter">${initial}</span>
        </div>
      </div>
      <div class="gps-marker-label">${label}</div>
    `,
    iconSize: [42, 52],
    iconAnchor: [21, 52],
    popupAnchor: [0, -55],
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
  const [token] = useState(DEFAULT_TOKEN);
  const [sendersCount, setSendersCount] = useState(0);
  const [receiversCount, setReceiversCount] = useState(0);

  // ---- Senders State ----
  const [senders, setSenders] = useState<Map<string, SenderInfo>>(new Map());
  const [positions, setPositions] = useState<Map<string, SenderPosition>>(new Map());
  const sendersRef = useRef<Map<string, SenderInfo>>(new Map());
  const positionsRef = useRef<Map<string, SenderPosition>>(new Map());

  // ---- UI State ----
  const [followMode, setFollowMode] = useState(true);
  const [serverUrl, setServerUrl] = useState(getWsRelayUrl());

  // ---- Connection Info ----
  const [connectionInfo, setConnectionInfo] = useState<string>('Desconectado');
  // const [lastPing, setLastPing] = useState<number>(0);

  // ---- Map ----
  const [mapCenter, setMapCenter] = useState<[number, number]>([41.6568, -0.8783]);

  // =========================================================================
  // WebSocket Connection
  // =========================================================================

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const url = `${serverUrl}?role=receiver&token=${token}`;
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
            if (followMode && data.senderId === Array.from(positionsRef.current.keys())[0]) {
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
  }, [serverUrl, token, followMode]);

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

        /* Marker styles */
        .gps-sender-marker {
          background: none !important;
          border: none !important;
        }
        .gps-marker-pulse {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 3px solid #D1121F;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: gps-marker-pulse 2s infinite;
          margin: 0 auto;
        }
        .gps-marker-inner {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .gps-marker-letter {
          color: white;
          font-weight: 800;
          font-size: 0.85rem;
        }
        .gps-marker-label {
          text-align: center;
          font-size: 0.6rem;
          font-weight: 700;
          color: hsl(var(--color-text-primary));
          background: hsl(var(--color-bg-card));
          padding: 1px 6px;
          border-radius: 4px;
          margin-top: 2px;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        @keyframes gps-marker-pulse {
          0% { box-shadow: 0 0 0 0 rgba(209, 18, 31, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(209, 18, 31, 0); }
          100% { box-shadow: 0 0 0 0 rgba(209, 18, 31, 0); }
        }

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
          <MapContainer
            center={mapCenter}
            zoom={16}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Follow Mode Controller */}
            <FollowModeController enabled={followMode} position={senderPositions.length > 0 ? [senderPositions[0].lat, senderPositions[0].lng] : null} />

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
                  icon={createSenderIcon(pos.label, getSenderColor(idx))}
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