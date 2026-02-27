import { z } from "zod";

// ─── Params ────────────────────────────────────────────────────────────────

export const channelIdParamSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Channel ID must be a positive integer" }),
  }),
};

// ─── Update Channel ────────────────────────────────────────────────────────

export const updateChannelSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Channel ID must be a positive integer" }),
  }),
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(1, { error: "Channel name must not be empty" })
        .max(100, { error: "Channel name must be at most 100 characters" })
        .optional(),
      description: z
        .string()
        .trim()
        .max(500, { error: "Description must be at most 500 characters" })
        .optional(),
    })
    .refine(
      (data) => data.name !== undefined || data.description !== undefined,
      {
        error: "At least one field (name or description) must be provided",
        path: ["name"],
      }
    ),
};
