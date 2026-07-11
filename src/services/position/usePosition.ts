/**
 * usePosition hook
 * 
 * React hook that wraps an IPositionSource and provides reactive state
 * to components. The hook automatically manages the lifecycle of the
 * position source and provides a clean API for GPS real-time mode.
 * 
 * The system is designed for production use where each comparsa will have
 * its own independent GPS device on the street. For demonstration, it can
 * also replay pre-recorded routes.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { IPositionSource, PositionState, PositionMode } from './types';
import { SimulationPositionSource } from './SimulationPositionSource';
import { GPSPositionSource, type GPSPositionSourceOptions } from './GPSPositionSource';
import type { PositionSourceConfig } from './types';

export interface UsePositionOptions {
  /** Position mode: 'simulation' or 'gps' */
  mode: PositionMode;
  /** Configuration for the position source */
  config: PositionSourceConfig;
  /** GPS-specific options (required when mode is 'gps') */
  gpsOptions?: GPSPositionSourceOptions;
}

export interface UsePositionResult {
  /** Current position state */
  state: PositionState;
  /** The position mode */
  mode: PositionMode;
  
  // --- Simulation controls (available in both modes, no-op in GPS) ---
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  isPlaying: boolean;
  speed: number;
  
  /** Switch between simulation and GPS mode */
  setMode: (mode: PositionMode) => void;
  
  /** Update the route configuration */
  updateConfig: (config: PositionSourceConfig) => void;
}

/**
 * Hook that provides a unified position interface for both simulation and GPS modes.
 * 
 * @example
 * ```tsx
 * const { state, play, pause, isPlaying } = usePosition({
 *   mode: 'simulation',
 *   config: { animCoords, streetPoints, totalDurationMs, durationMinutes, timeString, metrics },
 * });
 * ```
 */
export function usePosition(options: UsePositionOptions): UsePositionResult {
  const { config, gpsOptions } = options;
  const [mode, setMode] = useState<PositionMode>(options.mode);
  const [state, setState] = useState<PositionState>(() => createInitialState(config));
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState(1);
  
  // Keep a ref to the current source so callbacks stay stable
  const sourceRef = useRef<IPositionSource | null>(null);
  
  // Track the current route ID to detect actual changes
  const currentRouteIdRef = useRef<string>('');

  // Create/recreate the position source when mode or GPS connection params change.
  // The config is passed at creation time, and updates are handled via updateConfig method.
  useEffect(() => {
    // Destroy previous source completely
    if (sourceRef.current) {
      sourceRef.current.destroy();
      sourceRef.current = null;
    }

    let source: IPositionSource;

    if (mode === 'simulation') {
      source = new SimulationPositionSource(config);
    } else {
      if (!gpsOptions) {
        console.warn('GPS mode requires gpsOptions, falling back to simulation');
        source = new SimulationPositionSource(config);
        return;
      }
      source = new GPSPositionSource(config, gpsOptions);
    }

    sourceRef.current = source;
    setState(source.getState());
    setIsPlaying(source.isPlaying);
    setSpeedState(source.speed);

    const unsubscribe = source.subscribe((newState) => {
      setState(newState);
      setIsPlaying(source.isPlaying);
      setSpeedState(source.speed);
    });

    return () => {
      // CRITICAL: Complete cleanup on unmount or mode change
      unsubscribe();
      if (sourceRef.current) {
        sourceRef.current.destroy();
        sourceRef.current = null;
      }
    };
  }, [mode, gpsOptions?.wsUrl, gpsOptions?.token]);

  // Update config on the existing source when route changes.
  // Use route ID comparison to avoid unnecessary updates.
  useEffect(() => {
    if (!sourceRef.current) return;
    
    // Get route ID from the first waypoint (stable identifier)
    const routeId = config.animCoords[0] ? `${config.animCoords[0].lat},${config.animCoords[0].lng}` : '';
    
    // Only update if route actually changed
    if (currentRouteIdRef.current === routeId) {
      return;
    }
    
    currentRouteIdRef.current = routeId;
    
    // Update config - SimulationPositionSource.updateConfig now preserves elapsed time
    sourceRef.current.updateConfig(config);
  });

  const play = useCallback(() => {
    sourceRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    sourceRef.current?.pause();
  }, []);

  const reset = useCallback(() => {
    sourceRef.current?.reset();
  }, []);

  const setSpeed = useCallback((newSpeed: number) => {
    sourceRef.current?.setSpeed(newSpeed);
  }, []);

   const updateConfig = useCallback((newConfig: PositionSourceConfig) => {
     const source = sourceRef.current;
     if (source) {
       source.updateConfig(newConfig);
       // updateConfig already calls _updateState() which notifies listeners
       // but we also update state here to ensure immediate UI update
       setState(source.getState());
     } else {
       setState(createInitialState(newConfig));
     }
   }, []);

  const handleSetMode = useCallback((newMode: PositionMode) => {
    setMode(newMode);
  }, []);

  return {
    state,
    mode,
    play,
    pause,
    reset,
    setSpeed,
    isPlaying,
    speed,
    setMode: handleSetMode,
    updateConfig,
  };
}

function createInitialState(config: PositionSourceConfig): PositionState {
  const start = config.animCoords[0];
  return {
    lat: start?.lat ?? 0,
    lng: start?.lng ?? 0,
    currentStreet: config.streetPoints[0]?.streetName ?? '',
    nextStreet: config.streetPoints[1]?.streetName ?? '',
    simulatedTime: config.timeString,
    distanceTraveled: 0,
    timeRemaining: config.durationMinutes,
    status: 'Esperando inicio',
    activeStopName: '',
    progress: 0,
  };
}