import { memo, useMemo } from "react";
import { TimelineChart } from "@/features/analytics/components/TimelineChart";
import {
  type SessionInsight,
  selectTimelineBuckets,
} from "@/features/analytics/model/analytics.selectors";
import { formatDurationMinutes } from "@/lib/dates";

interface InsightsSessionPanelProps {
  insights: SessionInsight[];
  selectedSessionId: string | null;
}

function getSessionMessage(selectedInsight: SessionInsight | null) {
  if (!selectedInsight) {
    return "Choose a session from the Summary tab to inspect when yawns started and whether they stayed isolated or came in a short burst.";
  }

  if (!selectedInsight.hasAnyYawn) {
    return "No yawns were logged in this session. Keep sessions like this in mind as a calmer baseline when you compare harder days.";
  }

  if (selectedInsight.clusterCount > 0) {
    return `${selectedInsight.courseName} first showed a yawn around minute ${
      selectedInsight.firstYawnMinute
    }, and the cues later grouped into ${selectedInsight.clusterCount} short burst${
      selectedInsight.clusterCount === 1 ? "" : "s"
    }.`;
  }

  return `${selectedInsight.courseName} first showed a yawn around minute ${selectedInsight.firstYawnMinute}, but the cues stayed fairly spread out afterward.`;
}

export const InsightsSessionPanel = memo(function InsightsSessionPanel({
  insights,
  selectedSessionId,
}: InsightsSessionPanelProps) {
  const selectedInsight =
    insights.find((insight) => insight.id === selectedSessionId) ?? insights[0] ?? null;
  const timelineData = useMemo(
    () => (selectedInsight ? selectTimelineBuckets(selectedInsight.session) : []),
    [selectedInsight],
  );

  return (
    <>
      <div className="section-header">
        <h2>Session detail</h2>
        <p>{getSessionMessage(selectedInsight)}</p>
      </div>

      {selectedInsight ? (
        <>
          <div className="stats-grid">
            <div className="stat-tile">
              <strong>{formatDurationMinutes(selectedInsight.durationMinutes)}</strong>
              <span>Duration</span>
            </div>
            <div className="stat-tile">
              <strong>{selectedInsight.totalYawns === 1 ? "1 yawn" : `${selectedInsight.totalYawns} yawns`}</strong>
              <span>Total yawns</span>
            </div>
            <div className="stat-tile">
              <strong>
                {selectedInsight.firstYawnMinute === null
                  ? "No yawns"
                  : `${Math.round(selectedInsight.firstYawnMinute)} min`}
              </strong>
              <span>First yawn</span>
            </div>
            <div className="stat-tile">
              <strong>{selectedInsight.maxYawnsIn15MinWindow}</strong>
              <span>Most in 15 min</span>
            </div>
          </div>

          <div className="card insight-session-context">
            <div className="insight-session-context__row">
              <span>{selectedInsight.courseName}</span>
              <span>{selectedInsight.sessionLabel}</span>
            </div>
            <div className="insight-session-context__row">
              <span>
                {selectedInsight.weekdayLabel} · {selectedInsight.timeOfDayBucket}
              </span>
              <span>Sleep quality {selectedInsight.sleepQuality}/5</span>
            </div>
            <div className="insight-session-context__row">
              <span>
                {selectedInsight.clusterCount > 0
                  ? `${selectedInsight.clusterCount} short burst${selectedInsight.clusterCount === 1 ? "" : "s"}`
                  : "No short bursts"}
              </span>
              <span>
                {selectedInsight.firstYawnPercentOfSession === null
                  ? "No early cue"
                  : `${Math.round(selectedInsight.firstYawnPercentOfSession)}% into session`}
              </span>
            </div>
          </div>

          <TimelineChart
            data={timelineData}
            description="This timeline shows where yawns stayed isolated and where they started to cluster together."
            title="Selected session timeline"
          />
        </>
      ) : (
        <div className="card">
          <p className="microcopy">
            Choose a session from the Summary tab to inspect its timeline here.
          </p>
        </div>
      )}
    </>
  );
});
