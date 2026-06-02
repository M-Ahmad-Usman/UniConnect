import { z } from "zod";
import { publicIdSchema } from "../../shared/ids/index.js";

// ─── Params ────────────────────────────────────────────────────────────────

export const classPublicIdParamSchema = {
  params: z.object({
    publicId: publicIdSchema,
  }),
};

export const assignClassCrSchema = {
  params: z.object({
    publicId: publicIdSchema,
  }),
  body: z.object({
    userPublicId: publicIdSchema,
  }),
};

export const classCrParamSchema = {
  params: assignClassCrSchema.params,
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
    departmentId: z.coerce.number().int().positive({ error: "Department ID must be a positive integer" }).optional(),
    semester: z.coerce.number().int().positive({ error: "Semester must be a positive integer" }).optional(),
    section: z.enum(["A", "B"], { error: "Section must be either 'A' or 'B'" }).optional(),
    status: z.enum(["ACTIVE", "GRADUATED", "ALL"]).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
};

export const classCandidateQuerySchema = {
  params: z.object({
    publicId: publicIdSchema,
  }),
  query: z.object({
    search: z.string().trim().min(1).max(100).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
};

export const transferStudentSchema = {
  params: z.object({
    publicId: publicIdSchema,
  }),
  body: z.object({
    studentPublicId: publicIdSchema,
  }),
};

// ─── Assign Course ─────────────────────────────────────────────────────────

export const assignCourseSchema = {
  params: z.object({
    publicId: publicIdSchema,
  }),
  body: z.object({
    courseId: z.number().int().positive({ error: "Course ID must be a positive integer" }),
    teacherPublicId: publicIdSchema,
  }),
};

// ─── List Class Courses ────────────────────────────────────────────────────

export const listClassCoursesSchema = {
  params: z.object({
    publicId: publicIdSchema,
  }),
};

// ─── Remove Course ─────────────────────────────────────────────────────────

export const removeCourseSchema = {
  params: z.object({
    publicId: publicIdSchema,
    courseId: z.coerce.number().int().positive({ error: "Course ID must be a positive integer" }),
  }),
};

export const replaceCourseTeacherSchema = {
  params: z.object({
    publicId: publicIdSchema,
    courseId: z.coerce.number().int().positive({ error: "Course ID must be a positive integer" }),
  }),
  body: z.object({
    teacherPublicId: publicIdSchema,
  }),
};

// ─── Semester Progression ──────────────────────────────────────────────────

export const semesterProgressionSchema = {
  params: z.object({
    publicId: publicIdSchema,
  }),
  body: z.object({
    teacherAssignments: z
      .array(
        z.object({
          courseId: z.number().int().positive({ error: "Course ID must be a positive integer" }),
          teacherPublicId: publicIdSchema,
        })
      )
      .default([]),
  }),
};

export const graduationSchema = {
  params: z.object({
    publicId: publicIdSchema,
  }),
};
