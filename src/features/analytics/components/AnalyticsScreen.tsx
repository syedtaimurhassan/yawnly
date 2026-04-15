import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ContextComparisonChart } from "@/features/analytics/components/ContextComparisonChart";
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
  formatYawnCount,
  getComparisonMetricValue,
  selectCourseComparison,
  selectOverviewStats,
  selectSleepImpact,
  selectTimeOfDayImpact,
  selectTimelineBuckets,
} from "@/features/analytics/model/analytics.selectors";
import { cx } from "@/lib/classNames";
import { formatDurationMinutes } from "@/lib/dates";

type InsightView = "overview" | "patterns" | "session";

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

function sortComparisonData(data: CourseComparisonDatum[], metric: ComparisonMetric) {
  const items = [...data];

  if (metric === "firstYawnMinute") {
    return items.sort((left, right) => {
      const leftValue = left.firstYawnMinute ?? Number.POSITIVE_INFINITY;
      const rightValue = right.firstYawnMinute ?? Number.POSITIVE_INFINITY;

      if (leftValue !== rightValue) {
        return leftValue - rightValue;
      }

      return right.sessionsWithYawnsPct - left.sessionsWithYawnsPct;
    });
  }

  return items.sort(
    (left, right) => getComparisonMetricValue(right, metric) - getComparisonMetricValue(left, metric),
  );
}

function getOverviewMessage({
  comparisonData,
  comparisonMetric,
  selectedCourseData,
}: {
  comparisonData: CourseComparisonDatum[];
  comparisonMetric: ComparisonMetric;
  selectedCourseData: CourseComparisonDatum | null;
}) {
  const focusCourse = selectedCourseData ?? comparisonData[0] ?? null;

  if (!focusCourse) {
    return "Compare one simple question at a time, then open a session to see what actually happened.";
  }

  if (comparisonMetric === "firstYawnMinute") {
    if (focusCourse.firstYawnMinute === null) {
      return `${focusCourse.name} has no yawns in this range yet, which makes it a useful calm baseline.`;
    }

    return `${focusCourse.name} tends to show the earliest yawns, around minute ${Math.round(
      focusCourse.firstYawnMinute,
    )}.`;
  }

  if (comparisonMetric === "avgYawnsPerSession") {
    return `${focusCourse.name} currently averages ${formatYawnCount(
      focusCourse.avgYawnsPerSession,
    )} in a tracked session.`;
  }

  return `${focusCourse.name} currently has yawns in ${focusCourse.sessionsWithYawnsPct}% of tracked sessions.`;
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

function buildActionSuggestions({
  comparisonData,
  comparisonMetric,
  overview,
  selectedCourseData,
  sleepImpact,
  timeOfDayData,
}: {
  comparisonData: CourseComparisonDatum[];
  comparisonMetric: ComparisonMetric;
  overview: ReturnType<typeof selectOverviewStats>;
  selectedCourseData: CourseComparisonDatum | null;
  sleepImpact: ReturnType<typeof selectSleepImpact>;
  timeOfDayData: ReturnType<typeof selectTimeOfDayImpact>;
}) {
  const suggestions: ActionSuggestion[] = [];

  if (overview.avgFirstYawnMinute !== null) {
    const checkInMinute = Math.max(Math.round(overview.avgFirstYawnMinute) - 5, 5);
    suggestions.push({
      description: `Yawns usually begin around minute ${Math.round(
        overview.avgFirstYawnMinute,
      )}. Try a quick check-in, stretch, or sip of water around minute ${checkInMinute}.`,
      title: "Set an earlier check-in",
    });
  }

  const focusCourse = selectedCourseData ?? comparisonData[0] ?? null;
  if (focusCourse) {
    suggestions.push({
      description: `${focusCourse.name} stands out on ${
        METRIC_OPTIONS.find((option) => option.id === comparisonMetric)?.label.toLowerCase() ??
        "this view"
      }. ${formatComparisonMetricValue(
        comparisonMetric,
        comparisonMetric === "firstYawnMinute"
          ? focusCourse.firstYawnMinute
          : getComparisonMetricValue(focusCourse, comparisonMetric),
      )}.`,
      title: selectedCourseData ? "Watch the course in focus" : "Start with the strongest course",
    });
  }

  if (timeOfDayData.length >= 2 && suggestions.length < 2) {
    const highest = timeOfDayData.reduce((current, item) =>
      item.sessionsWithYawnsPct > current.sessionsWithYawnsPct ? item : current,
    );
    const lowest = timeOfDayData.reduce((current, item) =>
      item.sessionsWithYawnsPct < current.sessionsWithYawnsPct ? item : current,
    );

    if (highest.sessionsWithYawnsPct - lowest.sessionsWithYawnsPct >= 15) {
      suggestions.push({
        description: `${highest.label} sessions show yawns more often than ${lowest.label}. If you can choose, place heavier study in the calmer part of the day.`,
        title: "Use timing to your advantage",
      });
    }
  }

  if (sleepImpact.length >= 2 && suggestions.length < 2) {
    const highest = sleepImpact.reduce((current, item) =>
      item.sessionsWithYawnsPct > current.sessionsWithYawnsPct ? item : current,
    );
    const lowest = sleepImpact.reduce((current, item) =>
      item.sessionsWithYawnsPct < current.sessionsWithYawnsPct ? item : current,
    );

    if (highest.sessionsWithYawnsPct - lowest.sessionsWithYawnsPct >= 15) {
      suggestions.push({
        description: `On ${highest.label}/5 sleep days, yawns show up more often than on ${lowest.label}/5 days. On rough-sleep days, start with lighter work if you can.`,
        title: "Adjust the plan after poor sleep",
      });
    }
  }

  return suggestions.slice(0, 2);
}

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

  const comparisonData = useMemo(
    () => sortComparisonData(selectCourseComparison(dateFilteredInsights), comparisonMetric),
    [comparisonMetric, dateFilteredInsights],
  );

  useEffect(() => {
    if (selectedCourseId && !comparisonData.some((item) => item.courseId === selectedCourseId)) {
      setSelectedCourseId(null);
    }
  }, [comparisonData, selectedCourseId]);

  const selectedCourseData =
    comparisonData.find((item) => item.courseId === selectedCourseId) ?? null;
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

  const overview = useMemo(() => selectOverviewStats(dateFilteredInsights), [dateFilteredInsights]);
  const sleepImpact = useMemo(() => selectSleepImpact(dateFilteredInsights), [dateFilteredInsights]);
  const timeOfDayData = useMemo(
    () => selectTimeOfDayImpact(dateFilteredInsights),
    [dateFilteredInsights],
  );
  const actionSuggestions = useMemo(
    () =>
      buildActionSuggestions({
        comparisonData,
        comparisonMetric,
        overview,
        selectedCourseData,
        sleepImpact,
        timeOfDayData,
      }),
    [
      comparisonData,
      comparisonMetric,
      overview,
      selectedCourseData,
      sleepImpact,
      timeOfDayData,
    ],
  );
  const timelineData = useMemo(
    () => (selectedInsight ? selectTimelineBuckets(selectedInsight.session) : []),
    [selectedInsight],
  );

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

  function toggleCourseFocus(courseId: string) {
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
          <div className="section-header">
            <h2>Start with the biggest pattern</h2>
            <p>{getOverviewMessage({ comparisonData, comparisonMetric, selectedCourseData })}</p>
          </div>

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
                {overview.avgFirstYawnMinute === null ? "No yawns" : `${Math.round(overview.avgFirstYawnMinute)} min`}
              </strong>
              <span>Typical first yawn</span>
            </div>
          </div>

          <div className="card insight-filter-card">
            <div className="insight-filter-group">
              <span className="field-label">Compare courses by</span>
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
          </div>

          <ContextComparisonChart
            data={comparisonData}
            metric={comparisonMetric}
            onSelectCourse={toggleCourseFocus}
            selectedCourseId={drilldownCourseId}
          />

          {drilldownCourseData ? (
            <div className="card insight-drilldown">
              <div className="section-header">
                <h2>{selectedCourseId ? `Sessions from ${drilldownCourseData.name}` : `Start with ${drilldownCourseData.name}`}</h2>
                <p>
                  Tap a session to open its timeline and see the real study block behind the course
                  comparison above.
                </p>
              </div>

              {selectedCourseId ? (
                <div className="insight-focus-row">
                  <span className="field-label">Course focus</span>
                  <div className="insight-focus-row__controls">
                    <span className="chip chip--active">{drilldownCourseData.name}</span>
                    <button className="field-action" onClick={() => setSelectedCourseId(null)} type="button">
                      Clear focus
                    </button>
                  </div>
                </div>
              ) : null}

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
                      setActiveView("session");
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
                      <span>{formatYawnCount(insight.totalYawns)}</span>
                      <span>
                        {insight.firstYawnMinute === null
                          ? "No yawns"
                          : `First yawn ${Math.round(insight.firstYawnMinute)} min`}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {actionSuggestions.length > 0 ? (
            <div className="card insight-actions">
              <div className="section-header">
                <h2>What to try next</h2>
                <p>These are plain-language suggestions based on the patterns above.</p>
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
        </section>

        <section
          aria-labelledby={`${tabsId}-patterns-tab`}
          className="insight-panel"
          hidden={activeView !== "patterns" || dateFilteredInsights.length === 0}
          id={`${tabsId}-patterns-panel`}
          role="tabpanel"
        >
          <div className="section-header">
            <h2>Look for broad context patterns</h2>
            <p>{getPatternsMessage({ sleepImpact, timeOfDayData })}</p>
          </div>

          <SleepImpactChart data={sleepImpact} />
          <TimeOfDayImpactChart data={timeOfDayData} />
        </section>

        <section
          aria-labelledby={`${tabsId}-session-tab`}
          className="insight-panel"
          hidden={activeView !== "session" || dateFilteredInsights.length === 0}
          id={`${tabsId}-session-panel`}
          role="tabpanel"
        >
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
                  <strong>{formatYawnCount(selectedInsight.totalYawns)}</strong>
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
        </section>
      </div>
    </div>
  );
}
