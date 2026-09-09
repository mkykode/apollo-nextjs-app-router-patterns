import { useEffect, useMemo, useRef } from "react";

/**
 * Returns a stable function that runs `callback` only after `delayMs` of silence.
 * The latest callback is kept in a ref so the debounced function never goes stale, and the
 * pending timer is cleared on unmount so it cannot fire into a component that is gone.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
) {
  const latest = useRef(callback);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    latest.current = callback;
  });

  useEffect(() => () => clearTimeout(timer.current), []);

  return useMemo(
    () =>
      (...args: Args) => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => latest.current(...args), delayMs);
      },
    [delayMs],
  );
}
