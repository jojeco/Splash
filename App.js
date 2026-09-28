import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { getNext, getLabel } from './constants/orientation';
import PhoneIndicator from './components/PhoneIndicator';
import RotateButton from './components/RotateButton';
import StatsPanel from './components/StatsPanel';
import usePersistentState from './hooks/usePersistentState';
import useRotationStats from './hooks/useRotationStats';
import { STORAGE_KEYS } from './lib/storage';

const SETTINGS_VERSION = 1;
const DEFAULT_SETTINGS = { version: SETTINGS_VERSION, locked: false, orientationLock: null, showStats: false };
// How long after a restored lock we still attribute orientation changes to it.
const RESTORE_WINDOW_MS = 1500;

// Validates whatever came out of storage; a lock is only honoured if we also
// have a real OrientationLock value to re-apply.
function normalizeSettings(raw) {
  if (!raw || typeof raw !== 'object' || raw.version !== SETTINGS_VERSION) return DEFAULT_SETTINGS;
  const lockValid = Object.values(ScreenOrientation.OrientationLock).includes(raw.orientationLock);
  return {
    version: SETTINGS_VERSION,
    locked: raw.locked === true && lockValid,
    orientationLock: lockValid ? raw.orientationLock : null,
    showStats: raw.showStats === true,
  };
}

export default function App() {
  const [orientation, setOrientation] = useState(ScreenOrientation.Orientation.PORTRAIT_UP);
  const [settings, setSettings, { hydrated: settingsHydrated }] = usePersistentState(
    STORAGE_KEYS.settings,
    DEFAULT_SETTINGS,
    { normalize: normalizeSettings }
  );
  const { locked, showStats } = settings;
  const { stats, hydrated: statsHydrated, storageError, record, seed, reset, seeded } = useRotationStats();
  const [orientationReady, setOrientationReady] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const orientationRef = useRef(orientation);
  const restoringRef = useRef(false);
  const startedRef = useRef(false);

  useEffect(() => {
    // get initial screen orientation
    ScreenOrientation.getOrientationAsync()
      .then((info) => {
        orientationRef.current = info;
        setOrientation(info);
      })
      // If the read fails we still have to unblock the seed/restore effect,
      // otherwise record() would stay a permanent no-op and a saved lock would
      // never be re-applied. Falling back to the default orientation is better
      // than a dead stats subsystem.
      .catch(() => {})
      .then(() => setOrientationReady(true));
    // subscribe to future events
    const subscription = ScreenOrientation.addOrientationChangeListener((evt) => {
      const next = evt.orientationInfo.orientation;
      orientationRef.current = next;
      setOrientation(next);
      setOrientationReady(true);
      record(next, restoringRef.current ? 'restore' : 'sensor');
    });
    // unsubscribe when component is unmounted
    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription);
    };
  }, [record]);

  // Once stored data and the real starting orientation are both known: set the
  // stats baseline (no event), then re-apply a saved lock. Order matters, so the
  // restore rotation is logged as 'restore' rather than a phantom sensor change.
  useEffect(() => {
    if (startedRef.current || !settingsHydrated || !statsHydrated || !orientationReady) return;
    startedRef.current = true;
    seed(orientationRef.current);
    if (settings.locked && settings.orientationLock != null) {
      restoringRef.current = true;
      ScreenOrientation.lockAsync(settings.orientationLock)
        .catch(() => {})
        .then(() => setTimeout(() => (restoringRef.current = false), RESTORE_WINDOW_MS));
    }
  }, [settingsHydrated, statsHydrated, orientationReady, settings, seed]);

  // Tick once a second, but only while the stats panel is on screen.
  useEffect(() => {
    if (!showStats) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [showStats]);

  const rotate = () => {
    const { next, lock } = getNext(orientation);
    orientationRef.current = next;
    setOrientation(next);
    record(next, 'button');
    restoringRef.current = false;
    ScreenOrientation.lockAsync(lock).catch(() => {});
    setSettings((prev) => ({ ...prev, locked: true, orientationLock: lock }));
  };

  const unlock = () => {
    // Any rotation after an explicit unlock is the sensor's doing, not the
    // restored lock's, even if we are still inside the restore window.
    restoringRef.current = false;
    ScreenOrientation.unlockAsync().catch(() => {});
    setSettings((prev) => ({ ...prev, locked: false, orientationLock: null }));
  };

  const toggleStats = useCallback(() => {
    setSettings((prev) => ({ ...prev, showStats: !prev.showStats }));
  }, [setSettings]);

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <PhoneIndicator orientation={orientation} animate={orientationReady} />
        <Text style={styles.label}>{getLabel(orientation)}</Text>
        <Text style={styles.code}>Orientation code: {orientation}</Text>
        <RotateButton label="Rotate" onPress={rotate} variant="primary" />
        <RotateButton
          label={locked ? 'Unlock (follow device)' : 'Following device sensor'}
          onPress={unlock}
          disabled={!locked}
          variant="secondary"
        />
        <StatsPanel
          stats={stats}
          now={now}
          seeded={seeded}
          visible={showStats}
          onToggle={toggleStats}
          onReset={reset}
          storageError={storageError}
        />
      </ScrollView>
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#1da1f2',
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 20,
  },
  label: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  code: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 8,
  },
});
