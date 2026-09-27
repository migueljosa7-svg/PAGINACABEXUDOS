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

