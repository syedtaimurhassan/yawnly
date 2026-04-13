import type { StudySession } from "@/features/session/model/session.types";
import { getAverageSleepiness, getSessionDurationMinutes } from "@/features/session/model/session.utils";
import { buildDateKey, formatShortDate } from "@/lib/dates";

const TIMELINE_BUCKET_MINUTES = 5;

function completedSessions(sessions: StudySession[]) {
  return sessions.filter((session) => session.status === "completed" && session.endTime);
}

export function selectYawnsByCourse(sessions: StudySession[]) {
  const aggregates = new Map<string, { name: string; yawns: number }>();

  for (const session of completedSessions(sessions)) {
    const current = aggregates.get(session.courseId) ?? {
      name: session.courseNameSnapshot,
      yawns: 0,
    };

    current.yawns += session.yawns.length;
    aggregates.set(session.courseId, current);
  }

  return [...aggregates.values()].sort((left, right) => right.yawns - left.yawns);
}

export function selectFatigueByTaskType(sessions: StudySession[]) {
  const aggregates = new Map<string, { name: string; yawns: number }>();

  for (const session of completedSessions(sessions)) {
    const current = aggregates.get(session.taskType) ?? {
      name: session.taskType.replace("-", " "),
      yawns: 0,
    };

    current.yawns += session.yawns.length;
    aggregates.set(session.taskType, current);
  }

  return [...aggregates.values()].sort((left, right) => right.yawns - left.yawns);
}

export function selectDailyTrend(sessions: StudySession[]) {
  const aggregates = new Map<string, { label: string; yawns: number }>();

  for (const session of completedSessions(sessions)) {
    const key = buildDateKey(session.startTime);
    const current = aggregates.get(key) ?? {
      label: formatShortDate(session.startTime),
      yawns: 0,
    };

    current.yawns += session.yawns.length;
    aggregates.set(key, current);
  }

  return [...aggregates.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([, value]) => value);
}

export function selectSleepImpact(sessions: StudySession[]) {
  const aggregates = new Map<
    number,
    { label: string; totalYawns: number; sessionCount: number }
  >();

  for (const session of completedSessions(sessions)) {
    const current = aggregates.get(session.sleepQuality) ?? {
      label: `${session.sleepQuality}/5`,
      totalYawns: 0,
      sessionCount: 0,
    };

    current.totalYawns += session.yawns.length;
    current.sessionCount += 1;
    aggregates.set(session.sleepQuality, current);
  }

  return [...aggregates.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([, value]) => ({
      label: value.label,
      avgYawns: Number((value.totalYawns / value.sessionCount).toFixed(1)),
    }));
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

export function selectOverviewStats(sessions: StudySession[]) {
  const completed = completedSessions(sessions);
  const totalYawns = completed.reduce((sum, session) => sum + session.yawns.length, 0);
  const avgSleepiness =
    completed.length === 0
      ? 0
      : Number(
          (
            completed.reduce((sum, session) => sum + getAverageSleepiness(session), 0) /
            completed.length
          ).toFixed(1),
        );

  return {
    sessionCount: completed.length,
    totalYawns,
    avgSleepiness,
  };
}

