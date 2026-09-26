/**
 * Señal en vivo de una comparsa para el panel institucional.
 *
 * Reutiliza el MISMO canal que el visor público (SSE del relay, 1:N), de modo
 * que el dossier no abre una conexion propia por cliente: miles de
 * espectadores simultaneos no escalan, y abrir un stream por comparsa tampoco.
 *
 * Es un hook de solo lectura y bajo coste: no provoca re-render por trama (se
 * publica un snapshot a 1 Hz) y se desconecta solo cuando la pestana se oculta
 * o el componente se desmonta.
 */

import { useEffect, useRef, useState } from 'react';
import { PRUEBA_BARRIO } from '../config/pruebaBarrio';
import { isDocumentVisible } from '../services/mobileResilience';

export interface LiveComparsaSnapshot {
  connected: boolean;
  label: string;
  lat: number;
  lng: number;
  speedKmh: number;
  accuracyM: number;
  ageSeconds: number;
}

const IDLE: LiveComparsaSnapshot = {
  connected: false,
  label: '',
  lat: 0,
  lng: 0,
  speedKmh: 0,
  accuracyM: 0,
  ageSeconds: 0,
};

/** Base HTTP del relay, derivada de la misma variable de entorno que el visor. */
function getRelayHttpBase(): string {
  const fromEnv = import.meta.env.VITE_WS_RELAY_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.trim().replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:').replace(/\/+$/, '');
  }
  return window.location.origin;
}

export function useLiveComparsaSignal(
  token: string = PRUEBA_BARRIO.id,
  refreshMs = 1000,
): LiveComparsaSnapshot {
  const [snapshot, setSnapshot] = useState<LiveComparsaSnapshot>(IDLE);
  const latestRef = useRef<LiveComparsaSnapshot>(IDLE);

  useEffect(() => {
    if (!token) return;
    let source: EventSource | null = null;
    let ticker: ReturnType<typeof setInterval> | null = null;
    let closed = false;

    const publish = () => {
      const current = latestRef.current;
      const ageSeconds = current.lat === 0 && current.lng === 0
        ? 0
        : Math.max(0, Math.round((Date.now() - (current as { t?: number }).t!) / 1000));
      setSnapshot({ ...current, ageSeconds });
    };

    const handleFrame = (raw: string) => {
      let frame: {
        type?: string;
        lat?: number;
        lng?: number;
        speed?: number;
        accuracy?: number;
        label?: string;
      };
      try {
        frame = JSON.parse(raw);
      } catch {
        return;
      }
      // El snapshot inicial del relay llega embebido en `live`.
      const candidates = frame.type === 'location_snapshot' && Array.isArray((frame as { live?: unknown[] }).live)
        ? ((frame as { live: Array<Record<string, unknown>> }).live)
        : [frame as Record<string, unknown>];

      for (const candidate of candidates) {
        if (candidate.type !== 'gps') continue;
        const lat = Number(candidate.lat);
        const lng = Number(candidate.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        latestRef.current = {
          connected: true,
          label: String(candidate.label ?? 'Comparsa'),
          lat,
          lng,
          speedKmh: Math.max(0, Number(candidate.speed ?? 0)) * 3.6,
          accuracyM: Math.max(0, Number(candidate.accuracy ?? 0)),
          ageSeconds: 0,
        } as LiveComparsaSnapshot & { t: number };
        (latestRef.current as { t?: number }).t = Date.now();
        publish();
        return;
      }
    };

    const connect = () => {
      if (closed || source) return;
      if (!isDocumentVisible()) return;
      const url = `${getRelayHttpBase()}/api/stream/location?token=${encodeURIComponent(token)}`;
      try {
        source = new EventSource(url);
      } catch {
        return;
      }
      source.onmessage = (event) => handleFrame(event.data);
      source.addEventListener('location', (event) => {
        handleFrame((event as MessageEvent<string>).data);
      });
      source.onerror = () => {
        // EventSource reintenta solo; solo hay que reflejar el estado.
        if (source && source.readyState === EventSource.CLOSED) {
          latestRef.current = { ...IDLE };
          publish();
        }
      };
    };

    const disconnect = () => {
      if (source) {
        source.close();
        source = null;
      }
    };

    const handleVisibility = () => {
      if (isDocumentVisible()) {
        connect();
        publish();
      } else {
        // En segundo plano el navegador congela el stream: se cierra limpio.
        disconnect();
      }
    };

    connect();
    ticker = setInterval(publish, refreshMs);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleVisibility);

    return () => {
      closed = true;
      if (ticker) clearInterval(ticker);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleVisibility);
      disconnect();
    };
  }, [token, refreshMs]);

  return snapshot;
}
