import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { InsightsPatternsPanel } from "@/features/analytics/components/InsightsPatternsPanel";
import { InsightsSessionPanel } from "@/features/analytics/components/InsightsSessionPanel";
import { InsightsSummaryPanel } from "@/features/analytics/components/InsightsSummaryPanel";
import type { AnalyticsSnapshot } from "@/features/analytics/hooks/useAnalytics";
import {
  type ComparisonMetric,
  type DateRangeFilter,
  filterSessionInsights,
  selectTrendStats,
} from "@/features/analytics/model/analytics.selectors";

type InsightView = "overview" | "patterns" | "session";

interface AnalyticsScreenProps {
  analytics: AnalyticsSnapshot;
  participantName: string;
  onBack: () => void;
  onOpenSettings: () => void;
}

const INSIGHT_VIEWS: Array<{ id: InsightView; label: string }> = [
  { id: "overview", label: "Summary" },
  { id: "patterns", label: "Patterns" },
  { id: "session", label: "Session" },
];

const DATE_RANGE_OPTIONS: Array<{ id: DateRangeFilter; label: string }> = [
  { id: "all", label: "All time" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
];

const METRIC_OPTIONS: Array<{ id: ComparisonMetric; label: string }> = [
  { id: "sessionsWithYawnsPct", label: "How often" },
  { id: "firstYawnMinute", label: "How early" },
  { id: "avgYawnsPerSession", label: "How many" },
];

export function AnalyticsScreen({
  analytics,
  participantName,
  onBack,
  onOpenSettings,
}: AnalyticsScreenProps) {
  const [activeView, setActiveView] = useState<InsightView>("overview");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [comparisonMetric, setComparisonMetric] = useState<ComparisonMetric>("sessionsWithYawnsPct");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    analytics.latestSessionId,
  );
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabsId = useId();

  const dateFilteredInsights = useMemo(
    () => filterSessionInsights(analytics.sessionInsights, { dateRange }),
    [analytics.sessionInsights, dateRange],
  );

  const trendStats = useMemo(
    () => selectTrendStats(analytics.sessionInsights),
    [analytics.sessionInsights],
  );

  useEffect(() => {
    if (selectedCourseId && !dateFilteredInsights.some((insight) => insight.courseId === selectedCourseId)) {
      setSelectedCourseId(null);
    }
  }, [dateFilteredInsights, selectedCourseId]);

  useEffect(() => {
    if (selectedSessionId && !dateFilteredInsights.some((insight) => insight.id === selectedSessionId)) {
      setSelectedSessionId(dateFilteredInsights[0]?.id ?? null);
    }
  }, [dateFilteredInsights, selectedSessionId]);

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    if (
      event.key !== "ArrowRight" &&
      event.key !== "ArrowLeft" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
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

  const handleChangeComparisonMetric = useCallback((metric: ComparisonMetric) => {
    setComparisonMetric(metric);
  }, []);

  const handleToggleCourseFocus = useCallback((courseId: string) => {
    setSelectedCourseId((current) => (current === courseId ? null : courseId));
  }, []);

  const handleOpenSession = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId);
    setActiveView("session");
  }, []);

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
            {participantName} has tracked {analytics.sessionInsights.length} completed session
            {analytics.sessionInsights.length === 1 ? "" : "s"}.
          </p>
        </header>

        <div className="card insight-callout">
          <p className="insight-callout__eyebrow">How to read this</p>
          <p className="insight-callout__text">
            These charts treat yawns as personal study cues from your own logs. Use them to spot
            repeated patterns and plan better breaks, not to make hard claims about cause.
          </p>
        </div>

        <div className="card insight-filter-card">
          <div className="insight-filter-group">
            <span className="field-label">Date range</span>
            <div className="segmented-control insight-range-control">
              {DATE_RANGE_OPTIONS.map((option) => (
                <button
                  className={
                    dateRange === option.id
                      ? "segmented-control__item segmented-control__item--active"
                      : "segmented-control__item"
                  }
                  key={option.id}
                  onClick={() => setDateRange(option.id)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div aria-label="Insight sections" className="segmented-control insights-tabs" role="tablist">
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

        {dateFilteredInsights.length === 0 ? (
          <div className="card insight-actions">
            <div className="section-header">
              <h2>No sessions in this range</h2>
              <p>Try a wider date range to bring some completed sessions back into the insights view.</p>
            </div>
          </div>
        ) : null}

        <section
          aria-labelledby={`${tabsId}-overview-tab`}
          className="insight-panel"
          hidden={activeView !== "overview" || dateFilteredInsights.length === 0}
          id={`${tabsId}-overview-panel`}
          role="tabpanel"
        >
          {activeView === "overview" && dateFilteredInsights.length > 0 ? (
            <InsightsSummaryPanel
              comparisonMetric={comparisonMetric}
              insights={dateFilteredInsights}
              metricOptions={METRIC_OPTIONS}
              onChangeComparisonMetric={handleChangeComparisonMetric}
              onClearCourseFocus={() => setSelectedCourseId(null)}
              onOpenSession={handleOpenSession}
              onToggleCourseFocus={handleToggleCourseFocus}
              selectedCourseId={selectedCourseId}
              selectedSessionId={selectedSessionId}
              showTrends={dateRange === "30d"}
              trendStats={trendStats}
            />
          ) : null}
        </section>

        <section
          aria-labelledby={`${tabsId}-patterns-tab`}
          className="insight-panel"
          hidden={activeView !== "patterns" || dateFilteredInsights.length === 0}
          id={`${tabsId}-patterns-panel`}
          role="tabpanel"
        >
          {activeView === "patterns" && dateFilteredInsights.length > 0 ? (
            <InsightsPatternsPanel insights={dateFilteredInsights} />
          ) : null}
        </section>

        <section
          aria-labelledby={`${tabsId}-session-tab`}
          className="insight-panel"
          hidden={activeView !== "session" || dateFilteredInsights.length === 0}
          id={`${tabsId}-session-panel`}
          role="tabpanel"
        >
          {activeView === "session" && dateFilteredInsights.length > 0 ? (
            <InsightsSessionPanel
              insights={dateFilteredInsights}
              selectedSessionId={selectedSessionId}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}
