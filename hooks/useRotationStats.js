import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import usePersistentState from './usePersistentState';
import { STORAGE_KEYS } from '../lib/storage';
import {
  accumulateDwell,
  createStats,
  normalizeStats,
  recordOrientation,
  seedOrientation,
} from '../lib/stats';

// Persisted rotation history. record() is a no-op until the stored stats have
// loaded AND seed() has set the baseline orientation, so a stale orientation
// from the previous session can never be turned into a bogus rotation event.
export default function useRotationStats() {
  const [stats, setStats, { hydrated, error }] = usePersistentState(
    STORAGE_KEYS.stats,
    createStats(),
    { normalize: normalizeStats }
  );
  const hydratedRef = useRef(false);
  const seededRef = useRef(false);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    hydratedRef.current = hydrated;
  }, [hydrated]);

  const record = useCallback(
    (orientation, source = 'sensor') => {
      if (!hydratedRef.current || !seededRef.current) return;
      setStats((prev) => recordOrientation(prev, { orientation, at: Date.now(), source }));
    },
    [setStats]
  );

  const seed = useCallback(
    (orientation) => {
      if (!hydratedRef.current || seededRef.current) return;
      seededRef.current = true;
      setSeeded(true);
      setStats((prev) => seedOrientation(prev, orientation, Date.now()));
    },
    [setStats]
  );

  // Clears history but keeps tracking the orientation we are in right now.
  const reset = useCallback(() => {
    setStats((prev) => seedOrientation(createStats(), prev.currentOrientation, Date.now()));
  }, [setStats]);

  // Credits the still-running dwell span to storage immediately, so it is not
  // lost if the app gets killed while backgrounded. No-op until we actually
  // have a baseline to accumulate against.
  const flushDwell = useCallback(() => {
    if (!hydratedRef.current || !seededRef.current) return;
    setStats((prev) => accumulateDwell(prev, Date.now()), { immediate: true });
  }, [setStats]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') flushDwell();
    });
    return () => {
      sub.remove();
    };
  }, [flushDwell]);

  return { stats, hydrated, storageError: error, record, seed, reset, flushDwell, seeded };
}
