/**
 * Coordinate utility functions for aviation HUD and GIS components
 */

/**
 * Format decimal coordinates to standard aviation degrees, minutes, and seconds (DMS).
 * @param deg - Decimal degrees (e.g. -18.6292 or 26.9501)
 * @param isLat - True if latitude (N/S), false if longitude (E/W)
 * @returns Formatted DMS string (e.g. 18°37'45.1"S)
 */
export function formatCoordinate(deg: number, isLat: boolean): string {
  const dir = isLat ? (deg >= 0 ? 'N' : 'S') : deg >= 0 ? 'E' : 'W';
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = ((abs - d - m / 60) * 3600).toFixed(1);
  return `${d}°${m}'${s}"${dir}`;
}
