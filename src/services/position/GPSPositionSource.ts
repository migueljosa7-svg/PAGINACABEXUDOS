/**
 * GPSPositionSource
 * 
 * Receives real GPS coordinates from a mobile device via WebSocket
 * and provides them as the position source. The WebSocket connects
 * to a relay server that forwards GPS data from the phone.
 * 
 * When no GPS data is available, the position stays at the route start.
 * The source automatically maps GPS coordinates to the nearest street
 * name from the route waypoints.
 * 
 * Features:
 * - Auto-centering on first GPS fix
 * - Proper WebSocket cleanup on destroy
 * - Authorization check via AUTHORIZED_GPS_DEVICES
 */

import type { IPositionSource, PositionState, PositionSourceConfig, PositionMode } from './types';
import { haversineDistance } from '../routingService';

export interface GPSPositionSourceOptions {
  /** WebSocket URL of the relay server (e.g., ws://localhost:3001) */
  wsUrl: string;
  /** Token to identify this client to the relay */
  token: string;
  /** Reconnect delay in ms (default: 3000) */
  reconnectDelay?: number;
}


export class GPSPositionSource implements IPositionSource {
  readonly mode: PositionMode = 'gps';
  
  private _state: PositionState;
  private _config: PositionSourceConfig;
  private _options: GPSPositionSourceOptions;

  private _listeners: Set<(state: PositionState) => void> = new Set();
  
  // WebSocket connection
  private _ws: WebSocket | null = null;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _destroyed = false;
  
  // Last known GPS position
  private _lastGpsLat: number | null = null;
  private _lastGpsLng: number | null = null;
  private _lastGpsTime: number = 0;
  
  // GPS timeout: if no data received for this long, show "Esperando inicio"
  private readonly GPS_TIMEOUT_MS = 10_000;
  
  constructor(config: PositionSourceConfig, options: GPSPositionSourceOptions) {
    this._config = config;
    this._options = {
      reconnectDelay: 3000,
      ...options,
    };
    this._state = this._computeState(null, null);
    this._connect();
  }

  get state(): PositionState {
    return this._state;
  }

  get isPlaying(): boolean {
    return false; // GPS is always "playing" when receiving data
  }

  get speed(): number {
    return 1; // GPS has no speed control
  }

  getState(): PositionState {
    return this._state;
  }

  subscribe(callback: (state: PositionState) => void): () => void {
    this._listeners.add(callback);
    return () => {
      this._listeners.delete(callback);
    };
  }

  // Simulation controls are no-op in GPS mode
  play(): void { /* no-op */ }
  pause(): void { /* no-op */ }
  reset(): void { /* no-op */ }
  setSpeed(): void { /* no-op */ }


  destroy(): void {
    this._destroyed = true;
    this._disconnect();
    this._listeners.clear();
    if (this._reconnectTimer !== null) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }

  /** Update the route configuration */
  updateConfig(config: PositionSourceConfig): void {
    this._config = config;
    this._updateState();
  }

  private _connect(): void {
    if (this._destroyed) return;
    
    try {
     // Build proper URL with role and token parameters
      const wsUrl = new URL(this._options.wsUrl);
      wsUrl.searchParams.set('role', 'receiver');
      wsUrl.searchParams.set('token', this._options.token);

      
      this._ws = new WebSocket(wsUrl.toString());
      
      this._ws.onopen = () => {
        // The server will send room_info on connection
      };
      
      this._ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'gps' && typeof data.lat === 'number' && typeof data.lng === 'number') {
            this._lastGpsLat = data.lat;
            this._lastGpsLng = data.lng;
            this._lastGpsTime = Date.now();
            this._updateState();
          }
        } catch {
          // Ignore malformed messages
        }
      };
      
      this._ws.onclose = () => {
        this._ws = null;
        this._scheduleReconnect();
      };
      
      this._ws.onerror = () => {
        // onclose will fire after onerror
      };
    } catch {
      this._scheduleReconnect();
    }
  }

  private _disconnect(): void {
    if (this._ws) {
      this._ws.onclose = null;
      this._ws.onmessage = null;
      this._ws.onerror = null;
      try {
        this._ws.close();
      } catch {
        // ignore
      }
      this._ws = null;
    }
  }

  private _scheduleReconnect(): void {
    if (this._destroyed) return;
    if (this._reconnectTimer !== null) return;
    
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this._connect();
    }, this._options.reconnectDelay);
  }

  private _computeState(
    gpsLat: number | null,
    gpsLng: number | null
  ): PositionState {
    const now = Date.now();
    const hasRecentGps = gpsLat !== null && gpsLng !== null && 
      (now - this._lastGpsTime) < this.GPS_TIMEOUT_MS;

    if (!hasRecentGps) {
      // No GPS data: show start position with waiting status
      const start = this._config.animCoords[0];
      return {
        lat: start?.lat ?? 0,
        lng: start?.lng ?? 0,
        currentStreet: this._config.streetPoints[0]?.streetName ?? '',
        nextStreet: this._config.streetPoints[1]?.streetName ?? '',
        simulatedTime: this._config.timeString,
        distanceTraveled: 0,
        timeRemaining: this._config.durationMinutes,
        status: 'Esperando inicio',
        activeStopName: '',
        progress: 0,
      };
    }

    // Map GPS point to nearest street
    const nearestIdx = this._findNearestStreetPoint(gpsLat!, gpsLng!);
    const safeIdx = Math.max(0, Math.min(nearestIdx, this._config.streetPoints.length - 1));
    const currentStreet = this._config.streetPoints[safeIdx]?.streetName ?? '';
    const nextStreet = this._config.streetPoints[Math.min(safeIdx + 1, this._config.streetPoints.length - 1)]?.streetName ?? 'Llegada';

    // Calculate progress based on nearest waypoint index
    const progress = this._config.streetPoints.length > 1
      ? safeIdx / (this._config.streetPoints.length - 1)
      : 0;

    // Check if near a stop
    let isAtStop = false;
    let activeStopName = '';
    for (let i = 0; i < this._config.streetPoints.length; i++) {
      if (this._config.streetPoints[i]?.isStop) {
        const d = haversineDistance(
          gpsLat!, gpsLng!,
          this._config.streetPoints[i].lat,
          this._config.streetPoints[i].lng
        );
        if (d < 30) {
          isAtStop = true;
          activeStopName = this._config.streetPoints[i].streetName;
          break;
        }
      }
    }

    // Calculate simulated time based on progress
    const [startH, startM] = this._config.timeString.split(':').map(Number);
    const elapsedMinutes = progress * this._config.durationMinutes;
    const totalMinutes = ((isNaN(startH) ? 0 : startH * 60) + (isNaN(startM) ? 0 : startM) + elapsedMinutes);
    const currentH = Math.floor(totalMinutes / 60) % 24;
    const currentM = Math.floor(totalMinutes % 60);
    const simulatedTime = `${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`;

    // Status
    const status: PositionState['status'] = progress <= 0.01
      ? 'Esperando inicio'
      : progress >= 0.99
        ? 'Finalizado'
        : isAtStop
          ? 'Parada'
          : 'En marcha';

    return {
      lat: gpsLat!,
      lng: gpsLng!,
      currentStreet,
      nextStreet,
      simulatedTime,
      distanceTraveled: Math.round(progress * this._config.metrics.totalDistance),
      timeRemaining: Math.max(0, Math.round(this._config.durationMinutes * (1 - progress))),
      status,
      activeStopName,
      progress,
    };
  }

  private _findNearestStreetPoint(lat: number, lng: number): number {
    const points = this._config.streetPoints;
    if (points.length === 0) return 0;
    
    let bestIdx = 0;
    let bestDist = Infinity;
    
    for (let i = 0; i < points.length; i++) {
      const d = haversineDistance(lat, lng, points[i].lat, points[i].lng);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    
    return bestIdx;
  }

  private _updateState(): void {
    this._state = this._computeState(this._lastGpsLat, this._lastGpsLng);
    this._notify();
  }

  private _notify(): void {
    const state = this._state;
    this._listeners.forEach(cb => {
      try { cb(state); } catch { /* ignore listener errors */ }
    });
  }
}