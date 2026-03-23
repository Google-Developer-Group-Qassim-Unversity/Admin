export const AVAILABLE_SEMESTERS = ["471", "472"] as const;

export type Semester = (typeof AVAILABLE_SEMESTERS)[number];