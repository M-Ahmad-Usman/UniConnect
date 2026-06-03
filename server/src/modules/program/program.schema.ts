import { z } from "zod";
import { paginationQuerySchema } from "../../shared/utils/pagination.js";
import { publicIdSchema } from "../../shared/ids/index.js";

// ─── Params ────────────────────────────────────────────────────────────────

export const programIdParamSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Program ID must be a positive integer" }),
  }),
};

export const programDeletionImpactSchema = programIdParamSchema;

// ─── List Programs ─────────────────────────────────────────────────────────

export const listProgramsSchema = {
  query: paginationQuerySchema.extend({
    departmentId: z.coerce.number().int().positive({ error: "Department ID must be a positive integer" }).optional(),
    disciplineId: z.coerce.number().int().positive({ error: "Discipline ID must be a positive integer" }).optional(),
    degreeLevelId: z.coerce.number().int().positive({ error: "Degree level ID must be a positive integer" }).optional(),
    search: z.string().trim().max(100, { error: "Search must be at most 100 characters" }).optional(),
  }),
};

// ─── Update Program ────────────────────────────────────────────────────────

export const updateProgramSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Program ID must be a positive integer" }),
  }),
  body: z
    .object({
      semesters: z.number().int().positive({ error: "Semesters must be a positive integer" }).optional(),
      code: z
        .string()
        .trim()
        .min(1, { error: "Program code is required" })
        .max(20, { error: "Program code must be at most 20 characters" })
        .optional(),
    })
    .refine((data) => data.semesters !== undefined || data.code !== undefined, {
      error: "At least one field (semesters or code) must be provided",
      path: ["semesters"],
    }),
};

export const assignProgramDirectorSchema = {
  params: programIdParamSchema.params,
  body: z.object({
    userPublicId: publicIdSchema,
  }),
};

// ─── Get Curriculum ────────────────────────────────────────────────────────

export const getCurriculumSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Program ID must be a positive integer" }),
  }),
  query: z.object({
    semesterNumber: z.coerce.number().int().positive({ error: "Semester number must be a positive integer" }).optional(),
    batchYear: z.coerce.number().int().min(2000, { error: "Batch year must be >= 2000" }).max(2100, { error: "Batch year must be <= 2100" }).optional(),
  }),
};

// ─── Add Curriculum ────────────────────────────────────────────────────────

export const addCurriculumSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Program ID must be a positive integer" }),
  }),
  body: z.object({
    courseId: z.number().int().positive({ error: "Course ID must be a positive integer" }),
    semesterNumber: z.number().int().positive({ error: "Semester number must be a positive integer" }),
    batchYear: z.number().int().min(2000, { error: "Batch year must be >= 2000" }).max(2100, { error: "Batch year must be <= 2100" }),
  }),
};

// ─── Remove Curriculum ─────────────────────────────────────────────────────

export const removeCurriculumSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Program ID must be a positive integer" }),
    curriculumId: z.coerce.number().int().positive({ error: "Curriculum ID must be a positive integer" }),
  }),
};
