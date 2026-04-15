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
export type ComparisonMetric = "sessionsWithYawnsPct" | "avgYawnsPerSession" | "firstYawnMinute";
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
}

export interface CourseComparisonDatum {
  avgYawnsPerSession: number;
  courseId: string;
  firstYawnMinute: number | null;
  name: string;
  sessionCount: number;
  sessionsWithYawnsPct: number;
  totalYawns: number;
}

export interface SleepImpactDatum {
  avgFirstYawnMinute: number | null;
  label: string;
  sessionCount: number;
  sessionsWithYawnsPct: number;
}

export interface TimeOfDayImpactDatum {
  avgFirstYawnMinute: number | null;
  label: TimeOfDayBucket;
  sessionCount: number;
  sessionsWithYawnsPct: number;
}

export interface OverviewStats {
  avgFirstYawnMinute: number | null;
  sessionCount: number;
  sessionsWithYawnsPct: number;
}

function roundValue(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

function average(values: number[], digits = 1) {
  if (values.length === 0) {
    return null;
  }

  return roundValue(values.reduce((sum, value) => sum + value, 0) / values.length, digits);
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
      totalYawns: number;
    }
  >();

  for (const insight of insights) {
    const current = aggregates.get(insight.courseId) ?? {
      firstYawnMinutes: [],
      name: insight.courseName,
      sessionCount: 0,
      sessionsWithYawns: 0,
      totalYawns: 0,
    };

    current.sessionCount += 1;
    current.totalYawns += insight.totalYawns;

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
      avgYawnsPerSession: roundValue(value.totalYawns / value.sessionCount),
      courseId,
      firstYawnMinute: average(value.firstYawnMinutes),
      name: value.name,
      sessionCount: value.sessionCount,
      sessionsWithYawnsPct: roundValue((value.sessionsWithYawns / value.sessionCount) * 100, 0),
      totalYawns: value.totalYawns,
    }))
    .sort((left, right) => {
      if (right.sessionsWithYawnsPct !== left.sessionsWithYawnsPct) {
        return right.sessionsWithYawnsPct - left.sessionsWithYawnsPct;
      }

      return right.avgYawnsPerSession - left.avgYawnsPerSession;
    });
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

  return datum.avgYawnsPerSession;
}

export function formatYawnCount(value: number) {
  const rounded = roundValue(value);
  return `${rounded} ${rounded === 1 ? "yawn" : "yawns"}`;
}

export function formatComparisonMetricValue(
  metric: ComparisonMetric,
  value: number | null,
) {
  if (value === null) {
    return "No yawns yet";
  }

  if (metric === "sessionsWithYawnsPct") {
    return `${roundValue(value, 0)}% of sessions`;
  }

  if (metric === "firstYawnMinute") {
    return `Around ${roundValue(value, 0)} min`;
  }

  return `${formatYawnCount(value)} per session`;
}

export function formatCompactComparisonMetricValue(
  metric: ComparisonMetric,
  value: number | null,
) {
  if (value === null) {
    return "-";
  }

  if (metric === "sessionsWithYawnsPct") {
    return `${roundValue(value, 0)}%`;
  }

  if (metric === "firstYawnMinute") {
    return `${roundValue(value, 0)}m`;
  }

  return `${roundValue(value)}`;
}

export function selectSleepImpact(insights: SessionInsight[]): SleepImpactDatum[] {
  const aggregates = new Map<
    number,
    { firstYawnMinutes: number[]; sessionCount: number; sessionsWithYawns: number }
  >();

  for (const insight of insights) {
    const current = aggregates.get(insight.sleepQuality) ?? {
      firstYawnMinutes: [],
      sessionCount: 0,
      sessionsWithYawns: 0,
    };

    current.sessionCount += 1;
    if (insight.hasAnyYawn) {
      current.sessionsWithYawns += 1;
    }
    if (insight.firstYawnMinute !== null) {
      current.firstYawnMinutes.push(insight.firstYawnMinute);
    }

    aggregates.set(insight.sleepQuality, current);
  }

  return [...aggregates.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([sleepQuality, value]) => ({
      avgFirstYawnMinute: average(value.firstYawnMinutes),
      label: String(sleepQuality),
      sessionCount: value.sessionCount,
      sessionsWithYawnsPct: roundValue((value.sessionsWithYawns / value.sessionCount) * 100, 0),
    }));
}

export function selectTimeOfDayImpact(insights: SessionInsight[]): TimeOfDayImpactDatum[] {
  const aggregates = new Map<
    TimeOfDayBucket,
    { firstYawnMinutes: number[]; sessionCount: number; sessionsWithYawns: number }
  >();

  for (const insight of insights) {
    const current = aggregates.get(insight.timeOfDayBucket) ?? {
      firstYawnMinutes: [],
      sessionCount: 0,
      sessionsWithYawns: 0,
    };

    current.sessionCount += 1;
    if (insight.hasAnyYawn) {
      current.sessionsWithYawns += 1;
    }
    if (insight.firstYawnMinute !== null) {
      current.firstYawnMinutes.push(insight.firstYawnMinute);
    }

    aggregates.set(insight.timeOfDayBucket, current);
  }

  return TIME_OF_DAY_BUCKETS.map((label) => {
    const value = aggregates.get(label);
    if (!value) {
      return null;
    }

    return {
      avgFirstYawnMinute: average(value.firstYawnMinutes),
      label,
      sessionCount: value.sessionCount,
      sessionsWithYawnsPct: roundValue((value.sessionsWithYawns / value.sessionCount) * 100, 0),
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
    avgFirstYawnMinute: average(
      insightsWithFirstYawn.map((insight) => insight.firstYawnMinute),
    ),
    sessionCount: insights.length,
    sessionsWithYawnsPct:
      insights.length > 0 ? roundValue((sessionsWithYawns / insights.length) * 100, 0) : 0,
  };
}
