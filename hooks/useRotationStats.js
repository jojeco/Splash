import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import usePersistentState from './usePersistentState';
import { STORAGE_KEYS } from '../lib/storage';
import {
  accumulateDwell,
  createStats,
  normalizeStats,
  recordOrientation,
  resumeDwell as resumeDwellLib,
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
  // Tracks foreground/background so a late sensor event never credits
  // background time to the orientation active when the app was backgrounded.
  const appActiveRef = useRef(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');

  useEffect(() => {
    hydratedRef.current = hydrated;
  }, [hydrated]);

  const record = useCallback(
    (orientation, source = 'sensor') => {
      if (!hydratedRef.current || !seededRef.current) return;
      if (!appActiveRef.current) {
        const now = Date.now();
        setStats((prev) => recordOrientation(resumeDwellLib(prev, now), { orientation, at: now, source }));
        return;
      }
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

  // Restarts the dwell clock when the app returns to the foreground, so the
  // time spent backgrounded (possibly hours) is never silently credited to
  // whatever orientation was active when the app was backgrounded.
  const resumeDwell = useCallback(() => {
    if (!hydratedRef.current || !seededRef.current) return;
    setStats((prev) => resumeDwellLib(prev, Date.now()));
  }, [setStats]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      appActiveRef.current = state === 'active';
      if (state === 'active') resumeDwell();
      else flushDwell();
    });
    return () => {
      sub.remove();
    };
  }, [flushDwell, resumeDwell]);

  return { stats, hydrated, storageError: error, record, seed, reset, flushDwell, resumeDwell, seeded };
}
