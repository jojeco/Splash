// Pure rotation-angle math for the PhoneIndicator animation. No React Native
// or expo imports on purpose so plain node can require() it directly (see
// scripts/stats.test.js), mirroring the lib/stats.js pattern.

// Mirrors expo-screen-orientation's Orientation enum values.
const UNKNOWN = 0;
const PORTRAIT_UP = 1;
const PORTRAIT_DOWN = 2;
const LANDSCAPE_LEFT = 3;
const LANDSCAPE_RIGHT = 4;

const ROTATION_DEGREES = {
  [PORTRAIT_UP]: 0,
  [LANDSCAPE_RIGHT]: 90,
  [PORTRAIT_DOWN]: 180,
  [LANDSCAPE_LEFT]: 270,
};

// Maps an orientation code to the "canonical" target angle (0-359) the phone
// body should visually match. UNKNOWN or any unhandled code defaults to 0,
// matching the upright/portrait resting pose.
function getRotationDegrees(orientation) {
  return ROTATION_DEGREES[orientation] ?? 0;
}

// Given the current cumulative angle (which may already be many full turns
// away from 0) and a canonical target in [0, 360), returns the new cumulative
// angle reached by the shortest turn — always within +/-180 of currentAngle.
// This is what stops a jump like 270 -> 0 from spinning the long way back
// through 180; instead it keeps going forward to 360.
function nextAngle(currentAngle, targetDegrees) {
  const current = Number.isFinite(currentAngle) ? currentAngle : 0;
  const target = Number.isFinite(targetDegrees) ? targetDegrees : 0;
  const currentMod = ((current % 360) + 360) % 360;
  const targetMod = ((target % 360) + 360) % 360;
  let delta = targetMod - currentMod;
  if (delta > 180) delta -= 360;
  if (delta <= -180) delta += 360;
  return current + delta;
}

module.exports = {
  getRotationDegrees,
  nextAngle,
};
