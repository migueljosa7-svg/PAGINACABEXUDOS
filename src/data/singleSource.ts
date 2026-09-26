import type { ZonaType } from './barrioComparsasData';

export type DistritoType = ZonaType; // alias semántico (barrio|pueblo)

export type CharacterType = 'gigante' | 'cabezudo';

export interface Waypoint {
  lat: number;
  lng: number;
  calle: string;
  isStop?: boolean;
}

export interface Route {
  id: string;
  barrioId: string;
  nombre: string;
  distrito: DistritoType;
  category: 'gigante' | 'cabezudo';
  dateString: string;
  timeString: string;
  description: string;
  color: string;
  characterEmoji: string;
  characterName: string;
  streets: string[];
  durationMinutes: number;
  distanceMeters: number;
  waypoints: Waypoint[];
}

export interface Barrio {
  id: string;
  nombre: string;
  distrito: DistritoType;
  lat: number;
  lng: number;

  // comparsa
  comparsa: {
    id: string; // legacy compat
    asociacion: string;
    historia: string;
    description: string;
    hasGigantes: boolean;
    hasCabezudos: boolean;
  };

  // personajes
  gigantes: Array<{ id: string; name: string; description: string; year: number; emoji: string; color: string; copla?: string }>;
  cabezudos: Array<{ id: string; name: string; description: string; year: number; emoji: string; color: string; copla?: string }>;

  // mapa
  recorrido: Route;

  // extras no funcionales (para integraciones futuras)
  images: Array<{ src: string; alt: string }>;
  events: Array<{ id: string; title: string; date: string; description?: string }>;
  metadata: {
    mapZoom?: number;
  };
}

import { zaragozaNeighborhoods, neighborhoodRoutes, type NeighborhoodRoute } from './barriosData';
import { barrioComparsas, type BarrioComparsa } from './barrioComparsasData';
import {
  pruebaBarrioRoute,
  PRUEBA_BARRIO_CENTER,
  PRUEBA_BARRIO_TOKEN,
  normalizePruebaBarrioId,
} from './pruebaBarrioRoute';

function mapRouteFromNeighborhoodRoute(single: NeighborhoodRoute, distrito: DistritoType): Route {
  return {
    id: single.id,
    barrioId: single.barrioId,
    nombre: single.name,
    distrito,
    category: single.category,
    dateString: single.dateString,
    timeString: single.timeString,
    description: single.description,
    color: single.color,
    characterEmoji: single.characterEmoji,
    characterName: single.characterName,
    streets: single.streets,
    durationMinutes: single.duration,
    distanceMeters: single.distance,
    waypoints: (single.points ?? []).map((p) => ({
      lat: p.lat,
      lng: p.lng,
      calle: p.streetName,
      isStop: p.isStop,
    })),
  };
}

/**
 * Single source of truth (una sola lista consumible por el frontend).
 * Incluye un recorrido GPS en tiempo real "San José Demo - Ayuntamiento"
 * (Plaza del Pilar) para demostración.
 */
export const barrios: Barrio[] = (() => {
  const comparsaById = new Map<string, BarrioComparsa>(barrioComparsas.map((c) => [c.id, c]));

  // Build routes per barrioId
  const routesByBarrioId = new Map<string, NeighborhoodRoute[]>();
  for (const r of neighborhoodRoutes) {
    const list = routesByBarrioId.get(r.barrioId) ?? [];
    list.push(r);
    routesByBarrioId.set(r.barrioId, list);
  }

  const ensureSingleRoute = (barrioId: string) => {
    const list = routesByBarrioId.get(barrioId) ?? [];
    return list[0] ?? null;
  };

  const base = zaragozaNeighborhoods.map((n) => {
    const comp = comparsaById.get(n.id);
    const singleRoute = ensureSingleRoute(n.id);

    const gigantesRaw = comp?.personajes?.filter((p) => p.type === 'gigante') ?? [];
    const cabezudosRaw = comp?.personajes?.filter((p) => p.type === 'cabezudo') ?? [];

    const recorrido: Route = singleRoute
      ? mapRouteFromNeighborhoodRoute(singleRoute, n.zona)
      : {
          // Placeholder until we add missing routes.
          id: `route-missing-${n.id}`,
          barrioId: n.id,
          nombre: `${n.name} (pendiente)`,
          distrito: n.zona,
          category: 'cabezudo',
          dateString: '',
          timeString: '',
          description: 'Recorrido pendiente de completar.',
          color: '#999999',
          characterEmoji: '📍',
          characterName: 'Pendiente',
          streets: [],
          durationMinutes: 0,
          distanceMeters: 0,
          waypoints: [
            { lat: n.lat, lng: n.lng, calle: 'Salida', isStop: true },
            { lat: n.lat, lng: n.lng, calle: 'Llegada', isStop: true },
          ],
        };

    return {
      id: n.id,
      nombre: n.name,
      distrito: n.zona,
      lat: n.lat,
      lng: n.lng,

      comparsa: {
        id: comp?.id ?? n.id,
        asociacion: comp?.asociacion ?? 'Pendiente',
        historia: comp?.historia ?? '',
        description: comp?.description ?? '',
        hasGigantes: Boolean(comp?.hasGigantes),
        hasCabezudos: Boolean(comp?.hasCabezudos),
      },

      gigantes: gigantesRaw.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        year: p.year,
        emoji: p.emoji,
        color: p.color,
        copla: p.copla,
      })),
      cabezudos: cabezudosRaw.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        year: p.year,
        emoji: p.emoji,
        color: p.color,
        copla: p.copla,
      })),

      recorrido,
      images: [],
      events: [],
      metadata: { mapZoom: 15 },
    } satisfies Barrio;
  });

  // Add "San José Demo - Ayuntamiento" as an extra route for GPS real-time
  // demonstration. Centro y nombre se toman del propio recorrido para que no
  // puedan desincronizarse: la demo vive en Plaza del Pilar / Ayuntamiento.
  //
  // El id del barrio se NORMALIZA con `normalizePruebaBarrioId`, que solo anade
  // el prefijo si falta. Antes se concatenaba a mano
  // (`prueba-barrio-${route.id}`) sobre un id que ya empezaba por `prueba-barrio-`,
  // así que el barrio se llamaba `prueba-barrio-prueba-barrio-san-jose-...`
  // mientras su recorrido seguia apuntando a `prueba-barrio-san-jose-...`.
  // Ese desajuste rompia dos invariantes del validador y hacia que la app
  // lanzase al arrancar en produccion.
  const pruebaBarrioId = normalizePruebaBarrioId(pruebaBarrioRoute.id);

  const pruebaBarrioBaked: Barrio = {
    // Id unico y coherente con `pruebaBarrioRoute.barrioId` (el validador exige
    // que el recorrido apunte a un barrio EXISTENTE, no solo a uno con el mismo
    // nombre).
    id: pruebaBarrioId,
    nombre: pruebaBarrioRoute.nombre,
    distrito: 'barrio' as DistritoType,
    lat: PRUEBA_BARRIO_CENTER[0],
    lng: PRUEBA_BARRIO_CENTER[1],
    comparsa: {
      id: PRUEBA_BARRIO_TOKEN,
      asociacion: 'San José',
      historia: '',
      description: 'Recorrido GPS en tiempo real para demostración del seguimiento móvil.',
      hasGigantes: false,
      hasCabezudos: true,
    },
    gigantes: [],
    cabezudos: [],
    recorrido: {
      ...pruebaBarrioRoute,
      // El recorrido pertenece a ESTE barrio: misma constante, cero posibilidades
      // de que vuelvan a divergir.
      barrioId: pruebaBarrioId,
    },
    images: [],
    events: [],
    metadata: { mapZoom: 15 },
  };

  return [...base, pruebaBarrioBaked];
})();


export const barriosById = new Map(barrios.map((b) => [b.id, b] as const));

export function getBarrioById(id: string) {
  return barriosById.get(id) ?? null;
}

export function getAllBarrioIds() {
  return barrios.map((b) => b.id);
}

