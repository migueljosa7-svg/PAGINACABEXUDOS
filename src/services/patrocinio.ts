/**
 * PROXIMIDAD DE PATROCINIO — el motor que hace dinámico el mapa.
 *
 * Es la pieza que el programa impreso no puede tener: en lugar de un listado
 * fijo de locales, calcula para CADA patrocinador su distancia a la posición
 * real de la comparsa (la que llega por GPS/SSE al visor) y a la geometría del
 * recorrido, y decide si ese local merece salir destacado ahora mismo.
 *
 * Módulo puro: sin React, sin Leaflet, sin red. Se ejercita desde Node (lo
 * hace `scripts/verify-municipio.mjs`) y se reutiliza desde la página de
 * patrocinio, el visor en vivo y el panel municipal.
 *
 * Los umbrales salen de cómo se anda una calle de la fiesta, no de un número
 * redondo arbitrario:
 *   - 150 m: la comparsa está prácticamente en la puerta del local.
 *   - 400 m: se ve la pancarta desde la puerta y el local ya sirve a su público.
 */

import { haversineMeters } from './position/telemetryUtils';
import {
  PATROCINADORES,
  type Patrocinador,
  type PatrocinioCategoria,
} from '../data/patrocinadores';

/** Radio (m) a partir del cual el local sale como DESTACADO en el mapa. */
export const PATROCINIO_RADIO_DESTACADO_M = 150;

/** Radio (m) a partir del cual el local se considera "de la cabalgata". */
export const PATROCINIO_RADIO_CERCA_M = 400;

/**
 * Por debajo de esta velocidad (m/s) la comparsa está en una parada y el ETA
 * no tiene sentido: se devuelve `null` en vez de un número inventado.
 */
export const VELOCIDAD_MIN_UTILS_MS = 0.5;

// ---------------------------------------------------------------------------
// PARADA EN EL COMERCIO LOCAL (patrocinio B2B)
// ---------------------------------------------------------------------------
// Una parada larga es el único momento en que el público está quieto delante de
// una puerta. Por eso el banner de proximidad usa tres umbrales más estrictos
// que el destacado del mapa (150 m):
//   - 50 m: el público está literalmente en la puerta del local.
//   - 20 s: una parada de semáforo no es una parada; el local no paga por ella.
//   - 0,4 m/s: el mismo umbral que usa la analítica municipal
//     (`server/municipalAnalytics.js`, VELOCIDAD_PARADA_MS), para que el banner
//     del ciudadano y la tabla de paradas del ayuntamiento no se contradigan.
// Los tres son constantes exportadas y se verifican en `verify-municipio.mjs`.

/** Radio (m) máximo para considerar la parada "en la puerta" de un local. */
export const PATROCINIO_RADIO_PARADA_M = 50;

/** Duración mínima (s) de parada para que merezca un banner de comercio. */
export const PARADA_MINIMA_BANNER_SEG = 20;

/** Velocidad (m/s) por debajo de la cual la comparsa se considera parada. */
export const VELOCIDAD_PARADA_BANNER_MS = 0.4;

/** Parada detectada junto a un local: lo que consume el banner público. */
export interface ParadaEnComercio {
  /** Local más cercano dentro del radio de parada. */
  patrocinador: PatrocinadorConDistancia;
  /** Segundos que lleva parada la comparsa (redondeados). */
  segundosParado: number;
  /**
   * Texto listo para pintar. Se compone aquí (y no en el componente) para que
   * el mensaje sea verificable sin navegador.
   */
  mensaje: string;
}

export interface OpcionesParada {
  /** Velocidad media actual (m/s). Sin dato, se confía en `segundosParado`. */
  velocidadMs?: number | null;
  /** Segundos de parada acumulados. */
  segundosParado: number;
  /** Radio de búsqueda (m). Por defecto `PATROCINIO_RADIO_PARADA_M`. */
  radioM?: number;
  /** Categorías a considerar. Vacío = todas. */
  solo?: PatrocinioCategoria[];
}

/**
 * Local del catálogo que el público tiene en la puerta DURANTE una parada.
 *
 * Devuelve `null` en cuanto falla cualquiera de las tres condiciones (parada
 * corta, comparsa en marcha o ningún local en el radio): el banner no debe
 * inventarse una parada para vender un local.
 */
export function patrocinadorEnParada(
  ref: PosicionReferencia,
  opciones: OpcionesParada,
): ParadaEnComercio | null {
  const { velocidadMs = null, segundosParado, radioM = PATROCINIO_RADIO_PARADA_M } = opciones;
  if (!(segundosParado >= PARADA_MINIMA_BANNER_SEG)) return null;
  if (velocidadMs != null && Number.isFinite(velocidadMs) && velocidadMs > VELOCIDAD_PARADA_BANNER_MS) {
    return null;
  }

  // Se reutiliza el mismo cálculo de distancia que el mapa: si el local sale
  // "destacado" allí, aquí sale nombrado; no hay dos geometrías distintas.
  const cercano = porCategoria({ solo: opciones.solo })
    .map((p) => {
      const distanciaM = distanciaAPatrocinador(ref, p);
      return {
        ...p,
        distanciaM: Math.round(distanciaM),
        proximidad: clasificaProximidad(distanciaM),
        minutosEstimados: null,
      } satisfies PatrocinadorConDistancia;
    })
    .filter((p) => p.distanciaM <= radioM)
    .sort((a, b) => (a.distanciaM !== b.distanciaM ? a.distanciaM - b.distanciaM : a.nombre.localeCompare(b.nombre, 'es')));

  const patrocinador = cercano[0];
  if (!patrocinador) return null;

  return {
    patrocinador,
    segundosParado: Math.round(segundosParado),
    mensaje: `Comparsa en pausa junto a ${patrocinador.nombre} · ${patrocinador.gancho}`,
  };
}

/** Nivel de proximidad de un local respecto a un punto. */
export type PatrocinioProximidad = 'destacado' | 'cerca' | 'lejano';

/** Patrocinador + su estado respecto a la posición observada. */
export interface PatrocinadorConDistancia extends Patrocinador {
  /** Metros al punto de referencia (posición de la comparsa o waypoint). */
  distanciaM: number;
  /** Estado derivado de la distancia. */
  proximidad: PatrocinioProximidad;
  /**
   * Minutos estimados de cabalgata hasta el local, si se conoce la velocidad.
   * `null` con la comparsa parada o sin velocidad fiable.
   */
  minutosEstimados: number | null;
}

/** Posición de referencia: la comparsa en marcha o un waypoint del recorrido. */
export interface PosicionReferencia {
  lat: number;
  lng: number;
}

export interface OpcionesProximidad {
  /** Velocidad media de la comparsa (m/s) para calcular minutos estimados. */
  velocidadMs?: number | null;
  /** Categorías a excluir del resultado. */
  excluir?: PatrocinioCategoria[];
  /** Categorías a incluir (tiene prioridad sobre `excluir`). */
  solo?: PatrocinioCategoria[];
}

/** Distancia en metros entre la referencia y el patrocinador. */
export function distanciaAPatrocinador(
  ref: PosicionReferencia,
  patrocinador: PosicionReferencia,
): number {
  return haversineMeters(ref.lat, ref.lng, patrocinador.lat, patrocinador.lng);
}

/** Traduce una distancia a los tres estados que entiende la interfaz. */
export function clasificaProximidad(distanciaM: number): PatrocinioProximidad {
  if (distanciaM <= PATROCINIO_RADIO_DESTACADO_M) return 'destacado';
  if (distanciaM <= PATROCINIO_RADIO_CERCA_M) return 'cerca';
  return 'lejano';
}

/** Minutos de cabalgata hasta el local, o null si no se puede estimar. */
export function minutosHastaPatrocinador(
  distanciaM: number,
  velocidadMs: number | null | undefined,
): number | null {
  if (distanciaM <= 0) return 0;
  if (velocidadMs == null || !Number.isFinite(velocidadMs)) return null;
  if (velocidadMs < VELOCIDAD_MIN_UTILS_MS) return null;
  return Math.max(1, Math.round(distanciaM / velocidadMs / 60));
}

/** Orden de prioridad visual: destacado > cerca > lejano. */
function ordenProximidad(p: PatrocinioProximidad): number {
  return p === 'destacado' ? 0 : p === 'cerca' ? 1 : 2;
}

/** Filtra el catálogo por categoría, respetando `solo` sobre `excluir`. */
function porCategoria(opciones: OpcionesProximidad): Patrocinador[] {
  return PATROCINADORES.filter((p) => {
    if (opciones.solo?.length) return opciones.solo.includes(p.categoria);
    if (opciones.excluir?.length) return !opciones.excluir.includes(p.categoria);
    return true;
  });
}

/**
 * Enriquece el catálogo con la distancia a la referencia y el nivel derivado.
 *
 * El orden de salida es el que ve el público en la calle: primero lo más
 * cercano y, a igual distancia, el patrocinio de mayor nivel.
 */
export function patrociniosPorProximidad(
  ref: PosicionReferencia,
  opciones: OpcionesProximidad = {},
): PatrocinadorConDistancia[] {
  return porCategoria(opciones)
    .map((p) => {
      const distanciaM = distanciaAPatrocinador(ref, p);
      return {
        ...p,
        distanciaM: Math.round(distanciaM),
        proximidad: clasificaProximidad(distanciaM),
        minutosEstimados: minutosHastaPatrocinador(distanciaM, opciones.velocidadMs),
      };
    })
    .sort((a, b) => {
      if (a.proximidad !== b.proximidad) {
        return ordenProximidad(a.proximidad) - ordenProximidad(b.proximidad);
      }
      if (a.distanciaM !== b.distanciaM) return a.distanciaM - b.distanciaM;
      if (a.nivel !== b.nivel) return a.nivel === 'oro' ? -1 : 1;
      return a.nombre.localeCompare(b.nombre, 'es');
    });
}

/** Solo los locales que ya están sobre la marcha (dentro del radio cercano). */
export function patrociniosEnMarcha(
  ref: PosicionReferencia,
  opciones: OpcionesProximidad = {},
): PatrocinadorConDistancia[] {
  return patrociniosPorProximidad(ref, opciones).filter((p) => p.proximidad !== 'lejano');
}

/** ids de los locales destacados, para pintar el mapa sin recalcular. */
export function idsPatrocinadoresDestacados(
  lista: PatrocinadorConDistancia[],
): string[] {
  return lista.filter((p) => p.proximidad === 'destacado').map((p) => p.id);
}

/**
 * Distancia mínima de un local al POLÍGONO del recorrido, no a un punto suelto.
 * Se usa en la página de patrocinio (donde no hay posición de comparsa en
 * marcha, solo la ruta prevista) para decir "este local está en la calle del
 * desfile" con precisión, en vez de "cerca de un waypoint".
 */
export function distanciaAlRecorrido(
  patrocinador: PosicionReferencia,
  puntos: PosicionReferencia[],
): number {
  if (!puntos.length) return Number.POSITIVE_INFINITY;
  let min = Number.POSITIVE_INFINITY;
  for (const p of puntos) {
    const d = distanciaAPatrocinador(patrocinador, p);
    if (d < min) min = d;
  }
  return min;
}

/**
 * Catálogo ordenado por cercanía al RECORRIDO previsto (no a la posición en
 * marcha). Es lo que necesita la página /patrocinio antes de que salga la
 * comparsa: "tu bar está a 60 m del trazado, en el tramo de Don Jaime I".
 */
export function patrociniosSobreRecorrido(
  puntos: PosicionReferencia[],
  opciones: OpcionesProximidad & { radioM?: number } = {},
): PatrocinadorConDistancia[] {
  const radioM = opciones.radioM ?? PATROCINIO_RADIO_CERCA_M;
  return porCategoria(opciones)
    .map((p) => {
      const distanciaM = distanciaAlRecorrido(p, puntos);
      return {
        ...p,
        distanciaM: Math.round(distanciaM),
        proximidad: clasificaProximidad(distanciaM),
        minutosEstimados: null,
      };
    })
    .filter((p) => p.distanciaM <= radioM)
    .sort((a, b) => {
      if (a.distanciaM !== b.distanciaM) return a.distanciaM - b.distanciaM;
      if (a.nivel !== b.nivel) return a.nivel === 'oro' ? -1 : 1;
      return a.nombre.localeCompare(b.nombre, 'es');
    });
}

/** Texto de la distancia, listo para pintar bajo el marcador. */
export function textoDistanciaPatrocinio(p: PatrocinadorConDistancia): string {
  if (p.distanciaM < 1000) return `A ${p.distanciaM} m`;
  const km = (p.distanciaM / 1000).toFixed(1).replace('.', ',');
  return `A ${km} km`;
}

