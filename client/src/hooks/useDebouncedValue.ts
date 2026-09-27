import { useEffect, useState } from "react";

/**
 * Debounce a fast-changing value (search inputs) so API-backed filtering
 * stays responsive without firing a request per keystroke. The immediate
 * value updates instantly for controlled inputs; consumers read `debounced`
 * for query keys.
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
