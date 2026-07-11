/**
 * SimulationPositionSource
 * 
 * Provides a simulated position that advances automatically along the route,
 * with controls for play, pause, speed, and reset.
 * 
 * Reuses the existing animationService interpolation logic but wraps it
 * in the IPositionSource interface for clean separation.
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
  
  // Animation frame tracking
  private _rafId: number | null = null;
  private _previousTime: number | null = null;
  private _boundAnimate: (time: number) => void;

  constructor(config: PositionSourceConfig) {
    this._config = config;
    this._state = this._computeState(0);
    this._boundAnimate = this._animate.bind(this);
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
    console.log('[SimulationPositionSource] play() called, isPlaying:', this._isPlaying, 'totalDurationMs:', this._config.totalDurationMs);
    if (this._isPlaying) return;
    if (this._elapsedTimeMs >= this._config.totalDurationMs) {
      this._elapsedTimeMs = 0;
    }
    this._isPlaying = true;
    this._previousTime = null;
    this._rafId = requestAnimationFrame(this._boundAnimate);
  }

  pause(): void {
    if (!this._isPlaying) return;
    this._isPlaying = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._previousTime = null;
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

  /** Update the route configuration (e.g., when user selects a different route) */
  updateConfig(config: PositionSourceConfig): void {
    this.pause();
    this._elapsedTimeMs = 0;
    this._config = config;
    this._updateState();
  }

  private _animate(time: number): void {
    if (this._previousTime !== null) {
      const delta = time - this._previousTime;
      this._elapsedTimeMs += delta * this._speed;
      
      if (this._elapsedTimeMs >= this._config.totalDurationMs) {
        this._elapsedTimeMs = this._config.totalDurationMs;
        this._isPlaying = false;
        this._rafId = null;
        this._previousTime = null;
        this._updateState();
        return;
      }
    }
    this._previousTime = time;
    this._updateState();
    
    if (this._isPlaying) {
      this._rafId = requestAnimationFrame(this._boundAnimate);
    }
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
    console.log('[SimulationPositionSource] _updateState called, elapsed:', this._elapsedTimeMs, 'lat:', this._state.lat, 'lng:', this._state.lng);
  }

  private _notify(): void {
    const state = this._state;
    this._listeners.forEach(cb => {
      try { cb(state); } catch { /* ignore listener errors */ }
    });
  }
}