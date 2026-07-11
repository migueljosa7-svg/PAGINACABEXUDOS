/**
 * usePosition hook
 * 
 * React hook that wraps an IPositionSource and provides reactive state
 * to components. The hook automatically manages the lifecycle of the
 * position source and provides a clean API for both simulation and GPS modes.
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

  // Create/recreate the position source when mode or GPS connection params change.
  // The config is passed at creation time, and updates are handled separately.
  useEffect(() => {
    console.log('[usePosition] Creating source, mode:', mode, 'config animCoords length:', config.animCoords.length);
    
    // Destroy previous source
    if (sourceRef.current) {
      sourceRef.current.destroy();
    }

    let source: IPositionSource;

    if (mode === 'simulation') {
      source = new SimulationPositionSource(config);
    } else {
      if (!gpsOptions) {
        console.warn('GPS mode requires gpsOptions, falling back to simulation');
        source = new SimulationPositionSource(config);
        setMode('simulation');
        return;
      }
      source = new GPSPositionSource(config, gpsOptions);
    }

    sourceRef.current = source;
    setState(source.getState());
    setIsPlaying(source.isPlaying);
    setSpeedState(source.speed);

    const unsubscribe = source.subscribe((newState) => {
      console.log('[usePosition] State update received:', newState);
      setState(newState);
      setIsPlaying(source.isPlaying);
      setSpeedState(source.speed);
    });

    return () => {
      unsubscribe();
      source.destroy();
      sourceRef.current = null;
    };
  }, [mode, gpsOptions?.wsUrl, gpsOptions?.token]);

  // Update config on the existing source when config changes.
  // This effect runs after the source is created, so we use a ref to track it.
  useEffect(() => {
    if (!sourceRef.current) return;

    console.log('[usePosition] config changed, animCoords length:', config.animCoords.length, 'streetPoints length:', config.streetPoints.length);
    sourceRef.current.updateConfig(config);
    // The source will call _updateState() which notifies listeners, triggering setState
  }, [config]);

  const play = useCallback(() => {
    console.log('[usePosition] play() called');
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