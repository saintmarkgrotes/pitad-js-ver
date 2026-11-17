import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, consumeLocations, haversine, metrics, summarySplits, transitionRun } from '../../src/features/tracking/engine.js';
import { formatDistance, formatDuration, formatPace } from '../../src/features/tracking/format.js';
import { limitRoute, routeRegion, routeSegments } from '../../src/features/tracking/routeGeometry.js';
import { fix, start, straight } from './fixtures.mjs';

const fresh = () => createRun({ id: 'run', userId: 'alice', now: start });
const ingest = (state, points) => consumeLocations(state, points, start + 100000000);
const close = (value, expected, tolerance = 0.01) => assert.ok(Math.abs(value - expected) < tolerance, `${value} ≠ ${expected}`);

test('Haversine returns meters for known coordinates and across the dateline', () => {
  close(haversine({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }), 111195.0802, 0.01);
  close(haversine({ latitude: 0, longitude: 179.999 }, { latitude: 0, longitude: -179.999 }), 222.39016, 0.01);
  assert.equal(haversine(fix(0, 0).coords, fix(0, 0).coords), 0);
});
test('a steady run produces distance, moving time, and rolling pace without mutating input', () => {
  const initial = fresh();
  const result = ingest(initial, straight(120)).state;
  close(result.distance, 360);
  close(result.movingMs, 120000);
  const stats = metrics(result, start + 120000);
  close(stats.averagePace, 1000 / 3);
  close(stats.currentPace, 1000 / 3);
  close(stats.rollingPace, 1000 / 3);
  close(stats.bestPace, 1000 / 3);
  assert.equal(initial.distance, 0);
  assert.equal(initial.window.length, 0);
});
test('pace waits for enough history and becomes unavailable when fixes are stale', () => {
  const state = ingest(fresh(), straight(8)).state;
  assert.equal(metrics(state, start + 8000).currentPace, null);
  assert.equal(metrics(state, start + 25000).currentPace, null);
});
test('poor accuracy, invalid coordinates, mock locations, and impossible speeds are rejected', () => {
  const samples = [fix(0, 0), fix(30, 10, { accuracy: 100 }), fix(36, 12, { latitude: 91 }),
    { ...fix(42, 14), mocked: true }, fix(60, 20, { speed: 60 }), fix(66, 22, { accuracy: null })];
  const { state, points } = ingest(fresh(), samples);
  assert.equal(state.distance, 0);
  assert.equal(state.rejected, 5);
  assert.equal(points.length, 1);
});
test('a temporary GPS teleport does not poison the next real fix or best pace', () => {
  const state = ingest(fresh(), [...straight(40), fix(3000, 42), fix(132, 44)]).state;
  close(state.distance, 132);
  assert.equal(state.rejected, 1);
  assert.ok(state.bestPace >= 333.3);
});
test('stationary jitter does not accumulate distance, moving time, or elevation', () => {
  const points = Array.from({ length: 300 }, (_, i) => fix(Math.sin(i) * 2, i * 2, { speed: 0, altitude: i % 2 ? 20 : 10 }));
  const { state } = ingest(fresh(), points);
  assert.equal(state.distance, 0); assert.equal(state.movingMs, 0); assert.equal(state.elevationGain, 0);
});
test('duplicate and out-of-order deliveries cannot double-count a run', () => {
  const points = straight(60);
  const once = ingest(fresh(), points).state;
  const twice = ingest(once, [...points].reverse());
  close(twice.state.distance, once.distance);
  assert.equal(twice.points.length, 0);
});
test('future timestamp rejection does not block subsequent current data', () => {
  const once = consumeLocations(fresh(), [fix(0, 0), fix(3000, 1000)], start + 1000).state;
  const twice = consumeLocations(once, [fix(6, 2)], start + 2000).state;
  close(twice.distance, 6);
});
test('GPS gaps break route segments and never add the missing distance', () => {
  const { state, points } = ingest(fresh(), [fix(0, 0), fix(6, 2), fix(1000, 60), fix(1006, 62)]);
  close(state.distance, 12);
  assert.equal(state.gaps, 1);
  assert.notEqual(points[1].segment, points[2].segment);
  assert.equal(state.bestPace, null);
});
test('pause/resume excludes paused movement and preserves elapsed versus active time', () => {
  let state = ingest(fresh(), straight(10)).state;
  state = transitionRun(state, 'pause', start + 10000);
  state = ingest(state, [fix(300, 20)]).state;
  state = transitionRun(state, 'resume', start + 30000);
  state = ingest(state, [fix(300, 30), fix(306, 32)]).state;
  state = transitionRun(state, 'finish', start + 32000);
  const stats = metrics(state);
  close(stats.distance, 36); close(stats.durationMs, 12000); close(stats.elapsedMs, 32000); close(stats.movingMs, 12000);
  assert.throws(() => transitionRun(state, 'resume', start + 40000), /Cannot resume/);
});
test('stationary time counts toward run time but not moving time', () => {
  const state = ingest(fresh(), [fix(0, 0), fix(6, 2), fix(6, 4, { speed: 0 }), fix(6, 6, { speed: 0 }), fix(12, 8)]).state;
  const stats = metrics(state, start + 8000);
  close(stats.distance, 12); close(stats.movingMs, 4000); close(stats.durationMs, 8000);
});
test('interpolated kilometer splits and final partial sum to total distance and active time', () => {
  let state = ingest(fresh(), straight(760)).state;
  state = transitionRun(state, 'finish', start + 760000);
  const splits = summarySplits(state);
  assert.equal(splits.length, 3);
  close(splits[0].durationMs, 1000000 / 3);
  close(splits.reduce((sum, split) => sum + split.distance, 0), state.distance);
  close(splits.reduce((sum, split) => sum + split.durationMs, 0), state.activeMs);
  assert.equal(splits[2].partial, true);
});
test('elevation uses reliable altitude, smoothing, and hysteresis', () => {
  const ascent = straight(120).map((point, i) => ({ ...point, coords: { ...point.coords, altitude: 10 + i } }));
  const state = ingest(fresh(), ascent).state;
  assert.ok(state.elevationGain > 45 && state.elevationGain < 60);
  const unreliable = ascent.map((point) => ({ ...point, coords: { ...point.coords, altitudeAccuracy: 100 } }));
  assert.equal(ingest(fresh(), unreliable).state.elevationGain, 0);
});
test('map reduction preserves endpoints and pause boundaries without changing saved data', () => {
  const points = Array.from({ length: 2000 }, (_, i) => ({ ...fix(i, i).coords, seq: i + 1, segment: i < 1001 ? 0 : 1 }));
  const preview = limitRoute(points);
  assert.equal(points.length, 2000);
  assert.equal(preview[0].seq, 1); assert.equal(preview.at(-1).seq, 2000);
  const segments = routeSegments(preview);
  assert.equal(segments.length, 2);
  assert.equal(segments[0].at(-1).seq, 1001); assert.equal(segments[1][0].seq, 1002);
  assert.ok(preview.length < 610);
  assert.ok(routeRegion([{ latitude: 0, longitude: 179.999 }, { latitude: 0, longitude: -179.999 }]).longitudeDelta < 0.01);
});
test('display conversions handle miles, clock rollover, and unavailable pace', () => {
  assert.equal(formatDistance(1609.344, 'mi'), '1.00');
  assert.equal(formatPace(359.9), '6:00'); assert.equal(formatPace(null), '—');
  assert.equal(formatDuration(3661000), '1:01:01');
});
