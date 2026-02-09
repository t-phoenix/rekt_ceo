import { useCallback, useRef } from "react";

/**
 * Returns a stable function identity that always calls the latest implementation.
 * Useful when passing callbacks to memoized children without re-creating handlers.
 */
export function useStableCallback(fn) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

   
  const stable = useCallback(((...args) => {
    return fnRef.current(...args);
  }), []);

  return stable;
}
