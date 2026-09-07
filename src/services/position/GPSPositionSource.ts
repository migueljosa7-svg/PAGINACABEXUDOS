/**
 * GPSPositionSource
 *
 * Real GPS tracking using the browser Geolocation API
 * (navigator.geolocation.watchPosition).
 *
 * Produces the SAME metric fields as SimulationPositionSource so the
 * dashboard renders identically in both modes.
 *
 * State machine:
 *   detenido ──play()──► activo ──pause()──► pausado
 *      ▲                  │  ▲                  │
 *      │                  │  └─────play()───────┘
 *      └──────────────────┴──────reset()────────┘
 *
 * While watching (always, even when paused) the map marker follows the
 * device. Distance / time / speed only accumulate in the "activo" state
 * and only when the new position passes the noise filter.
 */

import type { IPositionSource, PositionState, PositionSourceConfig, PositionMode } from './types';
import { haversineDistance } from '../routingService';
import { formatElapsedTime, smoothSpeed, averageSpeedKmh, msToKmh } from './metricsUtils';

const MIN_STEP_METERS = 4;
const MAX_STEP_METERS = 200;
const MAX_STEP_SPEED_MS = 50;
const MAX_ACCURACY_METERS = 100;
const SPEED_SMOOTH_WINDOW = 5;

export class GPSPositionSource implements IPositionSource {
  readonly mode: PositionMode = 'gps';

  private _state: PositionState;
  private _config: PositionSourceConfig;
  private _listeners: Set<(state: PositionState) => void> = new Set();
  private _watchId: number | null = null;
  private _destroyed = false;
  private _gpsState: 'detenido' | 'activo' | 'pausado' = 'detenido';
  private _sessionStartWall = 0;
  private _accumulatedMs = 0;
  private _lastTimestamp = 0;
  private _totalDistance = 0;
  private _startLat: number | null = null;
  private _prevLat: number | null = null;
  private _prevLng: number | null = null;
  private _speedSamples: number[] = [];
  private _currentLat: number;
  private _currentLng: number;
  private _gpsError: string | null = null;

  constructor(config: PositionSourceConfig) {
    this._config = config;
    const start = config.animCoords[0];
    this._currentLat = start?.lat ?? 0;
    this._currentLng = start?.lng ?? 0;
    this._state = this._buildState();
    this._startWatching();
  }

  get state(): PositionState { return this._state; }
  get isPlaying(): boolean { return this._gpsState === 'activo'; }
  get speed(): number { return 1; }

  getState(): PositionState { return this._state; }

  subscribe(cb: (s: PositionState) => void): () => void {
    this._listeners.add(cb);
    return () => { this._listeners.delete(cb); };
  }

  play(): void {
    if (this._destroyed) return;
    if (this._gpsState === 'activo') return;
    if (this._gpsState === 'detenido') {
      this._accumulatedMs = 0;
      this._totalDistance = 0;
      this._speedSamples = [];
      this._startLat = null;
      this._prevLat = null;
      this._prevLng = null;
      this._gpsError = null;
    }
    this._gpsState = 'activo';
    this._sessionStartWall = performance.now();
    this._updateState();
  }

  pause(): void {
    if (this._destroyed || this._gpsState !== 'activo') return;
    this._accumulatedMs += performance.now() - this._sessionStartWall;
    this._gpsState = 'pausado';
    this._updateState();
  }

  reset(): void {
    if (this._destroyed) return;
    this._gpsState = 'detenido';
    this._accumulatedMs = 0;
    this._totalDistance = 0;
    this._speedSamples = [];
    this._startLat = null;
    this._prevLat = null;
    this._prevLng = null;
    this._lastTimestamp = 0;
    this._gpsError = null;
    this._updateState();
  }

  setSpeed(): void { /* no-op for real GPS */ }

  destroy(): void {
    this._destroyed = true;
    this._stopWatching();
    this._listeners.clear();
  }

  updateConfig(config: PositionSourceConfig): void {
    this._config = config;
    this._updateState();
  }  private _startWatching(): void {
    if (this._watchId !== null) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this._gpsError = 'Geolocalizacion no soportada por este navegador';
      this._updateState();
      return;
    }
    try {
      this._watchId = navigator.geolocation.watchPosition(
        (pos) => this._onPosition(pos),
        (err) => this._onError(err),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
      );
    } catch (e) {
      this._gpsError = 'Error al iniciar geolocalizacion';
    }
  }

  private _stopWatching(): void {
    if (this._watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      try { navigator.geolocation.clearWatch(this._watchId); } catch { /* ignore */ }
    }
    this._watchId = null;
  }

  private _onPosition(pos: GeolocationPosition): void {
    if (this._destroyed) return;
    const { latitude, longitude, accuracy, speed } = pos.coords;
    const timestamp = pos.timestamp;
    this._currentLat = latitude;
    this._currentLng = longitude;

    if (this._startLat === null) {
      this._startLat = latitude;
      this._prevLat = latitude;
      this._prevLng = longitude;
      this._lastTimestamp = timestamp;
      this._gpsError = null;
      this._updateState();
      return;
    }

    if (accuracy == null || accuracy > MAX_ACCURACY_METERS) { this._updateState(); return; }
    const stepDist = haversineDistance(this._prevLat!, this._prevLng!, latitude, longitude);
    if (stepDist < MIN_STEP_METERS) { this._updateState(); return; }
    if (stepDist > MAX_STEP_METERS) { this._updateState(); return; }
    const dtSec = (timestamp - this._lastTimestamp) / 1000;
    if (dtSec > 0 && stepDist / dtSec > MAX_STEP_SPEED_MS) { this._updateState(); return; }

    if (this._gpsState === 'activo' && dtSec > 0) {
      this._totalDistance += stepDist;
      let instKmh: number | null = null;
      if (speed != null && speed >= 0) {
        const fromApi = msToKmh(speed);
        if (fromApi >= 0 && fromApi < 200) instKmh = fromApi;
      }
      if (instKmh == null) {
        const calc = (stepDist / dtSec) * 3.6;
        if (calc >= 0 && calc < 200) instKmh = calc;
      }
      if (instKmh != null) this._speedSamples.push(instKmh);
    }

    this._prevLat = latitude;
    this._prevLng = longitude;
    this._lastTimestamp = timestamp;
    this._updateState();
  }

  private _onError(err: GeolocationPositionError): void {
    if (this._destroyed) return;
    switch (err.code) {
      case err.PERMISSION_DENIED:
        this._gpsError = 'Permiso de ubicacion denegado. Activa el GPS del dispositivo.';
        break;
      case err.POSITION_UNAVAILABLE:
        this._gpsError = 'Posicion no disponible. Esta activado el GPS?';
        break;
      case err.TIMEOUT:
        this._gpsError = 'Tiempo de espera agotado. Reintentando...';
        break;
      default:
        this._gpsError = `Error GPS: ${err.message}`;
    }
    if (this._gpsState === 'activo') this._gpsState = 'detenido';
    this._updateState();
  }

  private _elapsedMs(): number {
    if (this._gpsState === 'activo') {
      return this._accumulatedMs + (performance.now() - this._sessionStartWall);
    }
    return this._accumulatedMs;
  }
  private _updateState(): void {
    this._state = this._buildState();
    this._notify();
  }

  private _buildState(): PositionState {
    const elapsed = this._elapsedMs();
    let status: PositionState['status'];
    if (this._gpsError && this._gpsState === 'detenido') {
      status = 'GPS detenido';
    } else {
      status = this._gpsState === 'activo' ? 'GPS activo'
        : this._gpsState === 'pausado' ? 'GPS pausado'
          : 'GPS detenido';
    }

    const nearestIdx = this._findNearestStreetPoint(this._currentLat, this._currentLng);
    const safeIdx = Math.max(0, Math.min(nearestIdx, this._config.streetPoints.length - 1));
    const currentStreet = this._config.streetPoints[safeIdx]?.streetName ?? '';
    const nextStreet = this._config.streetPoints[Math.min(safeIdx + 1, this._config.streetPoints.length - 1)]?.streetName ?? 'Llegada';

    const totalStops = this._config.streetPoints.length;
    const progress = totalStops > 1 ? safeIdx / (totalStops - 1) : 0;

    const elapsedFmt = formatElapsedTime(elapsed);
    const [startH, startM] = this._config.timeString.split(':').map(Number);
    const elapsedMin = elapsed / (1000 * 60);
    const totalMin = ((isNaN(startH) ? 0 : startH * 60) + (isNaN(startM) ? 0 : startM)) + elapsedMin;
    const simH = Math.floor(totalMin / 60) % 24;
    const simM = Math.floor(totalMin % 60);
    const simulatedTime = `${String(simH).padStart(2, '0')}:${String(simM).padStart(2, '0')}`;

    const instSpeed = smoothSpeed(this._speedSamples, SPEED_SMOOTH_WINDOW);
    const avgSpeed = averageSpeedKmh(this._totalDistance, elapsed);

    return {
      lat: this._currentLat,
      lng: this._currentLng,
      currentStreet,
      nextStreet,
      simulatedTime,
      distanceTraveled: Math.round(this._totalDistance),
      timeRemaining: Math.max(0, Math.round(this._config.durationMinutes - elapsedMin)),
      status,
      activeStopName: '',
      progress,
      elapsedTimeMs: elapsed,
      speed: Math.round(instSpeed * 10) / 10,
      avgSpeed: Math.round(avgSpeed * 10) / 10,
      elapsedTimeFormatted: elapsedFmt,
      gpsError: this._gpsError,
    };
  }

  private _findNearestStreetPoint(lat: number, lng: number): number {
    const pts = this._config.streetPoints;
    if (pts.length === 0) return 0;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const d = haversineDistance(lat, lng, pts[i].lat, pts[i].lng);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  private _notify(): void {
    const s = this._state;
    this._listeners.forEach((cb) => { try { cb(s); } catch { /* ignore */ } });
  }
}
