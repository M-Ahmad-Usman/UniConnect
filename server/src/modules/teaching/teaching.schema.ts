import { z } from "zod";

export const getMyTeachingSchema = {
  query: z.object({
    includeHistory: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .default(true),
    historyPage: z.coerce.number().int().positive().default(1),
    historyLimit: z.coerce.number().int().positive().max(50).default(20),
  }),
};
