import * as ScreenOrientation from 'expo-screen-orientation';
import { Platform } from 'react-native';

const { Orientation, OrientationLock } = ScreenOrientation;

export const ORIENTATION_LABELS = {
  [Orientation.UNKNOWN]: 'Unknown',
  [Orientation.PORTRAIT_UP]: 'Portrait (upright)',
  [Orientation.PORTRAIT_DOWN]: 'Portrait (upside-down)',
  [Orientation.LANDSCAPE_LEFT]: 'Landscape (left)',
  [Orientation.LANDSCAPE_RIGHT]: 'Landscape (right)',
};

export const ORIENTATION_EMOJI = {
  [Orientation.UNKNOWN]: '📱',
  [Orientation.PORTRAIT_UP]: '📱',
  [Orientation.PORTRAIT_DOWN]: '🙃',
  [Orientation.LANDSCAPE_LEFT]: '⬅️📱',
  [Orientation.LANDSCAPE_RIGHT]: '📱➡️',
};

// Replaces the old switch statement in App.js. Each entry describes where
// `rotate()` should go next, and which OrientationLock to request for it.
const landscapeRightEntry =
  Platform.OS === 'ios'
    ? { next: Orientation.LANDSCAPE_LEFT, lock: OrientationLock.LANDSCAPE_LEFT }
    : { next: Orientation.PORTRAIT_DOWN, lock: OrientationLock.PORTRAIT_DOWN };

export const ORIENTATION_CYCLE = {
  [Orientation.PORTRAIT_UP]: {
    next: Orientation.LANDSCAPE_RIGHT,
    lock: OrientationLock.LANDSCAPE_RIGHT,
  },
  [Orientation.LANDSCAPE_RIGHT]: landscapeRightEntry,
  [Orientation.PORTRAIT_DOWN]: {
    next: Orientation.LANDSCAPE_LEFT,
    lock: OrientationLock.LANDSCAPE_LEFT,
  },
  [Orientation.LANDSCAPE_LEFT]: {
    next: Orientation.PORTRAIT_UP,
    lock: OrientationLock.PORTRAIT_UP,
  },
};

export function getLabel(orientation) {
  return ORIENTATION_LABELS[orientation] ?? `Orientation ${orientation}`;
}

export function getEmoji(orientation) {
  return ORIENTATION_EMOJI[orientation] ?? '📱';
}

export function getNext(orientation) {
  // Unknown/unhandled orientations fall back to portrait-up, matching the old
  // switch statement's default branch.
  return (
    ORIENTATION_CYCLE[orientation] ?? {
      next: Orientation.PORTRAIT_UP,
      lock: OrientationLock.PORTRAIT_UP,
    }
  );
}

export function isLandscape(orientation) {
  return (
    orientation === Orientation.LANDSCAPE_LEFT ||
    orientation === Orientation.LANDSCAPE_RIGHT
  );
}
