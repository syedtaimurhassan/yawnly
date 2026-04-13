import type { Course } from "@/features/courses/model/course.types";
import type { StudySession } from "@/features/session/model/session.types";
import type { StorageMode } from "@/features/settings/model/settings.types";

export interface DataRepository {
  kind: StorageMode;
  listCourses(): Promise<Course[]>;
  upsertCourse(course: Course): Promise<Course>;
  listSessions(): Promise<StudySession[]>;
  upsertSession(session: StudySession): Promise<StudySession>;
}

