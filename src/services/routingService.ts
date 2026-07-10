/**
 * OSRM Routing Service
 * 
 * Uses the public OSRM demo server to calculate real street-following paths
 * between waypoints using OpenStreetMap data.
 * 
 * OSRM (Open Source Routing Machine) is free and open-source.
 * Public demo server: https://router.project-osrm.org/
 * 
 * This replaces the previous straight-line coordinate interpolation
 * which caused routes to cut through buildings.
 */

export interface RouteGeometry {
  coordinates: [number, number][]; // [lng, lat] pairs
  distance: number; // meters
  duration: number; // seconds
}

export interface RouteWaypoint {
  lat: number;
  lng: number;
  streetName: string;
  isStop?: boolean;
}

/**
 * Fetches a real street-following route from OSRM.
 * 
 * @param waypoints - Array of waypoints to route through
 * @returns GeoJSON-style LineString coordinates that follow real streets
 */
export type RouteQuality = {
  // 0..1 (higher is better)
  score: number;
  reason: string;
  // Heuristics derived from the provided bounding box of waypoints
  bboxDistanceScore: number;
  bboxEscapeRatio: number;
};

export type FixRouteResult = {
  geometry: RouteGeometry | null;
  usedWaypoints: { lat: number; lng: number }[];
  // Whether we had to change/add waypoints
  corrected: boolean;
  attempts: number;
  quality?: RouteQuality;
  debugLog?: string[];
};

function buildOsrmUrl(waypoints: { lat: number; lng: number }[]): string {
  const coordsStr = waypoints.map((wp) => `${wp.lng},${wp.lat}`).join(';');
  return `https://router.project-osrm.org/route/v1/foot/${coordsStr}?geometries=geojson&overview=full&steps=true&alternatives=false`;
}

function toBounds(pts: { lat: number; lng: number }[], paddingMeters: number) {
  // Approx conversion: 1 deg lat ~ 111km; 1 deg lng depends on latitude.
  // Good enough for heuristics and production logging.
  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latPadDeg = paddingMeters / 111_000;
  const meanLat = (minLat + maxLat) / 2;
  const lngMetersPerDeg = 111_000 * Math.cos((meanLat * Math.PI) / 180);
  const lngPadDeg = lngMetersPerDeg <= 1 ? paddingMeters / 111_000 : paddingMeters / lngMetersPerDeg;

  return {
    minLat: minLat - latPadDeg,
    maxLat: maxLat + latPadDeg,
    minLng: minLng - lngPadDeg,
    maxLng: maxLng + lngPadDeg,
  };
}

function isPointInsideBounds(p: { lat: number; lng: number }, b: ReturnType<typeof toBounds>) {
  return p.lat >= b.minLat && p.lat <= b.maxLat && p.lng >= b.minLng && p.lng <= b.maxLng;
}

function scoreRouteGeometry(
  geometryLatLng: { lat: number; lng: number }[],
  waypoints: { lat: number; lng: number }[]
): RouteQuality {
  if (geometryLatLng.length < 2) {
    return {
      score: 0,
      reason: 'Too few OSRM points',
      bboxDistanceScore: 0,
      bboxEscapeRatio: 1,
    };
  }

  const bbox = toBounds(waypoints, 1000); // padding heuristic (meters)

  let escaped = 0;

  for (const p of geometryLatLng) {

    const inside = isPointInsideBounds(p, bbox);
    if (!inside) escaped++;
  }

  // Heuristic: distance of geometry centroid to waypoint centroid / expected scale
  const centroid = geometryLatLng.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 }
  );
  centroid.lat /= geometryLatLng.length;
  centroid.lng /= geometryLatLng.length;

  const wpCentroid = waypoints.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 }
  );
  wpCentroid.lat /= waypoints.length;
  wpCentroid.lng /= waypoints.length;

  const centroidDist = haversineDistance(centroid.lat, centroid.lng, wpCentroid.lat, wpCentroid.lng);
  // expected scale ~ bbox diagonal (rough)
  const bboxDiagMeters = Math.max(
    haversineDistance(bbox.minLat, bbox.minLng, bbox.maxLat, bbox.minLng),
    haversineDistance(bbox.minLat, bbox.minLng, bbox.minLat, bbox.maxLng)
  );

  const bboxDistanceScore = bboxDiagMeters <= 10 ? 0.5 : Math.max(0, 1 - centroidDist / bboxDiagMeters);
  const bboxEscapeRatio = escaped / geometryLatLng.length;

  // final score: penalize escaping hard
  const score = Math.max(0, Math.min(1, bboxDistanceScore * (1 - bboxEscapeRatio * 1.7)));

  const reason = bboxEscapeRatio > 0.12 ? 'Geometry escapes waypoint bbox' : 'Geometry matches waypoint bbox';

  return { score, reason, bboxDistanceScore, bboxEscapeRatio };
}

async function fetchOSRMRouteRaw(waypoints: { lat: number; lng: number }[]): Promise<RouteGeometry | null> {
  if (waypoints.length < 2) return null;
  const url = buildOsrmUrl(waypoints);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`OSRM request failed with status ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      console.warn('OSRM returned no routes');
      return null;
    }

    const route = data.routes[0];
    const geometry = route.geometry;

    return {
      coordinates: geometry.coordinates as [number, number][],
      distance: route.distance,
      duration: route.duration,
    };
  } catch (error) {
    console.warn('OSRM request failed:', error);
    return null;
  }
}

export async function fetchOSRMRoute(
  waypoints: { lat: number; lng: number }[]
): Promise<RouteGeometry | null> {
  return fetchOSRMRouteRaw(waypoints);
}

function jitterWaypoint(p: { lat: number; lng: number }, meters: number, attempt: number) {
  // Convert meters->deg
  const latDelta = meters / 111_000;
  const meanLatRad = (p.lat * Math.PI) / 180;
  const lngMetersPerDeg = 111_000 * Math.cos(meanLatRad);
  const lngDelta = lngMetersPerDeg <= 1 ? meters / 111_000 : meters / lngMetersPerDeg;

  // Deterministic small offset based on attempt index
  const sign = attempt % 2 === 0 ? 1 : -1;
  const swap = Math.floor(attempt / 2) % 2;
  const dLat = sign * (swap === 0 ? latDelta : -latDelta) * 0.6;
  const dLng = -sign * (swap === 0 ? lngDelta : -lngDelta) * 0.6;

  return { lat: p.lat + dLat, lng: p.lng + dLng };
}

/**
 * Insert multiple intermediate waypoints between consecutive waypoints
 * to give OSRM more guidance points, improving route quality.
 */
function insertIntermediateWaypoints(
  waypoints: { lat: number; lng: number }[],
  maxAddsPerSegment: number
): { lat: number; lng: number }[] {
  if (waypoints.length < 2) return waypoints;
  const out: { lat: number; lng: number }[] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    out.push(a);

    // For segments with distance > 200m, add intermediate points to help OSRM
    const segDist = haversineDistance(a.lat, a.lng, b.lat, b.lng);
    const numAdds = Math.min(maxAddsPerSegment, Math.max(0, Math.floor(segDist / 150)));

    for (let j = 0; j < numAdds; j++) {
      const t = (j + 1) / (numAdds + 1);
      const mid = {
        lat: a.lat + t * (b.lat - a.lat),
        lng: a.lng + t * (b.lng - a.lng)
      };
      // Small perpendicular offset to avoid snapping to the direct line
      const offset = 20;
      const latDelta = offset / 111_000;
      const meanLatRad = (mid.lat * Math.PI) / 180;
      const lngMetersPerDeg = 111_000 * Math.cos(meanLatRad) || 111_000;
      const lngDelta = offset / lngMetersPerDeg;
      // Alternate side of the line for each intermediate point
      const side = j % 2 === 0 ? 1 : -1;
      out.push({
        lat: mid.lat + side * latDelta * (j + 1),
        lng: mid.lng + side * lngDelta * (j + 1),
      });
    }
  }
  out.push(waypoints[waypoints.length - 1]);
  return out;
}

export async function fetchOSRMRouteWithAutoFix(
  waypoints: { lat: number; lng: number }[],
  opts?: {
    maxAttempts?: number;
    // score threshold: if score drops below -> considered incorrect
    minAcceptableScore?: number;
    // how much to jitter a problematic waypoint
    jitterMeters?: number;
    insertIntermediates?: boolean;
    maxAddsPerSegment?: number;
  }
): Promise<FixRouteResult> {
  const maxAttempts = opts?.maxAttempts ?? 3;
  const minAcceptableScore = opts?.minAcceptableScore ?? 0.25;

  const jitterMeters = opts?.jitterMeters ?? 25;
  const insertIntermediates = opts?.insertIntermediates ?? true;
  const maxAddsPerSegment = opts?.maxAddsPerSegment ?? 2; // Increased from 1 to 2

  const debugLog: string[] = [];

  const tryFetch = async (currentWaypoints: { lat: number; lng: number }[]) => {
    const geometry = await fetchOSRMRouteRaw(currentWaypoints);
    if (!geometry) return { geometry: null as RouteGeometry | null, quality: undefined as RouteQuality | undefined };
    const geometryLatLng = osrmToLatLng(geometry.coordinates);
    const quality = scoreRouteGeometry(geometryLatLng, currentWaypoints);
    return { geometry, quality };
  };

  // 1) direct attempt
  let usedWaypoints = waypoints;
  let attempts = 0;
  let best: FixRouteResult | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    attempts++;
    debugLog.push(`OSRM auto-fix attempt ${attempt + 1}/${maxAttempts}`);

    const res = await tryFetch(usedWaypoints);
    if (!res || !res.geometry) {
      debugLog.push('OSRM failed (null geometry)');
      // First failure: try with inserted intermediates immediately
      if (attempt === 0 && insertIntermediates) {
        const inserted = insertIntermediateWaypoints(waypoints, maxAddsPerSegment);
        if (inserted.length > waypoints.length) {
          usedWaypoints = inserted;
          debugLog.push(`Inserted ${inserted.length - waypoints.length} intermediate waypoints`);
        }
      }
      continue;
    }

    debugLog.push(`Quality: score=${res.quality?.score?.toFixed(3)} escaped=${res.quality?.bboxEscapeRatio?.toFixed(3)} (${res.quality?.reason})`);

    const corrected = attempt > 0 || usedWaypoints.length !== waypoints.length;
    best = {
      geometry: res.geometry,
      usedWaypoints,
      corrected,
      attempts,
      quality: res.quality,
      debugLog: [...debugLog],
    };

    // Accept if score is good enough
    if (res.geometry && (res.quality?.score ?? 0) >= minAcceptableScore) {
      debugLog.push('Acceptable quality reached, returning');
      return best;
    }

    // If quality is too low, try jittering intermediate waypoints
    if (attempt < maxAttempts - 1) {
      // jitter only inner points to preserve endpoints
      const next = usedWaypoints.map((p, idx) => {
        if (idx === 0 || idx === usedWaypoints.length - 1) return p;
        return jitterWaypoint(p, jitterMeters, attempt + idx);
      });
      usedWaypoints = next;
      continue;
    }
  }

  // 3) final attempt: insert intermediate points (optional)
  if (insertIntermediates) {
    const inserted = insertIntermediateWaypoints(waypoints, maxAddsPerSegment);
    if (inserted.length !== waypoints.length) {
      const res = await tryFetch(inserted);
      attempts++;
      if (res.geometry) {
        const quality = res.quality;
        debugLog.push(`Final intermediate attempt: score=${quality?.score?.toFixed(3)}`);
        return {
          geometry: res.geometry,
          usedWaypoints: inserted,
          corrected: true,
          attempts,
          quality,
          debugLog: [...debugLog, 'Inserted intermediate waypoints', `Final quality score=${quality?.score?.toFixed(3)}`],
        };
      }
    }
  }

  // Último recurso: si tenemos una ruta válida guardada, usarla.
  if (best && best.geometry) {
    debugLog.push('Using best available geometry (may have low quality)');
    return {
      ...best,
      debugLog: [...debugLog],
    };
  }

  return {
    geometry: null,
    usedWaypoints: waypoints,
    corrected: false,
    attempts,
    quality: undefined,
    debugLog: [
      ...debugLog,
      'No valid OSRM geometry after retries'
    ],
  };
}

/**
 * Converts OSRM coordinates (lng, lat) to Leaflet LatLng format (lat, lng)
 */
export function osrmToLatLng(
  coordinates: [number, number][]
): { lat: number; lng: number }[] {
  return coordinates.map(([lng, lat]) => ({ lat, lng }));
}

/**
 * Calculates distance between two coordinates using Haversine formula
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}