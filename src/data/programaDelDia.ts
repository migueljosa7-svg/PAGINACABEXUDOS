// ============================================================
// PROGRAMA DEL DÍA — resumen informativo del programa oficial
// ============================================================
//
// Qué resuelve: el programa impreso es un documento cerrado que hay que
// reimprimir cuando cambia el orden de los actos. Esta capa devuelve el
// "programa de hoy" calculado en el momento, con la distancia de cada acto
// al recorrido de los cabezudos, de modo que el ciudadano ve de un vistazo
// QUÉ PASA HOY y DÓNDE, sin salir de la app.
//
// De dónde sale todo (sin fuentes de datos nuevas):
//   - `calendarData.calendarEvents` es la agenda oficial ya curada.
//   - `barriosData.neighborhoodRoutes` es la geometría de los recorridos
//     (incluye `route-pilar-principal`, el eje municipal de referencia).
//
// `calendarData` no trae coordenadas (solo `location` en texto), igual que
// `waypoints.ts` mantiene su propio catálogo de puntos. Por eso los anclajes
// geográficos viven aquí, en una tabla explícita y auditable de una línea por
// acto: añadir un evento nuevo al programa es añadir su anclaje aquí.
//
// Criterio de "cerca del recorrido": `PROGRAMA_CERCANIA_M` metros al waypoint
// más próximo del recorrido municipal. Es el mismo criterio que usa el visor
// GPS para el vecindario, para que ambas vistas no se contradigan.

import { calendarEvents, type CalendarEvent } from './calendarData';
import { neighborhoodRoutes } from './barriosData';
import { haversineMeters } from '../services/position/telemetryUtils';

/** Recorrido municipal de referencia: el Gran Desfile del Pilar. */
export const PROGRAMA_RUTA_ID = 'route-pilar-principal';

/**
 * Radio de "cerca del recorrido" en metros. 250 m es lo que anda una persona
 * sin desviarse de la plaza: es "el mismo sitio" para quien va con el programa
 * impreso en la mano.
 */
export const PROGRAMA_CERCANIA_M = 250;

/** Máximo de actos destacados en el resumen (los más próximos al recorrido). */
export const PROGRAMA_MAX_DESTACADOS = 4;

/** Anclaje geográfico de los actos municipales del eje del Casco Histórico. */
export interface ProgramaAnclaje {
  lat: number;
  lng: number;
  /** Calle o plaza de referencia, legible para el ciudadano. */
  calle: string;
}

/**
 * Coordenadas de referencia por id de evento. Solo los actos que desarrollan
 * junto al recorrido municipal: el resto del calendario (fiestas de barrio,
 * pedanías) se muestra igualmente, pero sin distancia porque su lugar no
 * forma parte del eje de la comparsa.
 */
export const PROGRAMA_ANCLAJES: Record<string, ProgramaAnclaje> = {
  // La Seo y el entorno del Pilar
  'sv-2025-01': { lat: 41.6567, lng: -0.8793, calle: 'Plaza de la Seo' },
  'sv-2025-02': { lat: 41.6566, lng: -0.8785, calle: 'Casco Histórico (Pilar)' },
  'sv-2025-03': { lat: 41.6566, lng: -0.8783, calle: 'Plaza del Pilar' },
  'sv-2026-01': { lat: 41.6567, lng: -0.8793, calle: 'Plaza de la Seo' },
  'sv-2026-02': { lat: 41.6566, lng: -0.8785, calle: 'Casco Histórico (Pilar)' },
  'sv-2026-03': { lat: 41.6566, lng: -0.8783, calle: 'Plaza del Pilar' },
  // Pilar
  'ext-2025-01': { lat: 41.6566, lng: -0.8783, calle: 'Plaza del Pilar' },
  'pilar-2025-01': { lat: 41.6566, lng: -0.8783, calle: 'Plaza del Pilar' },
  'pilar-2025-02': { lat: 41.654, lng: -0.88, calle: 'Paseo de la Independencia' },
  'pilar-2025-03': { lat: 41.657, lng: -0.8783, calle: 'Basílica del Pilar' },
  'pilar-2025-07': { lat: 41.655, lng: -0.879, calle: 'Casco Histórico' },
  'pilar-2025-08': { lat: 41.658, lng: -0.879, calle: 'Plaza del Pilar - Coso' },
  'nav-2025-01': { lat: 41.6566, lng: -0.8783, calle: 'Plaza del Pilar' },
  'nav-2025-02': { lat: 41.652, lng: -0.879, calle: 'Coso - Plaza de España' },
  // San Jorge (la Plaza de España está en el recorrido)
  'sj-2025-01': { lat: 41.6517, lng: -0.8812, calle: 'Plaza de España' },
};

/** Un punto del recorrido de referencia, con su calle. */
export interface ProgramaPuntoRecorrido {
  lat: number;
  lng: number;
  calle: string;
}

/** Un acto del día, enriquecido con su relación con el recorrido. */
export interface ProgramaItem {
  evento: CalendarEvent;
  /** Metros al waypoint más próximo del recorrido. `null` si no hay anclaje. */
  distanciaAlRecorridoM: number | null;
  /** Calle del waypoint más próximo (la "puerta" por la que se llega). */
  calleCercana: string | null;
  /** true si cae dentro de `PROGRAMA_CERCANIA_M`. */
  enRecorrido: boolean;
  /** true si es un acto oficial (comparsa municipal o fiestas clave). */
  esMunicipal: boolean;
}

/** Resultado completo de la consulta "¿qué hay hoy?". */
export interface ProgramaDelDia {
  /** Fecha consultada (ISO local `YYYY-MM-DD`). */
  fecha: string;
  /** Fecha de los actos mostrados (difiere si hoy no hay programación). */
  fechaActos: string;
  /** Hoy hay actos programados. */
  esHoy: boolean;
  /** No hay actos hoy: los mostrados son los del próximo día con programa. */
  esProximoConPrograma: boolean;
  /** Días de diferencia respecto a hoy (0 = hoy). */
  diasDeDiferencia: number;
  /** Todos los actos del día, ordenados por hora. */
  items: ProgramaItem[];
  /** Subconjunto informativo: los actos que caen junto al recorrido. */
  destacados: ProgramaItem[];
  /** Número total de actos del día. */
  total: number;
  /** Número de actos junto al recorrido. */
  totalEnRecorrido: number;
  /** Frase resumen lista para pintar (una línea, sin HTML). */
  resumen: string;
  /** Avisos de servicio (hoy no hay acto, cortes de calle...). */
  avisos: string[];
}

/** Waypoints del recorrido municipal de referencia. */
export function recorridoPrograma(): ProgramaPuntoRecorrido[] {
  const ruta = neighborhoodRoutes.find((r) => r.id === PROGRAMA_RUTA_ID);
  if (!ruta || !ruta.points.length) return [];
  return ruta.points.map((p) => ({ lat: p.lat, lng: p.lng, calle: p.streetName }));
}

/**
 * Distancia (m) y calle del waypoint del recorrido más próximo al punto dado.
 * Si el recorrido no está disponible devuelve `null` en vez de inventar un 0:
 * un "0 m" falso haría creer al ciudadano que el acto cae en la calle exacta.
 */
export function puntoDelRecorridoMasCercano(
  lat: number,
  lng: number,
  puntos: ProgramaPuntoRecorrido[] = recorridoPrograma(),
): { distanciaM: number; calle: string } | null {
  let best: { distanciaM: number; calle: string } | null = null;
  for (const p of puntos) {
    const d = haversineMeters(lat, lng, p.lat, p.lng);
    if (!best || d < best.distanciaM) best = { distanciaM: d, calle: p.calle };
  }
  return best;
}

/** Fecha local en ISO `YYYY-MM-DD` (sin el shift de `toISOString`, que es UTC). */
export function fechaISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

/** Minutos desde medianoche de un "HH:mm"; null si no hay hora válida. */
function minutosDeHora(t?: string): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
}

/**
 * Orden del programa: primero los actos con hora (cronológico) y después los
 * que no la tienen, que el programa impreso lista al final de la jornada.
 */
function porHorario(a: CalendarEvent, b: CalendarEvent): number {
  const ma = minutosDeHora(a.time);
  const mb = minutosDeHora(b.time);
  if (ma === null && mb === null) return a.title.localeCompare(b.title, 'es');
  if (ma === null) return 1;
  if (mb === null) return -1;
  return ma - mb;
}

/** Actos municipales = los de la comparsa oficial o de las fiestas grandes. */
function esActoMunicipal(evento: CalendarEvent): boolean {
  if (evento.comparsa && /municipal/i.test(evento.comparsa)) return true;
  if (!evento.barrio) return true;
  return ['pilar', 'san-valero', 'cincomarzada', 'san-jorge'].includes(evento.category);
}

/** Actos de una fecha ISO concreta, ordenados por hora. */
export function eventosDeFecha(fecha: string): CalendarEvent[] {
  return calendarEvents.filter((e) => e.date === fecha).sort(porHorario);
}

/**
 * Primera fecha (>= `desde`) que tiene programación. Es lo que permite que
 * "Programa del día" siga siendo útil un 3 de julio: en vez de una pantalla
 * vacía, muestra el día festivo más próximo y lo dice expresamente.
 */
export function proximaFechaConPrograma(desde: string): string | null {
  const fechas = Array.from(new Set(calendarEvents.map((e) => e.date))).sort();
  return fechas.find((f) => f >= desde) ?? null;
}

/** Enriquece un acto con su distancia al recorrido. */
function aProgramaItem(evento: CalendarEvent): ProgramaItem {
  const anclaje = PROGRAMA_ANCLAJES[evento.id];
  const cercano = anclaje ? puntoDelRecorridoMasCercano(anclaje.lat, anclaje.lng) : null;
  return {
    evento,
    distanciaAlRecorridoM: cercano ? Math.round(cercano.distanciaM) : null,
    calleCercana: cercano ? cercano.calle : null,
    enRecorrido: cercano ? cercano.distanciaM <= PROGRAMA_CERCANIA_M : false,
    esMunicipal: esActoMunicipal(evento),
  };
}


/** "A 85 m del recorrido" / "A 1,4 km del recorrido" / "Fuera del eje". */
export function textoDistancia(item: ProgramaItem): string {
  if (item.distanciaAlRecorridoM === null) return 'Fuera del eje del recorrido';
  if (item.enRecorrido) return `A ${item.distanciaAlRecorridoM} m del recorrido`;
  const km = (item.distanciaAlRecorridoM / 1000).toFixed(1).replace('.', ',');
  return `A ${km} km del recorrido`;
}

/** Etiqueta compacta del día: "HOY" / "MAÑANA" / "EN 3 DIAS". */
export function etiquetaDia(diasDeDiferencia: number): string {
  if (diasDeDiferencia === 0) return 'HOY';
  if (diasDeDiferencia === 1) return 'MAÑANA';
  return `EN ${diasDeDiferencia} DIAS`;
}

/**
 * Programa del día completo.
 *
 * @param referencia Fecha de referencia (por defecto, hoy). Se inyecta para que
 *        los tests puedan fijar el día y no dependan del reloj del sistema.
 */
export function buildProgramaDelDia(referencia: Date = new Date()): ProgramaDelDia {
  const hoy = fechaISO(referencia);
  const deHoy = eventosDeFecha(hoy);
  const fechaActos = deHoy.length > 0 ? hoy : (proximaFechaConPrograma(hoy) ?? hoy);
  const diasDeDiferencia = Math.max(
    0,
    Math.round(
      (new Date(`${fechaActos}T00:00:00`).getTime() - new Date(`${hoy}T00:00:00`).getTime()) /
        86400000,
    ),
  );
  const esHoy = fechaActos === hoy;
  const items = eventosDeFecha(fechaActos).map(aProgramaItem);

  // Destacados: primero los que caen junto al recorrido y, a igual distancia,
  // los municipales. Es el orden con el que se lee un día de fiesta.
  const destacados = items
    .filter((i) => i.enRecorrido)
    .sort((a, b) => {
      if (a.esMunicipal !== b.esMunicipal) return a.esMunicipal ? -1 : 1;
      return (a.distanciaAlRecorridoM ?? Infinity) - (b.distanciaAlRecorridoM ?? Infinity);
    })
    .slice(0, PROGRAMA_MAX_DESTACADOS);

  const totalEnRecorrido = items.filter((i) => i.enRecorrido).length;
  const etiqueta = etiquetaDia(diasDeDiferencia);
  const plural = (n: number, sing: string, plur: string) => (n === 1 ? sing : plur);

  // El resumen se lee de un vistazo, así que lleva ADVERTIDO su propio "hoy no
  // hay acto": si esa advertencia viviera solo en `avisos`, quien lea únicamente
  // el resumen (o un lector de pantalla) se iría a la calle con la fecha
  // equivocada creyendo que el programa es de hoy.
  const resumen = items.length
    ? esHoy
      ? `Hoy ${items.length} ${plural(items.length, 'acto', 'actos')} en el programa, ${totalEnRecorrido} junto al recorrido de los cabezudos.`
      : `Hoy no hay acto. El siguiente programa es ${etiqueta.toLowerCase()} (${fechaActos}): ${items.length} ${plural(items.length, 'acto', 'actos')} ${plural(items.length, 'programado', 'programados')}, ${totalEnRecorrido} junto al recorrido.`
    : 'No hay actos programados en el calendario oficial a partir de hoy.';

  const avisos: string[] = [];
  if (!esHoy) {
    avisos.push(
      diasDeDiferencia === 1
        ? 'Hoy no hay acto: se muestra el programa de mañana.'
        : `Hoy no hay acto: se muestra el programa de ${etiqueta.toLowerCase()}.`,
    );
  }
  if (totalEnRecorrido === 0 && items.length > 0) {
    avisos.push('Ningún acto de esta fecha se sitúa sobre el eje del recorrido municipal.');
  }

  return {
    fecha: hoy,
    fechaActos,
    esHoy,
    esProximoConPrograma: !esHoy,
    diasDeDiferencia,
    items,
    destacados,
    total: items.length,
    totalEnRecorrido,
    resumen,
    avisos,
  };
}

