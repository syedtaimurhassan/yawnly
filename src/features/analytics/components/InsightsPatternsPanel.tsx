import { memo, useMemo } from "react";
import { SleepImpactChart } from "@/features/analytics/components/SleepImpactChart";
import { TimeOfDayImpactChart } from "@/features/analytics/components/TimeOfDayImpactChart";
import {
  type SessionInsight,
  selectSleepImpact,
  selectTimeOfDayImpact,
} from "@/features/analytics/model/analytics.selectors";

interface InsightsPatternsPanelProps {
  insights: SessionInsight[];
}

function getPatternsMessage({
  sleepImpact,
  timeOfDayData,
}: {
  sleepImpact: ReturnType<typeof selectSleepImpact>;
  timeOfDayData: ReturnType<typeof selectTimeOfDayImpact>;
}) {
  if (timeOfDayData.length >= 2) {
    const highest = timeOfDayData.reduce((current, item) =>
      item.sessionsWithYawnsPct > current.sessionsWithYawnsPct ? item : current,
    );
    const lowest = timeOfDayData.reduce((current, item) =>
      item.sessionsWithYawnsPct < current.sessionsWithYawnsPct ? item : current,
    );

    if (highest.sessionsWithYawnsPct - lowest.sessionsWithYawnsPct >= 15) {
      return `${highest.label} currently shows yawns most often, while ${lowest.label} looks calmer. Treat that as a planning hint, not proof of cause.`;
    }
  }

  if (sleepImpact.length >= 2) {
    const highest = sleepImpact.reduce((current, item) =>
      item.sessionsWithYawnsPct > current.sessionsWithYawnsPct ? item : current,
    );
    const lowest = sleepImpact.reduce((current, item) =>
      item.sessionsWithYawnsPct < current.sessionsWithYawnsPct ? item : current,
    );

    if (highest.sessionsWithYawnsPct - lowest.sessionsWithYawnsPct >= 15) {
      return `Sleep quality ${highest.label}/5 currently lines up with more yawn-heavy sessions than ${lowest.label}/5. Use the gap as a rough guide, not a hard rule.`;
    }
  }

  return "Look for broad differences here. Small gaps usually are not a strong enough reason to change your study plan yet.";
}

export const InsightsPatternsPanel = memo(function InsightsPatternsPanel({
  insights,
}: InsightsPatternsPanelProps) {
  const sleepImpact = useMemo(() => selectSleepImpact(insights), [insights]);
  const timeOfDayData = useMemo(() => selectTimeOfDayImpact(insights), [insights]);

  return (
    <>
      <div className="section-header">
        <h2>Look for broad context patterns</h2>
        <p>{getPatternsMessage({ sleepImpact, timeOfDayData })}</p>
      </div>

      <SleepImpactChart data={sleepImpact} />
      <TimeOfDayImpactChart data={timeOfDayData} />
    </>
  );
});
