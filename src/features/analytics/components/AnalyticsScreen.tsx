import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { FatigueTrendChart } from "@/features/analytics/components/FatigueTrendChart";
import { SleepImpactChart } from "@/features/analytics/components/SleepImpactChart";
import { TimelineChart } from "@/features/analytics/components/TimelineChart";
import { YawnsByCourseChart } from "@/features/analytics/components/YawnsByCourseChart";
import type { AnalyticsSnapshot } from "@/features/analytics/hooks/useAnalytics";

type InsightView = "overview" | "patterns" | "latest";

const INSIGHT_VIEWS: Array<{ id: InsightView; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "patterns", label: "Patterns" },
  { id: "latest", label: "Latest" },
];

interface AnalyticsScreenProps {
  analytics: AnalyticsSnapshot;
  participantName: string;
  onBack: () => void;
  onOpenSettings: () => void;
}

function getOverviewTakeaway(analytics: AnalyticsSnapshot) {
  const topCourse = analytics.byCourse[0];

  if (!topCourse || analytics.overview.totalYawns === 0) {
    return "Start here. This view gives the quickest summary of what has happened across completed sessions.";
  }

  return `${topCourse.name} has the most logged yawns so far with ${topCourse.yawns}. Use this view first before looking at trends.`;
}

function getPatternsTakeaway(analytics: AnalyticsSnapshot) {
  if (analytics.sleepImpact.length >= 2) {
    const highest = analytics.sleepImpact.reduce((current, item) =>
      item.avgYawns > current.avgYawns ? item : current,
    );
    const lowest = analytics.sleepImpact.reduce((current, item) =>
      item.avgYawns < current.avgYawns ? item : current,
    );

    if (highest.label !== lowest.label) {
      return `Sessions after ${highest.label} sleep show the highest average yawns so far. Compare that with ${lowest.label} to see if sleep looks like a real pattern.`;
    }
  }

  if (analytics.dailyTrend.length > 1) {
    return "Use this view to check whether fatigue cues are building up on certain study days and whether sleep seems to matter.";
  }

  return "This view is for patterns over time. It becomes more useful after you have a few completed sessions.";
}

function getLatestTakeaway(analytics: AnalyticsSnapshot) {
  if (analytics.latestTimeline.length === 0) {
    return "This view focuses on the most recent completed session so you can inspect when fatigue cues started showing up.";
  }

  const firstActiveBucket = analytics.latestTimeline.find((bucket) => bucket.yawns > 0);
  const peakBucket = analytics.latestTimeline.reduce((current, item) =>
    item.yawns > current.yawns ? item : current,
  );

  if (!firstActiveBucket) {
    return "The latest completed session had no logged yawns. That can still be useful as a calmer comparison point.";
  }

  return `In the latest session, the first yawn appeared around ${firstActiveBucket.label}. The strongest cluster was ${peakBucket.yawns} yawn${peakBucket.yawns === 1 ? "" : "s"} in ${peakBucket.label}.`;
}

export function AnalyticsScreen({
  analytics,
  participantName,
  onBack,
  onOpenSettings,
}: AnalyticsScreenProps) {
  const [activeView, setActiveView] = useState<InsightView>("overview");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabsId = useId();
  const takeaway = useMemo(() => {
    if (activeView === "patterns") {
      return getPatternsTakeaway(analytics);
    }

    if (activeView === "latest") {
      return getLatestTakeaway(analytics);
    }

    return getOverviewTakeaway(analytics);
  }, [activeView, analytics]);
  const takeawayLabel =
    activeView === "patterns"
      ? "Pattern note"
      : activeView === "latest"
        ? "Latest session"
        : "Start here";

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") {
      return;
    }

    event.preventDefault();

    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % INSIGHT_VIEWS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + INSIGHT_VIEWS.length) % INSIGHT_VIEWS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = INSIGHT_VIEWS.length - 1;
    }

    setActiveView(INSIGHT_VIEWS[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className="mobile-screen">
      <div className="screen-toolbar screen-toolbar--balanced">
        <button className="toolbar-pill" onClick={onBack} type="button">
          Back
        </button>
        <button className="toolbar-pill" onClick={onOpenSettings} type="button">
          Settings
        </button>
      </div>

      <div className="screen-stack">
        <header className="screen-header">
          <h1>Insights</h1>
          <p>
            {participantName} has tracked {analytics.overview.sessionCount} completed session
            {analytics.overview.sessionCount === 1 ? "" : "s"}.
          </p>
        </header>

        <div
          aria-label="Insight sections"
          className="segmented-control insights-tabs"
          role="tablist"
        >
          {INSIGHT_VIEWS.map((view, index) => {
            const selected = activeView === view.id;
            const tabId = `${tabsId}-${view.id}-tab`;
            const panelId = `${tabsId}-${view.id}-panel`;

            return (
              <button
                aria-controls={panelId}
                aria-selected={selected}
                className={
                  selected
                    ? "segmented-control__item segmented-control__item--active"
                    : "segmented-control__item"
                }
                id={tabId}
                key={view.id}
                onClick={() => setActiveView(view.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                role="tab"
                tabIndex={selected ? 0 : -1}
                type="button"
              >
                {view.label}
              </button>
            );
          })}
        </div>

        <div className="card insight-callout">
          <p className="insight-callout__eyebrow">{takeawayLabel}</p>
          <p className="insight-callout__text">{takeaway}</p>
        </div>

        <section
          aria-labelledby={`${tabsId}-overview-tab`}
          className="insight-panel"
          hidden={activeView !== "overview"}
          id={`${tabsId}-overview-panel`}
          role="tabpanel"
        >
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
        </section>

        <section
          aria-labelledby={`${tabsId}-patterns-tab`}
          className="insight-panel"
          hidden={activeView !== "patterns"}
          id={`${tabsId}-patterns-panel`}
          role="tabpanel"
        >
          <FatigueTrendChart data={analytics.dailyTrend} />
          <SleepImpactChart data={analytics.sleepImpact} />
        </section>

        <section
          aria-labelledby={`${tabsId}-latest-tab`}
          className="insight-panel"
          hidden={activeView !== "latest"}
          id={`${tabsId}-latest-panel`}
          role="tabpanel"
        >
          {analytics.latestTimeline.length > 0 ? (
            <TimelineChart
              data={analytics.latestTimeline}
              description="Use the latest session as a simple reflection view. Look for when the first yawn appeared and whether they stayed isolated or started clustering."
              title="Latest session timeline"
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}
