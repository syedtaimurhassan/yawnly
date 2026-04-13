import { describe, expect, it } from "vitest";
import {
  selectDailyTrend,
  selectFatigueByTaskType,
  selectSleepImpact,
  selectTimelineBuckets,
  selectYawnsByCourse,
} from "@/features/analytics/model/analytics.selectors";
import type { StudySession } from "@/features/session/model/session.types";

function createSession(overrides: Partial<StudySession>): StudySession {
  return {
    id: "session-1",
    participantKey: "taimur",
    participantNameSnapshot: "Taimur",
    courseId: "personal-data",
    courseNameSnapshot: "Personal Data",
    taskType: "reading",
    expectedMinutes: 30,
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
  it("aggregates yawns by course", () => {
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
        courseId: "algo",
        courseNameSnapshot: "Algorithms",
        yawns: [{ id: "c", timestamp: Date.parse("2026-04-14T10:05:00.000Z"), sleepiness: 4 }],
      }),
    ];

    expect(selectYawnsByCourse(sessions)).toEqual([
      { name: "Personal Data", yawns: 2 },
      { name: "Algorithms", yawns: 1 },
    ]);
  });

  it("builds task, daily, and sleep aggregates", () => {
    const sessions = [
      createSession({
        id: "one",
        taskType: "reading",
        sleepQuality: 2,
        yawns: [{ id: "a", timestamp: Date.parse("2026-04-13T10:05:00.000Z"), sleepiness: 2 }],
      }),
      createSession({
        id: "two",
        taskType: "writing",
        startTime: Date.parse("2026-04-14T10:00:00.000Z"),
        endTime: Date.parse("2026-04-14T10:20:00.000Z"),
        sleepQuality: 4,
        yawns: [
          { id: "b", timestamp: Date.parse("2026-04-14T10:05:00.000Z"), sleepiness: 4 },
          { id: "c", timestamp: Date.parse("2026-04-14T10:12:00.000Z"), sleepiness: 5 },
        ],
      }),
    ];

    expect(selectFatigueByTaskType(sessions)).toEqual([
      { name: "writing", yawns: 2 },
      { name: "reading", yawns: 1 },
    ]);
    expect(selectDailyTrend(sessions)).toEqual([
      { label: "Apr 13", yawns: 1 },
      { label: "Apr 14", yawns: 2 },
    ]);
    expect(selectSleepImpact(sessions)).toEqual([
      { label: "2/5", avgYawns: 1 },
      { label: "4/5", avgYawns: 2 },
    ]);
  });

  it("builds timeline buckets for a single session", () => {
    const session = createSession({
      yawns: [
        { id: "a", timestamp: Date.parse("2026-04-13T10:02:00.000Z"), sleepiness: 2 },
        { id: "b", timestamp: Date.parse("2026-04-13T10:14:00.000Z"), sleepiness: 4 },
      ],
    });

    expect(selectTimelineBuckets(session).slice(0, 3)).toEqual([
      { label: "0-5m", yawns: 1 },
      { label: "5-10m", yawns: 0 },
      { label: "10-15m", yawns: 1 },
    ]);
  });
});
