import type { Course } from "@/features/courses/model/course.types";
import type { ParticipantWorkspace } from "@/features/participants/model/participant.types";
import type { StudySession } from "@/features/session/model/session.types";
import type { StorageMode } from "@/features/settings/model/settings.types";

export interface DataRepository {
  kind: StorageMode;
  loadWorkspace(displayName: string): Promise<ParticipantWorkspace>;
  upsertCourse(participantKey: string, course: Course): Promise<Course>;
  archiveCourse(participantKey: string, course: Course): Promise<void>;
  upsertSession(participantKey: string, session: StudySession): Promise<StudySession>;
}
