/**
 * GPS Live status semantics
 *
 * Convierte los estados crudos del socket/GPS en una semantica de
 * usuario callejero con textos, tonos y reglas de pulso claras.
 * (kinds en ASCII para evitar problemas de encoding con la enie)
 */

export type GpsLiveStatusKind =
  | 'directo'
  | 'debil'
  | 'buscando'
  | 'simulacion'
  | 'desconectado';

export interface GpsLiveConnectionStatus {
  kind: GpsLiveStatusKind;
  /** Edad de la ultima trama en ms (solo directo/debil). */
  ageMs?: number;
  /** Precision GPS en metros (solo directo/debil). */
  accuracy?: number | null;
}

export interface GpsLiveSenderStatus {
  status: GpsLiveConnectionStatus;
  ageSec: number;
}

export interface GpsLiveStatusContext {
  status: GpsLiveConnectionStatus;
  lastSeenAt: number;
  isSimulated: boolean;
  liveSenderCount: number;
  sentence: string;
  sendersByStatus: Map<string, GpsLiveSenderStatus>;
}

export const GPS_STATUS_LABEL: Record<GpsLiveStatusKind, string> = {
  directo: 'En directo',
  debil: 'Senal debil',
  buscando: 'Buscando senal de la comparsa',
  simulacion: 'Estimacion',
  desconectado: 'Sin conexion',
};

/**
 * Regla de pulso del marcador.
 * Solo se activa el anillo pulsante cuando la senal es verdaderamente
 * "en directo". En modo debil o desconectado el marcador queda fijo para
 * evitar parpadeo innecesario en calle.
 */
export function isMarkerPulseActive(status: GpsLiveStatusKind): boolean {
  return status === 'directo';
}

/**
 * Edad de la senal en segundos a partir del momento actual.
 */
export function signalAgeSeconds(lastSeenAt: number): number {
  const ageMs = Math.max(0, Date.now() - lastSeenAt);
  return ageMs / 1000;
}

/**
 * Determina si, dado el lastSeen del emisor, la UX debe marcarse como
 * "directo" (<5s), "debil" (5-20s) o "buscando" (>20s / sin datos).
 */
export function classifyLiveSignalFromAge(
  ageMs: number,
  timeoutMs = 20000,
): GpsLiveStatusKind {
  if (ageMs < 5000) return 'directo';
  if (ageMs < timeoutMs) return 'debil';
  return 'buscando';
}

/**
 * Genera el texto legible para lectores de pantalla y para el badge.
 * Ejemplo: "En directo (hace 3s) - precision +-12m"
 */
export function gpsStatusSentence(
  status: GpsLiveConnectionStatus,
  options?: { includeAge?: boolean; includeAccuracy?: boolean },
): string {
  const { includeAge = true, includeAccuracy = true } = options ?? {};

  const base = GPS_STATUS_LABEL[status.kind];
  const parts: string[] = [base];

  if (
    includeAge &&
    (status.kind === 'directo' || status.kind === 'debil') &&
    typeof status.ageMs === 'number'
  ) {
    const ageSec = Math.round(status.ageMs / 1000);
    parts.push(`hace ${ageSec}s`);
  }

  if (
    includeAccuracy &&
    status.accuracy != null &&
    Number.isFinite(status.accuracy) &&
    (status.accuracy as number) > 0
  ) {
    parts.push(`+-${Math.round(status.accuracy as number)}m`);
  }

  if (status.kind === 'simulacion') {
    parts.push('estimacion del recorrido');
  }

  if (status.kind === 'buscando') {
    parts.push('sin datos recientes');
  }

  return parts.join(' - ');
}

