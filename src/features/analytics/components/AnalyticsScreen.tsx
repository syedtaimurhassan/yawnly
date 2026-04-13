import { Card } from "@/components/ui/Card";
import { FatigueByTaskChart } from "@/features/analytics/components/FatigueByTaskChart";
import { FatigueTrendChart } from "@/features/analytics/components/FatigueTrendChart";
import { SleepImpactChart } from "@/features/analytics/components/SleepImpactChart";
import { TimelineChart } from "@/features/analytics/components/TimelineChart";
import { YawnsByCourseChart } from "@/features/analytics/components/YawnsByCourseChart";
import type { AnalyticsSnapshot } from "@/features/analytics/hooks/useAnalytics";
import type { StorageMode } from "@/features/settings/model/settings.types";

interface AnalyticsScreenProps {
  analytics: AnalyticsSnapshot;
  storageMode: StorageMode;
}

export function AnalyticsScreen({
  analytics,
  storageMode,
}: AnalyticsScreenProps) {
  return (
    <div className="stack-lg">
      <Card className="hero-card">
        <p className="eyebrow">Phase 5</p>
        <h2>Reflection dashboard</h2>
        <p className="hero-card__subtitle">
          Derived analytics stay on the client in this version, which keeps GitHub Pages deployment simple.
        </p>
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
            <strong>{storageMode}</strong>
            <span>Storage mode</span>
          </div>
        </div>
      </Card>
      <YawnsByCourseChart data={analytics.byCourse} />
      <FatigueByTaskChart data={analytics.byTask} />
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
  );
}
