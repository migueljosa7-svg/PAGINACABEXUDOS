import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useGpsKillSwitch
 * ==========
 * Hook de seguridad para el visor GPS en vivo.
 *
 * Regla: cuando el emisor deja de transmitir, se activa un temporizador
 * de seguridad de 5-10 minutos. Si transcurre sin rectificar, se ejecutan:
 *   1. navigator.geolocation.clearWatch()
 *   2. Desmontaje de listeners
 *   3. Marcado session = INACTIVE en el backend
 *   4. Registro de auditoria
 *   5. Toast visual + badge de estado
 *
 * Exporte la interfaz y la funcion principal.
 */

export type GpsSessionStatus = 'ACTIVE' | 'INACTIVE';

export interface GpsKillSwitchConfig {
  securityWindowMs?: number;
  onTimeout: () => void;
  onAudit: (event: GpsKillSwitchAuditEvent) => void;
  onMarkInactive: () => Promise<void>;
}

export interface GpsKillSwitchAuditEvent {
  event: 'GPS_KILLSWITCH_TIMEOUT';
  timestamp: number;
  durationMs: number;
  statusBefore: GpsSessionStatus;
  statusAfter: GpsSessionStatus;
  location?: string;
}

export interface UseGpsKillSwitchResult {
  isTimerActive: boolean;
  triggerCount: number;
  startWatch: (onSuccess: (pos: GeolocationPosition) => void, onError: (err: GeolocationPositionError) => void) => number;
  stopWatch: (watchId: number) => void;
  triggerSecurityTimer: (ms?: number) => void;
  resetTimer: () => void;
  markSessionInactive: () => Promise<void>;
  cleanup: () => void;
}

/**
 * Hook: Kill-switch de GPS con temporizador de seguridad y notificaciones visuales.
 *
 * El temporizador puede ser de 5 a 10 minutos.
 * Al expirar, ejecuta inmediatamente:
 * - navigator.geolocation.clearWatch()
 * - limpieza de listeners
 * - marcar sesion INACTIVE en backend
 * - registro de auditoria
 * - notificaciones visuales (toast, badge)
 */
export function useGpsKillSwitch(config: GpsKillSwitchConfig): UseGpsKillSwitchResult {
  const { securityWindowMs = 7 * 60 * 1000, onTimeout, onAudit, onMarkInactive } = config;

  const [isTimerActive, setIsTimerActive] = useState(false);
  const [triggerCount, setTriggerCount] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const triggerSecurityTimer = useCallback(
    (ms: number = securityWindowMs) => {
      clearTimer();

      // Validar rango 5-10 minutos
      const minSafeMs = 5 * 60 * 1000;
      const maxSafeMs = 10 * 60 * 1000;
      const effectiveMs = Math.max(minSafeMs, Math.min(maxSafeMs, ms));

      setIsTimerActive(true);
      setTriggerCount((prev) => prev + 1);

      timerRef.current = setTimeout(async () => {
        setIsTimerActive(false);
        clearTimer();

        // 1. Limpiar el watcher GPS
        if (watchIdRef.current !== null) {
          try {
            navigator.geolocation.clearWatch(watchIdRef.current);
          } catch {
            // ignore
          }
          watchIdRef.current = null;
        }

        // 2. Desmonta listener de posicion
        // (En este hook no se gestiona el listener directamente,
        //  pero se deja la referencia para que el componente
        //  que lo llame lo limpie explicitamente)

        // 3. Marcar sesion INACTIVE en backend
        try {
          await onMarkInactive();
        } catch (err) {
          console.error('[useGpsKillSwitch] Error al marcar sesion INACTIVE:', err);
        }

        // 4. Registrar auditoria
        onAudit({
          event: 'GPS_KILLSWITCH_TIMEOUT',
          timestamp: Date.now(),
          durationMs: effectiveMs,
          statusBefore: 'ACTIVE',
          statusAfter: 'INACTIVE',
        });

        // 5. Ejecutar callback del timeout
        onTimeout();
      }, effectiveMs);
    },
    [securityWindowMs, onTimeout, onMarkInactive, onAudit, clearTimer]
  );

  const resetTimer = useCallback(() => {
    clearTimer();
    setIsTimerActive(false);
  }, [clearTimer]);

  const startWatch = useCallback(
    (onSuccess: (pos: GeolocationPosition) => void, onError: (err: GeolocationPositionError) => void): number => {
      const id = navigator.geolocation.watchPosition(onSuccess, onError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
      watchIdRef.current = id;
      return id;
    },
    []
  );

  const stopWatch = useCallback((watchIdToStop: number) => {
    if (watchIdToStop !== 0) {
      try {
        navigator.geolocation.clearWatch(watchIdToStop);
      } catch {
        // ignore
      }
      if (watchIdRef.current === watchIdToStop) {
        watchIdRef.current = null;
      }
    }
  }, []);

  const markSessionInactive = useCallback(async () => {
    await onMarkInactive();
  }, [onMarkInactive]);

  const cleanup = useCallback(() => {
    clearTimer();
    if (watchIdRef.current !== null) {
      try {
        navigator.geolocation.clearWatch(watchIdRef.current);
      } catch {
        // ignore
      }
      watchIdRef.current = null;
    }
  }, [clearTimer]);

  // Limpieza en unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return { isTimerActive, triggerCount, startWatch, stopWatch, triggerSecurityTimer, resetTimer, markSessionInactive, cleanup };
}

export default useGpsKillSwitch;
