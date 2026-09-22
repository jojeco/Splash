// Plain-node tests for lib/stats.js (no test runner needed): npm run test:logic
const assert = require('node:assert');
const {
  STATS_VERSION,
  MAX_EVENTS,
  createStats,
  normalizeStats,
  seedOrientation,
  recordOrientation,
  accumulateDwell,
  summarize,
  buildExportPayload,
  exportStatsJSON,
  formatDuration,
} = require('../lib/stats');

const PORTRAIT_UP = 1;
const PORTRAIT_DOWN = 2;
const LANDSCAPE_LEFT = 3;
const LANDSCAPE_RIGHT = 4;

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}\n${err.stack}`);
    process.exitCode = 1;
  }
}

const seeded = (orientation = PORTRAIT_UP, at = 1000) => seedOrientation(createStats(), orientation, at);

test('createStats has the documented shape', () => {
  assert.deepStrictEqual(createStats(), {
    version: STATS_VERSION,
    totalRotations: 0,
    byOrientation: {},
    events: [],
    currentOrientation: null,
    currentSince: null,
  });
});

test('normalizeStats resets garbage and old versions', () => {
  for (const bad of [null, undefined, 42, 'x', [], {}, { version: 0 }, { version: 999, totalRotations: 5 }]) {
    assert.deepStrictEqual(normalizeStats(bad), createStats());
  }
});

test('normalizeStats coerces keys and drops bad entries', () => {
  const out = normalizeStats({
    version: 1,
    totalRotations: '3',
    byOrientation: {
      '01': { count: 1, totalMs: 100 },
      '1': { count: 2, totalMs: 50 },
      '0': { count: 9, totalMs: 9 },
      abc: { count: 1, totalMs: 1 },
      '2': { count: -4, totalMs: NaN },
      '3': null,
    },
    events: [
      { from: 1, to: 2, at: 5, source: 'sensor' },
      { from: 1, to: 2, at: NaN, source: 'sensor' },
      { from: 0, to: 2, at: 5, source: 'sensor' },
      { from: 2, to: 1, at: -50, source: 'weird' },
      'nope',
    ],
    currentOrientation: 2,
    currentSince: 10,
  });
  assert.deepStrictEqual(Object.keys(out.byOrientation).sort(), ['1', '2']);
  assert.deepStrictEqual(out.byOrientation['1'], { count: 3, totalMs: 150 });
  assert.deepStrictEqual(out.byOrientation['2'], { count: 0, totalMs: 0 });
  assert.strictEqual(out.totalRotations, 3);
  assert.strictEqual(out.events.length, 2);
  assert.deepStrictEqual(out.events[1], { from: 2, to: 1, at: 0, source: 'sensor' });
  assert.strictEqual(out.currentOrientation, 2);
});

test('normalizeStats drops a half-specified current marker', () => {
  const out = normalizeStats({ version: 1, currentOrientation: 2, currentSince: 'bad' });
  assert.strictEqual(out.currentOrientation, null);
  assert.strictEqual(out.currentSince, null);
});

test('recordOrientation is a no-op for duplicates and UNKNOWN', () => {
  const base = seeded(PORTRAIT_UP);
  assert.strictEqual(recordOrientation(base, { orientation: PORTRAIT_UP, at: 2000, source: 'sensor' }), base);
  assert.strictEqual(recordOrientation(base, { orientation: 0, at: 2000, source: 'sensor' }), base);
});

test('the first reading without a baseline seeds instead of rotating', () => {
  const out = recordOrientation(createStats(), { orientation: LANDSCAPE_LEFT, at: 500, source: 'sensor' });
  assert.strictEqual(out.totalRotations, 0);
  assert.strictEqual(out.events.length, 0);
  assert.strictEqual(out.currentOrientation, LANDSCAPE_LEFT);
});

test('recordOrientation accumulates dwell and logs the event', () => {
  const start = seeded(PORTRAIT_UP, 1000);
  const next = recordOrientation(start, { orientation: LANDSCAPE_RIGHT, at: 4000, source: 'button' });
  assert.strictEqual(next.totalRotations, 1);
  assert.deepStrictEqual(next.byOrientation['1'], { count: 0, totalMs: 3000 });
  assert.deepStrictEqual(next.byOrientation['4'], { count: 1, totalMs: 0 });
  assert.deepStrictEqual(next.events[0], { from: PORTRAIT_UP, to: LANDSCAPE_RIGHT, at: 4000, source: 'button' });
  assert.strictEqual(next.currentSince, 4000);
  assert.strictEqual(start.totalRotations, 0, 'input must not be mutated');
  assert.deepStrictEqual(start.byOrientation, {});
});

test('backwards or invalid timestamps never reduce dwell', () => {
  const start = seeded(PORTRAIT_UP, 5000);
  for (const at of [100, -1, NaN, undefined]) {
    const next = recordOrientation(start, { orientation: PORTRAIT_DOWN, at, source: 'sensor' });
    assert.ok(next.byOrientation['1'].totalMs >= 0);
    assert.ok(next.currentSince >= 5000);
  }
});

test('accumulateDwell moves the marker so time is not counted twice', () => {
  const once = accumulateDwell(seeded(PORTRAIT_UP, 1000), 3000);
  const twice = accumulateDwell(once, 3000);
  assert.strictEqual(twice.byOrientation['1'].totalMs, 2000);
  assert.strictEqual(twice.currentSince, 3000);
  assert.strictEqual(accumulateDwell(createStats(), 3000).currentSince, null);
});

test('events are newest first and capped at MAX_EVENTS', () => {
  let stats = seeded(PORTRAIT_UP, 0);
  for (let i = 1; i <= MAX_EVENTS + 7; i += 1) {
    stats = recordOrientation(stats, {
      orientation: i % 2 === 0 ? PORTRAIT_UP : LANDSCAPE_LEFT,
      at: i * 1000,
      source: 'sensor',
    });
  }
  assert.strictEqual(stats.totalRotations, MAX_EVENTS + 7);
  assert.strictEqual(stats.events.length, MAX_EVENTS);
  assert.strictEqual(stats.events[0].at, (MAX_EVENTS + 7) * 1000);
  assert.ok(stats.events[0].at > stats.events[MAX_EVENTS - 1].at);
});

test('summarize includes live dwell and ranks by time', () => {
  let stats = seeded(PORTRAIT_UP, 0);
  stats = recordOrientation(stats, { orientation: LANDSCAPE_LEFT, at: 1000, source: 'sensor' });
  const summary = summarize(stats, 11000);
  assert.strictEqual(summary.totalMs, 11000);
  assert.deepStrictEqual(summary.rows.map((r) => r.orientation), [LANDSCAPE_LEFT, PORTRAIT_UP]);
  assert.ok(Math.abs(summary.rows.reduce((sum, r) => sum + r.share, 0) - 1) < 1e-9);
  assert.strictEqual(stats.byOrientation['3'].totalMs, 0, 'summarize must not mutate');
  assert.strictEqual(summarize(createStats(), 5).rows.length, 0);
});

test('formatDuration', () => {
  assert.strictEqual(formatDuration(0), '0s');
  assert.strictEqual(formatDuration(-5), '0s');
  assert.strictEqual(formatDuration(NaN), '0s');
  assert.strictEqual(formatDuration(999), '0s');
  assert.strictEqual(formatDuration(45000), '45s');
  assert.strictEqual(formatDuration(185000), '3m 05s');
  assert.strictEqual(formatDuration(3720000), '1h 02m');
  assert.strictEqual(formatDuration(2 * 86400000 + 3 * 3600000), '2d 3h');
});

test('JSON round-trip keeps keys stable and is idempotent', () => {
  let stats = seeded(PORTRAIT_UP, 1000);
  stats = recordOrientation(stats, { orientation: LANDSCAPE_RIGHT, at: 2000, source: 'sensor' });
  stats = recordOrientation(stats, { orientation: PORTRAIT_DOWN, at: 3500, source: 'restore' });
  const revived = normalizeStats(JSON.parse(JSON.stringify(stats)));
  assert.deepStrictEqual(revived, stats);
  assert.deepStrictEqual(Object.keys(revived.byOrientation).sort(), ['1', '2', '4']);
  assert.deepStrictEqual(normalizeStats(revived), revived);
});

test('summarize(live=false) credits zero live span; live=true (default) still adds it', () => {
  let stats = seeded(PORTRAIT_UP, 0);
  stats = recordOrientation(stats, { orientation: LANDSCAPE_LEFT, at: 1000, source: 'sensor' });
  const noLive = summarize(stats, 11000, false);
  const noLiveExpected = summarize(stats, stats.currentSince);
  assert.deepStrictEqual(noLive, noLiveExpected);
  assert.strictEqual(noLive.totalMs, 1000, 'only the already-settled dwell should be counted');
  const liveDefault = summarize(stats, 11000);
  const liveExplicit = summarize(stats, 11000, true);
  assert.deepStrictEqual(liveDefault, liveExplicit);
  assert.strictEqual(liveDefault.totalMs, 11000, 'live=true (or omitted) must still add the running span');
});

test('accumulateDwell is safe to call twice in a row (iOS active->inactive->background)', () => {
  const start = seeded(PORTRAIT_UP, 1000);
  const once = accumulateDwell(start, 5000);
  const twice = accumulateDwell(once, 5000 + 50);
  assert.strictEqual(once.byOrientation['1'].totalMs, 4000);
  assert.strictEqual(twice.byOrientation['1'].totalMs, 4050, 'the second call must only add the extra epsilon, never re-add the whole span');
  assert.strictEqual(twice.currentSince, 5050);
});

test('dwell flushed at background survives a simulated app kill (JSON round-trip)', () => {
  let stats = seeded(PORTRAIT_UP, 0);
  stats = recordOrientation(stats, { orientation: LANDSCAPE_LEFT, at: 1000, source: 'sensor' });
  // App is backgrounded 4000ms later: flushDwell() accumulates the running span.
  const backgrounded = accumulateDwell(stats, 5000);
  // Simulate the process being killed and storage being re-read from scratch.
  const revived = normalizeStats(JSON.parse(JSON.stringify(backgrounded)));
  assert.deepStrictEqual(revived, backgrounded);
  assert.strictEqual(revived.byOrientation['3'].totalMs, 4000, 'the flushed dwell must not be lost on kill');
  // Contrast: without the background flush, the still-running span never made
  // it into byOrientation, so it really would be gone after a kill.
  const unflushed = normalizeStats(JSON.parse(JSON.stringify(stats)));
  assert.strictEqual(unflushed.byOrientation['3'].totalMs, 0, 'un-flushed dwell is lost on kill');
});

test('exportStatsJSON produces parseable JSON matching summarize', () => {
  let stats = seeded(PORTRAIT_UP, 0);
  stats = recordOrientation(stats, { orientation: LANDSCAPE_LEFT, at: 1000, source: 'sensor' });
  const now = 11000;
  const parsed = JSON.parse(exportStatsJSON(stats, now, true));
  assert.deepStrictEqual(Object.keys(parsed).sort(), [
    'app',
    'events',
    'exportedAt',
    'orientations',
    'totalMs',
    'totalRotations',
    'version',
  ]);
  assert.strictEqual(parsed.app, 'splash');
  assert.strictEqual(parsed.version, STATS_VERSION);
  assert.strictEqual(parsed.exportedAt, now);
  const summary = summarize(stats, now, true);
  assert.strictEqual(parsed.totalRotations, summary.totalRotations);
  assert.strictEqual(parsed.totalMs, summary.totalMs);
  assert.deepStrictEqual(
    parsed.orientations.map((o) => [o.orientation, o.count, o.totalMs, o.share]),
    summary.rows.map((r) => [r.orientation, r.count, r.totalMs, r.share])
  );
  assert.deepStrictEqual(parsed.events, summary.events);
  // buildExportPayload must be the same data exportStatsJSON serializes.
  assert.deepStrictEqual(JSON.parse(JSON.stringify(buildExportPayload(stats, now, true))), parsed);
});

console.log(`${passed} tests passed`);
