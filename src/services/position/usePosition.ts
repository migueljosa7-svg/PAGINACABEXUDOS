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

  // Create/recreate the position source ONLY when mode or GPS connection params change.
  // - GPS WebSocket connection must NOT be affected by config changes.
  // - GPS only needs to reconnect when wsUrl / token changes.
  // - Simulation source is created fresh when mode changes to simulation.
  useEffect(() => {
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
  // - For simulation: update the source with new route data.
  // - For GPS: only update config (keep WebSocket connection alive).
  useEffect(() => {
    const source = sourceRef.current;
    if (!source) return;

    source.updateConfig(config);
    setState(source.getState());
  }, [config]);

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
    if (source instanceof SimulationPositionSource) {
      source.updateConfig(newConfig);
    } else if (source instanceof GPSPositionSource) {
      source.updateConfig(newConfig);
    }
    setState(source?.getState() ?? createInitialState(newConfig));
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