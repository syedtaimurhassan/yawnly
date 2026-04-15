import type { StudySession } from "@/features/session/model/session.types";
import { selectSessionInsights } from "@/features/analytics/model/analytics.selectors";

export interface AnalyticsSnapshot {
  latestSessionId: string | null;
  sessionInsights: ReturnType<typeof selectSessionInsights>;
}

export function buildAnalyticsSnapshot(
  sessions: StudySession[],
  latestSession: StudySession | null,
): AnalyticsSnapshot {
  const sessionInsights = selectSessionInsights(sessions);

  return {
    latestSessionId: latestSession?.id ?? sessionInsights[0]?.id ?? null,
    sessionInsights,
  };
}

export function useAnalytics(sessions: StudySession[], latestSession: StudySession | null) {
  return buildAnalyticsSnapshot(sessions, latestSession);
}
