import { barrios, barriosById, getAllBarrioIds } from './singleSource';

export type ValidationSeverity = 'error';

export type ValidationIssue = {
  severity: ValidationSeverity;
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
};

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const isWaypointValid = (wp: { lat: number; lng: number; calle: string; isStop?: boolean }): boolean => {
  if (!isFiniteNumber(wp.lat) || wp.lat < -90 || wp.lat > 90) return false;
  if (!isFiniteNumber(wp.lng) || wp.lng < -180 || wp.lng > 180) return false;
  if (typeof wp.calle !== 'string' || wp.calle.trim().length === 0) return false;
  if (wp.isStop !== undefined && typeof wp.isStop !== 'boolean') return false;
  return true;
};

export function validateSingleSource(): ValidationResult {
  const issues: ValidationIssue[] = [];
  const push = (issue: Omit<ValidationIssue, 'severity'>) => issues.push({ severity: 'error', ...issue });

  // 1) Barrios básicos
  const barrioIds = getAllBarrioIds();
  const barrioIdSet = new Set(barrioIds);
  if (barrioIdSet.size !== barrioIds.length) {
    push({
      code: 'DUPLICATE_BARRIO_IDS',
      message: 'Existen IDs duplicados de barrios en singleSource.',
      details: { barrioIds },
    });
  }

  // 2) No existen placeholders
  for (const b of barrios) {
    if (b.recorrido?.id?.startsWith('route-missing-')) {
      push({
        code: 'PLACEHOLDER_ROUTE_FOUND',
        message: `Placeholder detectado: ${b.recorrido.id} para el barrio ${b.nombre} (${b.id}).`,
        details: { barrio: b, route: b.recorrido },
      });
    }
  }

  // 3) Exactamente 1 recorrido por barrio y mapeo correcto
  const seenRouteIds = new Set<string>();
  for (const b of barrios) {
    if (!b.recorrido) {
      push({
        code: 'BARRIO_WITHOUT_RECORRIDO',
        message: `El barrio ${b.nombre} (${b.id}) no tiene recorrido asignado.`,
        details: { barrio: b },
      });
      continue;
    }

    const r = b.recorrido;

    // El recorrido debe pertenecer al barrio
    if (r.barrioId !== b.id) {
      push({
        code: 'RECORDO_BARRIO_MISMATCH',
        message: `El recorrido ${r.id} pertenece a ${r.barrioId} pero está asignado al barrio ${b.id}.`,
        details: { recorrido: r, barrio: b },
      });
    }

    // IDs duplicados de recorridos
    if (seenRouteIds.has(r.id)) {
      push({
        code: 'DUPLICATE_ROUTE_IDS',
        message: `ID de recorrido duplicado: ${r.id}.`,
        details: { routeId: r.id },
      });
    }
    seenRouteIds.add(r.id);

    // Waypoints válidos
    const wps = r.waypoints ?? [];
    if (wps.length < 2) {
      push({
        code: 'INVALID_WAYPOINTS_COUNT',
        message: `El recorrido ${r.id} (${b.nombre}) no tiene suficientes waypoints (mínimo 2).`,
        details: { route: r, waypointCount: wps.length },
      });
    }
    for (let i = 0; i < wps.length; i++) {
      const wp = wps[i];
      if (!wp || !isWaypointValid(wp)) {
        push({
          code: 'INVALID_WAYPOINT',
          message: `Waypoint inválido en recorrido ${r.id} (barrio ${b.id}) en índice ${i}.`,
          details: { waypoint: wp, route: r, barrio: b, index: i },
        });
        break;
      }
    }

    // No placeholders en streets/metadata
    if (!Array.isArray(r.streets)) {
      push({
        code: 'INVALID_STREETS',
        message: `El recorrido ${r.id} tiene streets inválido (no es array).`,
        details: { route: r },
      });
    }
  }

  // 4) No existen barrios sin comparsa (integridad básica)
  for (const b of barrios) {
    if (!b.comparsa || typeof b.comparsa.id !== 'string' || b.comparsa.id.trim().length === 0) {
      push({
        code: 'BARRIO_WITHOUT_COMPARSA',
        message: `El barrio ${b.nombre} (${b.id}) no tiene comparsa válida.`,
        details: { barrio: b },
      });
    }
  }

  // 5) Todos los barrios aparecen también en /recorridos y /barrios
  // Como /barrios usa barrios[] y /recorridos usa barrios[].map(b=>b.recorrido), lo que validamos es:
  // - cada barrio tiene recorrido
  // - cada recorrido tiene barrioId existente
  for (const b of barrios) {
    if (!barriosById.get(b.id)) {
      push({
        code: 'BARRIO_MISSING_IN_BY_ID',
        message: `El barrio ${b.id} no existe en barriosById (inconsistencia interna).`,
        details: { barrio: b },
      });
    }
  }

  for (const b of barrios) {
    const r = b.recorrido;
    const hasBarrio = barriosById.get(r.barrioId);
    if (!hasBarrio) {
      push({
        code: 'ORPHAN_ROUTE_BARRIO',
        message: `Existe un recorrido huérfano por barrioId: ${r.id} -> barrioId=${r.barrioId}, pero ese barrio no existe.`,
        details: { route: r, missingBarrioId: r.barrioId },
      });
    }
  }

  // 6) Sanidad de campos tipo streets/waypoints
  for (const b of barrios) {
    const r = b.recorrido;
    if (!Array.isArray(r.waypoints)) {
      push({
        code: 'WAYPOINTS_NOT_ARRAY',
        message: `Recorrido ${r.id} no tiene waypoints array.`,
        details: { route: r },
      });
    }
    if (typeof r.category !== 'string' || (r.category !== 'gigante' && r.category !== 'cabezudo')) {
      push({
        code: 'INVALID_CATEGORY',
        message: `Categoría inválida en recorrido ${r.id}: ${r.category}`,
        details: { route: r },
      });
    }
  }

  return { ok: issues.length === 0, issues };
}

