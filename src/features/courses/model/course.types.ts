export interface Course {
  id: string;
  name: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_COURSE_NAMES = ["Personal Data"];

export function slugifyCourseName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

