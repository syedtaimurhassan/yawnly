import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
    <div className="stack-lg">
      <Card className="hero-card">
        <p className="eyebrow">Phase 3</p>
        <h2>Session complete</h2>
        <p className="hero-card__subtitle">
          The useful question is not whether you were tired. It is when and where the tiredness surfaced.
        </p>
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
      </Card>

      <TimelineChart
        data={selectTimelineBuckets(session)}
        description="This session view helps you see when fatigue started clustering."
        title="Session timeline"
      />

      <div className="button-row">
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

