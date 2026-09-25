/**
 * Telemetría unificada (v3.1) — única fuente de verdad matemática del proyecto.
 *
 * Consumida por los tres productores de posición:
 *   - GPSPositionSource        (GPS local, página Recorridos)
 *   - SimulationPositionSource (replay de rutas, página Recorridos)
 *   - Visor GPS-relay          (stream WebSocket, página GpsLive)
 *
 * Triple capa anti-ruido para que la distancia NO crezca con el teléfono parado:
 *   1. Puerta de precisión:    accuracy > accuracyGateM → muestra rechazada.
 *   2. Umbral adaptativo:      un paso cuenta si step >= max(NOISE_GATE_M, accuracy * 0.5).
 *      Los pasos menores se acumulan en `pending` y se comprometen cuando el
 *      DESPLAZAMIENTO NETO (drift) desde el inicio de la ráfaga supera ese mismo
 *      umbral → caminar lento acumula metros reales y el vagabundeo estático
 *      (drift ≈ 0) se descarta. Si pasa PENDING_TIMEOUT_MS sin drift, se purga.
 *   3. Techo de velocidad:     step/dt > maxSpeedMs → anti-teleport.
 *
 * Velocidades amortiguadas:
 *   - Instantánea: media móvil de las últimas `speedWindow` muestras
 *     (metricsUtils.smoothSpeed — la misma que SimulationPositionSource).
 *   - Media 10 s:  ventana deslizante Σd/Σt (distancia/tiempo, NO media de
 *     velocidades) → lectura limpia e estable para pantalla.
 */

import { smoothSpeed, msToKmh } from './metricsUtils';

// --- Constantes canónicas (visor GPS en vivo) --------------------------------
export const ACCURACY_GATE_M = 30;       // anti-jitter: se descarta si accuracy > 30 m
export const NOISE_GATE_M = 3;           // anti-ruido base: los pasos < 3 m no suman metros
export const MAX_STEP_M = 100;           // anti-teleport por muestra
export const MAX_SPEED_MS = 8;           // ~28,8 km/h: nadie corre con un gigante
export const SPEED_SMOOTH_WINDOW = 5;    // media móvil de 5 muestras
export const AVG_WINDOW_MS = 10000;      // ventana deslizante de la velocidad media
export const PENDING_TIMEOUT_MS = 30000; // parado confirmado: purga el pending

// --- Constantes del filtro de ahorro del emisor (GpsEmisor) ------------------
export const EMITTER_MIN_SEND_DISTANCE_M = 3;  // Parado (<3 m): no se emiten ni metros.
export const EMITTER_HEARTBEAT_MS = 10000;     // Heartbeat: <15 s de timeout del visor.
export const EMITTER_MAX_ACCURACY_M = 30;      // Ruido de antena: accuracy > 30 m se descarta.
export const DEMO_SPEED_MULTIPLIERS = [1, 2, 4] as const; // 1x / 2x / 4x (selector demo)
export type DemoSpeedMultiplier = (typeof DEMO_SPEED_MULTIPLIERS)[number];

/** Etiquetas de demo asociadas a cada multiplicador (solo presentación). */
export const DEMO_SPEED_LABEL: Record<DemoSpeedMultiplier, string> = {
  1: 'Velocidad real de caminata',
  2: 'Paso ligero / trote',
  4: 'Avance rápido para demostraciones exprés',
};

/** Normaliza un multiplicador arbitrario al valor de demo más cercano permitido. */
export function normalizeDemoSpeed(value: number): DemoSpeedMultiplier {
  let best: DemoSpeedMultiplier = 1;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const candidate of DEMO_SPEED_MULTIPLIERS) {
    const delta = Math.abs(candidate - value);
    if (delta < bestDelta) {
      best = candidate;
      bestDelta = delta;
    }
  }
  return best;
}

/** Fórmula canónica de Haversine (radio medio terrestre 6 371 000 m). */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface DistanceAccumulatorOptions {
  /** Rechaza muestras con accuracy mayor que este valor (m). */
  accuracyGateM?: number;
  /** Umbral base anti-ruido (m); el efectivo es max(noiseGateM, accuracy * 0.5). */
  noiseGateM?: number;
  /** Rechaza pasos individuales mayores que este valor (m). */
  maxStepM?: number;
  /** Techo de velocidad derivada (m/s) para rechazar teleports. */
  maxSpeedMs?: number;
  /** Tamaño de la media móvil de la velocidad instantánea. */
  speedWindow?: number;
  /** Ventana temporal (ms) de la velocidad media Σd/Σt. */
  avgWindowMs?: number;
  /** Registra v≈0 en las muestras rechazadas (visor en vivo: decae a cero parado). */
  zeroSpeedOnReject?: boolean;
}

export interface TelemetryPushInput {
  lat: number;
  lng: number;
  /** Precisión GPS en metros (0/desconocida pasa la puerta de precisión). */
  accuracy?: number | null;
  /** Timestamp de la muestra en ms (mismo reloj entre muestras consecutivas). */
  t: number;
  /** Velocidad del chip GPS en m/s (opcional; tiene prioridad sobre la derivada). */
  speedMs?: number | null;
  /** false durante pausa/detenido: avanza la referencia sin acumular métricas. */
  accumulate?: boolean;
}

export interface TelemetryPushResult {
  /** true si el paso superó los filtros (directo o comprometido vía pending). */
  accepted: boolean;
  /** Desplazamiento Haversine de esta muestra respecto a la anterior (m). */
  stepM: number;
}

export interface TelemetryReading {
  /** Distancia total acumulada y aceptada (m). */
  distanceM: number;
  /** Velocidad instantánea amortiguada (media móvil) en km/h. */
  instantKmh: number;
  /** Velocidad media de la ventana deslizante Σd/Σt en km/h. */
  avg10sKmh: number;
}

interface WindowEntry { t: number; d: number; dt: number; }
interface Anchor { lat: number; lng: number; t: number; }

/**
 * Acumulador de distancia real + velocidades amortiguadas, por emisor.
 * Puro (sin DOM ni React): testeable y compartido por GPS real, simulación
 * y stream del relay.
 */
export class DistanceAccumulator {
  private readonly accuracyGateM: number;
  private readonly noiseGateM: number;
  private readonly maxStepM: number;
  private readonly maxSpeedMs: number;
  private readonly speedWindow: number;
  private readonly avgWindowMs: number;
  private readonly zeroSpeedOnReject: boolean;

  private prev: Anchor | null = null;
  private totalM = 0;
  private pendingM = 0;
  private pendingStart: Anchor | null = null;
  private speedSamples: number[] = [];
  private window: WindowEntry[] = [];
  private lastT = 0;

  constructor(opts: DistanceAccumulatorOptions = {}) {
    this.accuracyGateM = opts.accuracyGateM ?? ACCURACY_GATE_M;
    this.noiseGateM = opts.noiseGateM ?? NOISE_GATE_M;
    this.maxStepM = opts.maxStepM ?? MAX_STEP_M;
    this.maxSpeedMs = opts.maxSpeedMs ?? MAX_SPEED_MS;
    this.speedWindow = opts.speedWindow ?? SPEED_SMOOTH_WINDOW;
    this.avgWindowMs = opts.avgWindowMs ?? AVG_WINDOW_MS;
    this.zeroSpeedOnReject = opts.zeroSpeedOnReject ?? false;
  }

  /**
   * Procesa una muestra de posición. Aplica las tres capas anti-ruido y, si
   * el paso supera el umbral adaptativo (directamente o vía acumulación
   * `pending` con confirmación de drift neto), compromete distancia y
   * velocidad. Ver cabecera del fichero para la explicación completa.
   */
  push(input: TelemetryPushInput): TelemetryPushResult {
    const lat = input.lat;
    const lng = input.lng;
    const accuracy = input.accuracy ?? 0;
    const t = input.t;
    const speedMs = input.speedMs ?? null;
    const accumulate = input.accumulate !== false;

    const prev = this.prev;
    if (!prev) {
      // Primera muestra: solo referencia inicial, sin métricas.
      this.prev = { lat, lng, t };
      return { accepted: false, stepM: 0 };
    }

    const stepM = haversineMeters(prev.lat, prev.lng, lat, lng);
    const dtSec = (t - prev.t) / 1000;

    const reject = (recordZero: boolean): TelemetryPushResult => {
      if (recordZero && this.zeroSpeedOnReject && accumulate) {
        this.recordSpeedSample(0, t);
      }
      this.prev = { lat, lng, t };
      return { accepted: false, stepM };
    };

    // En pausa/detenido: avanza la referencia (la reanudación medirá desde
    // aquí) y descarta el pending para no inflar la distancia con el periodo
    // pausado. Comportamiento análogo al original de GPSPositionSource.
    if (!accumulate) {
      this.prev = { lat, lng, t };
      this.pendingM = 0;
      this.pendingStart = null;
      return { accepted: false, stepM };
    }

    // --- Capa 0: muestras malformadas (reloj duplicado / NaN) ---
    if (!Number.isFinite(stepM) || !Number.isFinite(dtSec) || dtSec <= 0) return reject(true);
    // --- Capa 1: puerta de precisión (≤ 15 m en el visor en vivo) ---
    if (accuracy > this.accuracyGateM) return reject(true);
    // --- Capa 3: techo de velocidad (anti-teleport) ---
    if (stepM / dtSec > this.maxSpeedMs) return reject(true);
    // --- Anti-teleport por paso individual: purga también el pending huérfano ---
    if (stepM > this.maxStepM) {
      this.pendingM = 0;
      this.pendingStart = null;
      return reject(true);
    }

    // --- Capa 2: umbral adaptativo al error del GPS ---
    const gate = Math.max(this.noiseGateM, accuracy * 0.5);
    this.prev = { lat, lng, t };

    if (stepM >= gate) {
      // Paso directo por encima del umbral: cuenta él y el pending previo
      // (movimiento real que se estaba acumulando a paso corto).
      const committed = stepM + this.pendingM;
      const spanSec = this.pendingStart ? (t - this.pendingStart.t) / 1000 : dtSec;
      this.pendingM = 0;
      this.pendingStart = null;
      this.commit(committed, spanSec, t, speedMs);
      return { accepted: true, stepM };
    }

    // Paso por debajo del umbral: se guarda en `pending`. Se compromete cuando
    // el DESPLAZAMIENTO NETO desde el ancla supera el umbral (caminar lento:
    // drift ≈ Σpasos) o se descarta si pasa el timeout (parado sobre una mesa:
    // el vagabundeo vuelve al ancla, drift ≈ 0).
    if (!this.pendingStart) this.pendingStart = { lat: prev.lat, lng: prev.lng, t: prev.t };
    this.pendingM += stepM;
    const drift = haversineMeters(this.pendingStart.lat, this.pendingStart.lng, lat, lng);
    if (drift >= gate) {
      const spanSec = (t - this.pendingStart.t) / 1000;
      const committed = this.pendingM;
      this.pendingM = 0;
      this.pendingStart = null;
      this.commit(committed, spanSec, t, speedMs);
      return { accepted: true, stepM };
    }
    if (t - this.pendingStart.t > PENDING_TIMEOUT_MS) {
      // Parado confirmado 30 s: descarta el vagabundeo acumulado.
      this.pendingM = 0;
      this.pendingStart = null;
    }
    // Velocidad derivada del paso pequeño: ≈0 en heartbeats (parado), real
    // andando despacio. La media móvil la amortigua en ambos casos.
    this.recordSpeedSample(dtSec > 0 ? (stepM / dtSec) * 3.6 : 0, t);
    return { accepted: false, stepM };
  }

  /** Registra una muestra de velocidad instantánea (km/h) acotada y saneada. */
  private recordSpeedSample(kmh: number, t: number): void {
    const safe = Number.isFinite(kmh) ? Math.max(0, Math.min(kmh, this.maxSpeedMs * 3.6)) : 0;
    this.speedSamples.push(safe);
    if (this.speedSamples.length > this.speedWindow) this.speedSamples.shift();
    this.lastT = Math.max(this.lastT, t);
  }

  /** Compromete distancia: total + ventana Σd/Σt + muestra de velocidad. */
  private commit(distanceMeters: number, spanSec: number, t: number, speedMs: number | null): void {
    this.totalM += distanceMeters;
    // Prioridad a la velocidad del chip GPS (si es plausible); si no, derivada
    // de la distancia comprometida sobre su intervalo temporal.
    let kmh: number;
    if (speedMs != null && Number.isFinite(speedMs) && speedMs >= 0 && speedMs <= this.maxSpeedMs) {
      kmh = msToKmh(speedMs);
    } else {
      kmh = spanSec > 0 ? (distanceMeters / spanSec) * 3.6 : 0;
    }
    this.recordSpeedSample(kmh, t);
    this.window.push({ t, d: distanceMeters, dt: spanSec });
    this.lastT = Math.max(this.lastT, t);
  }

  /** Distancia total acumulada y aceptada (m). */
  get distanceM(): number {
    return this.totalM;
  }

  /** Velocidad instantánea amortiguada: media móvil de las últimas N muestras. */
  get instantKmh(): number {
    return smoothSpeed(this.speedSamples, this.speedWindow);
  }

  /**
   * Velocidad media de la ventana deslizante (10 s): Σd/Σt — promedio
   * distancia/tiempo, NO media de velocidades → lectura limpia y estable.
   */
  get avg10sKmh(): number {
    while (this.window.length > 0 && this.window[0].t < this.lastT - this.avgWindowMs) {
      this.window.shift();
    }
    let d = 0;
    let dt = 0;
    for (const w of this.window) {
      d += w.d;
      dt += w.dt;
    }
    return dt > 0 ? (d / dt) * 3.6 : 0;
  }

  /** Reinicia todo el estado (nueva sesión / play desde detenido). */
  reset(): void {
    this.prev = null;
    this.totalM = 0;
    this.pendingM = 0;
    this.pendingStart = null;
    this.speedSamples = [];
    this.window = [];
    this.lastT = 0;
  }
}

/** Instantánea legible para la UI (tarjeta de telemetría del visor). */
export function readTelemetry(acc: DistanceAccumulator): TelemetryReading {
  return {
    distanceM: acc.distanceM,
    instantKmh: acc.instantKmh,
    avg10sKmh: acc.avg10sKmh,
  };
}
