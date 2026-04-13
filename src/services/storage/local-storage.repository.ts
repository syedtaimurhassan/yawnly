import type { Course } from "@/features/courses/model/course.types";
import { DEFAULT_COURSE_NAMES } from "@/features/courses/model/course.types";
import type { StudySession } from "@/features/session/model/session.types";
import { createCourse } from "@/features/session/model/session.utils";
import { readJson, writeJson } from "@/lib/storage";
import type { DataRepository } from "@/services/storage/repositories";

const COURSES_KEY = "yawnly:courses";
const SESSIONS_KEY = "yawnly:sessions";

function sortCourses(courses: Course[]) {
  return [...courses].sort((left, right) => left.name.localeCompare(right.name));
}

function sortSessions(sessions: StudySession[]) {
  return [...sessions].sort((left, right) => right.startTime - left.startTime);
}

function ensureSeedCourses() {
  const currentCourses = readJson<Course[]>(COURSES_KEY, []);
  if (currentCourses.length > 0) {
    return currentCourses;
  }

  const seededCourses = DEFAULT_COURSE_NAMES.map((name) => createCourse(name));
  writeJson(COURSES_KEY, seededCourses);
  return seededCourses;
}

export function createLocalStorageRepository(): DataRepository {
  return {
    kind: "local",

    async listCourses() {
      return sortCourses(ensureSeedCourses());
    },

    async upsertCourse(course) {
      const courses = ensureSeedCourses();
      const existingIndex = courses.findIndex((item) => item.id === course.id);
      const nextCourses =
        existingIndex >= 0
          ? courses.map((item, index) => (index === existingIndex ? course : item))
          : [...courses, course];

      writeJson(COURSES_KEY, nextCourses);
      return course;
    },

    async listSessions() {
      return sortSessions(readJson<StudySession[]>(SESSIONS_KEY, []));
    },

    async upsertSession(session) {
      const sessions = readJson<StudySession[]>(SESSIONS_KEY, []);
      const existingIndex = sessions.findIndex((item) => item.id === session.id);
      const nextSessions =
        existingIndex >= 0
          ? sessions.map((item, index) => (index === existingIndex ? session : item))
          : [...sessions, session];

      writeJson(SESSIONS_KEY, nextSessions);
      return session;
    },
  };
}

