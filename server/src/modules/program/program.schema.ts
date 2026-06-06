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

const programIdsQuerySchema = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed.split(",").map((id) => id.trim()) : undefined;
  }
  return value;
}, z.array(z.coerce.number().int().positive()).min(1).max(100).optional());

const departmentIdsQuerySchema = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed.split(",").map((id) => id.trim()) : undefined;
  }
  return value;
}, z.array(z.coerce.number().int().positive()).min(1).max(100).optional());

export const listProgramsSchema = {
  query: paginationQuerySchema.extend({
    departmentId: z.coerce.number().int().positive({ error: "Department ID must be a positive integer" }).optional(),
    departmentIds: departmentIdsQuerySchema,
    disciplineId: z.coerce.number().int().positive({ error: "Discipline ID must be a positive integer" }).optional(),
    degreeLevelId: z.coerce.number().int().positive({ error: "Degree level ID must be a positive integer" }).optional(),
    programIds: programIdsQuerySchema,
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
      confirmSemesterReduction: z.boolean().optional(),
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

export const bulkAddCurriculumSchema = {
  params: addCurriculumSchema.params,
  body: z.object({
    courseIds: z
      .array(z.number().int().positive({ error: "Course ID must be a positive integer" }))
      .min(1, { error: "Select at least one course" })
      .max(100, { error: "A maximum of 100 courses can be added at once" }),
    semesterNumber: z.number().int().positive({ error: "Semester number must be a positive integer" }),
    batchYear: z.number().int().min(2000, { error: "Batch year must be >= 2000" }).max(2100, { error: "Batch year must be <= 2100" }),
  }),
};

export const copyCurriculumBatchSchema = {
  params: addCurriculumSchema.params,
  body: z.object({
    sourceBatchYear: z.number().int().min(2000, { error: "Source batch year must be >= 2000" }).max(2100, { error: "Source batch year must be <= 2100" }),
    targetBatchYear: z.number().int().min(2000, { error: "Target batch year must be >= 2000" }).max(2100, { error: "Target batch year must be <= 2100" }),
  }).refine((data) => data.sourceBatchYear !== data.targetBatchYear, {
    error: "Source and target batch years must be different",
    path: ["targetBatchYear"],
  }),
};

// ─── Remove Curriculum ─────────────────────────────────────────────────────

export const removeCurriculumSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Program ID must be a positive integer" }),
    curriculumId: z.coerce.number().int().positive({ error: "Curriculum ID must be a positive integer" }),
  }),
};
