/**
 * useRelayPosition — Polling JSON robusto (reemplaza EventSource/SSE)
 *
 * Vercel Serverless no soporta conexiones SSE persistentes; responde con
 * Content-Type: text/html y rompe EventSource. Esta implementación hace
 * polling fetch cada ~1 s al endpoint REST /api/location/latest,
 * con backoff exponencial en fallos y reconexión automática al volver
 * a primer plano o recuperar la red.
 *
 * Contrato de respuesta esperado del backend (mismo JSON que SSE):
 *   { type: 'gps', lat: number, lng: number, speed?: number,
 *     accuracy?: number, label?: string, timestamp?: number }
 * o array de lo mismo si hay múltiples emisores.
 */

import { useEffect, useRef, useState } from 'react';
import { resolveRoom } from '../config/liveRooms';
import { getGpsRelayHttpBase, pingViewer } from '../config/gpsRelay';
import { isDocumentVisible } from '../services/mobileResilience';

export interface RelayPosition {
  lat: number;
  lng: number;
  speedKmh: number;
  accuracyM: number;
  label: string;
}

export interface RelayPositionState {
  connected: boolean;
  position: RelayPosition | null;
  trail: [number, number][];
  ageSeconds: number;
  frameNonce: number;
}

const INITIAL: RelayPositionState = {
  connected: false,
  position: null,
  trail: [],
  ageSeconds: 0,
  frameNonce: 0,
};

const MAX_AGE_MS = 15000;
const MAX_TRAIL_POINTS = 600;
const BASE_POLL_MS = 1500;
/** Sin emisor activo no hace falta preguntar cada segundo: ahorra Redis y batería. */
const IDLE_POLL_MS = 6000;
const IDLE_AFTER_MS = 20_000;
const MAX_POLL_MS = 8000;
const TICK_MS = 1000; // UI refresh rate

export function useRelayPosition(token: string, enabled = true): RelayPositionState {
  const [state, setState] = useState<RelayPositionState>(INITIAL);
  const latestRef = useRef<RelayPositionState & { at: number }>({ ...INITIAL, at: 0 });

  useEffect(() => {
    if (!enabled || !token) {
      latestRef.current = { ...INITIAL, at: 0 };
      return;
    }

    let closed = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let ticker: ReturnType<typeof setInterval> | null = null;
    let failCount = 0;

    const publish = () => {
      if (closed) return;
      const current = latestRef.current;
      if (!current.position) {
        setState({ ...INITIAL, connected: current.connected, trail: current.trail });
        return;
      }
      const ageSeconds = Math.round((Date.now() - current.at) / 1000);
      setState({
        ...current,
        ageSeconds,
        connected: ageSeconds * 1000 <= MAX_AGE_MS && current.connected,
      });
    };

    const ingest = (data: unknown) => {
      const frames = Array.isArray(data) ? data : [data];
      for (const frame of frames) {
        if (!frame || typeof frame !== 'object') continue;
        const f = frame as Record<string, unknown>;
        // Acepta tanto { type: 'gps' } como frames dentro de { live: [...] }
        const candidates = Array.isArray(f.live) ? f.live : [f];
        for (const candidate of candidates) {
          if (!candidate || typeof candidate !== 'object') continue;
          const c = candidate as Record<string, unknown>;
          if (c.type !== 'gps') continue;
          const lat = Number(c.lat);
          const lng = Number(c.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
          // Edad REAL del dato: el relay devuelve siempre la última posición, así
          // que sin esto una comparsa apagada parecería "en directo" para siempre.
          const serverNow = Number(f.timestamp) || Date.now();
          const frameTs = Number(c.timestamp) || serverNow;
          const receivedAt = Date.now() - Math.max(0, serverNow - frameTs);
          // Estela histórica que guarda el servidor (todo el recorrido del día).
          const serverTrail = Array.isArray(f.trail)
            ? (f.trail as unknown[]).filter(
                (p): p is [number, number] => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]),
              )
            : null;
          if (serverTrail && serverTrail.length > latestRef.current.trail.length) {
            latestRef.current = { ...latestRef.current, trail: serverTrail.slice(-MAX_TRAIL_POINTS) };
          }
          const previousPoint = latestRef.current.trail[latestRef.current.trail.length - 1];
          const moved = !previousPoint || previousPoint[0] !== lat || previousPoint[1] !== lng;
          const trail = previousPoint && previousPoint[0] === lat && previousPoint[1] === lng
            ? latestRef.current.trail
            : [...latestRef.current.trail.slice(-(MAX_TRAIL_POINTS - 1)), [lat, lng] as [number, number]];
          latestRef.current = {
            connected: true,
            position: {
              lat,
              lng,
              speedKmh: Math.max(0, Number(c.speed ?? 0)) * 3.6,
              accuracyM: Math.max(0, Number(c.accuracy ?? 0)),
              label: String(c.label ?? 'Comparsa'),
            },
            trail,
            ageSeconds: 0,
            // Solo se pide reencuadrar el mapa cuando la posición cambia de verdad.
            frameNonce: moved ? latestRef.current.frameNonce + 1 : latestRef.current.frameNonce,
            at: receivedAt,
          };
          publish();
          return;
        }
      }
    };

    const poll = async () => {
      if (closed || !isDocumentVisible()) {
        schedulePoll(BASE_POLL_MS);
        return;
      }
      const room = resolveRoom(token);
      const base = getGpsRelayHttpBase();
      pingViewer(room.token);
      const url = `${base}/api/location/latest?token=${encodeURIComponent(room.token)}`;
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        failCount = 0;
        latestRef.current = { ...latestRef.current, connected: true };
        ingest(data);
        const lastAt = latestRef.current.at;
        const idle = !lastAt || Date.now() - lastAt > IDLE_AFTER_MS;
        schedulePoll(idle ? IDLE_POLL_MS : BASE_POLL_MS);
      } catch {
        failCount++;
        latestRef.current = { ...latestRef.current, connected: false };
        publish();
        const delay = Math.min(BASE_POLL_MS * Math.pow(2, failCount - 1), MAX_POLL_MS);
        schedulePoll(delay);
      }
    };

    const schedulePoll = (ms: number) => {
      if (closed) return;
      if (pollTimer) clearTimeout(pollTimer);
      pollTimer = setTimeout(poll, ms);
    };

    const handleVisibility = () => {
      if (isDocumentVisible()) {
        failCount = 0;
        schedulePoll(0);
      }
    };

    // Inicio
    poll();
    ticker = setInterval(publish, TICK_MS);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleVisibility);

    return () => {
      closed = true;
      if (pollTimer) clearTimeout(pollTimer);
      if (ticker) clearInterval(ticker);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleVisibility);
      latestRef.current = { ...INITIAL, at: 0 };
    };
  }, [token, enabled]);

  return enabled && token ? state : INITIAL;
}
