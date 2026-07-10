/**
 * Position System - Barrel exports
 * 
 * Clean architecture for unified position handling.
 * - Simulation mode: position advances automatically along the route
 * - GPS mode: position comes from real GPS data via WebSocket relay
 * 
 * Both modes produce the same PositionState interface,
 * so visualization components work identically in both modes.
 */

export { usePosition } from './usePosition';
export type { UsePositionOptions, UsePositionResult } from './usePosition';
export { SimulationPositionSource } from './SimulationPositionSource';
export { GPSPositionSource } from './GPSPositionSource';
export type { GPSPositionSourceOptions } from './GPSPositionSource';
export type {
  IPositionSource,
  PositionState,
  PositionSourceConfig,
  PositionMode,
} from './types';