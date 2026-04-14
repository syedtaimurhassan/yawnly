import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { SessionEndReason } from "@/features/session/model/session.types";
import { YawnButton } from "@/features/session/components/YawnButton";
import { SleepinessScale } from "@/features/session/components/SleepinessScale";
import { useInactivityTimeout } from "@/features/session/hooks/useInactivityTimeout";
import { formatClock } from "@/lib/dates";

interface ActiveSessionViewProps {
  courseNameSnapshot: string;
  inactivityTimeoutMs: number;
  onLogYawn: (sleepiness: number) => void;
  onEndSession: (reason: SessionEndReason) => void;
  participantNameSnapshot: string;
  sleepQuality: number;
  startTime: number;
  yawnCount: number;
}

const ActiveHeader = memo(function ActiveHeader({
  courseNameSnapshot,
  startTime,
}: {
  courseNameSnapshot: string;
  startTime: number;
}) {
  return (
    <div className="active-header">
      <p>{courseNameSnapshot}</p>
      <span>Started at {formatClock(startTime)}</span>
    </div>
  );
});

const TimerStage = memo(function TimerStage({
  elapsedMinutes,
  elapsedSeconds,
}: {
  elapsedMinutes: number;
  elapsedSeconds: number;
}) {
  return (
    <div className="timer-stage">
      <svg className="timer-stage__dial" viewBox="0 0 100 100">
        <circle className="timer-stage__track" cx="50" cy="50" r="44" />
        <circle
          className="timer-stage__progress"
          cx="50"
          cy="50"
          r="44"
          pathLength="100"
          stroke="var(--color-primary)"
          strokeDasharray="100 0"
        />
      </svg>
      <div className="timer-stage__content">
        <strong>
          {elapsedMinutes}:{String(elapsedSeconds).padStart(2, "0")}
        </strong>
        <span>Elapsed time</span>
      </div>
    </div>
  );
});

const ElapsedTimer = memo(function ElapsedTimer({ startTime }: { startTime: number }) {
  const [elapsedMs, setElapsedMs] = useState(() => Math.max(Date.now() - startTime, 0));

  useEffect(() => {
    setElapsedMs(Math.max(Date.now() - startTime, 0));

    const interval = window.setInterval(() => {
      setElapsedMs(Math.max(Date.now() - startTime, 0));
    }, 1_000);

    return () => window.clearInterval(interval);
  }, [startTime]);

  const elapsedMinutes = Math.floor(elapsedMs / 60_000);
  const elapsedSeconds = Math.floor((elapsedMs % 60_000) / 1_000);

  return (
    <div className="timer-stage">
      <svg className="timer-stage__dial" viewBox="0 0 100 100">
        <circle className="timer-stage__track" cx="50" cy="50" r="44" />
        <circle
          className="timer-stage__progress"
          cx="50"
          cy="50"
          r="44"
          pathLength="100"
          stroke="var(--color-primary)"
          strokeDasharray="100 0"
        />
      </svg>
      <div className="timer-stage__content">
        <strong>
          {elapsedMinutes}:{String(elapsedSeconds).padStart(2, "0")}
        </strong>
        <span>Elapsed time</span>
      </div>
    </div>
  );
});

const YawnCounter = memo(function YawnCounter({ count }: { count: number }) {
  return (
    <div className="yawn-counter">
      <strong>{count}</strong>
      <span>yawn{count === 1 ? "" : "s"} logged</span>
    </div>
  );
});

const SessionMeta = memo(function SessionMeta({
  sleepQuality,
  participantNameSnapshot,
}: {
  participantNameSnapshot: string;
  sleepQuality: number;
}) {
  return (
    <div className="session-metrics">
      <div>
        <strong>{sleepQuality}/5</strong>
        <span>Sleep quality</span>
      </div>
      <div>
        <strong>{participantNameSnapshot}</strong>
        <span>Participant</span>
      </div>
    </div>
  );
});

export const ActiveSessionView = memo(function ActiveSessionView({
  courseNameSnapshot,
  inactivityTimeoutMs,
  onLogYawn,
  onEndSession,
  participantNameSnapshot,
  sleepQuality,
  startTime,
  yawnCount,
}: ActiveSessionViewProps) {
  const sleepinessRef = useRef(1);
  const onLogYawnRef = useRef(onLogYawn);
  const onEndSessionRef = useRef(onEndSession);
  const { markActivity } = useInactivityTimeout(
    inactivityTimeoutMs,
    () => onEndSessionRef.current("inactivity"),
    true,
  );

  useEffect(() => {
    onLogYawnRef.current = onLogYawn;
  }, [onLogYawn]);

  useEffect(() => {
    onEndSessionRef.current = onEndSession;
  }, [onEndSession]);

  const handleLogYawn = useCallback(() => {
    markActivity();
    onLogYawnRef.current(sleepinessRef.current);
  }, [markActivity]);

  const handleManualEnd = useCallback(() => {
    markActivity();
    onEndSessionRef.current("manual");
  }, [markActivity]);

  const handleSleepinessChange = useCallback((value: number) => {
    sleepinessRef.current = value;
    markActivity();
  }, [markActivity]);

  return (
    <div className="mobile-screen mobile-screen--centered">
      <ActiveHeader courseNameSnapshot={courseNameSnapshot} startTime={startTime} />

      <ElapsedTimer startTime={startTime} />

      <YawnCounter count={yawnCount} />

      <YawnButton onClick={handleLogYawn} />

      <SleepinessScale onChange={handleSleepinessChange} />

      <SessionMeta
        participantNameSnapshot={participantNameSnapshot}
        sleepQuality={sleepQuality}
      />

      <button className="text-button text-button--danger" onClick={handleManualEnd} type="button">
        End session
      </button>
    </div>
  );
});
