import { describe, expect, it, vi } from "vitest";
import {
  appendYawn,
  removeYawn,
} from "@/features/session/model/session.utils";
import type { StudySession } from "@/features/session/model/session.types";

function createSession(): StudySession {
  return {
    id: "session-1",
    participantKey: "taimur",
    participantNameSnapshot: "Taimur",
    courseId: "graph-theory",
    courseNameSnapshot: "Graph Theory",
    sleepQuality: 3,
    status: "active",
    startTime: Date.parse("2026-04-15T14:00:00.000Z"),
    yawns: [],
    source: "local",
    createdAt: Date.parse("2026-04-15T14:00:00.000Z"),
    updatedAt: Date.parse("2026-04-15T14:00:00.000Z"),
  };
}

describe("session utils", () => {
  it("removes a logged yawn without touching the rest of the session", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T14:05:00.000Z"));

    const baseSession = createSession();
    const withFirstYawn = appendYawn(baseSession, 2, "local");

    vi.setSystemTime(new Date("2026-04-15T14:08:00.000Z"));
    const withTwoYawns = appendYawn(withFirstYawn, 4, "local");
    const removed = removeYawn(withTwoYawns, withFirstYawn.yawns[0].id, "local");

    expect(removed.yawns).toHaveLength(1);
    expect(removed.yawns[0].sleepiness).toBe(4);
    expect(removed.courseNameSnapshot).toBe(withTwoYawns.courseNameSnapshot);
    expect(removed.updatedAt).toBe(Date.parse("2026-04-15T14:08:00.000Z"));

    vi.useRealTimers();
  });
});
