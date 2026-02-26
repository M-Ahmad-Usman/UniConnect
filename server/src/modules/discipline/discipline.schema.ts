import { z } from "zod";

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
