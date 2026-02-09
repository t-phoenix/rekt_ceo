import { useEffect, useMemo, useRef } from "react";
import { useStableCallback } from "./useStableCallback";

/**
 * Returns a debounced function that delays invoking `fn` until after `delay`
 * milliseconds have elapsed since the last call.
 */
export function useDebouncedCallback(fn, delay) {
  const latest = useStableCallback(fn);
  const timerRef = useRef(null);
  const lastArgsRef = useRef(null);

  const cancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const flush = () => {
    if (timerRef.current && lastArgsRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
       
      latest(...lastArgsRef.current);
      lastArgsRef.current = null;
    }
  };

  // cancel when delay changes/unmounts
  useEffect(() => cancel, [delay]);

  return useMemo(() => {
    const debounced = ((...args) => {
      lastArgsRef.current = args;
      cancel();
      timerRef.current = setTimeout(() => {
         
        latest(...lastArgsRef.current);
        lastArgsRef.current = null;
        timerRef.current = null;
      }, delay);
    });
    debounced.cancel = cancel;
    debounced.flush = flush;
    return debounced;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, latest]);
}
