import { z } from "zod";
import { paginationQuerySchema } from "../../shared/utils/pagination.js";

// ─── Params ────────────────────────────────────────────────────────────────

export const courseIdParamSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Course ID must be a positive integer" }),
  }),
};

// ─── Create Course ─────────────────────────────────────────────────────────

export const createCourseSchema = {
  body: z.object({
    title: z
      .string()
      .trim()
      .min(1, { error: "Course title is required" })
      .max(50, { error: "Course title must be at most 50 characters" }),
    code: z
      .string()
      .trim()
      .min(1, { error: "Course code is required" })
      .max(50, { error: "Course code must be at most 50 characters" }),
    creditHours: z
      .number()
      .int()
      .positive({ error: "Credit hours must be a positive integer" }),
    departmentId: z
      .number()
      .int()
      .positive({ error: "Department ID must be a positive integer" }),
  }),
};

// ─── List Courses ──────────────────────────────────────────────────────────

export const listCoursesSchema = {
  query: paginationQuerySchema.extend({
    departmentId: z.coerce.number().int().positive({ error: "Department ID must be a positive integer" }).optional(),
    search: z.string().trim().max(100, { error: "Search must be at most 100 characters" }).optional(),
  }),
};

// ─── Update Course ─────────────────────────────────────────────────────────

export const updateCourseSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Course ID must be a positive integer" }),
  }),
  body: z
    .object({
      title: z
        .string()
        .trim()
        .min(1, { error: "Course title is required" })
        .max(50, { error: "Course title must be at most 50 characters" })
        .optional(),
      code: z
        .string()
        .trim()
        .min(1, { error: "Course code is required" })
        .max(50, { error: "Course code must be at most 50 characters" })
        .optional(),
      creditHours: z
        .number()
        .int()
        .positive({ error: "Credit hours must be a positive integer" })
        .optional(),
    })
    .refine((data) => data.title !== undefined || data.code !== undefined || data.creditHours !== undefined, {
      error: "At least one field (title, code, or creditHours) must be provided",
      path: ["title"],
    }),
};
