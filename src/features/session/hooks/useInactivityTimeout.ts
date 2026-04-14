import { useCallback, useEffect, useRef } from "react";

export function useInactivityTimeout(
  timeoutMs: number,
  onTimeout: () => void,
  enabled: boolean,
) {
  const lastActivityRef = useRef(Date.now());
  const hasTimedOutRef = useRef(false);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

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
        onTimeoutRef.current();
      }
    }, 1_000);

    return () => window.clearInterval(interval);
  }, [enabled, timeoutMs]);

  return { markActivity };
}
