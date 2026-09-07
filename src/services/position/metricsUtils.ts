/**
 * Shared metrics utilities for position sources.
 *
 * Used by both SimulationPositionSource and GPSPositionSource so that
 * distance / time / speed calculations behave identically regardless of
 * whether positions come from interpolation or real GPS.
 */

/** Format milliseconds as HH:MM:SS */
export function formatElapsedTime(totalMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Smooth a stream of speed samples with a simple moving average.
 * Returns the average of the last `windowSize` samples (or all of them
 * if fewer have been collected).
 */
export function smoothSpeed(samples: number[], windowSize = 5): number {
  if (samples.length === 0) return 0;
  const recent = samples.slice(-windowSize);
  const sum = recent.reduce((a, b) => a + b, 0);
  return sum / recent.length;
}

/**
 * Calculate average speed in km/h from total distance (m) and total time (ms).
 * Returns 0 when time is zero or negative.
 */
export function averageSpeedKmh(distanceMeters: number, timeMs: number): number {
  if (timeMs <= 0) return 0;
  const hours = timeMs / (1000 * 60 * 60);
  return (distanceMeters / 1000) / hours;
}

/**
 * Convert m/s to km/h.
 */
export function msToKmh(metersPerSecond: number): number {
  return metersPerSecond * 3.6;
}
