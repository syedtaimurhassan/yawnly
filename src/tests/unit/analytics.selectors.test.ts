import { describe, expect, it } from "vitest";
import {
  filterSessionInsights,
  selectCourseComparison,
  selectDailyTrend,
  selectSessionInsights,
  selectSleepImpact,
  selectTimelineBuckets,
} from "@/features/analytics/model/analytics.selectors";
import type { StudySession } from "@/features/session/model/session.types";

function createSession(overrides: Partial<StudySession>): StudySession {
  return {
    id: "session-1",
    participantKey: "taimur",
    participantNameSnapshot: "Taimur",
    courseId: "social-graph",
    courseNameSnapshot: "Social Graph",
    sleepQuality: 3,
    status: "completed",
    startTime: Date.parse("2026-04-13T10:00:00.000Z"),
    endTime: Date.parse("2026-04-13T10:30:00.000Z"),
    endReason: "manual",
    yawns: [],
    source: "local",
    createdAt: Date.parse("2026-04-13T10:00:00.000Z"),
    updatedAt: Date.parse("2026-04-13T10:30:00.000Z"),
    ...overrides,
  };
}

describe("analytics selectors", () => {
  it("derives richer session insight metrics", () => {
    const insights = selectSessionInsights([
      createSession({
        yawns: [
          { id: "a", timestamp: Date.parse("2026-04-13T10:05:00.000Z"), sleepiness: 2 },
          { id: "b", timestamp: Date.parse("2026-04-13T10:08:00.000Z"), sleepiness: 4 },
          { id: "c", timestamp: Date.parse("2026-04-13T10:24:00.000Z"), sleepiness: 5 },
        ],
      }),
    ]);

    expect(insights[0]).toMatchObject({
      clusterCount: 1,
      courseId: "social-graph",
      durationMinutes: 30,
      firstYawnMinute: 5,
      firstYawnPercentOfSession: 16.7,
      hasAnyYawn: true,
      maxYawnsIn15MinWindow: 2,
      totalYawns: 3,
      yawnsPerHour: 6,
    });
  });

  it("builds normalized course, daily, and sleep aggregates", () => {
    const sessions = [
      createSession({
        id: "one",
        yawns: [
          { id: "a", timestamp: Date.parse("2026-04-13T10:05:00.000Z"), sleepiness: 2 },
          { id: "b", timestamp: Date.parse("2026-04-13T10:10:00.000Z"), sleepiness: 3 },
        ],
      }),
      createSession({
        id: "two",
        courseId: "economics",
        courseNameSnapshot: "Economics",
        startTime: Date.parse("2026-04-14T10:00:00.000Z"),
        endTime: Date.parse("2026-04-14T11:00:00.000Z"),
        sleepQuality: 4,
        yawns: [{ id: "c", timestamp: Date.parse("2026-04-14T10:10:00.000Z"), sleepiness: 4 }],
      }),
    ];

    const insights = selectSessionInsights(sessions);

    expect(selectCourseComparison(insights)).toEqual([
      {
        courseId: "social-graph",
        firstYawnMinute: 5,
        name: "Social Graph",
        sessionCount: 1,
        sessionsWithYawnsPct: 100,
        totalYawns: 2,
        yawnsPerHour: 4,
      },
      {
        courseId: "economics",
        firstYawnMinute: 10,
        name: "Economics",
        sessionCount: 1,
        sessionsWithYawnsPct: 100,
        totalYawns: 1,
        yawnsPerHour: 1,
      },
    ]);

    expect(selectDailyTrend(insights)).toEqual([
      { label: "Apr 13", sessionCount: 1, yawnsPerHour: 4 },
      { label: "Apr 14", sessionCount: 1, yawnsPerHour: 1 },
    ]);

    expect(selectSleepImpact(insights)).toEqual([
      { avgYawnsPerHour: 4, label: "3/5", sessionCount: 1, sessionsWithYawnsPct: 100 },
      { avgYawnsPerHour: 1, label: "4/5", sessionCount: 1, sessionsWithYawnsPct: 100 },
    ]);
  });

  it("filters by date range and keeps timeline buckets", () => {
    const sessions = [
      createSession({
        id: "recent",
        startTime: Date.parse("2026-04-10T10:00:00.000Z"),
        endTime: Date.parse("2026-04-10T10:20:00.000Z"),
        yawns: [{ id: "a", timestamp: Date.parse("2026-04-10T10:02:00.000Z"), sleepiness: 2 }],
      }),
      createSession({
        id: "old",
        startTime: Date.parse("2025-12-01T10:00:00.000Z"),
        endTime: Date.parse("2025-12-01T10:20:00.000Z"),
      }),
    ];

    const insights = selectSessionInsights(sessions);
    const filtered = filterSessionInsights(
      insights,
      { dateRange: "30d" },
      Date.parse("2026-04-15T12:00:00.000Z"),
    );

    expect(filtered.map((insight) => insight.id)).toEqual(["recent"]);
    expect(selectTimelineBuckets(sessions[0]).slice(0, 2)).toEqual([
      { label: "0-5m", yawns: 1 },
      { label: "5-10m", yawns: 0 },
    ]);
  });
});
