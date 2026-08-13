import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Platform, Text, View, Pressable } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useEffect, useState } from 'react';

const ORIENTATION_LABELS = {
  [ScreenOrientation.Orientation.UNKNOWN]: 'Unknown',
  [ScreenOrientation.Orientation.PORTRAIT_UP]: 'Portrait (upright)',
  [ScreenOrientation.Orientation.PORTRAIT_DOWN]: 'Portrait (upside-down)',
  [ScreenOrientation.Orientation.LANDSCAPE_LEFT]: 'Landscape (left)',
  [ScreenOrientation.Orientation.LANDSCAPE_RIGHT]: 'Landscape (right)',
};

const ORIENTATION_EMOJI = {
  [ScreenOrientation.Orientation.PORTRAIT_UP]: '📱',
  [ScreenOrientation.Orientation.PORTRAIT_DOWN]: '🙃',
  [ScreenOrientation.Orientation.LANDSCAPE_LEFT]: '⬅️📱',
  [ScreenOrientation.Orientation.LANDSCAPE_RIGHT]: '📱➡️',
};

const ORIENTATION_CYCLE = {
  [ScreenOrientation.Orientation.PORTRAIT_UP]: {
    next: ScreenOrientation.Orientation.LANDSCAPE_RIGHT,
    lock: ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT,
  },
  [ScreenOrientation.Orientation.LANDSCAPE_RIGHT]: {
    next: Platform.OS === 'ios'
      ? ScreenOrientation.Orientation.LANDSCAPE_LEFT
      : ScreenOrientation.Orientation.PORTRAIT_DOWN,
    lock: Platform.OS === 'ios'
      ? ScreenOrientation.OrientationLock.LANDSCAPE_LEFT
      : ScreenOrientation.OrientationLock.PORTRAIT_DOWN,
  },
  [ScreenOrientation.Orientation.PORTRAIT_DOWN]: {
    next: ScreenOrientation.Orientation.LANDSCAPE_LEFT,
    lock: ScreenOrientation.OrientationLock.LANDSCAPE_LEFT,
  },
  [ScreenOrientation.Orientation.LANDSCAPE_LEFT]: {
    next: ScreenOrientation.Orientation.PORTRAIT_UP,
    lock: ScreenOrientation.OrientationLock.PORTRAIT_UP,
  },
};

export default function App() {
  const [orientation, setOrientation] = useState(ScreenOrientation.Orientation.PORTRAIT_UP);

  useEffect(() => {
    // Read the initial orientation
    ScreenOrientation.getOrientationAsync().then((info) => {
      setOrientation(info);
    });

    // Subscribe to orientation changes
    const subscription = ScreenOrientation.addOrientationChangeListener((evt) => {
      setOrientation(evt.orientationInfo.orientation);
    });

    // Unsubscribe on unmount
    return () => ScreenOrientation.removeOrientationChangeListener(subscription);
  }, []); // Empty deps: subscribe once on mount, clean up on unmount

  const rotate = () => {
    const target = ORIENTATION_CYCLE[orientation] ?? ORIENTATION_CYCLE[ScreenOrientation.Orientation.PORTRAIT_UP];
    setOrientation(target.next);
    ScreenOrientation.lockAsync(target.lock);
  };

  const label = ORIENTATION_LABELS[orientation] ?? `Orientation ${orientation}`;
  const emoji = ORIENTATION_EMOJI[orientation] ?? '📱';
  const isLandscape =
    orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
    orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>

      <View style={[styles.phoneOutline, isLandscape && styles.phoneLandscape]}>
        <Text style={styles.phoneScreen}>📷</Text>
      </View>

      <Text style={styles.label}>{label}</Text>
      <Text style={styles.code}>Orientation code: {orientation}</Text>

      <Pressable style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]} onPress={rotate}>
        <Text style={styles.btnText}>Rotate →</Text>
      </Pressable>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1da1f2',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emoji: {
    fontSize: 48,
  },
  phoneOutline: {
    width: 60,
    height: 100,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneLandscape: {
    width: 100,
    height: 60,
  },
  phoneScreen: {
    fontSize: 20,
  },
  label: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  code: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
  },
  btn: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#fff',
  },
  btnPressed: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    transform: [{ scale: 0.96 }],
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
