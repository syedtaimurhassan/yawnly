import { useEffect, useState } from "react";
import type {
  SessionEndReason,
  StudySession,
} from "@/features/session/model/session.types";
import { getSessionDurationMs } from "@/features/session/model/session.utils";
import { useInactivityTimeout } from "@/features/session/hooks/useInactivityTimeout";

interface UseActiveSessionOptions {
  session: StudySession;
  inactivityTimeoutMs: number;
  onLogYawn: (sleepiness: number) => void;
  onEndSession: (reason: SessionEndReason) => void;
}

export function useActiveSession({
  session,
  inactivityTimeoutMs,
  onLogYawn,
  onEndSession,
}: UseActiveSessionOptions) {
  const [elapsedMs, setElapsedMs] = useState(() => getSessionDurationMs(session));
  const [sleepiness, setSleepiness] = useState(1);
  const [isPulsing, setIsPulsing] = useState(false);
  const { markActivity } = useInactivityTimeout(
    inactivityTimeoutMs,
    () => onEndSession("inactivity"),
    true,
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setElapsedMs(getSessionDurationMs(session));
    }, 1_000);

    return () => window.clearInterval(interval);
  }, [session]);

  function handleSleepinessChange(value: number) {
    markActivity();
    setSleepiness(value);
  }

  function handleLogYawn() {
    markActivity();
    onLogYawn(sleepiness);
    setIsPulsing(true);
    window.setTimeout(() => setIsPulsing(false), 420);
  }

  function handleManualEnd() {
    markActivity();
    onEndSession("manual");
  }

  return {
    elapsedMs,
    sleepiness,
    isPulsing,
    handleLogYawn,
    handleManualEnd,
    handleSleepinessChange,
  };
}

