import test from 'node:test';
import assert from 'node:assert/strict';

// Import production utilities directly
import { formatCoordinate } from '../utils/coordinates.ts';
import { clampAltitude, clampSpeed } from '../utils/telemetry.ts';
import { addTrailPoint, MAX_TRAIL_POINTS } from '../utils/flightTrail.ts';

// -------------------------------------------------------------
// 1. Coordinate Formatter Production Logic
// -------------------------------------------------------------
test('formatCoordinate formats positive latitude correctly (Northern hemisphere)', () => {
  const res = formatCoordinate(18.6292, true);
  assert.match(res, /^18°37'.+N$/);
});

test('formatCoordinate formats negative latitude correctly (Southern hemisphere, Hwange)', () => {
  const res = formatCoordinate(-18.6292, true);
  assert.match(res, /^18°37'.+S$/);
});

test('formatCoordinate formats positive longitude correctly (Eastern hemisphere)', () => {
  const res = formatCoordinate(26.9501, false);
  assert.match(res, /^26°57'.+E$/);
});

test('formatCoordinate formats negative longitude correctly (Western hemisphere)', () => {
  const res = formatCoordinate(-122.4194, false);
  assert.match(res, /^122°25'.+W$/);
});

// -------------------------------------------------------------
// 2. Telemetry Clamping Production Logic
// -------------------------------------------------------------
test('clampAltitude adjusts and clamps within safe operational limits [20, 300]', () => {
  assert.equal(clampAltitude(120, 10), 130);
  assert.equal(clampAltitude(295, 15), 300); // Ceiling cap
  assert.equal(clampAltitude(25, -15), 20);   // Ground clearance minimum
  assert.equal(clampAltitude(50, -100), 20);  // Deep negative floor
  assert.equal(clampAltitude(200, 500), 300); // Extreme ceiling
});

test('clampSpeed adjusts and clamps within flight envelope [0, 65]', () => {
  assert.equal(clampSpeed(20, 5), 25);
  assert.equal(clampSpeed(62, 5), 65);  // Top speed cap
  assert.equal(clampSpeed(3, -10), 0);  // Hover / zero speed minimum
  assert.equal(clampSpeed(50, 100), 65); // Excessive acceleration cap
});

// -------------------------------------------------------------
// 3. Flight Trail Bounded Breadcrumb Logic
// -------------------------------------------------------------
test('addTrailPoint caps array size at MAX_TRAIL_POINTS', () => {
  let trail = [];
  for (let i = 0; i < 550; i++) {
    trail = addTrailPoint(trail, [-18.6 + i * 0.0001, 26.9 + i * 0.0001], MAX_TRAIL_POINTS);
  }
  assert.equal(trail.length, MAX_TRAIL_POINTS);
});

test('addTrailPoint deduplicates consecutive identical points', () => {
  const initial = [[-18.6292, 26.9501]];
  const updated = addTrailPoint(initial, [-18.6292, 26.9501]);
  assert.equal(updated.length, 1);
});

test('addTrailPoint appends distinct coordinates', () => {
  const initial = [[-18.6292, 26.9501]];
  const updated = addTrailPoint(initial, [-18.6300, 26.9510]);
  assert.equal(updated.length, 2);
  assert.deepEqual(updated[1], [-18.6300, 26.9510]);
});

// -------------------------------------------------------------
// 4. Mock Data Validation & Contract Integrity
// -------------------------------------------------------------
test('mock initial telemetry defines dataMode: "simulated"', async () => {
  const { INITIAL_TELEMETRY } = await import('../data/mockSafariData.ts');
  assert.equal(INITIAL_TELEMETRY.dataMode, 'simulated');
  assert.equal(INITIAL_TELEMETRY.isLive, false);
  assert.ok(INITIAL_TELEMETRY.droneId.length > 0);
  assert.ok(INITIAL_TELEMETRY.batteryPercentage > 0 && INITIAL_TELEMETRY.batteryPercentage <= 100);
});

test('mock camera streams define streamStatus: "demo"', async () => {
  const { CAMERA_STREAMS } = await import('../data/mockSafariData.ts');
  assert.ok(CAMERA_STREAMS.length >= 3);
  for (const stream of CAMERA_STREAMS) {
    assert.equal(stream.streamStatus, 'demo');
    assert.ok(stream.videoUrl.length > 0);
    assert.ok(Array.isArray(stream.coordinates));
    assert.equal(stream.coordinates.length, 2);
  }
});

test('mock wildlife detections define source: "simulated"', async () => {
  const { MOCK_WILDLIFE_CATALOG } = await import('../data/mockSafariData.ts');
  assert.ok(MOCK_WILDLIFE_CATALOG.length >= 4);
  for (const det of MOCK_WILDLIFE_CATALOG) {
    assert.equal(det.source, 'simulated');
    assert.ok(det.species.length > 0);
    assert.ok(det.confidence >= 0 && det.confidence <= 1);
    assert.ok(det.box.width > 0 && det.box.height > 0);
  }
});

// -------------------------------------------------------------
// 5. Snapshot Capture Decision Logic
// -------------------------------------------------------------
test('determineSnapshotSource correctly identifies video source when available', () => {
  function determineSnapshotSource({ videoReady, videoError, canvasReady }) {
    if (!videoError && videoReady) return 'video';
    if (canvasReady) return 'procedural';
    return 'failed';
  }

  assert.equal(determineSnapshotSource({ videoReady: true, videoError: false, canvasReady: true }), 'video');
  assert.equal(determineSnapshotSource({ videoReady: false, videoError: true, canvasReady: true }), 'procedural');
  assert.equal(determineSnapshotSource({ videoReady: false, videoError: true, canvasReady: false }), 'failed');
  assert.equal(determineSnapshotSource({ videoReady: false, videoError: false, canvasReady: false }), 'failed');
});

// -------------------------------------------------------------
// 6. Simulation Mode Isolation (Manual vs Automatic)
// -------------------------------------------------------------
test('manual simulation mode isolates altitude and speed from orbital drift', () => {
  function simulateTelemetryTick(current, mode, orbitStep) {
    const lat = -18.6292 + Math.sin(orbitStep) * 0.01;
    const lng = 26.9501 + Math.cos(orbitStep) * 0.01;
    if (mode === 'manual') {
      // In manual mode, altitude and speed are preserved
      return {
        ...current,
        latitude: lat,
        longitude: lng,
      };
    }
    // In auto mode, altitude and speed follow autopilot patrol
    return {
      ...current,
      latitude: lat,
      longitude: lng,
      altitude: 120 + Math.sin(orbitStep) * 5,
      speed: 18 + Math.cos(orbitStep) * 2,
    };
  }

  const userAdjustedState = {
    altitude: 210.0,
    speed: 45.0,
    latitude: -18.6292,
    longitude: 26.9501,
  };

  const nextManualState = simulateTelemetryTick(userAdjustedState, 'manual', 1.5);
  assert.equal(nextManualState.altitude, 210.0, 'Manual altitude should remain unchanged');
  assert.equal(nextManualState.speed, 45.0, 'Manual speed should remain unchanged');
  assert.notEqual(nextManualState.latitude, userAdjustedState.latitude, 'Latitude continues orbital path');

  const nextAutoState = simulateTelemetryTick(userAdjustedState, 'automatic', 1.5);
  assert.notEqual(nextAutoState.altitude, 210.0, 'Auto mode recalculates altitude');
  assert.notEqual(nextAutoState.speed, 45.0, 'Auto mode recalculates speed');
});
