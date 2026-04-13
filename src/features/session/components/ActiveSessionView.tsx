import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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

  return (
    <div className="stack-lg">
      <Card className="hero-card">
        <p className="eyebrow">Phase 2</p>
        <h2>{session.courseNameSnapshot}</h2>
        <p className="hero-card__subtitle">
          {session.participantNameSnapshot} studying {session.taskType.replace("-", " ")} • started at{" "}
          {formatClock(session.startTime)}
        </p>
        <div className="timer-ring" style={{ ["--progress" as string]: `${progress}` }}>
          <div className="timer-ring__content">
            <strong>
              {elapsedMinutes}:{String(elapsedSeconds).padStart(2, "0")}
            </strong>
            <span>Target {formatDurationMinutes(session.expectedMinutes)}</span>
          </div>
        </div>
        <div className="session-metrics">
          <div>
            <strong>{session.yawns.length}</strong>
            <span>Yawns logged</span>
          </div>
          <div>
            <strong>{session.sleepQuality}/5</strong>
            <span>Sleep quality</span>
          </div>
        </div>
      </Card>

      <YawnButton isPulsing={isPulsing} onClick={handleLogYawn} />

      <SleepinessScale onChange={handleSleepinessChange} value={sleepiness} />

      <Button block onClick={handleManualEnd} size="lg" type="button" variant="danger">
        End session now
      </Button>
    </div>
  );
}
