// Thin expo-haptics wrapper that never throws and never rejects visibly.
// Loaded the same defensive way lib/storage.js loads AsyncStorage: if the
// native module isn't present (old dev client, or any non-native platform
// that doesn't bundle it) every exported call becomes a silent no-op. Web is
// also always a no-op since the Haptics API has no browser equivalent.

import { Platform } from 'react-native';

let Haptics = null;
try {
  Haptics = require('expo-haptics');
} catch (e) {
  Haptics = null;
}

function isUsable() {
  return Haptics != null && Platform.OS !== 'web';
}

// Fire-and-forget: wrapped in try/catch, and the returned promise (if any)
// gets a .catch(() => {}) so a rejection never surfaces as an unhandled
// rejection.
function safeCall(fn) {
  if (!isUsable()) return;
  try {
    const result = fn();
    if (result && typeof result.catch === 'function') {
      result.catch(() => {});
    }
  } catch (e) {
    // best effort
  }
}

export function hapticRotate() {
  safeCall(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function hapticUnlock() {
  safeCall(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function hapticReset() {
  safeCall(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
