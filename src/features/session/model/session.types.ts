import type { StorageMode } from "@/features/settings/model/settings.types";

export type TaskType =
  | "reading"
  | "writing"
  | "problem-solving"
  | "watching-lecture";

export type SessionStatus = "active" | "completed";
export type SessionEndReason = "manual" | "inactivity";

export interface YawnEvent {
  id: string;
  timestamp: number;
  sleepiness: number;
}

export interface StudySession {
  id: string;
  courseId: string;
  courseNameSnapshot: string;
  taskType: TaskType;
  expectedMinutes: number;
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
  courseId: string;
  courseNameSnapshot: string;
  taskType: TaskType;
  expectedMinutes: number;
  sleepQuality: number;
}

