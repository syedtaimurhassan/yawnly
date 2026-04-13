import { createId } from "@/lib/ids";
import type { Course } from "@/features/courses/model/course.types";
import { slugifyCourseName } from "@/features/courses/model/course.types";
import type {
  SessionEndReason,
  StartSessionInput,
  StudySession,
  YawnEvent,
} from "@/features/session/model/session.types";
import type { StorageMode } from "@/features/settings/model/settings.types";

export function createCourse(name: string): Course {
  const now = Date.now();

  return {
    id: slugifyCourseName(name) || createId("course"),
    name: name.trim(),
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function createStudySession(
  input: StartSessionInput,
  source: StorageMode,
): StudySession {
  const now = Date.now();

  return {
    id: createId("session"),
    participantKey: input.participantKey,
    participantNameSnapshot: input.participantNameSnapshot,
    courseId: input.courseId,
    courseNameSnapshot: input.courseNameSnapshot,
    taskType: input.taskType,
    expectedMinutes: input.expectedMinutes,
    sleepQuality: input.sleepQuality,
    status: "active",
    startTime: now,
    yawns: [],
    source,
    createdAt: now,
    updatedAt: now,
  };
}

export function appendYawn(
  session: StudySession,
  sleepiness: number,
  source: StorageMode,
): StudySession {
  const yawn: YawnEvent = {
    id: createId("yawn"),
    timestamp: Date.now(),
    sleepiness,
  };

  return {
    ...session,
    yawns: [...session.yawns, yawn],
    source,
    updatedAt: Date.now(),
  };
}

export function completeSession(
  session: StudySession,
  endReason: SessionEndReason,
  source: StorageMode,
): StudySession {
  return {
    ...session,
    status: "completed",
    endTime: Date.now(),
    endReason,
    source,
    updatedAt: Date.now(),
  };
}

export function isActiveSession(session: StudySession) {
  return session.status === "active" && !session.endTime;
}

export function getSessionDurationMs(session: StudySession, now = Date.now()) {
  const endTime = session.endTime ?? now;
  return Math.max(endTime - session.startTime, 0);
}

export function getSessionDurationMinutes(session: StudySession, now = Date.now()) {
  return Math.max(Math.round(getSessionDurationMs(session, now) / 60_000), 0);
}

export function getAverageSleepiness(session: StudySession) {
  if (session.yawns.length === 0) {
    return 0;
  }

  const total = session.yawns.reduce((sum, yawn) => sum + yawn.sleepiness, 0);
  return Number((total / session.yawns.length).toFixed(1));
}

export function getMaxSleepiness(session: StudySession) {
  if (session.yawns.length === 0) {
    return 0;
  }

  return session.yawns.reduce((max, yawn) => Math.max(max, yawn.sleepiness), 0);
}
