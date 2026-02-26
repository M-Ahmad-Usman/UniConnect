import { z } from "zod";

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
