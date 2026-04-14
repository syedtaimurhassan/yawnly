import { FatigueTrendChart } from "@/features/analytics/components/FatigueTrendChart";
import { SleepImpactChart } from "@/features/analytics/components/SleepImpactChart";
import { TimelineChart } from "@/features/analytics/components/TimelineChart";
import { YawnsByCourseChart } from "@/features/analytics/components/YawnsByCourseChart";
import type { AnalyticsSnapshot } from "@/features/analytics/hooks/useAnalytics";

interface AnalyticsScreenProps {
  analytics: AnalyticsSnapshot;
  participantName: string;
  onBack: () => void;
  onOpenSettings: () => void;
}

export function AnalyticsScreen({
  analytics,
  participantName,
  onBack,
  onOpenSettings,
}: AnalyticsScreenProps) {
  return (
    <div className="mobile-screen">
      <div className="screen-toolbar">
        <button className="toolbar-pill" onClick={onOpenSettings} type="button">
          Settings
        </button>
      </div>

      <div className="screen-stack">
        <header className="screen-header">
          <button className="back-link" onClick={onBack} type="button">
            Back
          </button>
          <h1>Insights</h1>
          <p>
            {participantName} has tracked {analytics.overview.sessionCount} completed session
            {analytics.overview.sessionCount === 1 ? "" : "s"}.
          </p>
        </header>
        <div className="stats-grid">
          <div className="stat-tile">
            <strong>{analytics.overview.sessionCount}</strong>
            <span>Completed sessions</span>
          </div>
          <div className="stat-tile">
            <strong>{analytics.overview.totalYawns}</strong>
            <span>Total yawns</span>
          </div>
          <div className="stat-tile">
            <strong>{analytics.overview.avgSleepiness || "-"}</strong>
            <span>Avg sleepiness</span>
          </div>
          <div className="stat-tile">
            <strong>{analytics.overview.avgDurationMinutes || "-"}</strong>
            <span>Avg duration</span>
          </div>
        </div>
        <YawnsByCourseChart data={analytics.byCourse} />
        <FatigueTrendChart data={analytics.dailyTrend} />
        <SleepImpactChart data={analytics.sleepImpact} />
        {analytics.latestTimeline.length > 0 ? (
          <TimelineChart
            data={analytics.latestTimeline}
            description="The latest completed session stays visible as a quick reflection anchor."
            title="Latest session timeline"
          />
        ) : null}
      </div>
    </div>
  );
}
