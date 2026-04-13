import type { Course } from "@/features/courses/model/course.types";
import { DEFAULT_COURSE_NAMES } from "@/features/courses/model/course.types";
import {
  cleanParticipantName,
  normalizeParticipantName,
  type ParticipantProfile,
} from "@/features/participants/model/participant.types";
import type { StudySession } from "@/features/session/model/session.types";
import { createCourse } from "@/features/session/model/session.utils";
import { readJson, writeJson } from "@/lib/storage";
import type { DataRepository } from "@/services/storage/repositories";

function sortCourses(courses: Course[]) {
  return [...courses]
    .filter((course) => course.active)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function sortSessions(sessions: StudySession[]) {
  return [...sessions].sort((left, right) => right.startTime - left.startTime);
}

function getParticipantStorageKeys(participantKey: string) {
  return {
    profile: `yawnly:participant:${participantKey}:profile`,
    courses: `yawnly:participant:${participantKey}:courses`,
    sessions: `yawnly:participant:${participantKey}:sessions`,
  };
}

function createParticipantProfile(displayName: string): ParticipantProfile {
  const now = Date.now();
  const nameKey = normalizeParticipantName(displayName);

  return {
    displayName,
    nameKey,
    createdAt: now,
    updatedAt: now,
    lastSeenAt: now,
    source: "local",
  };
}

function readCourses(participantKey: string) {
  return readJson<Course[]>(getParticipantStorageKeys(participantKey).courses, []);
}

function writeCourses(participantKey: string, courses: Course[]) {
  writeJson(getParticipantStorageKeys(participantKey).courses, courses);
}

function readSessions(participantKey: string) {
  return readJson<StudySession[]>(getParticipantStorageKeys(participantKey).sessions, []);
}

function writeSessions(participantKey: string, sessions: StudySession[]) {
  writeJson(getParticipantStorageKeys(participantKey).sessions, sessions);
}

function ensureSeedCourses(participantKey: string) {
  const currentCourses = readCourses(participantKey);
  if (currentCourses.length > 0) {
    return currentCourses;
  }

  const seededCourses = DEFAULT_COURSE_NAMES.map((name) => createCourse(name));
  writeCourses(participantKey, seededCourses);
  return seededCourses;
}

export function createLocalStorageRepository(): DataRepository {
  return {
    kind: "local",

    async loadWorkspace(displayName) {
      const cleanedName = cleanParticipantName(displayName);
      const nameKey = normalizeParticipantName(cleanedName);

      if (!nameKey) {
        throw new Error("Enter a name before trying to load a workspace.");
      }

      const keys = getParticipantStorageKeys(nameKey);
      const existingProfile = readJson<ParticipantProfile | null>(keys.profile, null);
      const now = Date.now();
      const participant = existingProfile
        ? {
            ...existingProfile,
            displayName: cleanedName,
            updatedAt: now,
            lastSeenAt: now,
            source: "local" as const,
          }
        : createParticipantProfile(cleanedName);

      writeJson(keys.profile, participant);

      return {
        participant,
        courses: sortCourses(ensureSeedCourses(nameKey)),
        sessions: sortSessions(readSessions(nameKey)),
        existed: Boolean(existingProfile),
      };
    },

    async upsertCourse(participantKey, course) {
      const courses = ensureSeedCourses(participantKey);
      const existingIndex = courses.findIndex((item) => item.id === course.id);
      const nextCourses =
        existingIndex >= 0
          ? courses.map((item, index) => (index === existingIndex ? course : item))
          : [...courses, course];

      writeCourses(participantKey, nextCourses);
      return course;
    },

    async archiveCourse(participantKey, course) {
      const courses = ensureSeedCourses(participantKey);
      const now = Date.now();
      const nextCourses = courses.map((item) =>
        item.id === course.id
          ? {
              ...item,
              active: false,
              deletedAt: now,
              updatedAt: now,
            }
          : item,
      );

      writeCourses(participantKey, nextCourses);
    },

    async upsertSession(participantKey, session) {
      const sessions = readSessions(participantKey);
      const existingIndex = sessions.findIndex((item) => item.id === session.id);
      const nextSessions =
        existingIndex >= 0
          ? sessions.map((item, index) => (index === existingIndex ? session : item))
          : [...sessions, session];

      writeSessions(participantKey, nextSessions);
      return session;
    },
  };
}
