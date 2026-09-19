import { useCallback, useEffect, useRef } from 'react';

import usePersistentState from './usePersistentState';
import { STORAGE_KEYS } from '../lib/storage';
import {
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
      setStats((prev) => seedOrientation(prev, orientation, Date.now()));
    },
    [setStats]
  );

  // Clears history but keeps tracking the orientation we are in right now.
  const reset = useCallback(() => {
    setStats((prev) => seedOrientation(createStats(), prev.currentOrientation, Date.now()));
  }, [setStats]);

  return { stats, hydrated, storageError: error, record, seed, reset };
}
