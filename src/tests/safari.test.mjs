import test from 'node:test';
import assert from 'node:assert/strict';

// Helper: Coordinate formatter
function formatCoordinate(deg, isLat) {
  const dir = isLat ? (deg >= 0 ? 'N' : 'S') : deg >= 0 ? 'E' : 'W';
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = ((abs - d - m / 60) * 3600).toFixed(1);
  return `${d}°${m}'${s}"${dir}`;
}

// Helper: Trail capping
function addTrailPoint(points, newPoint, maxPoints = 500) {
  const updated = [...points, newPoint];
  if (updated.length > maxPoints) {
    updated.shift();
  }
  return updated;
}

// Helper: Telemetry altitude bounds
function clampAltitude(current, delta, min = 20, max = 300) {
  return Math.max(min, Math.min(max, current + delta));
}

test('formatCoordinate formats positive latitude correctly', () => {
  const res = formatCoordinate(18.6292, true);
  assert.match(res, /^18°37'.+N$/);
});

test('formatCoordinate formats negative latitude (Southern hemisphere) correctly', () => {
  const res = formatCoordinate(-18.6292, true);
  assert.match(res, /^18°37'.+S$/);
});

test('formatCoordinate formats positive longitude (Eastern hemisphere) correctly', () => {
  const res = formatCoordinate(26.9501, false);
  assert.match(res, /^26°57'.+E$/);
});

test('clampAltitude clamps within safe operational limits', () => {
  assert.equal(clampAltitude(120, 10), 130);
  assert.equal(clampAltitude(295, 15), 300); // Max ceiling
  assert.equal(clampAltitude(25, -15), 20);  // Min ground clearance
});

test('addTrailPoint caps array size at MAX_TRAIL_POINTS', () => {
  let trail = [];
  for (let i = 0; i < 550; i++) {
    trail = addTrailPoint(trail, [-18.6 + i * 0.0001, 26.9 + i * 0.0001], 500);
  }
  assert.equal(trail.length, 500);
});
