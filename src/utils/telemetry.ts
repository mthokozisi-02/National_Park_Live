/**
 * Telemetry boundary calculation and validation utilities
 */

/**
 * Clamps target altitude within safe drone operational limits (AGL).
 * Standard safety limits for wildlife surveillance: 20m min ground clearance, 300m max ceiling.
 */
export function clampAltitude(current: number, delta: number, min: number = 20, max: number = 300): number {
  return Math.max(min, Math.min(max, current + delta));
}

/**
 * Clamps target airspeed within drone flight performance envelope (km/h).
 */
export function clampSpeed(current: number, delta: number, min: number = 0, max: number = 65): number {
  return Math.max(min, Math.min(max, current + delta));
}
