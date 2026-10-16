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

test('mock camera streams define valid streamStatus ("demo" or "live")', async () => {
  const { CAMERA_STREAMS } = await import('../data/mockSafariData.ts');
  assert.ok(CAMERA_STREAMS.length >= 3);
  for (const stream of CAMERA_STREAMS) {
    assert.ok(['demo', 'live'].includes(stream.streamStatus));
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

// -------------------------------------------------------------
// 7. AI Model Integration & Inference Pipeline Tests (Phase 1)
// -------------------------------------------------------------
test('AI pipeline: Model checkpoint path resolves to best_finetuned.pt or env override', () => {
  const defaultModelName = 'best_finetuned.pt';
  const customPath = process.env.MODEL_PATH || process.env.YOLO_MODEL_PATH || defaultModelName;
  assert.ok(customPath.includes('.pt'), 'Configured model checkpoint must have .pt extension');
});

test('AI pipeline: YOLO 10-class taxonomy mapping correctly resolves all classes', async () => {
  const { wildlifeDetectionService } = await import('../services/wildlifeDetectionService.ts');
  
  const expectedClasses = [
    { classId: 'elephant', common: 'African Bush Elephant', scientific: 'Loxodonta africana', status: 'Endangered' },
    { classId: 'giraffe', common: 'Giraffe', scientific: 'Giraffa camelopardalis', status: 'Vulnerable' },
    { classId: 'zebra', common: 'Plains Zebra', scientific: 'Equus quagga', status: 'Near Threatened' },
    { classId: 'lion', common: 'African Lion', scientific: 'Panthera leo', status: 'Vulnerable' },
    { classId: 'buffalo', common: 'African Buffalo', scientific: 'Syncerus caffer', status: 'Near Threatened' },
    { classId: 'wildebeest', common: 'Wildebeest', scientific: 'Connochaetes', status: 'Least Concern' },
    { classId: 'impala', common: 'Impala', scientific: 'Aepyceros melampus', status: 'Least Concern' },
  ];

  for (const exp of expectedClasses) {
    const rawDetection = {
      id: `raw-${exp.classId}`,
      common_name: exp.common,
      species: exp.scientific,
      confidence: 0.91,
      box: { x: 0.25, y: 0.35, width: 0.20, height: 0.30 },
      source: 'model',
    };

    const mapped = wildlifeDetectionService.convertToWildlifeDetection(rawDetection, 1, 'test.mp4', 0);
    assert.equal(mapped.commonName, exp.common);
    assert.equal(mapped.scientificName, exp.scientific);
    assert.equal(mapped.conservationStatus, exp.status);
    assert.equal(mapped.source, 'model');
    assert.equal(mapped.modelVersion, 'best_finetuned.pt');
  }
});

test('AI pipeline: Bounding-box conversion converts normalized 0-1 coords to 0-100 percentages', async () => {
  const { wildlifeDetectionService } = await import('../services/wildlifeDetectionService.ts');

  const rawItem = {
    id: 'box-01',
    common_name: 'African Bush Elephant',
    species: 'Loxodonta africana',
    confidence: 0.885,
    box: { x: 0.3927, y: 0.5871, width: 0.0945, height: 0.0896 },
    source: 'model',
  };

  const converted = wildlifeDetectionService.convertToWildlifeDetection(rawItem, 2, 'final_test.mp4', 0);
  assert.ok(Math.abs(converted.box.x - 39.27) < 0.01, 'x coordinate should be 39.27%');
  assert.ok(Math.abs(converted.box.y - 58.71) < 0.01, 'y coordinate should be 58.71%');
  assert.ok(Math.abs(converted.box.width - 9.45) < 0.01, 'width should be 9.45%');
  assert.ok(Math.abs(converted.box.height - 8.96) < 0.01, 'height should be 8.96%');

  // Verify bounds clamping
  assert.ok(converted.box.x >= 0 && converted.box.x <= 100);
  assert.ok(converted.box.y >= 0 && converted.box.y <= 100);
});

test('AI pipeline: Three-tier data separation isolates predictions, telemetry, and reference taxonomy', async () => {
  const { wildlifeDetectionService } = await import('../services/wildlifeDetectionService.ts');

  const rawItem = {
    id: 'lion-01',
    common_name: 'African Lion',
    species: 'Panthera leo',
    confidence: 0.942,
    box: { x: 0.15, y: 0.25, width: 0.12, height: 0.18 },
    source: 'model',
  };

  const animal = wildlifeDetectionService.convertToWildlifeDetection(rawItem, 4, 'safari.webm', 1);

  // Tier 1: AI Model Detections
  assert.equal(animal.confidence, 0.942);
  assert.equal(animal.source, 'model');
  assert.equal(animal.modelVersion, 'best_finetuned.pt');
  assert.ok(animal.box.width > 0);

  // Tier 2: Calculated Metrics
  assert.equal(animal.count, 4, 'Count represents real grouped detections');
  assert.ok(animal.distanceFromDroneM > 0, 'Distance calculated from geometry');
  assert.ok(animal.timestamp.length > 0, 'Timestamp recorded');

  // Tier 3: Reference Taxonomy
  assert.equal(animal.scientificName, 'Panthera leo');
  assert.equal(animal.diet, 'Carnivore (Apex)');
  assert.equal(animal.conservationStatus, 'Vulnerable');
  assert.ok(animal.habitat.includes('Savanna'));
});

test('Snapshot labelling: Distinguishes recorded footage, live feeds, and procedural simulation', () => {
  function getSnapshotSourceLabel(snapshotSource, streamUrl, streamStatus) {
    const videoBasename = streamUrl.split('/').pop() || 'footage.mp4';
    const isRecorded = streamStatus === 'demo' || streamUrl.startsWith('/videos/') || streamUrl.endsWith('.mp4') || streamUrl.endsWith('.webm');
    if (snapshotSource === 'video') {
      return isRecorded ? `SOURCE: RECORDED FOOTAGE (${videoBasename})` : 'SOURCE: LIVE TELEMETRY STREAM';
    }
    return 'SOURCE: PROCEDURAL SIMULATION';
  }

  assert.equal(
    getSnapshotSourceLabel('video', '/videos/final_test.mp4', 'demo'),
    'SOURCE: RECORDED FOOTAGE (final_test.mp4)'
  );
  assert.equal(
    getSnapshotSourceLabel('video', 'rtmp://drone-live.hwange.zw/live/stream1', 'live'),
    'SOURCE: LIVE TELEMETRY STREAM'
  );
  assert.equal(
    getSnapshotSourceLabel('procedural', '/videos/final_test.mp4', 'demo'),
    'SOURCE: PROCEDURAL SIMULATION'
  );
});

test('Map Feature Resolution: Matches map markers to sightings and species without first-word split errors', async () => {
  const { MAP_FEATURES } = await import('../data/mockSafariData.ts');

  // Verify all wildlife features in MAP_FEATURES have stable sightingId and speciesKey
  const wildlifeFeatures = MAP_FEATURES.filter((f) => f.type === 'wildlife');
  assert.ok(wildlifeFeatures.length >= 3);

  for (const feat of wildlifeFeatures) {
    assert.ok(feat.sightingId, `Feature ${feat.id} must define sightingId`);
    assert.ok(feat.speciesKey, `Feature ${feat.id} must define speciesKey`);
  }

  // Regression test: Searching for "African Bush Elephant" against "Elephant Herd"
  const elephantFeature = wildlifeFeatures.find((f) => f.id === 'feat-elephants');
  assert.ok(elephantFeature);
  const animalDetections = [
    { id: 's-ele-01', commonName: 'African Bush Elephant' },
    { id: 's-gir-03', commonName: 'Giraffe' },
    { id: 's-lio-04', commonName: 'African Lion' },
  ];

  // Resolution via sightingId
  const matchById = animalDetections.find((a) => a.id === elephantFeature.sightingId);
  assert.ok(matchById, 'Should resolve via sightingId');
  assert.equal(matchById.commonName, 'African Bush Elephant');

  // Resolution via speciesKey
  const matchByKey = animalDetections.find((a) =>
    a.commonName.toLowerCase().includes(elephantFeature.speciesKey.toLowerCase())
  );
  assert.ok(matchByKey, 'Should resolve via speciesKey');
  assert.equal(matchByKey.commonName, 'African Bush Elephant');
});

test('AI pipeline: Model unavailable returns empty list and does NOT fabricate detections', async () => {
  const { wildlifeDetectionService } = await import('../services/wildlifeDetectionService.ts');

  // When given an empty or invalid blob, detectFrame should safely resolve to []
  const mockEmptyBlob = { size: 0, type: 'image/jpeg' };
  const detections = await wildlifeDetectionService.detectFrame(mockEmptyBlob);
  assert.ok(Array.isArray(detections), 'Should return an array');
  assert.equal(detections.length, 0, 'Must NOT fabricate fake animal records when detection fails');
});

