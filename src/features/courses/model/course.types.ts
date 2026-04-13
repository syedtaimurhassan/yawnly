export interface Course {
  id: string;
  name: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export const DEFAULT_COURSE_NAMES = ["Social Graph", "Graph Theory", "Economics"];

export function slugifyCourseName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
