import { useEffect, useState } from "react";
import { useDebouncedCallback } from "./useDebouncedCallback";

/**
 * Derives a debounced value from an input value and delay.
 */
export function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  const setter = useDebouncedCallback((v) => setDebounced(v), delay);

  useEffect(() => {
    setter(value);
    return setter.cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay]);

  return debounced;
}
