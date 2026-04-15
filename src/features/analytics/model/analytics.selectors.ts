import type { StudySession } from "@/features/session/model/session.types";
import {
  getAverageSleepiness,
  getMaxSleepiness,
  getSessionDurationMinutes,
} from "@/features/session/model/session.utils";
import {
  buildDateKey,
  formatShortDate,
  formatShortDateTime,
  formatShortWeekday,
} from "@/lib/dates";

const TIMELINE_BUCKET_MINUTES = 5;
const DENSE_WINDOW_MINUTES = 15;
const CLUSTER_GAP_MINUTES = 10;
const ONE_DAY_MS = 24 * 60 * 60 * 1_000;

const TIME_OF_DAY_BUCKETS = ["Morning", "Afternoon", "Evening", "Late night"] as const;

export type DateRangeFilter = "all" | "30d" | "90d";
export type ComparisonMetric = "yawnsPerHour" | "sessionsWithYawnsPct" | "firstYawnMinute";
export type TimeOfDayBucket = (typeof TIME_OF_DAY_BUCKETS)[number];

export interface SessionInsight {
  avgSleepiness: number;
  clusterCount: number;
  courseId: string;
  courseName: string;
  dateKey: string;
  dateLabel: string;
  durationMinutes: number;
  firstYawnMinute: number | null;
  firstYawnPercentOfSession: number | null;
  hasAnyYawn: boolean;
  id: string;
  maxSleepiness: number;
  maxYawnsIn15MinWindow: number;
  session: StudySession;
  sessionLabel: string;
  sleepQuality: number;
  startTime: number;
  timeOfDayBucket: TimeOfDayBucket;
  totalYawns: number;
  weekdayLabel: string;
  yawnsPerHour: number;
}

export interface CourseComparisonDatum {
  courseId: string;
  firstYawnMinute: number | null;
  name: string;
  sessionCount: number;
  sessionsWithYawnsPct: number;
  totalYawns: number;
  yawnsPerHour: number;
}

export interface DailyTrendDatum {
  label: string;
  sessionCount: number;
  yawnsPerHour: number;
}

export interface SleepImpactDatum {
  avgYawnsPerHour: number;
  label: string;
  sessionCount: number;
  sessionsWithYawnsPct: number;
}

export interface TimeOfDayImpactDatum {
  label: TimeOfDayBucket;
  sessionCount: number;
  yawnsPerHour: number;
}

export interface OverviewStats {
  avgFirstYawnMinute: number | null;
  avgYawnRate: number;
  sessionCount: number;
  sessionsWithYawnsPct: number;
}

function roundValue(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

function completedSessions(sessions: StudySession[]) {
  return sessions.filter((session) => session.status === "completed" && session.endTime);
}

function yawnOffsetsMinutes(session: StudySession) {
  return session.yawns
    .map((yawn) => (yawn.timestamp - session.startTime) / 60_000)
    .filter((value) => value >= 0)
    .sort((left, right) => left - right);
}

export function getFirstYawnMinute(session: StudySession) {
  const [firstYawn] = yawnOffsetsMinutes(session);
  return firstYawn === undefined ? null : roundValue(firstYawn);
}

export function getFirstYawnPercentOfSession(session: StudySession) {
  const firstYawnMinute = getFirstYawnMinute(session);
  const durationMinutes = Math.max(getSessionDurationMinutes(session), 1);

  if (firstYawnMinute === null) {
    return null;
  }

  return roundValue((firstYawnMinute / durationMinutes) * 100);
}

export function getMaxYawnsInWindow(session: StudySession, windowMinutes = DENSE_WINDOW_MINUTES) {
  const offsets = yawnOffsetsMinutes(session);
  let maxCount = 0;

  for (let index = 0; index < offsets.length; index += 1) {
    let count = 1;

    for (let compareIndex = index + 1; compareIndex < offsets.length; compareIndex += 1) {
      if (offsets[compareIndex] - offsets[index] <= windowMinutes) {
        count += 1;
      } else {
        break;
      }
    }

    maxCount = Math.max(maxCount, count);
  }

  return maxCount;
}

export function getClusterCount(session: StudySession, gapMinutes = CLUSTER_GAP_MINUTES) {
  const offsets = yawnOffsetsMinutes(session);

  if (offsets.length < 2) {
    return 0;
  }

  let clusters = 0;
  let currentClusterSize = 1;

  for (let index = 1; index < offsets.length; index += 1) {
    if (offsets[index] - offsets[index - 1] <= gapMinutes) {
      currentClusterSize += 1;
      continue;
    }

    if (currentClusterSize >= 2) {
      clusters += 1;
    }

    currentClusterSize = 1;
  }

  if (currentClusterSize >= 2) {
    clusters += 1;
  }

  return clusters;
}

function getTimeOfDayBucket(startTime: number): TimeOfDayBucket {
  const hour = new Date(startTime).getHours();

  if (hour >= 5 && hour < 12) {
    return "Morning";
  }

  if (hour >= 12 && hour < 17) {
    return "Afternoon";
  }

  if (hour >= 17 && hour < 22) {
    return "Evening";
  }

  return "Late night";
}

export function selectSessionInsights(sessions: StudySession[]): SessionInsight[] {
  return completedSessions(sessions)
    .map((session) => {
      const durationMinutes = Math.max(getSessionDurationMinutes(session), 1);
      const totalYawns = session.yawns.length;

      return {
        avgSleepiness: getAverageSleepiness(session),
        clusterCount: getClusterCount(session),
        courseId: session.courseId,
        courseName: session.courseNameSnapshot,
        dateKey: buildDateKey(session.startTime),
        dateLabel: formatShortDate(session.startTime),
        durationMinutes,
        firstYawnMinute: getFirstYawnMinute(session),
        firstYawnPercentOfSession: getFirstYawnPercentOfSession(session),
        hasAnyYawn: totalYawns > 0,
        id: session.id,
        maxSleepiness: getMaxSleepiness(session),
        maxYawnsIn15MinWindow: getMaxYawnsInWindow(session),
        session,
        sessionLabel: formatShortDateTime(session.startTime),
        sleepQuality: session.sleepQuality,
        startTime: session.startTime,
        timeOfDayBucket: getTimeOfDayBucket(session.startTime),
        totalYawns,
        weekdayLabel: formatShortWeekday(session.startTime),
        yawnsPerHour: roundValue(totalYawns / (durationMinutes / 60)),
      };
    })
    .sort((left, right) => right.startTime - left.startTime);
}

export function filterSessionInsights(
  insights: SessionInsight[],
  {
    courseId,
    dateRange,
  }: {
    courseId?: string | null;
    dateRange: DateRangeFilter;
  },
  now = Date.now(),
) {
  let filtered = insights;

  if (dateRange !== "all") {
    const days = dateRange === "30d" ? 30 : 90;
    const cutoff = now - days * ONE_DAY_MS;
    filtered = filtered.filter((insight) => insight.startTime >= cutoff);
  }

  if (courseId) {
    filtered = filtered.filter((insight) => insight.courseId === courseId);
  }

  return filtered;
}

export function selectCourseComparison(insights: SessionInsight[]): CourseComparisonDatum[] {
  const aggregates = new Map<
    string,
    {
      firstYawnMinutes: number[];
      name: string;
      sessionCount: number;
      sessionsWithYawns: number;
      totalDurationMinutes: number;
      totalYawns: number;
    }
  >();

  for (const insight of insights) {
    const current = aggregates.get(insight.courseId) ?? {
      firstYawnMinutes: [],
      name: insight.courseName,
      sessionCount: 0,
      sessionsWithYawns: 0,
      totalDurationMinutes: 0,
      totalYawns: 0,
    };

    current.sessionCount += 1;
    current.totalYawns += insight.totalYawns;
    current.totalDurationMinutes += insight.durationMinutes;
    if (insight.hasAnyYawn) {
      current.sessionsWithYawns += 1;
    }
    if (insight.firstYawnMinute !== null) {
      current.firstYawnMinutes.push(insight.firstYawnMinute);
    }

    aggregates.set(insight.courseId, current);
  }

  return [...aggregates.entries()]
    .map(([courseId, value]) => ({
      courseId,
      firstYawnMinute:
        value.firstYawnMinutes.length > 0
          ? roundValue(
              value.firstYawnMinutes.reduce((sum, minute) => sum + minute, 0) /
                value.firstYawnMinutes.length,
            )
          : null,
      name: value.name,
      sessionCount: value.sessionCount,
      sessionsWithYawnsPct: roundValue((value.sessionsWithYawns / value.sessionCount) * 100, 0),
      totalYawns: value.totalYawns,
      yawnsPerHour: roundValue(value.totalYawns / (value.totalDurationMinutes / 60)),
    }))
    .sort((left, right) => right.yawnsPerHour - left.yawnsPerHour);
}

export function getComparisonMetricValue(
  datum: CourseComparisonDatum,
  metric: ComparisonMetric,
) {
  if (metric === "sessionsWithYawnsPct") {
    return datum.sessionsWithYawnsPct;
  }

  if (metric === "firstYawnMinute") {
    return datum.firstYawnMinute ?? 0;
  }

  return datum.yawnsPerHour;
}

export function formatComparisonMetricValue(
  metric: ComparisonMetric,
  value: number | null,
) {
  if (value === null) {
    return "No yawns";
  }

  if (metric === "sessionsWithYawnsPct") {
    return `${roundValue(value, 0)}%`;
  }

  if (metric === "firstYawnMinute") {
    return `${roundValue(value)}m`;
  }

  return `${roundValue(value)}/hr`;
}

export function selectDailyTrend(insights: SessionInsight[]): DailyTrendDatum[] {
  const aggregates = new Map<
    string,
    { label: string; sessionCount: number; totalDurationMinutes: number; totalYawns: number }
  >();

  for (const insight of insights) {
    const current = aggregates.get(insight.dateKey) ?? {
      label: insight.dateLabel,
      sessionCount: 0,
      totalDurationMinutes: 0,
      totalYawns: 0,
    };

    current.sessionCount += 1;
    current.totalDurationMinutes += insight.durationMinutes;
    current.totalYawns += insight.totalYawns;
    aggregates.set(insight.dateKey, current);
  }

  return [...aggregates.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([, value]) => ({
      label: value.label,
      sessionCount: value.sessionCount,
      yawnsPerHour: roundValue(value.totalYawns / (value.totalDurationMinutes / 60)),
    }));
}

export function selectSleepImpact(insights: SessionInsight[]): SleepImpactDatum[] {
  const aggregates = new Map<
    number,
    {
      label: string;
      sessionCount: number;
      sessionsWithYawns: number;
      totalDurationMinutes: number;
      totalYawns: number;
    }
  >();

  for (const insight of insights) {
    const current = aggregates.get(insight.sleepQuality) ?? {
      label: `${insight.sleepQuality}/5`,
      sessionCount: 0,
      sessionsWithYawns: 0,
      totalDurationMinutes: 0,
      totalYawns: 0,
    };

    current.sessionCount += 1;
    current.totalDurationMinutes += insight.durationMinutes;
    current.totalYawns += insight.totalYawns;
    if (insight.hasAnyYawn) {
      current.sessionsWithYawns += 1;
    }

    aggregates.set(insight.sleepQuality, current);
  }

  return [...aggregates.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([, value]) => ({
      avgYawnsPerHour: roundValue(value.totalYawns / (value.totalDurationMinutes / 60)),
      label: value.label,
      sessionCount: value.sessionCount,
      sessionsWithYawnsPct: roundValue((value.sessionsWithYawns / value.sessionCount) * 100, 0),
    }));
}

export function selectTimeOfDayImpact(insights: SessionInsight[]): TimeOfDayImpactDatum[] {
  const aggregates = new Map<
    TimeOfDayBucket,
    { sessionCount: number; totalDurationMinutes: number; totalYawns: number }
  >();

  for (const insight of insights) {
    const current = aggregates.get(insight.timeOfDayBucket) ?? {
      sessionCount: 0,
      totalDurationMinutes: 0,
      totalYawns: 0,
    };

    current.sessionCount += 1;
    current.totalDurationMinutes += insight.durationMinutes;
    current.totalYawns += insight.totalYawns;
    aggregates.set(insight.timeOfDayBucket, current);
  }

  return TIME_OF_DAY_BUCKETS.map((label) => {
    const value = aggregates.get(label);
    if (!value) {
      return null;
    }

    return {
      label,
      sessionCount: value.sessionCount,
      yawnsPerHour: roundValue(value.totalYawns / (value.totalDurationMinutes / 60)),
    };
  }).filter((value): value is TimeOfDayImpactDatum => value !== null);
}

export function selectTimelineBuckets(session: StudySession) {
  const durationMinutes = Math.max(getSessionDurationMinutes(session), 1);
  const bucketCount = Math.max(Math.ceil(durationMinutes / TIMELINE_BUCKET_MINUTES), 1);

  return Array.from({ length: bucketCount }, (_, index) => {
    const startMinutes = index * TIMELINE_BUCKET_MINUTES;
    const endMinutes = startMinutes + TIMELINE_BUCKET_MINUTES;
    const yawns = session.yawns.filter((yawn) => {
      const minutesFromStart = (yawn.timestamp - session.startTime) / 60_000;
      return minutesFromStart >= startMinutes && minutesFromStart < endMinutes;
    }).length;

    return {
      label: `${startMinutes}-${endMinutes}m`,
      yawns,
    };
  });
}

export function selectOverviewStats(insights: SessionInsight[]): OverviewStats {
  const insightsWithFirstYawn = insights.filter(
    (insight): insight is SessionInsight & { firstYawnMinute: number } =>
      insight.firstYawnMinute !== null,
  );
  const sessionsWithYawns = insights.filter((insight) => insight.hasAnyYawn).length;

  return {
    avgFirstYawnMinute:
      insightsWithFirstYawn.length > 0
        ? roundValue(
            insightsWithFirstYawn.reduce((sum, insight) => sum + insight.firstYawnMinute, 0) /
              insightsWithFirstYawn.length,
          )
        : null,
    avgYawnRate:
      insights.length > 0
        ? roundValue(
            insights.reduce((sum, insight) => sum + insight.yawnsPerHour, 0) / insights.length,
          )
        : 0,
    sessionCount: insights.length,
    sessionsWithYawnsPct:
      insights.length > 0 ? roundValue((sessionsWithYawns / insights.length) * 100, 0) : 0,
  };
}
