/**
 * useLoadingSimulator
 * ==================
 * Simula una conexion inicial de 2 segundos para los mapas y vistas pesadas.
 *
 * Usos:
 *   - GpsLiveView: esperar 2s antes de conectar el GPS real
 *   - Mapas con Leaflet/React-Leaflet: animacion de carga
 *   - WebSockets: animacion de conexion
 *
 * Al expirar los 2 segundos, emite el evento onReady
 * y el componente puede conectar su recurso real.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseLoadingSimulatorOptions {
  /** Duracion en ms (por defecto 2000 = 2 segundos) */
  durationMs?: number;
  /** Callback cuando empieza la simulacion */
  onStart?: () => void;
  /** Callback cuando termina la simulacion */
  onReady: () => void;
}

export interface UseLoadingSimulatorResult {
  isLoading: boolean;
  progress: number; // 0 a 1
  start: () => void;
  cancel: () => void;
  renderLoading?: (props: { message?: string; progress?: number }) => React.ReactNode;
}

/**
 * Hook que simula una carga de 2 segundos.
 *
 * Progreso de 0 a 100%, luego llama a onReady().
 * El componente puede usar `isLoading` y `progress` para mostrar indicadores.
 */
export function useLoadingSimulator(options: UseLoadingSimulatorOptions): UseLoadingSimulatorResult {
  const { durationMs = 2000, onStart, onReady } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cancel = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsLoading(false);
    setProgress(0);
    startTimeRef.current = null;
  }, []);

  const start = useCallback(() => {
    if (isLoading) return;

    setIsLoading(true);
    setProgress(0);
    startTimeRef.current = Date.now();
    onStart?.();

    intervalRef.current = setInterval(() => {
      if (startTimeRef.current === null) return;
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min(elapsed / durationMs, 1);
      setProgress(newProgress);

      if (newProgress >= 1) {
        // Complete: call onReady BEFORE cancel to ensure correct ordering
        onReady();
        // Clean up interval and state
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsLoading(false);
        setProgress(0);
        startTimeRef.current = null;
      }
    }, 50);
  }, [durationMs, isLoading, onStart, onReady, cancel]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setIsLoading(false);
      setProgress(0);
    };
  }, []);

  return { isLoading, progress, start, cancel };
}

export default useLoadingSimulator;
