import type {
  SessionEndReason,
  StudySession,
} from "@/features/session/model/session.types";
import { useActiveSession } from "@/features/session/hooks/useActiveSession";
import { YawnButton } from "@/features/session/components/YawnButton";
import { SleepinessScale } from "@/features/session/components/SleepinessScale";
import { formatClock, formatDurationMinutes } from "@/lib/dates";

interface ActiveSessionViewProps {
  session: StudySession;
  inactivityTimeoutMs: number;
  onLogYawn: (sleepiness: number) => void;
  onEndSession: (reason: SessionEndReason) => void;
}

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
  const progress = Math.min(elapsedMinutes / session.expectedMinutes, 1);
  const isOvertime = elapsedMinutes > session.expectedMinutes;

  return (
    <div className="mobile-screen mobile-screen--centered">
      <div className="active-header">
        <p>{session.courseNameSnapshot}</p>
        <span>{session.taskType.replace("-", " ")} • {formatClock(session.startTime)}</span>
      </div>

      <div className="timer-stage">
        <svg className="timer-stage__dial" viewBox="0 0 100 100">
          <circle className="timer-stage__track" cx="50" cy="50" r="44" />
          <circle
            className="timer-stage__progress"
            cx="50"
            cy="50"
            r="44"
            pathLength="100"
            stroke={isOvertime ? "var(--color-fatigue-high)" : "var(--color-primary)"}
            strokeDasharray={`${progress * 100} 100`}
          />
        </svg>
        <div className="timer-stage__content">
          <strong>
            {elapsedMinutes}:{String(elapsedSeconds).padStart(2, "0")}
          </strong>
          <span>{formatDurationMinutes(session.expectedMinutes)}</span>
        </div>
      </div>

      <div className="yawn-counter">
        <strong>{session.yawns.length}</strong>
        <span>yawn{session.yawns.length === 1 ? "" : "s"} logged</span>
      </div>

      <YawnButton isPulsing={isPulsing} onClick={handleLogYawn} />

      <SleepinessScale onChange={handleSleepinessChange} value={sleepiness} />

      <div className="session-metrics">
        <div>
          <strong>{session.sleepQuality}/5</strong>
          <span>Sleep quality</span>
        </div>
        <div>
          <strong>{session.participantNameSnapshot}</strong>
          <span>Participant</span>
        </div>
      </div>

      <button className="text-button text-button--danger" onClick={handleManualEnd} type="button">
        End session
      </button>
    </div>
  );
}
