import { Button } from "@/components/ui/Button";
import { TimelineChart } from "@/features/analytics/components/TimelineChart";
import { selectTimelineBuckets } from "@/features/analytics/model/analytics.selectors";
import type { StudySession } from "@/features/session/model/session.types";
import { getAverageSleepiness, getSessionDurationMinutes } from "@/features/session/model/session.utils";

interface SessionSummaryViewProps {
  session: StudySession;
  onStartAnother: () => void;
  onViewAnalytics: () => void;
}

export function SessionSummaryView({
  session,
  onStartAnother,
  onViewAnalytics,
}: SessionSummaryViewProps) {
  const durationMinutes = getSessionDurationMinutes(session);
  const avgSleepiness = getAverageSleepiness(session);

  return (
    <div className="mobile-screen">
      <div className="screen-stack">
        <header className="screen-header">
        <h2>Session complete</h2>
          <p>
            {session.participantNameSnapshot} finished a {session.taskType.replace("-", " ")} session.
          </p>
        </header>
        <div className="stats-grid">
          <div className="stat-tile">
            <strong>{durationMinutes}m</strong>
            <span>Duration</span>
          </div>
          <div className="stat-tile">
            <strong>{session.yawns.length}</strong>
            <span>Yawns</span>
          </div>
          <div className="stat-tile">
            <strong>{session.courseNameSnapshot}</strong>
            <span>Course</span>
          </div>
          <div className="stat-tile">
            <strong>{avgSleepiness || "-"}</strong>
            <span>Avg sleepiness</span>
          </div>
        </div>

        <TimelineChart
          data={selectTimelineBuckets(session)}
          description="This session view helps you see when fatigue started clustering."
          title="Session timeline"
        />
      </div>

      <div className="button-row button-row--bottom">
        <Button block onClick={onStartAnother} type="button" variant="secondary">
          New session
        </Button>
        <Button block onClick={onViewAnalytics} type="button">
          View insights
        </Button>
      </div>
    </div>
  );
}
