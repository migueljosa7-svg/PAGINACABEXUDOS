/**
 * Waypoints emblematicos del recorrido (referencias para el ETA).
 * Coordenadas aproximadas del centro de Zaragoza (WGS84).
 */

export interface LandmarkWaypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export const LANDMARK_WAYPOINTS: LandmarkWaypoint[] = [
  { id: 'plaza-pilar', name: 'Plaza del Pilar', lat: 41.6566, lng: -0.8783 },
  { id: 'don-jaime', name: 'Calle Don Jaime I', lat: 41.654, lng: -0.8774 },
  { id: 'plaza-espana', name: 'Plaza de Espana', lat: 41.6507, lng: -0.8788 },
  { id: 'plaza-san-felipe', name: 'Plaza San Felipe', lat: 41.6554, lng: -0.8807 },
];

/** Velocidad minima (m/s) para considerar que la comparsa avanza. */
export const ETA_MIN_SPEED_MS = 0.2;

/** Factor de sinuosidad peatonal: la calle real es ~30% mas larga que la recta. */
export const ETA_SINUOSITY_FACTOR = 1.3;

/** Maximo de muestras del historial corto de velocidad. */
export const ETA_HISTORY_MAX = 12;

export interface EtaSample {
  lat: number;
  lng: number;
  t: number;
}

export type EtaState =
  | { kind: 'idle'; reason: 'sin-datos' }
  | { kind: 'stopped' }
  | { kind: 'ready'; waypointName: string; distanceM: number; speedMs: number; etaSec: number };

/**
 * Distancia haversine en metros (duplicada aqui para no acoplar el hook
 * a telemetryUtils; misma formula canonica R=6371000).
 */
export function etaHaversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Velocidad media (m/s) sobre el historial corto: suma(dist)/suma(tiempo).
 * Descarta teleports (>100 m entre muestras) y deltas no positivos.
 */
export function etaMeanSpeedMs(samples: EtaSample[]): number {
  if (samples.length < 2) return 0;
  let dist = 0;
  let timeSec = 0;
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const cur = samples[i];
    const dt = (cur.t - prev.t) / 1000;
    if (dt <= 0) continue;
    const d = etaHaversineMeters(prev.lat, prev.lng, cur.lat, cur.lng);
    if (d > 100) continue;
    dist += d;
    timeSec += dt;
  }
  if (timeSec <= 0) return 0;
  return dist / timeSec;
}

/** Waypoint emblematico mas cercano a la posicion dada. */
export function nearestWaypoint(lat: number, lng: number): { waypoint: LandmarkWaypoint; distanceM: number } {
  let best = LANDMARK_WAYPOINTS[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const w of LANDMARK_WAYPOINTS) {
    const d = etaHaversineMeters(lat, lng, w.lat, w.lng);
    if (d < bestDist) {
      bestDist = d;
      best = w;
    }
  }
  return { waypoint: best, distanceM: bestDist };
}

/**
 * Calcula el ETA al waypoint mas cercano.
 * Retorna 'stopped' si v < 0.2 m/s, 'idle' sin historial suficiente.
 */
export function computeEta(samples: EtaSample[]): EtaState {
  if (samples.length < 2) return { kind: 'idle', reason: 'sin-datos' };
  const last = samples[samples.length - 1];
  const speedMs = etaMeanSpeedMs(samples);
  if (!(speedMs >= ETA_MIN_SPEED_MS)) return { kind: 'stopped' };
  const { waypoint, distanceM } = nearestWaypoint(last.lat, last.lng);
  const estimatedM = distanceM * ETA_SINUOSITY_FACTOR;
  return {
    kind: 'ready',
    waypointName: waypoint.name,
    distanceM: Math.round(estimatedM),
    speedMs,
    etaSec: estimatedM / speedMs,
  };
}

/** "Llegada a Plaza del Pilar: ~8 min" / "a 250 m" / "menos de 1 min". */
export function formatEta(eta: EtaState): string {
  if (eta.kind === 'idle') return 'ETA no disponible (sin datos recientes)';
  if (eta.kind === 'stopped') return 'Detenido / En pausa';
  const mins = Math.round(eta.etaSec / 60);
  if (eta.distanceM < 60) return `Llegada a ${eta.waypointName}: aqui mismo`;
  if (mins < 1) return `Llegada a ${eta.waypointName}: menos de 1 min`;
  if (mins === 1) return `Llegada a ${eta.waypointName}: ~1 min`;
  if (mins < 120) return `Llegada a ${eta.waypointName}: ~${mins} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return `Llegada a ${eta.waypointName}: ~${hours} h ${rest} min`;
}
