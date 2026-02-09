import { useEffect, useRef } from "react";
import { useStableCallback } from "./useStableCallback";

/**
 * Declarative setInterval with pause/resume and latest-callback semantics.
 * Pass delay=null to pause.
 */
export function useInterval(
  callback,
  delay,
  options = {}
) {
  const { enabled = true, immediate = false } = options;
  const savedCallback = useStableCallback(callback);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!enabled || delay == null) return;
    if (immediate) {
      savedCallback();
    }
    intervalRef.current = setInterval(savedCallback, delay);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [delay, enabled, immediate, savedCallback]);
}
