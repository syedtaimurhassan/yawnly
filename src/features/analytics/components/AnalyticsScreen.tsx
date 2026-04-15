import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ContextComparisonChart } from "@/features/analytics/components/ContextComparisonChart";
import { FatigueTrendChart } from "@/features/analytics/components/FatigueTrendChart";
import { SleepImpactChart } from "@/features/analytics/components/SleepImpactChart";
import { TimeOfDayImpactChart } from "@/features/analytics/components/TimeOfDayImpactChart";
import { TimelineChart } from "@/features/analytics/components/TimelineChart";
import type { AnalyticsSnapshot } from "@/features/analytics/hooks/useAnalytics";
import {
  type ComparisonMetric,
  type CourseComparisonDatum,
  type DateRangeFilter,
  type SessionInsight,
  filterSessionInsights,
  formatComparisonMetricValue,
  getComparisonMetricValue,
  selectCourseComparison,
  selectDailyTrend,
  selectOverviewStats,
  selectSleepImpact,
  selectTimeOfDayImpact,
  selectTimelineBuckets,
} from "@/features/analytics/model/analytics.selectors";
import { cx } from "@/lib/classNames";
import { formatDurationMinutes } from "@/lib/dates";

type InsightView = "overview" | "patterns" | "latest";

interface ActionSuggestion {
  description: string;
  title: string;
}

interface AnalyticsScreenProps {
  analytics: AnalyticsSnapshot;
  participantName: string;
  onBack: () => void;
  onOpenSettings: () => void;
}

const INSIGHT_VIEWS: Array<{ id: InsightView; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "patterns", label: "Patterns" },
  { id: "latest", label: "Latest" },
];

const DATE_RANGE_OPTIONS: Array<{ id: DateRangeFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "30d", label: "30d" },
  { id: "90d", label: "90d" },
];

const METRIC_OPTIONS: Array<{ id: ComparisonMetric; label: string }> = [
  { id: "yawnsPerHour", label: "Yawns/hr" },
  { id: "sessionsWithYawnsPct", label: "% with yawns" },
  { id: "firstYawnMinute", label: "First yawn" },
];

function buildActionSuggestions({
  analysisInsights,
  comparisonData,
  selectedCourseData,
  timeOfDayData,
  sleepImpact,
}: {
  analysisInsights: SessionInsight[];
  comparisonData: CourseComparisonDatum[];
  selectedCourseData: CourseComparisonDatum | null;
  sleepImpact: ReturnType<typeof selectSleepImpact>;
  timeOfDayData: ReturnType<typeof selectTimeOfDayImpact>;
}): ActionSuggestion[] {
  const suggestions: ActionSuggestion[] = [];

  const firstYawnValues = analysisInsights
    .map((insight) => insight.firstYawnMinute)
    .filter((value): value is number => value !== null);
  const avgFirstYawnMinute =
    firstYawnValues.length > 0
      ? firstYawnValues.reduce((sum, value) => sum + value, 0) / firstYawnValues.length
      : null;

  if (avgFirstYawnMinute !== null) {
    const checkInMinute = Math.max(Math.round(avgFirstYawnMinute) - 5, 5);
    suggestions.push({
      description: `Fatigue cues start around minute ${Math.round(avgFirstYawnMinute)} on average. Set a short break check or stretch reminder around minute ${checkInMinute}.`,
      title: "Plan an earlier check-in",
    });
  }

  const focusCourse = selectedCourseData ?? comparisonData[0] ?? null;
  if (focusCourse) {
    suggestions.push({
      description: `${focusCourse.name} shows ${formatComparisonMetricValue(
        "yawnsPerHour",
        focusCourse.yawnsPerHour,
      )} right now. If this keeps happening, try shorter rounds or move this course to a calmer time.`,
      title: selectedCourseData ? "Adjust the current course focus" : "Watch the strongest course pattern",
    });
  }

  const peakDenseWindow = analysisInsights.reduce(
    (max, insight) => Math.max(max, insight.maxYawnsIn15MinWindow),
    0,
  );
  if (peakDenseWindow >= 2) {
    suggestions.push({
      description: `Some sessions show ${peakDenseWindow} yawns inside 15 minutes. When yawns start clustering like that, treat it as a strong signal to pause.`,
      title: "Use clustered yawns as a break signal",
    });
  }

  if (timeOfDayData.length >= 2) {
    const busiest = timeOfDayData.reduce((current, item) =>
      item.yawnsPerHour > current.yawnsPerHour ? item : current,
    );
    const calmest = timeOfDayData.reduce((current, item) =>
      item.yawnsPerHour < current.yawnsPerHour ? item : current,
    );

    if (busiest.label !== calmest.label && busiest.yawnsPerHour - calmest.yawnsPerHour >= 0.4) {
      suggestions.push({
        description: `${busiest.label} sessions show more fatigue cues than ${calmest.label}. If you can choose, place the heavier studying closer to ${calmest.label}.`,
        title: "Use the calmer part of the day",
      });
    }
  }

  if (sleepImpact.length >= 2) {
    const strongest = sleepImpact.reduce((current, item) =>
      item.avgYawnsPerHour > current.avgYawnsPerHour ? item : current,
    );
    const lightest = sleepImpact.reduce((current, item) =>
      item.avgYawnsPerHour < current.avgYawnsPerHour ? item : current,
    );

    if (
      strongest.label !== lightest.label &&
      strongest.avgYawnsPerHour - lightest.avgYawnsPerHour >= 0.4
    ) {
      suggestions.push({
        description: `After ${strongest.label} sleep, fatigue cues are stronger than after ${lightest.label}. On rough-sleep days, keep sessions lighter or shorter.`,
        title: "Adjust the plan after poor sleep",
      });
    }
  }

  return suggestions.slice(0, 3);
}

function getOverviewTakeaway({
  comparisonData,
  comparisonMetric,
  selectedCourseData,
}: {
  comparisonData: CourseComparisonDatum[];
  comparisonMetric: ComparisonMetric;
  selectedCourseData: CourseComparisonDatum | null;
}) {
  if (selectedCourseData) {
    return `${selectedCourseData.name} is in focus. The current comparison metric is ${METRIC_OPTIONS.find((option) => option.id === comparisonMetric)?.label.toLowerCase()}.`;
  }

  const topCourse = comparisonData[0];
  if (!topCourse) {
    return "Start here. This view shows the strongest course pattern first, then lets you open the sessions behind it.";
  }

  return `${topCourse.name} stands out most on ${METRIC_OPTIONS.find((option) => option.id === comparisonMetric)?.label.toLowerCase()} so far. Tap a bar to focus that course and inspect the sessions behind it.`;
}

function getPatternsTakeaway({
  sleepImpact,
  timeOfDayData,
}: {
  sleepImpact: ReturnType<typeof selectSleepImpact>;
  timeOfDayData: ReturnType<typeof selectTimeOfDayImpact>;
}) {
  if (timeOfDayData.length >= 2) {
    const busiest = timeOfDayData.reduce((current, item) =>
      item.yawnsPerHour > current.yawnsPerHour ? item : current,
    );

    return `${busiest.label} currently has the highest fatigue rate. Use this tab to compare that pattern against sleep and daily trends.`;
  }

  if (sleepImpact.length >= 2) {
    const strongest = sleepImpact.reduce((current, item) =>
      item.avgYawnsPerHour > current.avgYawnsPerHour ? item : current,
    );

    return `The strongest sleep-related fatigue rate right now is after ${strongest.label} sleep. Compare the bars before making a judgment.`;
  }

  return "This tab is for pattern finding. It becomes more useful when there are more completed sessions to compare.";
}

function getLatestTakeaway(selectedInsight: SessionInsight | null) {
  if (!selectedInsight) {
    return "Choose a session from the overview tab to inspect when fatigue cues started and whether they stayed isolated or started clustering.";
  }

  if (!selectedInsight.hasAnyYawn) {
    return `${selectedInsight.courseName} had no logged yawns in this session. That can be useful as a calmer baseline to compare against harder sessions.`;
  }

  return `${selectedInsight.courseName} first showed a yawn around minute ${selectedInsight.firstYawnMinute}. Use the timeline below to see whether the cues stayed isolated or clustered together.`;
}

export function AnalyticsScreen({
  analytics,
  participantName,
  onBack,
  onOpenSettings,
}: AnalyticsScreenProps) {
  const [activeView, setActiveView] = useState<InsightView>("overview");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [comparisonMetric, setComparisonMetric] = useState<ComparisonMetric>("yawnsPerHour");
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

  const comparisonData = useMemo(() => {
    const data = selectCourseComparison(dateFilteredInsights);

    return [...data].sort((left, right) => {
      const leftValue = getComparisonMetricValue(left, comparisonMetric);
      const rightValue = getComparisonMetricValue(right, comparisonMetric);
      return rightValue - leftValue;
    });
  }, [comparisonMetric, dateFilteredInsights]);

  useEffect(() => {
    if (selectedCourseId && !comparisonData.some((item) => item.courseId === selectedCourseId)) {
      setSelectedCourseId(null);
    }
  }, [comparisonData, selectedCourseId]);

  const selectedCourseData =
    comparisonData.find((item) => item.courseId === selectedCourseId) ?? null;
  const analysisInsights = useMemo(
    () => filterSessionInsights(dateFilteredInsights, { courseId: selectedCourseId, dateRange: "all" }),
    [dateFilteredInsights, selectedCourseId],
  );
  const drilldownCourseId = selectedCourseId ?? comparisonData[0]?.courseId ?? null;
  const drilldownCourseData =
    comparisonData.find((item) => item.courseId === drilldownCourseId) ?? comparisonData[0] ?? null;
  const drilldownInsights = useMemo(
    () =>
      drilldownCourseId
        ? dateFilteredInsights.filter((insight) => insight.courseId === drilldownCourseId)
        : [],
    [dateFilteredInsights, drilldownCourseId],
  );

  useEffect(() => {
    const nextSessionId = drilldownInsights[0]?.id ?? null;

    if (!nextSessionId) {
      if (selectedSessionId !== null) {
        setSelectedSessionId(null);
      }
      return;
    }

    if (!selectedSessionId || !drilldownInsights.some((insight) => insight.id === selectedSessionId)) {
      setSelectedSessionId(nextSessionId);
    }
  }, [drilldownInsights, selectedSessionId]);

  const selectedInsight =
    drilldownInsights.find((insight) => insight.id === selectedSessionId) ??
    drilldownInsights[0] ??
    null;

  const overview = useMemo(() => selectOverviewStats(analysisInsights), [analysisInsights]);
  const dailyTrend = useMemo(() => selectDailyTrend(analysisInsights), [analysisInsights]);
  const sleepImpact = useMemo(() => selectSleepImpact(analysisInsights), [analysisInsights]);
  const timeOfDayData = useMemo(() => selectTimeOfDayImpact(analysisInsights), [analysisInsights]);
  const actionSuggestions = useMemo(
    () =>
      buildActionSuggestions({
        analysisInsights,
        comparisonData,
        selectedCourseData,
        sleepImpact,
        timeOfDayData,
      }),
    [analysisInsights, comparisonData, selectedCourseData, sleepImpact, timeOfDayData],
  );
  const timelineData = useMemo(
    () => (selectedInsight ? selectTimelineBuckets(selectedInsight.session) : []),
    [selectedInsight],
  );

  const takeaway = useMemo(() => {
    if (activeView === "patterns") {
      return getPatternsTakeaway({ sleepImpact, timeOfDayData });
    }

    if (activeView === "latest") {
      return getLatestTakeaway(selectedInsight);
    }

    return getOverviewTakeaway({
      comparisonData,
      comparisonMetric,
      selectedCourseData,
    });
  }, [
    activeView,
    comparisonData,
    comparisonMetric,
    selectedCourseData,
    selectedInsight,
    sleepImpact,
    timeOfDayData,
  ]);

  const takeawayLabel =
    activeView === "patterns"
      ? "Pattern note"
      : activeView === "latest"
        ? "Session note"
        : "Start here";

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

  function toggleCourseFilter(courseId: string) {
    setSelectedCourseId((current) => (current === courseId ? null : courseId));
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
            {participantName} has tracked {analytics.sessionInsights.length} completed session
            {analytics.sessionInsights.length === 1 ? "" : "s"}.
          </p>
        </header>

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

        <div className="card insight-callout">
          <p className="insight-callout__eyebrow">{takeawayLabel}</p>
          <p className="insight-callout__text">{takeaway}</p>
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

          <div className="insight-filter-group">
            <span className="field-label">Comparison metric</span>
            <div className="segmented-control insights-tabs">
              {METRIC_OPTIONS.map((option) => (
                <button
                  className={
                    comparisonMetric === option.id
                      ? "segmented-control__item segmented-control__item--active"
                      : "segmented-control__item"
                  }
                  key={option.id}
                  onClick={() => setComparisonMetric(option.id)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {selectedCourseData ? (
            <div className="insight-focus-row">
              <span className="field-label">Course focus</span>
              <div className="insight-focus-row__controls">
                <span className="chip chip--active">{selectedCourseData.name}</span>
                <button className="field-action" onClick={() => setSelectedCourseId(null)} type="button">
                  Clear
                </button>
              </div>
            </div>
          ) : null}
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
          <div className="stats-grid">
            <div className="stat-tile">
              <strong>{overview.sessionCount}</strong>
              <span>Sessions tracked</span>
            </div>
            <div className="stat-tile">
              <strong>{overview.sessionsWithYawnsPct}%</strong>
              <span>Sessions with yawns</span>
            </div>
            <div className="stat-tile">
              <strong>
                {overview.avgFirstYawnMinute === null ? "-" : `${overview.avgFirstYawnMinute}m`}
              </strong>
              <span>Avg first yawn</span>
            </div>
            <div className="stat-tile">
              <strong>{overview.avgYawnRate ? `${overview.avgYawnRate}/hr` : "-"}</strong>
              <span>Avg fatigue rate</span>
            </div>
          </div>

          {actionSuggestions.length > 0 ? (
            <div className="card insight-actions">
              <div className="section-header">
                <h2>What to try next</h2>
                <p>These suggestions are based on the current filters and the sessions already logged.</p>
              </div>
              <div className="insight-action-list">
                {actionSuggestions.map((suggestion) => (
                  <div className="insight-action-item" key={suggestion.title}>
                    <strong>{suggestion.title}</strong>
                    <p>{suggestion.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <ContextComparisonChart
            data={comparisonData}
            metric={comparisonMetric}
            onSelectCourse={toggleCourseFilter}
            selectedCourseId={drilldownCourseId}
          />

          {drilldownCourseData ? (
            <div className="card insight-drilldown">
              <div className="section-header">
                <h2>Sessions behind this pattern</h2>
                <p>
                  {selectedCourseId
                    ? `${drilldownCourseData.name} is in focus now. Tap a session to open its timeline.`
                    : `Showing the strongest course right now: ${drilldownCourseData.name}. Tap another bar if you want to compare a different course.`}
                </p>
              </div>

              <div className="insight-session-list">
                {drilldownInsights.slice(0, 4).map((insight) => (
                  <button
                    className={cx(
                      "insight-session-card",
                      selectedInsight?.id === insight.id && "insight-session-card--active",
                    )}
                    key={insight.id}
                    onClick={() => {
                      setSelectedSessionId(insight.id);
                      setActiveView("latest");
                    }}
                    type="button"
                  >
                    <div className="insight-session-card__header">
                      <strong>{insight.sessionLabel}</strong>
                      <span>
                        {insight.weekdayLabel} · {insight.timeOfDayBucket}
                      </span>
                    </div>
                    <div className="insight-session-card__metrics">
                      <span>{formatDurationMinutes(insight.durationMinutes)}</span>
                      <span>{insight.yawnsPerHour}/hr</span>
                      <span>
                        {insight.firstYawnMinute === null
                          ? "No yawns"
                          : `First yawn ${insight.firstYawnMinute}m`}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section
          aria-labelledby={`${tabsId}-patterns-tab`}
          className="insight-panel"
          hidden={activeView !== "patterns" || dateFilteredInsights.length === 0}
          id={`${tabsId}-patterns-panel`}
          role="tabpanel"
        >
          <FatigueTrendChart data={dailyTrend} />
          <SleepImpactChart data={sleepImpact} />
          <TimeOfDayImpactChart data={timeOfDayData} />
        </section>

        <section
          aria-labelledby={`${tabsId}-latest-tab`}
          className="insight-panel"
          hidden={activeView !== "latest" || dateFilteredInsights.length === 0}
          id={`${tabsId}-latest-panel`}
          role="tabpanel"
        >
          {selectedInsight ? (
            <>
              <div className="stats-grid">
                <div className="stat-tile">
                  <strong>{selectedInsight.courseName}</strong>
                  <span>Course</span>
                </div>
                <div className="stat-tile">
                  <strong>{formatDurationMinutes(selectedInsight.durationMinutes)}</strong>
                  <span>Duration</span>
                </div>
                <div className="stat-tile">
                  <strong>
                    {selectedInsight.firstYawnMinute === null
                      ? "-"
                      : `${selectedInsight.firstYawnMinute}m`}
                  </strong>
                  <span>First yawn</span>
                </div>
                <div className="stat-tile">
                  <strong>{selectedInsight.maxYawnsIn15MinWindow}</strong>
                  <span>Peak in 15m</span>
                </div>
              </div>

              <div className="card insight-session-context">
                <div className="insight-session-context__row">
                  <span>{selectedInsight.sessionLabel}</span>
                  <span>
                    {selectedInsight.weekdayLabel} · {selectedInsight.timeOfDayBucket}
                  </span>
                </div>
                <div className="insight-session-context__row">
                  <span>Sleep quality {selectedInsight.sleepQuality}/5</span>
                  <span>
                    {selectedInsight.clusterCount > 0
                      ? `${selectedInsight.clusterCount} cluster${selectedInsight.clusterCount === 1 ? "" : "s"}`
                      : "No yawn clusters"}
                  </span>
                </div>
              </div>

              <TimelineChart
                data={timelineData}
                description="This selected session comes from the course drill-down above. Use it to see whether the yawns stayed isolated or started arriving in short bursts."
                title="Selected session timeline"
              />
            </>
          ) : (
            <div className="mobile-screen">
              <div className="card">
                <p className="microcopy">
                  Choose a session from the overview tab to inspect its timeline here.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
