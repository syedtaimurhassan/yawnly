import type { Course } from "@/features/courses/model/course.types";
import type { StudySession } from "@/features/session/model/session.types";
import type { StorageMode } from "@/features/settings/model/settings.types";

export interface ParticipantProfile {
  displayName: string;
  nameKey: string;
  createdAt: number;
  updatedAt: number;
  lastSeenAt: number;
  source: StorageMode;
}

export interface ParticipantWorkspace {
  participant: ParticipantProfile;
  courses: Course[];
  sessions: StudySession[];
  existed: boolean;
}

export function cleanParticipantName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function normalizeParticipantName(name: string) {
  return cleanParticipantName(name)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
