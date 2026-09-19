// Pure rotation-history logic. No React Native imports on purpose so plain
// node can require() it (see scripts/stats.test.js). Every function treats its
// input as immutable and returns new objects.

const STATS_VERSION = 1;
const MAX_EVENTS = 20;
// Mirrors ScreenOrientation.Orientation.UNKNOWN; never tracked as a real state.
const UNKNOWN = 0;
const SOURCES = ['sensor', 'button', 'restore'];

function createStats() {
  return {
    version: STATS_VERSION,
    totalRotations: 0,
    byOrientation: {},
    events: [],
    currentOrientation: null,
    currentSince: null,
  };
}

const isCode = (n) => Number.isInteger(n) && n > UNKNOWN;
const nonNegative = (n) => (Number.isFinite(n) && n > 0 ? n : 0);

function normalizeEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const from = Number(raw.from);
  const to = Number(raw.to);
  const at = Number(raw.at);
  if (!isCode(from) || !isCode(to) || !Number.isFinite(at)) return null;
  return {
    from,
    to,
    at: Math.max(0, at),
    source: SOURCES.includes(raw.source) ? raw.source : 'sensor',
  };
}

// Coerces whatever came out of storage into a valid stats object. Anything
// unrecognisable (wrong version, garbage) resets to a fresh createStats().
function normalizeStats(raw) {
  if (!raw || typeof raw !== 'object' || raw.version !== STATS_VERSION) {
    return createStats();
  }
  const byOrientation = {};
  const source = raw.byOrientation && typeof raw.byOrientation === 'object' ? raw.byOrientation : {};
  for (const key of Object.keys(source)) {
    const code = Number(key);
    const entry = source[key];
    if (!isCode(code) || !entry || typeof entry !== 'object') continue;
    // Re-stringify so "01" and "1" collapse into one numeric-string key.
    const prev = byOrientation[String(code)] || { count: 0, totalMs: 0 };
    byOrientation[String(code)] = {
      count: prev.count + Math.floor(nonNegative(Number(entry.count))),
      totalMs: prev.totalMs + nonNegative(Number(entry.totalMs)),
    };
  }
  const events = (Array.isArray(raw.events) ? raw.events : [])
    .map(normalizeEvent)
    .filter(Boolean)
    .slice(0, MAX_EVENTS);
  const currentOrientation = Number(raw.currentOrientation);
  const currentSince = Number(raw.currentSince);
  const hasCurrent = isCode(currentOrientation) && Number.isFinite(currentSince) && currentSince >= 0;
  return {
    version: STATS_VERSION,
    totalRotations: Math.floor(nonNegative(Number(raw.totalRotations))),
    byOrientation,
    events,
    currentOrientation: hasCurrent ? currentOrientation : null,
    currentSince: hasCurrent ? currentSince : null,
  };
}

// Timestamps from a bad clock (NaN, negative, or earlier than the dwell start)
// are clamped so dwell time can never go backwards.
function clampAt(at, floor) {
  const safe = Number.isFinite(at) && at >= 0 ? at : floor ?? 0;
  return floor != null && safe < floor ? floor : safe;
}

function addDwell(byOrientation, code, ms) {
  const key = String(code);
  const prev = byOrientation[key] || { count: 0, totalMs: 0 };
  return { ...byOrientation, [key]: { count: prev.count, totalMs: prev.totalMs + ms } };
}

// Starts tracking `orientation` from `at` without emitting an event. Used for
// the initial reading on launch, where nothing has actually rotated.
function seedOrientation(stats, orientation, at) {
  if (!isCode(orientation)) return stats;
  return { ...stats, currentOrientation: orientation, currentSince: clampAt(at, null) };
}

// Credits the time since `currentSince` to the current orientation and moves
// the marker forward, so the same span is never counted twice.
function accumulateDwell(stats, now) {
  if (stats.currentOrientation == null || stats.currentSince == null) return stats;
  const at = clampAt(now, stats.currentSince);
  return {
    ...stats,
    byOrientation: addDwell(stats.byOrientation, stats.currentOrientation, at - stats.currentSince),
    currentSince: at,
  };
}

function recordOrientation(stats, { orientation, at, source }) {
  if (!isCode(orientation) || orientation === stats.currentOrientation) return stats;
  // No baseline yet: treat the first reading as a seed, not a rotation.
  if (stats.currentOrientation == null) return seedOrientation(stats, orientation, at);
  const settled = accumulateDwell(stats, at);
  const now = settled.currentSince;
  const entered = settled.byOrientation[String(orientation)] || { count: 0, totalMs: 0 };
  const event = {
    from: stats.currentOrientation,
    to: orientation,
    at: now,
    source: SOURCES.includes(source) ? source : 'sensor',
  };
  return {
    ...settled,
    totalRotations: stats.totalRotations + 1,
    byOrientation: {
      ...settled.byOrientation,
      [String(orientation)]: { count: entered.count + 1, totalMs: entered.totalMs },
    },
    events: [event, ...stats.events].slice(0, MAX_EVENTS),
    currentOrientation: orientation,
    currentSince: now,
  };
}

// Read-only view for the UI: dwell includes the still-running current span, and
// rows are ranked by time spent.
function summarize(stats, now) {
  const live = accumulateDwell(stats, now);
  const rows = Object.keys(live.byOrientation).map((key) => ({
    orientation: Number(key),
    count: live.byOrientation[key].count,
    totalMs: live.byOrientation[key].totalMs,
  }));
  const totalMs = rows.reduce((sum, row) => sum + row.totalMs, 0);
  rows.sort((a, b) => b.totalMs - a.totalMs || a.orientation - b.orientation);
  return {
    totalRotations: stats.totalRotations,
    totalMs,
    rows: rows.map((row) => ({ ...row, share: totalMs > 0 ? row.totalMs / totalMs : 0 })),
    events: stats.events.slice(),
  };
}

function formatDuration(ms) {
  const total = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0;
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600) % 24;
  const d = Math.floor(total / 86400);
  const pad = (n) => String(n).padStart(2, '0');
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${pad(m)}m`;
  if (m > 0) return `${m}m ${pad(s)}s`;
  return `${s}s`;
}

module.exports = {
  STATS_VERSION,
  MAX_EVENTS,
  createStats,
  normalizeStats,
  seedOrientation,
  recordOrientation,
  accumulateDwell,
  summarize,
  formatDuration,
};
