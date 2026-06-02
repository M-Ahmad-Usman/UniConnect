import { z } from "zod";
import { publicIdSchema } from "../../shared/ids/index.js";

// ─── Params ────────────────────────────────────────────────────────────────

export const channelPublicIdParamSchema = {
  params: z.object({
    publicId: publicIdSchema,
  }),
};

// ─── Update Channel ────────────────────────────────────────────────────────

export const updateChannelSchema = {
  params: z.object({
    publicId: publicIdSchema,
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
