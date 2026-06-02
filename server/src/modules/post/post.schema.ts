import { z } from "zod";
import { MAX_TITLE_LENGTH, MAX_CONTENT_LENGTH } from "../../shared/constants.js";
import { publicIdSchema } from "../../shared/ids/index.js";
import { paginationQuerySchema } from "../../shared/utils/pagination.js";

// ─── Param Schemas ─────────────────────────────────────────────────────────

export const channelPublicIdParamSchema = {
  params: z.object({
    publicId: publicIdSchema,
  }),
};

export const postPublicIdParamSchema = {
  params: z.object({
    publicId: publicIdSchema,
  }),
};

// ─── Create Post ───────────────────────────────────────────────────────────

export const createPostSchema = {
  params: z.object({
    publicId: publicIdSchema,
  }),
  body: z.object({
    title: z
      .string()
      .trim()
      .min(1, { error: "Title must not be empty" })
      .max(MAX_TITLE_LENGTH, { error: `Title must be at most ${MAX_TITLE_LENGTH} characters` }),
    content: z
      .string()
      .trim()
      .min(1, { error: "Content must not be empty" })
      .max(MAX_CONTENT_LENGTH, {
        error: `Content must be at most ${MAX_CONTENT_LENGTH} characters`,
      }),
    priority: z.enum(["NORMAL", "IMPORTANT", "URGENT"]).optional().default("NORMAL"),
  }),
};

// ─── Update Post ───────────────────────────────────────────────────────────

export const updatePostSchema = {
  params: z.object({
    publicId: publicIdSchema,
  }),
  body: z
    .object({
      title: z
        .string()
        .trim()
        .min(1, { error: "Title must not be empty" })
        .max(MAX_TITLE_LENGTH, { error: `Title must be at most ${MAX_TITLE_LENGTH} characters` })
        .optional(),
      content: z
        .string()
        .trim()
        .min(1, { error: "Content must not be empty" })
        .max(MAX_CONTENT_LENGTH, {
          error: `Content must be at most ${MAX_CONTENT_LENGTH} characters`,
        })
        .optional(),
      priority: z.enum(["NORMAL", "IMPORTANT", "URGENT"]).optional(),
    })
    .refine(
      (data) =>
        data.title !== undefined || data.content !== undefined || data.priority !== undefined,
      {
        error: "At least one field (title, content, or priority) must be provided",
        path: ["title"],
      }
    ),
};

// ─── List Posts ────────────────────────────────────────────────────────────

export const listPostsSchema = {
  params: z.object({
    publicId: publicIdSchema,
  }),
  query: paginationQuerySchema
    .extend({
      search: z.string().trim().optional(),
      priority: z.enum(["NORMAL", "IMPORTANT", "URGENT"]).optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    })
    .refine(
      (data) => {
        if (data.startDate && data.endDate) {
          return data.startDate <= data.endDate;
        }
        return true;
      },
      {
        error: "Start date must be before or equal to end date",
        path: ["startDate"],
      }
    ),
};

// ─── Pin Post ──────────────────────────────────────────────────────────────

export const pinPostSchema = {
  params: z.object({
    publicId: publicIdSchema,
  }),
  body: z.object({
    isPinned: z.boolean({ error: "isPinned must be a boolean" }),
  }),
};
