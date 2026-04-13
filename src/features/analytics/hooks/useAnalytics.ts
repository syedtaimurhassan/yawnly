import type { StudySession } from "@/features/session/model/session.types";
import {
  selectDailyTrend,
  selectFatigueByTaskType,
  selectOverviewStats,
  selectSleepImpact,
  selectTimelineBuckets,
  selectYawnsByCourse,
} from "@/features/analytics/model/analytics.selectors";

export interface AnalyticsSnapshot {
  byCourse: ReturnType<typeof selectYawnsByCourse>;
  byTask: ReturnType<typeof selectFatigueByTaskType>;
  dailyTrend: ReturnType<typeof selectDailyTrend>;
  sleepImpact: ReturnType<typeof selectSleepImpact>;
  overview: ReturnType<typeof selectOverviewStats>;
  latestTimeline: Array<{ label: string; yawns: number }>;
}

export function useAnalytics(sessions: StudySession[], latestSession: StudySession | null) {
  const snapshot: AnalyticsSnapshot = {
    byCourse: selectYawnsByCourse(sessions),
    byTask: selectFatigueByTaskType(sessions),
    dailyTrend: selectDailyTrend(sessions),
    sleepImpact: selectSleepImpact(sessions),
    overview: selectOverviewStats(sessions),
    latestTimeline: latestSession ? selectTimelineBuckets(latestSession) : [],
  };

  return snapshot;
}
