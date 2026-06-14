import { z } from "zod";

export const disciplineIdParamSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Discipline ID must be a positive integer" }),
  }),
};

// ─── Create Discipline ─────────────────────────────────────────────────────

export const createDisciplineSchema = {
  body: z.object({
    name: z
      .string()
      .trim()
      .min(1, { error: "Discipline name is required" })
      .max(100, { error: "Discipline name must be at most 100 characters" }),
  }),
};

export const updateDisciplineSchema = {
  params: disciplineIdParamSchema.params,
  body: createDisciplineSchema.body,
};
