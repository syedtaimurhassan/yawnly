import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import type { Course } from "@/features/courses/model/course.types";
import type { StudySession } from "@/features/session/model/session.types";
import { ensureAnonymousUser } from "@/services/firebase/auth";
import { getFirebaseDb } from "@/services/firebase/db";
import type { DataRepository } from "@/services/storage/repositories";

export function createFirestoreRepository(): DataRepository {
  return {
    kind: "firebase",

    async listCourses() {
      const user = await ensureAnonymousUser();
      const courseQuery = query(
        collection(getFirebaseDb(), `users/${user.uid}/courses`),
        orderBy("name"),
      );
      const snapshot = await getDocs(courseQuery);

      return snapshot.docs.map((document) => document.data() as Course);
    },

    async upsertCourse(course) {
      const user = await ensureAnonymousUser();
      await setDoc(doc(getFirebaseDb(), `users/${user.uid}/courses/${course.id}`), course);
      return course;
    },

    async listSessions() {
      const user = await ensureAnonymousUser();
      const sessionQuery = query(
        collection(getFirebaseDb(), `users/${user.uid}/sessions`),
        orderBy("startTime", "desc"),
      );
      const snapshot = await getDocs(sessionQuery);

      return snapshot.docs.map((document) => document.data() as StudySession);
    },

    async upsertSession(session) {
      const user = await ensureAnonymousUser();
      await setDoc(doc(getFirebaseDb(), `users/${user.uid}/sessions/${session.id}`), session);
      return session;
    },
  };
}
