// Thin AsyncStorage wrapper that never throws. If the native module is missing
// or a call fails, values fall back to an in-memory map so the app keeps
// working (just without persistence across launches).

let AsyncStorage = null;
try {
  const mod = require('@react-native-async-storage/async-storage');
  AsyncStorage = mod?.default ?? mod ?? null;
} catch (e) {
  AsyncStorage = null;
}

export const STORAGE_KEYS = {
  settings: 'splash:settings:v1',
  stats: 'splash:stats:v1',
};

const memory = new Map();

export function isAvailable() {
  return AsyncStorage != null && typeof AsyncStorage.getItem === 'function';
}

export async function removeKey(key) {
  memory.delete(key);
  if (!isAvailable()) return;
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    // best effort
  }
}

export async function loadJSON(key, fallback) {
  let text;
  if (isAvailable()) {
    try {
      text = await AsyncStorage.getItem(key);
    } catch (e) {
      text = memory.get(key);
    }
  } else {
    text = memory.get(key);
  }
  if (text == null) return fallback;
  try {
    return JSON.parse(text);
  } catch (e) {
    // Corrupt payload: drop it once so we don't trip over it every launch.
    await removeKey(key);
    return fallback;
  }
}

// Resolves true only if the value reached durable storage.
export async function saveJSON(key, value) {
  let text;
  try {
    text = JSON.stringify(value);
  } catch (e) {
    return false;
  }
  memory.set(key, text);
  if (!isAvailable()) return false;
  try {
    await AsyncStorage.setItem(key, text);
    return true;
  } catch (e) {
    return false;
  }
}
