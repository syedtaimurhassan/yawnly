import { memo } from "react";
import type {
  SessionEndReason,
  StudySession,
} from "@/features/session/model/session.types";
import { useActiveSession } from "@/features/session/hooks/useActiveSession";
import { YawnButton } from "@/features/session/components/YawnButton";
import { SleepinessScale } from "@/features/session/components/SleepinessScale";
import { formatClock } from "@/lib/dates";

interface ActiveSessionViewProps {
  session: StudySession;
  inactivityTimeoutMs: number;
  onLogYawn: (sleepiness: number) => void;
  onEndSession: (reason: SessionEndReason) => void;
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
}: Pick<StudySession, "sleepQuality" | "participantNameSnapshot">) {
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

export function ActiveSessionView({
  session,
  inactivityTimeoutMs,
  onLogYawn,
  onEndSession,
}: ActiveSessionViewProps) {
  const {
    elapsedMs,
    sleepiness,
    isPulsing,
    handleLogYawn,
    handleManualEnd,
    handleSleepinessChange,
  } = useActiveSession({
    session,
    inactivityTimeoutMs,
    onLogYawn,
    onEndSession,
  });

  const elapsedMinutes = Math.floor(elapsedMs / 60_000);
  const elapsedSeconds = Math.floor((elapsedMs % 60_000) / 1_000);

  return (
    <div className="mobile-screen mobile-screen--centered">
      <ActiveHeader
        courseNameSnapshot={session.courseNameSnapshot}
        startTime={session.startTime}
      />

      <TimerStage elapsedMinutes={elapsedMinutes} elapsedSeconds={elapsedSeconds} />

      <YawnCounter count={session.yawns.length} />

      <YawnButton isPulsing={isPulsing} onClick={handleLogYawn} />

      <SleepinessScale onChange={handleSleepinessChange} value={sleepiness} />

      <SessionMeta
        participantNameSnapshot={session.participantNameSnapshot}
        sleepQuality={session.sleepQuality}
      />

      <button className="text-button text-button--danger" onClick={handleManualEnd} type="button">
        End session
      </button>
    </div>
  );
}
