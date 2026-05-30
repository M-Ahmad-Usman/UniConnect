import { z } from "zod";
import { publicIdSchema } from "../../shared/ids/index.js";

// ─── Params ────────────────────────────────────────────────────────────────

export const departmentIdParamSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Department ID must be a positive integer" }),
  }),
};

// ─── Create Department ─────────────────────────────────────────────────────

export const createDepartmentSchema = {
  body: z.object({
    name: z
      .string()
      .trim()
      .min(1, { error: "Department name is required" })
      .max(100, { error: "Department name must be at most 100 characters" }),
    code: z
      .string()
      .trim()
      .min(1, { error: "Department code is required" })
      .max(20, { error: "Department code must be at most 20 characters" }),
  }),
};

// ─── Update Department ─────────────────────────────────────────────────────

export const updateDepartmentSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Department ID must be a positive integer" }),
  }),
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(1, { error: "Department name is required" })
        .max(100, { error: "Department name must be at most 100 characters" })
        .optional(),
      code: z
        .string()
        .trim()
        .min(1, { error: "Department code is required" })
        .max(20, { error: "Department code must be at most 20 characters" })
        .optional(),
    })
    .refine((data) => data.name !== undefined || data.code !== undefined, {
      error: "At least one field (name or code) must be provided",
      path: ["name"],
    }),
};

export const assignDepartmentHodSchema = {
  params: departmentIdParamSchema.params,
  body: z.object({
    userPublicId: publicIdSchema,
  }),
};

// ─── Create Program ────────────────────────────────────────────────────────

export const createProgramSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Department ID must be a positive integer" }),
  }),
  body: z.object({
    disciplineId: z.number().int().positive({ error: "Discipline ID must be a positive integer" }),
    degreeLevelId: z.number().int().positive({ error: "Degree level ID must be a positive integer" }),
    semesters: z.number().int().positive({ error: "Semesters must be a positive integer" }),
    code: z
      .string()
      .trim()
      .min(1, { error: "Program code is required" })
      .max(20, { error: "Program code must be at most 20 characters" }),
  }),
};

// ─── List Programs ─────────────────────────────────────────────────────────

export const listProgramsSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Department ID must be a positive integer" }),
  }),
};
