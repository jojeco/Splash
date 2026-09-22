import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { isAvailable, loadJSON, saveJSON } from '../lib/storage';

const WRITE_DELAY_MS = 500;

// useState backed by AsyncStorage. Writes are debounced and never happen before
// the stored value has been read, so defaults can't clobber saved data.
export default function usePersistentState(key, defaultValue, { normalize } = {}) {
  const [value, setValueState] = useState(defaultValue);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState(null);

  const latest = useRef(defaultValue);
  const hydratedRef = useRef(false);
  const touched = useRef(false);
  const dirty = useRef(false);
  const timer = useRef(null);
  const mounted = useRef(true);
  const normalizeRef = useRef(normalize);
  normalizeRef.current = normalize;

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current || !hydratedRef.current) return;
    dirty.current = false;
    saveJSON(key, latest.current).then((ok) => {
      if (mounted.current) setError(ok ? null : 'unavailable');
    });
  }, [key]);

  const setValue = useCallback(
    (next, { immediate = false } = {}) => {
      const resolved = typeof next === 'function' ? next(latest.current) : next;
      latest.current = resolved;
      touched.current = true;
      setValueState(resolved);
      if (!hydratedRef.current) return;
      dirty.current = true;
      clearTimeout(timer.current);
      if (immediate) {
        flush();
      } else {
        timer.current = setTimeout(flush, WRITE_DELAY_MS);
      }
    },
    [flush]
  );

  useEffect(() => {
    let cancelled = false;
    loadJSON(key, null).then((stored) => {
      if (cancelled) return;
      // A change made before the read finished wins over the stored value.
      if (!touched.current && stored != null) {
        const restored = normalizeRef.current ? normalizeRef.current(stored) : stored;
        latest.current = restored;
        setValueState(restored);
      }
      hydratedRef.current = true;
      if (touched.current) {
        dirty.current = true;
        timer.current = setTimeout(flush, WRITE_DELAY_MS);
      }
      if (!isAvailable()) setError('unavailable');
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [key, flush]);

  // Flush pending writes when the app is backgrounded (it may be killed there)
  // and when the component unmounts.
  useEffect(() => {
    mounted.current = true;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') flush();
    });
    return () => {
      mounted.current = false;
      sub.remove();
      flush();
    };
  }, [flush]);

  return [value, setValue, { hydrated, error }];
}
