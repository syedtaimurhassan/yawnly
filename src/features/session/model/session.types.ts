import type { StorageMode } from "@/features/settings/model/settings.types";

export type SessionStatus = "active" | "completed";
export type SessionEndReason = "manual" | "inactivity";

export interface YawnEvent {
  id: string;
  timestamp: number;
  sleepiness: number;
}

export interface StudySession {
  id: string;
  participantKey: string;
  participantNameSnapshot: string;
  courseId: string;
  courseNameSnapshot: string;
  sleepQuality: number;
  status: SessionStatus;
  startTime: number;
  endTime?: number;
  endReason?: SessionEndReason;
  yawns: YawnEvent[];
  source: StorageMode;
  createdAt: number;
  updatedAt: number;
}

export interface StartSessionInput {
  participantKey: string;
  participantNameSnapshot: string;
  courseId: string;
  courseNameSnapshot: string;
  sleepQuality: number;
}
