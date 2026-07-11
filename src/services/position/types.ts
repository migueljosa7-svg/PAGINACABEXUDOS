/**
 * Core types for the position system.
 * 
 * This file defines the shared types used by all position sources,
 * ensuring a consistent interface regardless of whether the position
 * comes from simulation or real GPS.
 */

export interface PositionState {
  lat: number;
  lng: number;
  currentStreet: string;
  nextStreet: string;
  simulatedTime: string;
  distanceTraveled: number;
  timeRemaining: number;
  status: 'Esperando inicio' | 'En marcha' | 'Parada' | 'Finalizado';
  activeStopName: string;
  progress: number; // 0..1
}

export type PositionMode = 'simulation' | 'gps';

export interface PositionSourceConfig {
  /** Route geometry (OSRM or waypoints) for street-following */
  animCoords: { lat: number; lng: number }[];
  /** Original waypoints with street names and stop flags */
  streetPoints: { lat: number; lng: number; streetName: string; isStop?: boolean }[];
  /** Total duration of the route in ms */
  totalDurationMs: number;
  /** Total duration in minutes */
  durationMinutes: number;
  /** Start time string (HH:MM) */
  timeString: string;
  /** Pre-computed route metrics */
  metrics: {
    segmentDistances: number[];
    cumulativeDistances: number[];
    totalDistance: number;
  };
}

export interface IPositionSource {
  /** Current position state */
  readonly state: PositionState;
  
  /** The mode of this source */
  readonly mode: PositionMode;
  
  /** Subscribe to position changes. Returns unsubscribe function. */
  subscribe(callback: (state: PositionState) => void): () => void;
  
  /** Get current state synchronously */
  getState(): PositionState;
  
  // --- Simulation controls (no-op in GPS mode) ---
  play(): void;
  pause(): void;
  reset(): void;
  setSpeed(speed: number): void;
  readonly isPlaying: boolean;
  readonly speed: number;
  
  /** Update the route configuration (e.g., when user selects a different route) */
  updateConfig(config: PositionSourceConfig): void;
  
  /** Clean up resources */
  destroy(): void;
}
