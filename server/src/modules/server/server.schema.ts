import { z } from "zod";
import { publicIdSchema } from "../../shared/ids/index.js";
import { paginationQuerySchema } from "../../shared/utils/pagination.js";

// ─── Params ────────────────────────────────────────────────────────────────

export const serverPublicIdParamSchema = {
  params: z.object({
    publicId: publicIdSchema,
  }),
};

// ─── List Servers ──────────────────────────────────────────────────────────

export const listServersSchema = {
  query: paginationQuerySchema.extend({
    type: z
      .enum(["DEPARTMENT", "CLASS", "SOCIETY"], {
        error: "Type must be one of: DEPARTMENT, CLASS, SOCIETY",
      })
      .optional(),
  }),
};

// ─── List Server Channels ──────────────────────────────────────────────────

export const listServerChannelsSchema = {
  params: z.object({
    publicId: publicIdSchema,
  }),
  query: z.object({
    includeArchived: z
      .enum(["true", "false"], { error: "includeArchived must be 'true' or 'false'" })
      .default("false")
      .transform((v) => v === "true"),
  }),
};

// ─── List Server Members ───────────────────────────────────────────────────

export const listServerMembersSchema = {
  params: z.object({
    publicId: publicIdSchema,
  }),
  query: paginationQuerySchema,
};

// ─── Create Channel in Server ──────────────────────────────────────────────

export const createChannelSchema = {
  params: z.object({
    publicId: publicIdSchema,
  }),
  body: z.object({
    name: z
      .string()
      .trim()
      .min(1, { error: "Channel name is required" })
      .max(100, { error: "Channel name must be at most 100 characters" }),
    description: z
      .string()
      .trim()
      .max(500, { error: "Description must be at most 500 characters" })
      .optional(),
  }),
};
