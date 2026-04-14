import {
  writeBatch,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import type { Course } from "@/features/courses/model/course.types";
import { DEFAULT_COURSE_NAMES } from "@/features/courses/model/course.types";
import {
  cleanParticipantName,
  normalizeParticipantName,
  type ParticipantProfile,
} from "@/features/participants/model/participant.types";
import type { StudySession } from "@/features/session/model/session.types";
import {
  createCourse,
  getAverageSleepiness,
  getMaxSleepiness,
} from "@/features/session/model/session.utils";
import { ensureAnonymousUser } from "@/services/firebase/auth";
import { getFirebaseDb } from "@/services/firebase/db";
import type { DataRepository } from "@/services/storage/repositories";

function participantDocumentPath(participantKey: string) {
  return `participants/${participantKey}`;
}

function sortCourses(courses: Course[]) {
  return [...courses]
    .filter((course) => course.active)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function sortSessions(sessions: StudySession[]) {
  return [...sessions].sort((left, right) => right.startTime - left.startTime);
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
    source: "firebase",
  };
}

export function createFirestoreRepository(): DataRepository {
  return {
    kind: "firebase",

    async loadWorkspace(displayName) {
      await ensureAnonymousUser();

      const cleanedName = cleanParticipantName(displayName);
      const participantKey = normalizeParticipantName(cleanedName);

      if (!participantKey) {
        throw new Error("Enter a name before trying to load a workspace.");
      }

      const db = getFirebaseDb();
      const participantRef = doc(db, participantDocumentPath(participantKey));
      const participantSnapshot = await getDoc(participantRef);
      const now = Date.now();
      const participant = participantSnapshot.exists()
        ? {
            ...(participantSnapshot.data() as ParticipantProfile),
            displayName: cleanedName,
            nameKey: participantKey,
            updatedAt: now,
            lastSeenAt: now,
            source: "firebase" as const,
          }
        : createParticipantProfile(cleanedName);

      const batch = writeBatch(db);
      batch.set(participantRef, participant, { merge: true });

      if (!participantSnapshot.exists()) {
        DEFAULT_COURSE_NAMES.map((name) => createCourse(name)).forEach((course) => {
          batch.set(doc(db, `${participantDocumentPath(participantKey)}/courses/${course.id}`), course);
        });
      }

      await batch.commit();

      const [courseSnapshot, sessionSnapshot] = await Promise.all([
        getDocs(
          query(
            collection(db, `${participantDocumentPath(participantKey)}/courses`),
            orderBy("name"),
          ),
        ),
        getDocs(
          query(
            collection(db, `${participantDocumentPath(participantKey)}/sessions`),
            orderBy("startTime", "desc"),
          ),
        ),
      ]);

      if (courseSnapshot.empty) {
        const seedBatch = writeBatch(db);
        const seededCourses = DEFAULT_COURSE_NAMES.map((name) => createCourse(name));

        seededCourses.forEach((course) => {
          seedBatch.set(doc(db, `${participantDocumentPath(participantKey)}/courses/${course.id}`), course);
        });

        await seedBatch.commit();

        return {
          participant,
          courses: sortCourses(seededCourses),
          sessions: sortSessions(sessionSnapshot.docs.map((document) => document.data() as StudySession)),
          existed: participantSnapshot.exists(),
        };
      }

      return {
        participant,
        courses: sortCourses(courseSnapshot.docs.map((document) => document.data() as Course)),
        sessions: sortSessions(sessionSnapshot.docs.map((document) => document.data() as StudySession)),
        existed: participantSnapshot.exists(),
      };
    },

    async upsertCourse(participantKey, course) {
      await ensureAnonymousUser();
      await setDoc(
        doc(getFirebaseDb(), `${participantDocumentPath(participantKey)}/courses/${course.id}`),
        course,
      );
      return course;
    },

    async archiveCourse(participantKey, course) {
      await ensureAnonymousUser();
      await setDoc(
        doc(getFirebaseDb(), `${participantDocumentPath(participantKey)}/courses/${course.id}`),
        {
          ...course,
          active: false,
          deletedAt: Date.now(),
          updatedAt: Date.now(),
        },
      );
    },

    async upsertSession(participantKey, session) {
      await ensureAnonymousUser();

      const db = getFirebaseDb();
      const sessionRef = doc(db, `${participantDocumentPath(participantKey)}/sessions/${session.id}`);
      const batch = writeBatch(db);

      batch.set(sessionRef, {
        ...session,
        yawnCount: session.yawns.length,
        avgSleepiness: getAverageSleepiness(session),
        maxSleepiness: getMaxSleepiness(session),
      });

      session.yawns.forEach((yawn) => {
        batch.set(
          doc(db, `${participantDocumentPath(participantKey)}/sessions/${session.id}/yawnEvents/${yawn.id}`),
          {
            ...yawn,
            participantKey,
            participantNameSnapshot: session.participantNameSnapshot,
            sessionId: session.id,
            courseId: session.courseId,
            courseNameSnapshot: session.courseNameSnapshot,
            sleepQuality: session.sleepQuality,
            source: session.source,
          },
        );
      });

      await batch.commit();
      return session;
    },
  };
}
