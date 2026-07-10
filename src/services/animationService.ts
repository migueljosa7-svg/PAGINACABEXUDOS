/**
 * Animation Service for simulation interpolation
 * 
 * Provides utilities to interpolate positions along a route geometry,
 * calculate metrics, and manage simulation state.
 */

export interface RouteMetrics {
  segmentDistances: number[];
  cumulativeDistances: number[];
  totalDistance: number;
}

export interface SimulatedPosition {
  lat: number;
  lng: number;
  currentStreet: string;
  nextStreet: string;
  simulatedTime: string;
  distanceTraveled: number;
  timeRemaining: number;
  status: 'Esperando inicio' | 'En marcha' | 'Parada' | 'Finalizado';
  activeStopName: string;
}

export interface StreetPoint {
  lat: number;
  lng: number;
  streetName: string;
  isStop?: boolean;
}

/**
 * Build route metrics (segment distances, cumulative distances, total distance)
 * from an array of coordinates using Haversine formula.
 */
export function getRouteMetrics(coords: { lat: number; lng: number }[]): RouteMetrics {
  let cumulative = 0;
  const segmentDistances: number[] = [];
  const cumulativeDistances: number[] = [];

  for (let i = 0; i < coords.length - 1; i++) {
    const dist = haversineDistance(
      coords[i].lat, coords[i].lng,
      coords[i + 1].lat, coords[i + 1].lng
    );
    segmentDistances.push(dist);
    cumulative += dist;
    cumulativeDistances.push(cumulative);
  }

  return {
    segmentDistances,
    cumulativeDistances,
    totalDistance: cumulative
  };
}

/**
 * Find the nearest street point index for a given OSRM geometry point
 * using Haversine distance. This correctly maps OSRM dense geometry
 * back to the original sparse waypoints with street names.
 */
function findNearestStreetPoint(
  osrmPoint: { lat: number; lng: number },
  streetPoints: StreetPoint[]
): number {
  if (streetPoints.length === 0) return 0;
  if (streetPoints.length === 1) return 0;

  let bestIdx = 0;
  let bestDist = Infinity;

  for (let i = 0; i < streetPoints.length; i++) {
    const d = haversineDistance(
      osrmPoint.lat, osrmPoint.lng,
      streetPoints[i].lat, streetPoints[i].lng
    );
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }

  return bestIdx;
}

/**
 * Interpolate the position along the route geometry at a given elapsed time.
 * 
 * @param animCoords - The full geometry coordinates (e.g., from OSRM)
 * @param streetPoints - Original waypoints with street names and stop flags
 * @param elapsedTimeMs - Current elapsed time in milliseconds
 * @param totalDurationMs - Total duration of the route in milliseconds
 * @param durationMinutes - Total duration in minutes
 * @param timeString - Start time string (HH:MM format)
 * @param metrics - Pre-computed route metrics
 * @returns SimulatedPosition with lat/lng, street info, and status
 */
export function interpolatePosition(
  animCoords: { lat: number; lng: number }[],
  streetPoints: StreetPoint[],
  elapsedTimeMs: number,
  totalDurationMs: number,
  durationMinutes: number,
  timeString: string,
  metrics: RouteMetrics
): SimulatedPosition {
  const progress = Math.min(elapsedTimeMs / totalDurationMs, 1);
  const targetDistance = progress * metrics.totalDistance;

  let currentLat = animCoords[0]?.lat ?? 0;
  let currentLng = animCoords[0]?.lng ?? 0;
  let currentStreet = streetPoints[0]?.streetName ?? '';
  let nextStreet = streetPoints[1]?.streetName ?? '';
  let isAtStop = false;
  let activeStopName = '';

  if (animCoords.length > 1) {
    if (targetDistance <= 0) {
      currentLat = animCoords[0].lat;
      currentLng = animCoords[0].lng;
      currentStreet = streetPoints[0]?.streetName ?? '';
      nextStreet = streetPoints[1]?.streetName ?? '';
      isAtStop = streetPoints[0]?.isStop ?? false;
      activeStopName = streetPoints[0]?.streetName ?? '';
    } else if (targetDistance >= metrics.totalDistance) {
      const lastIdx = animCoords.length - 1;
      currentLat = animCoords[lastIdx].lat;
      currentLng = animCoords[lastIdx].lng;
      currentStreet = streetPoints[streetPoints.length - 1]?.streetName ?? '';
      nextStreet = 'Llegada';
      isAtStop = streetPoints[streetPoints.length - 1]?.isStop ?? false;
      activeStopName = streetPoints[streetPoints.length - 1]?.streetName ?? '';
    } else {
      // Find the segment index where targetDistance falls
      let segmentIdx = 0;
      for (let i = 0; i < metrics.cumulativeDistances.length; i++) {
        if (targetDistance < metrics.cumulativeDistances[i]) {
          segmentIdx = i;
          break;
        }
      }

      const prevCumulative = segmentIdx === 0 ? 0 : metrics.cumulativeDistances[segmentIdx - 1];
      const segmentProgress = targetDistance - prevCumulative;
      const segmentLength = metrics.segmentDistances[segmentIdx];
      const t = segmentLength > 0 ? segmentProgress / segmentLength : 0;

      const pStart = animCoords[segmentIdx];
      const pEnd = animCoords[segmentIdx + 1];

      // LERP coordinates
      currentLat = pStart.lat + t * (pEnd.lat - pStart.lat);
      currentLng = pStart.lng + t * (pEnd.lng - pStart.lng);

      // Use nearest-point mapping to find the closest original waypoint
      const nearestIdx = findNearestStreetPoint(
        { lat: currentLat, lng: currentLng },
        streetPoints
      );
      
      const safeIdx = Math.max(0, Math.min(nearestIdx, streetPoints.length - 1));
      currentStreet = streetPoints[safeIdx]?.streetName ?? currentStreet;
      nextStreet = streetPoints[Math.min(safeIdx + 1, streetPoints.length - 1)]?.streetName ?? nextStreet;

      // Check if we're near a stop by checking proximity to stop waypoints
      const STOP_PROXIMITY_METERS = 30;
      let foundStop = false;
      for (let i = 0; i < streetPoints.length; i++) {
        if (streetPoints[i]?.isStop) {
          const d = haversineDistance(
            currentLat, currentLng,
            streetPoints[i].lat, streetPoints[i].lng
          );
          if (d < STOP_PROXIMITY_METERS) {
            isAtStop = true;
            activeStopName = streetPoints[i].streetName;
            foundStop = true;
            break;
          }
        }
      }
      if (!foundStop) {
        isAtStop = false;
        activeStopName = '';
      }
    }
  }

  // Calculate simulated current time
  const [startH, startM] = timeString.split(':').map(Number);
  const elapsedMinutes = progress * durationMinutes;
  const totalMinutes = (isNaN(startH) ? 0 : startH * 60) + (isNaN(startM) ? 0 : startM) + elapsedMinutes;
  const currentH = Math.floor(totalMinutes / 60) % 24;
  const currentM = Math.floor(totalMinutes % 60);
  const simulatedTime = `${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`;

  // Status logic
  const status: 'Esperando inicio' | 'En marcha' | 'Parada' | 'Finalizado' = elapsedTimeMs === 0
    ? 'Esperando inicio'
    : elapsedTimeMs >= totalDurationMs
      ? 'Finalizado'
      : isAtStop
        ? 'Parada'
        : 'En marcha';

  return {
    lat: currentLat,
    lng: currentLng,
    currentStreet,
    nextStreet,
    simulatedTime,
    distanceTraveled: Math.round(targetDistance),
    timeRemaining: Math.max(0, Math.round(durationMinutes * (1 - progress))),
    status,
    activeStopName
  };
}

/**
 * Haversine distance between two coordinates in meters.
 */
function haversineDistance(
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