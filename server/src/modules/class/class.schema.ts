import { z } from "zod";

// ─── Params ────────────────────────────────────────────────────────────────

export const classIdParamSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Class ID must be a positive integer" }),
  }),
};

// ─── Create Class ──────────────────────────────────────────────────────────

export const createClassSchema = {
  body: z.object({
    programId: z.number().int().positive({ error: "Program ID must be a positive integer" }),
    currentSemester: z.number().int().positive({ error: "Current semester must be a positive integer" }),
    academicYear: z
      .number()
      .int()
      .min(2000, { error: "Academic year must be a valid year (>= 2000)" })
      .max(2100, { error: "Academic year must be a valid year (<= 2100)" }),
    admissionYear: z
      .number()
      .int()
      .min(2000, { error: "Admission year must be a valid year (>= 2000)" })
      .max(2100, { error: "Admission year must be a valid year (<= 2100)" }),
    section: z.enum(["A", "B"], { error: "Section must be either 'A' or 'B'" }),
  }),
};

// ─── List Classes ──────────────────────────────────────────────────────────

export const listClassesSchema = {
  query: z.object({
    programId: z.coerce.number().int().positive({ error: "Program ID must be a positive integer" }).optional(),
    semester: z.coerce.number().int().positive({ error: "Semester must be a positive integer" }).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
};

// ─── Assign Course ─────────────────────────────────────────────────────────

export const assignCourseSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Class ID must be a positive integer" }),
  }),
  body: z.object({
    courseId: z.number().int().positive({ error: "Course ID must be a positive integer" }),
    teacherId: z.number().int().positive({ error: "Teacher ID must be a positive integer" }),
  }),
};

// ─── List Class Courses ────────────────────────────────────────────────────

export const listClassCoursesSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Class ID must be a positive integer" }),
  }),
};

// ─── Remove Course ─────────────────────────────────────────────────────────

export const removeCourseSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Class ID must be a positive integer" }),
    courseId: z.coerce.number().int().positive({ error: "Course ID must be a positive integer" }),
  }),
};

// ─── Semester Progression ──────────────────────────────────────────────────

export const semesterProgressionSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Class ID must be a positive integer" }),
  }),
  body: z.object({
    teacherAssignments: z
      .array(
        z.object({
          courseId: z.number().int().positive({ error: "Course ID must be a positive integer" }),
          teacherId: z.number().int().positive({ error: "Teacher ID must be a positive integer" }),
        })
      )
      .default([]),
  }),
};
