import { useCallback, useEffect, useRef } from "react";

export function useInactivityTimeout(
  timeoutMs: number,
  onTimeout: () => void,
  enabled: boolean,
) {
  const lastActivityRef = useRef(Date.now());
  const hasTimedOutRef = useRef(false);

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    hasTimedOutRef.current = false;
  }, []);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    lastActivityRef.current = Date.now();
    hasTimedOutRef.current = false;

    const interval = window.setInterval(() => {
      const idleDuration = Date.now() - lastActivityRef.current;
      if (!hasTimedOutRef.current && idleDuration >= timeoutMs) {
        hasTimedOutRef.current = true;
        onTimeout();
      }
    }, 1_000);

    return () => window.clearInterval(interval);
  }, [enabled, onTimeout, timeoutMs]);

  return { markActivity };
}

