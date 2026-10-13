/**
 * Flight trail management utilities to prevent unbounded memory growth during GPS tracking.
 */

export const MAX_TRAIL_POINTS = 500;

/**
 * Appends a coordinate to a flight trail, ensuring:
 * 1. Successive identical points are not duplicated.
 * 2. Trail length does not exceed maxPoints (bounded FIFO).
 *
 * @param trail - Existing list of coordinate tuples [lat, lng]
 * @param newPoint - New coordinate tuple [lat, lng]
 * @param maxPoints - Maximum number of points to retain (defaults to 500)
 * @returns Updated array of coordinate tuples
 */
export function addTrailPoint(
  trail: [number, number][],
  newPoint: [number, number],
  maxPoints: number = MAX_TRAIL_POINTS
): [number, number][] {
  const last = trail[trail.length - 1];
  if (last && last[0] === newPoint[0] && last[1] === newPoint[1]) {
    return trail;
  }
  const updated = [...trail, newPoint];
  if (updated.length > maxPoints) {
    updated.shift();
  }
  return updated;
}
