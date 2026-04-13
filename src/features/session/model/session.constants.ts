import type { TaskType } from "@/features/session/model/session.types";

export const TASK_OPTIONS: Array<{ value: TaskType; label: string; emoji: string }> = [
  { value: "reading", label: "Reading", emoji: "📖" },
  { value: "writing", label: "Writing", emoji: "✍️" },
  { value: "problem-solving", label: "Problem solving", emoji: "🧩" },
  { value: "watching-lecture", label: "Watching lecture", emoji: "🎥" },
];

export const SESSION_DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];
export const SLEEP_SCALE = [1, 2, 3, 4, 5];

