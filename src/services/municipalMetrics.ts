/**
 * Métricas municipales para el dossier institucional (Zaragoza Cultural,
 * Protección Civil y Comercio de barrio).
 *
 * IMPORTANTE — HONESTIDAD DE LOS DATOS
 * ------------------------------------
 * La plataforma mide con exactitud lo que el sensor mide: posicion, itinerancia
 * y estado de la sesion. NO mide espectadores: no hay camara ni sensor de
 * aforo. Lo que si se puede afirmar con rigor es la *estructura* del problema:
 * longitud real de cada tramo, anchura util de calzada, recorrido oficial,
 * numero de paradas y, por tanto, la *superficie* donde puede concentrarse
 * la gente. El aforo es una ESTIMACION con supuestos declarados en
 * CROWD_MODEL, pensada para dimensionar y priorizar donde hacen falta
 * agentes, no para sustituir un recuento con sensor.
 *
 * Todas las funciones son puras y derivan de la única fuente de verdad de
 * datos del proyecto (singleSource), sin estado ni efectos.
 */

import type { Barrio, Route } from '../data/singleSource';
import { STATIC_POIS, POI_CATEGORY_LABEL } from '../data/pois';
import type { PoiCategory } from '../data/pois';
import { haversineMeters } from './position/telemetryUtils';

/**
 * Supuestos del modelo de aforo. Declarados aqui para que la administracion
 * pueda auditarlos y sustituirlos por sus propias fuentes (sensores, conteo
 * manual, acreditaciones) sin tocar la interfaz.
 */
export const CROWD_MODEL = {
  /** Espectadores por metro lineal de tramo, por tipo de calle. */
  spectatorsPerMeter: {
    plaza: 4.0,
    avenida: 1.8,
    calle: 0.9,
    estrecho: 1.4,
  } as Record<StreetKind, number>,
  /** Anchura útil de calzada (m) por tipo de calle: divisor de la densidad. */
  usableWidthM: {
    plaza: 22,
    avenida: 14,
    calle: 7,
    estrecho: 4,
  } as Record<StreetKind, number>,
  /** Umbrales de densidad (personas/m²) por nivel de riesgo. */
  riskThresholds: {
    medio: 1.0,
    alto: 2.0,
    critico: 3.0,
  },
  /** Desviación admitida (m) respecto al trazado oficial antes de alertar. */
  deviationToleranceM: 45,
  /** Retraso admitido (min) sobre el horario oficial antes de alertar. */
  delayToleranceMin: 3,
} as const;

export type StreetKind = 'plaza' | 'avenida' | 'calle' | 'estrecho';

export type RiskLevel = 'bajo' | 'medio' | 'alto' | 'critico';

export interface SegmentCrowding {
  street: string;
  kind: StreetKind;
  lengthM: number;
  estimatedSpectators: number;
  densityPerM2: number;
  risk: RiskLevel;
  isOfficialStop: boolean;
}

export interface MunicipalAlert {
  id: string;
  severity: 'info' | 'aviso' | 'critico';
  title: string;
  detail: string;
}

export interface MunicipalCoverage {
  totalBarrios: number;
  totalRoutes: number;
  totalSegments: number;
  totalOfficialStops: number;
  totalRouteKm: number;
  districts: number;
  poiByCategory: Array<{ category: PoiCategory; label: string; count: number }>;
}

export interface EconomicImpact {
  totalRouteKm: number;
  /** Superficie de exposición potencial (km lineales) donde hay escaparate. */
  exposureKm: number;
  /** Ticket medio estimado por consumidor en tramo de fiestas (€). */
  avgTicketEur: number;
  /** Multiplicador de permanencia: no todo el público consume. */
  conversionRate: number;
  potentialDailyRevenueEur: number;
  assumptions: string[];
}

/** Clasifica el tipo de vía a partir del nombre de la calle. */
export function classifyStreet(street: string): StreetKind {
  const s = (street || '').toLowerCase();
  if (/plaza|plazuela|paseo del pilar/.test(s)) return 'plaza';
  if (/avenida|av\.?|paseo|alameda|vía/.test(s)) return 'avenida';
  if (/callejon|cuesta|pasaje|callejón/.test(s)) return 'estrecho';
  return 'calle';
}

function riskForDensity(densityPerM2: number): RiskLevel {
  const t = CROWD_MODEL.riskThresholds;
  if (densityPerM2 >= t.critico) return 'critico';
  if (densityPerM2 >= t.alto) return 'alto';
  if (densityPerM2 >= t.medio) return 'medio';
  return 'bajo';
}


/**
 * Un tramo del recorrido con su aforo ESTIMADO y su densidad.
 *
 * La longitud se mide de verdad (Haversine entre waypoints consecutivos del
 * trazado oficial). El aforo se deriva de los supuestos declarados; por eso el
 * tipo de calle importa tanto como la longitud.
 */
export function buildSegmentCrowding(route: Route): SegmentCrowding[] {
  const points = route.waypoints;
  const segments: SegmentCrowding[] = [];

  for (let i = 1; i < points.length; i += 1) {
    const from = points[i - 1];
    const to = points[i];
    const lengthM = haversineMeters(from.lat, from.lng, to.lat, to.lng);
    if (!(lengthM > 0)) continue;

    // El tramo se nombra por la calle de destino: es la que se recorre al llegar.
    const street = to.calle || from.calle || 'Tramo sin nombre';
    const kind = classifyStreet(street);
    const perMeter = CROWD_MODEL.spectatorsPerMeter[kind];
    const widthM = CROWD_MODEL.usableWidthM[kind];

    const estimatedSpectators = Math.round(perMeter * lengthM);
    const densityPerM2 = widthM > 0 ? estimatedSpectators / (lengthM * widthM) : 0;

    segments.push({
      street,
      kind,
      lengthM: Math.round(lengthM),
      estimatedSpectators,
      densityPerM2: Math.round(densityPerM2 * 100) / 100,
      risk: riskForDensity(densityPerM2),
      isOfficialStop: Boolean(to.isStop),
    });
  }

  return segments;
}

/** Cobertura territorial y de red de ayuda: dato duro, sin estimaciones. */
export function buildCoverage(barrios: Barrio[]): MunicipalCoverage {
  const routes = barrios.map((b) => b.recorrido).filter((r) => r.waypoints.length > 0);
  const districts = new Set(barrios.map((b) => b.distrito));

  const poiByCategory = (Object.keys(POI_CATEGORY_LABEL) as PoiCategory[]).map((category) => ({
    category,
    label: POI_CATEGORY_LABEL[category],
    count: STATIC_POIS.filter((p) => p.category === category).length,
  }));

  return {
    totalBarrios: barrios.length,
    totalRoutes: routes.length,
    totalSegments: routes.reduce((acc, r) => acc + Math.max(0, r.waypoints.length - 1), 0),
    totalOfficialStops: routes.reduce(
      (acc, r) => acc + r.waypoints.filter((w) => w.isStop).length,
      0,
    ),
    totalRouteKm: Math.round(routes.reduce((acc, r) => acc + (r.distanceMeters || 0), 0) / 10) / 100,
    districts: districts.size,
    poiByCategory,
  };
}


/** Alertas de densidad por tramo, ordenadas de mas critico a menos. */
export function buildCrowdingAlerts(segments: SegmentCrowding[]): MunicipalAlert[] {
  const order: Record<RiskLevel, number> = { critico: 0, alto: 1, medio: 2, bajo: 3 };
  return segments
    .filter((s) => s.risk === 'alto' || s.risk === 'critico')
    .slice()
    .sort((a, b) => order[a.risk] - order[b.risk] || b.densityPerM2 - a.densityPerM2)
    .map((s) => ({
      id: `densidad-${s.street}-${s.lengthM}`,
      severity: s.risk === 'critico' ? ('critico' as const) : ('aviso' as const),
      title: `Densidad ${s.risk} en ${s.street}`,
      detail:
        `Aforo estimado ${s.estimatedSpectators} personas en ${s.lengthM} m ` +
        `(${s.densityPerM2} pers/m2). Reforzar ` +
        `${s.isOfficialStop ? 'la parada oficial incluida' : 'el paso de la comitiva'}.`,
    }));
}

/** Distancia de la comitiva al trazado oficial mas cercano (desvio real). */
export function measureDeviationMeters(route: Route, lat: number, lng: number): number {
  let best = Number.POSITIVE_INFINITY;
  for (const wp of route.waypoints) {
    const d = haversineMeters(lat, lng, wp.lat, wp.lng);
    if (d < best) best = d;
  }
  return Number.isFinite(best) ? best : Number.POSITIVE_INFINITY;
}

/**
 * Alertas operativas en vivo: desvio del recorrido oficial y retraso.
 * Devuelve [] cuando la comitiva va dentro de los margenes permitidos.
 */
export function buildLiveAlerts(input: {
  route: Route;
  live?: { lat: number; lng: number; label: string } | null;
  delayMinutes?: number | null;
}): MunicipalAlert[] {
  const alerts: MunicipalAlert[] = [];
  const { route, live, delayMinutes } = input;

  if (live) {
    const deviation = measureDeviationMeters(route, live.lat, live.lng);
    if (deviation > CROWD_MODEL.deviationToleranceM) {
      alerts.push({
        id: 'desvio-recorrido',
        severity: deviation > CROWD_MODEL.deviationToleranceM * 4 ? 'critico' : 'aviso',
        title: 'Desvio del recorrido oficial',
        detail:
          `${live.label} esta a ${Math.round(deviation)} m del trazado oficial ` +
          `(tolerancia ${CROWD_MODEL.deviationToleranceM} m). Verificar corte de via y avisar a Proteccion Civil.`,
      });
    }
  }

  if (typeof delayMinutes === 'number' && delayMinutes > CROWD_MODEL.delayToleranceMin) {
    alerts.push({
      id: 'retraso-comitiva',
      severity: delayMinutes > CROWD_MODEL.delayToleranceMin * 3 ? 'critico' : 'aviso',
      title: 'Retraso sobre el horario oficial',
      detail:
        `La comitiva va ${Math.round(delayMinutes)} min detras de la hora prevista ` +
        `(tolerancia ${CROWD_MODEL.delayToleranceMin} min). Reajustar los cortes de trafico.`,
    });
  }

  return alerts;
}


/**
 * Impacto economico orientativo del recorrido sobre el comercio de barrio.
 * NO es una previsjon de facturacion: es la superficie de exposicion con los
 * supuestos declarados, para dimensionar el programa de dinamizacion comercial.
 */
export function buildEconomicImpact(coverage: MunicipalCoverage): EconomicImpact {
  const totalRouteKm = coverage.totalRouteKm;
  const exposureKm = Math.round(totalRouteKm * 0.8 * 100) / 100;
  const avgTicketEur = 4.5;
  const conversionRate = 0.18;

  // 0,045 consumidores por metro y por dia de fiesta, declarado como supuesto.
  const potentialDailyRevenueEur =
    Math.round(exposureKm * 1000 * 0.045 * avgTicketEur * conversionRate);

  return {
    totalRouteKm,
    exposureKm,
    avgTicketEur,
    conversionRate,
    potentialDailyRevenueEur,
    assumptions: [
      `Longitud total de recorridos catalogados: ${totalRouteKm} km (dato duro del trazado oficial).`,
      'Se considera exposicion comercial el 80 % de esa longitud (tramos con escaparate a pie de via).',
      'Densidad de publico: 0,045 consumidores por metro lineal y dia de fiesta.',
      `Ticket medio por consumidor: ${avgTicketEur} EUR (hosteleria y comercio de barrio).`,
      `Tasa de conversion a consumo: ${Math.round(conversionRate * 100)} % del publico expuesto.`,
    ],
  };
}
