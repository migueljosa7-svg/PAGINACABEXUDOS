/**
 * SimulationPositionSource
 * 
 * Provides a position source for GPS real-time tracking.
 * In production, each comparsa will have its own independent GPS device on the street.
 * For demonstration purposes, this source can also replay pre-recorded routes.
 * 
 * Uses WebSocket connection for real-time GPS data from mobile devices.
 */

import { interpolatePosition } from '../animationService';
import type { IPositionSource, PositionState, PositionSourceConfig, PositionMode } from './types';

export class SimulationPositionSource implements IPositionSource {
  readonly mode: PositionMode = 'simulation';
  
  private _state: PositionState;
  private _isPlaying = false;
  private _speed = 1;
  private _elapsedTimeMs = 0;
  private _config: PositionSourceConfig;
  private _listeners: Set<(state: PositionState) => void> = new Set();
  
  // Interval tracking for smooth playback
  private _intervalId: ReturnType<typeof setInterval> | null = null;
  private _lastUpdateTimestamp: number = 0;

  constructor(config: PositionSourceConfig) {
    this._config = config;
    this._state = this._computeState(0);
  }

  get state(): PositionState {
    return this._state;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get speed(): number {
    return this._speed;
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

  play(): void {
    if (this._isPlaying) return;
    
    if (this._elapsedTimeMs >= this._config.totalDurationMs) {
      this._elapsedTimeMs = 0;
    }
    
    this._isPlaying = true;
    this._lastUpdateTimestamp = performance.now();
    
    // Use setInterval for smooth, reliable playback
    // 16ms = ~60fps, but we'll use 10ms for even smoother animation
    this._intervalId = setInterval(() => {
      this._tick();
    }, 10);
    
    // Immediate state update
    this._updateState();
  }

  private _tick(): void {
    if (!this._isPlaying) return;
    
    const now = performance.now();
    const delta = now - this._lastUpdateTimestamp;
    this._lastUpdateTimestamp = now;
    
    this._elapsedTimeMs += delta * this._speed;
    
    if (this._elapsedTimeMs >= this._config.totalDurationMs) {
      this._elapsedTimeMs = this._config.totalDurationMs;
      this._isPlaying = false;
      this._clearInterval();
      this._updateState();
      return;
    }
    
    this._updateState();
  }

  private _clearInterval(): void {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  pause(): void {
    if (!this._isPlaying) return;
    this._isPlaying = false;
    this._clearInterval();
    this._lastUpdateTimestamp = 0;
  }

  reset(): void {
    this.pause();
    this._elapsedTimeMs = 0;
    this._updateState();
  }

  setSpeed(speed: number): void {
    this._speed = Math.max(0.1, speed);
  }

  destroy(): void {
    this.pause();
    this._listeners.clear();
  }

  /** 
   * Update the route configuration (e.g., when user selects a different route).
   * Does NOT reset elapsed time - preserves simulation progress.
   * Only call this when the route actually changes.
   */
  updateConfig(config: PositionSourceConfig): void {
    // CRITICAL: Do NOT pause or reset elapsed time - just update the config
    // This preserves the simulation progress when route data updates
    this._config = config;
    this._updateState();
  }

  private _computeState(elapsedMs: number): PositionState {
    const simState = interpolatePosition(
      this._config.animCoords,
      this._config.streetPoints,
      elapsedMs,
      this._config.totalDurationMs,
      this._config.durationMinutes,
      this._config.timeString,
      this._config.metrics
    );

    const progress = this._config.totalDurationMs > 0
      ? Math.min(elapsedMs / this._config.totalDurationMs, 1)
      : 0;

    return {
      lat: simState.lat,
      lng: simState.lng,
      currentStreet: simState.currentStreet,
      nextStreet: simState.nextStreet,
      simulatedTime: simState.simulatedTime,
      distanceTraveled: simState.distanceTraveled,
      timeRemaining: simState.timeRemaining,
      status: simState.status,
      activeStopName: simState.activeStopName,
      progress,
    };
  }

  private _updateState(): void {
    this._state = this._computeState(this._elapsedTimeMs);
    this._notify();
  }

  private _notify(): void {
    const state = this._state;
    this._listeners.forEach(cb => {
      try { cb(state); } catch { /* ignore listener errors */ }
    });
  }
}