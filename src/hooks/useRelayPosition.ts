/**
 * Posicion en vivo de una comparsa, leida del relay (SSE).
 *
 * QUE RESUELVE: en la pagina de Recorridos, el modo "GPS Real" usaba
 * `navigator.geolocation` del PROPIO visitante, no la posicion de la comparsa.
 * Eso obligaba a pulsar Play y nunca mostraba al emisor. Este hook se suscribe
 * al mismo canal que el visor publico (`/api/stream/location`), de modo que la
 * comparsa se ve en directo desde el segundo cero.
 *
 * DECISIONES:
 *  - Solo se suscribe cuando `enabled` es true (modo GPS Real). En modo Demo no
 *    se mantiene ninguna conexion abierta.
 *  - Se publica a 1 Hz, no por trama: el relay emite ~1 Hz por emisor y varios
 *    re-renders por segundo sobre un mapa son contraproducentes.
 *  - Cierra el stream en segundo plano: en movil el navegador lo congela y al
 *    volver la conexion suele estar muerta sin haber emitido `error`.
 *  - Nunca lanza: si el stream falla, la UI muestra simplemente "sin senal".
 */

import { useEffect, useRef, useState } from 'react';
import { resolveRoom } from '../config/liveRooms';
import { isDocumentVisible } from '../services/mobileResilience';

export interface RelayPosition {
  lat: number;
  lng: number;
  speedKmh: number;
  accuracyM: number;
  label: string;
}

export interface RelayPositionState {
  /** El stream esta abierto (conectado al relay). */
  connected: boolean;
  /** Ultima posicion conocida del emisor; null si aun no ha emitido. */
  position: RelayPosition | null;
  /** Segundos desde la ultima trama (0 si no hay datos). */
  ageSeconds: number;
  /**
   * Contador que se incrementa con CADA trama recibida. Permite forzar un
   * reencuadre aunque las coordenadas sean identicas: el mapa lo usa como
   * senal de "ha llegado actividad nueva".
   */
  frameNonce: number;
}

const INITIAL: RelayPositionState = {
  connected: false,
  position: null,
  ageSeconds: 0,
  frameNonce: 0,
};

const MAX_AGE_MS = 15000; // por encima de esto el emisor se considera perdido

function relayHttpBase(): string {
  const fromEnv = import.meta.env.VITE_WS_RELAY_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.trim().replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:').replace(/\/+$/, '');
  }
  return window.location.origin;
}


export function useRelayPosition(token: string, enabled = true): RelayPositionState {
  const [state, setState] = useState<RelayPositionState>(INITIAL);
  // Ultimo dato en una ref: el intervalo de 1 Hz lo lee sin provocar renders.
  const latestRef = useRef<RelayPositionState>(INITIAL);

  useEffect(() => {
    if (!enabled || !token) {
      // NO se llama a setState aqui:_RESET_ es trabajo de un efecto y provoke
      // un render en cascada. El estado mostrado se deriva abajo, y la ref ya
      // queda limpia para cuando se vuelva a activar.
      latestRef.current = INITIAL;
      return;
    }

    let source: EventSource | null = null;
    let ticker: ReturnType<typeof setInterval> | null = null;
    let closed = false;

    const publish = () => {
      const current = latestRef.current;
      if (!current.position) {
        setState(current);
        return;
      }
      const at = (current as { at?: number }).at ?? 0;
      const ageSeconds = Math.round((Date.now() - at) / 1000);
      setState({
        ...current,
        ageSeconds,
        // El emisor dejo de emitir: se marca perdido pero se conserva la ultima
        // posicion para que el marcador no salte ni desaparezca.
        connected: ageSeconds * 1000 <= MAX_AGE_MS && current.connected,
      });
    };

    const ingest = (raw: string) => {
      let frame: {
        type?: string;
        live?: Array<Record<string, unknown>>;
        [k: string]: unknown;
      };
      try {
        frame = JSON.parse(raw);
      } catch {
        return; // trama parcial o keep-alive
      }

      // El snapshot inicial (room_info) trae las posiciones vigentes en `live[]`.
      // Se acepta CUALQUIER trama que lleve ese array, no solo un tipo concreto:
      // el relay lo etiqueta como `room_info`, y atarse a un nombre fijo haria
      // que al reconectar no se repintase la ultima posicion conocida.
      const embedded = Array.isArray((frame as { live?: unknown[] }).live)
        ? ((frame as { live: Array<Record<string, unknown>> }).live)
        : null;
      const candidates = embedded && embedded.length > 0 ? embedded : [frame];

      for (const candidate of candidates) {
        if (!candidate || candidate.type !== 'gps') continue;
        const lat = Number(candidate.lat);
        const lng = Number(candidate.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        const next: RelayPositionState & { at: number } = {
          connected: true,
          position: {
            lat,
            lng,
            speedKmh: Math.max(0, Number(candidate.speed ?? 0)) * 3.6,
            accuracyM: Math.max(0, Number(candidate.accuracy ?? 0)),
            label: String(candidate.label ?? 'Comparsa'),
          },
          ageSeconds: 0,
          frameNonce: latestRef.current.frameNonce + 1,
          at: Date.now(),
        };
        latestRef.current = next;
        publish();
        return;
      }
    };

    const connect = () => {
      if (closed || source) return;
      if (!isDocumentVisible()) return; // no se abre en segundo plano
      const room = resolveRoom(token);
      const url = `${relayHttpBase()}/api/stream/location?token=${encodeURIComponent(room.token)}`;
      try {
        source = new EventSource(url);
      } catch {
        return; // sin EventSource: la UI mostrara "sin senal"
      }
      source.onopen = () => {
        if (closed) return;
        latestRef.current = { ...latestRef.current, connected: true };
        publish();
      };
      source.onmessage = (event) => ingest(event.data);
      // Se escucha tambien el evento con nombre por si el contrato cambiara.
      source.addEventListener('location', (event) => {
        ingest((event as MessageEvent<string>).data);
      });
      source.onerror = () => {
        // EventSource reintenta solo salvo que se cierre definitivamente.
        if (source && source.readyState === EventSource.CLOSED) {
          latestRef.current = { ...latestRef.current, connected: false };
          publish();
        }
      };
    };

    const disconnect = () => {
      if (!source) return;
      source.onopen = null;
      source.onmessage = null;
      source.onerror = null;
      try {
        source.close();
      } catch {
        /* ignore */
      }
      source = null;
    };

    const handleVisibility = () => {
      if (isDocumentVisible()) {
        connect();
        publish();
      } else {
        disconnect();
      }
    };

    connect();
    ticker = setInterval(publish, 1000);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleVisibility);

    return () => {
      closed = true;
      if (ticker) clearInterval(ticker);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleVisibility);
      disconnect();
      latestRef.current = INITIAL;
    };
  }, [token, enabled]);

  // Desactivado, el hook no expone senal: se deriva en lugar de resetear con
    // un setState dentro del efecto.
  return enabled && token ? state : INITIAL;
}
