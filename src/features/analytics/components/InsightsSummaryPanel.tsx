import { memo, useMemo } from "react";
import { ContextComparisonChart } from "@/features/analytics/components/ContextComparisonChart";
import {
  type ComparisonMetric,
  type CourseComparisonDatum,
  type SessionInsight,
  type TrendStats,
  type TrendValue,
  formatComparisonMetricValue,
  formatYawnCount,
  getComparisonMetricValue,
  selectCourseComparison,
  selectOverviewStats,
  selectSleepImpact,
  selectTimeOfDayImpact,
} from "@/features/analytics/model/analytics.selectors";
import { cx } from "@/lib/classNames";
import { formatDurationMinutes } from "@/lib/dates";

interface MetricOption {
  id: ComparisonMetric;
  label: string;
}

interface ActionSuggestion {
  description: string;
  title: string;
}

interface InsightsSummaryPanelProps {
  comparisonMetric: ComparisonMetric;
  insights: SessionInsight[];
  metricOptions: MetricOption[];
  onChangeComparisonMetric: (metric: ComparisonMetric) => void;
  onClearCourseFocus: () => void;
  onOpenSession: (sessionId: string) => void;
  onToggleCourseFocus: (courseId: string) => void;
  selectedCourseId: string | null;
  selectedSessionId: string | null;
  showTrends?: boolean;
  trendStats?: TrendStats | null;
}

function TrendBadge({
  formatter,
  isPositiveGood,
  value,
}: {
  formatter: (n: number) => string;
  isPositiveGood: boolean | "neutral";
  value: TrendValue;
}) {
  if (value.delta === null || value.direction === null || value.direction === "flat") {
    return null;
  }
  const arrow = value.direction === "up" ? "↑" : "↓";
  let variant: "good" | "bad" | "neutral";
  if (isPositiveGood === "neutral") {
    variant = "neutral";
  } else if (isPositiveGood) {
    variant = value.direction === "up" ? "good" : "bad";
  } else {
    variant = value.direction === "up" ? "bad" : "good";
  }
  return (
    <span className={`trend-badge trend-badge--${variant}`}>
      {arrow}
      {formatter(Math.abs(value.delta))}
    </span>
  );
}

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

function buildActionSuggestions({
  comparisonData,
  comparisonMetric,
  insights,
  metricOptions,
  overview,
  selectedCourseData,
}: {
  comparisonData: CourseComparisonDatum[];
  comparisonMetric: ComparisonMetric;
  insights: SessionInsight[];
  metricOptions: MetricOption[];
  overview: ReturnType<typeof selectOverviewStats>;
  selectedCourseData: CourseComparisonDatum | null;
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
        metricOptions.find((option) => option.id === comparisonMetric)?.label.toLowerCase() ??
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

  const timeOfDayData = selectTimeOfDayImpact(insights);
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

  const sleepImpact = selectSleepImpact(insights);
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

export const InsightsSummaryPanel = memo(function InsightsSummaryPanel({
  comparisonMetric,
  insights,
  metricOptions,
  onChangeComparisonMetric,
  onClearCourseFocus,
  onOpenSession,
  onToggleCourseFocus,
  selectedCourseId,
  selectedSessionId,
  showTrends = false,
  trendStats = null,
}: InsightsSummaryPanelProps) {
  const comparisonData = useMemo(
    () => sortComparisonData(selectCourseComparison(insights), comparisonMetric),
    [comparisonMetric, insights],
  );
  const selectedCourseData =
    comparisonData.find((item) => item.courseId === selectedCourseId) ?? null;
  const drilldownCourseId = selectedCourseId ?? comparisonData[0]?.courseId ?? null;
  const drilldownCourseData =
    comparisonData.find((item) => item.courseId === drilldownCourseId) ?? comparisonData[0] ?? null;
  const drilldownInsights = useMemo(
    () =>
      drilldownCourseId ? insights.filter((insight) => insight.courseId === drilldownCourseId) : [],
    [drilldownCourseId, insights],
  );
  const overview = useMemo(() => selectOverviewStats(insights), [insights]);
  const actionSuggestions = useMemo(
    () =>
      buildActionSuggestions({
        comparisonData,
        comparisonMetric,
        insights,
        metricOptions,
        overview,
        selectedCourseData,
      }),
    [comparisonData, comparisonMetric, insights, metricOptions, overview, selectedCourseData],
  );

  return (
    <>
      <div className="section-header">
        <h2>Start with the biggest pattern</h2>
        <p>{getOverviewMessage({ comparisonData, comparisonMetric, selectedCourseData })}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-tile">
          <div className="stat-tile__value-row">
            <strong>{overview.sessionCount}</strong>
            {showTrends && trendStats && (
              <TrendBadge
                formatter={(n) => String(Math.round(n))}
                isPositiveGood="neutral"
                value={trendStats.sessionCount}
              />
            )}
          </div>
          <span>Sessions tracked</span>
          {showTrends && trendStats?.sessionCount.previous !== null && (
            <span className="stat-tile__context">vs prev 30d</span>
          )}
        </div>
        <div className="stat-tile">
          <div className="stat-tile__value-row">
            <strong>{overview.sessionsWithYawnsPct}%</strong>
            {showTrends && trendStats && (
              <TrendBadge
                formatter={(n) => `${Math.round(n)}%`}
                isPositiveGood={false}
                value={trendStats.sessionsWithYawnsPct}
              />
            )}
          </div>
          <span>Sessions with yawns</span>
          {showTrends && trendStats?.sessionsWithYawnsPct.previous !== null && (
            <span className="stat-tile__context">vs prev 30d</span>
          )}
        </div>
        <div className="stat-tile">
          <div className="stat-tile__value-row">
            <strong>
              {overview.avgFirstYawnMinute === null
                ? "No yawns"
                : `${Math.round(overview.avgFirstYawnMinute)} min`}
            </strong>
            {showTrends && trendStats && overview.avgFirstYawnMinute !== null && (
              <TrendBadge
                formatter={(n) => `${Math.round(n)}m`}
                isPositiveGood={true}
                value={trendStats.avgFirstYawnMinute}
              />
            )}
          </div>
          <span>Typical first yawn</span>
          {showTrends && trendStats?.avgFirstYawnMinute.previous !== null && (
            <span className="stat-tile__context">vs prev 30d</span>
          )}
        </div>
      </div>

      <div className="card insight-filter-card">
        <div className="insight-filter-group">
          <span className="field-label">Compare courses by</span>
          <div className="segmented-control insights-tabs">
            {metricOptions.map((option) => (
              <button
                className={
                  comparisonMetric === option.id
                    ? "segmented-control__item segmented-control__item--active"
                    : "segmented-control__item"
                }
                key={option.id}
                onClick={() => onChangeComparisonMetric(option.id)}
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
        onSelectCourse={onToggleCourseFocus}
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
                <button className="field-action" onClick={onClearCourseFocus} type="button">
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
                  selectedSessionId === insight.id && "insight-session-card--active",
                )}
                key={insight.id}
                onClick={() => onOpenSession(insight.id)}
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
    </>
  );
});
