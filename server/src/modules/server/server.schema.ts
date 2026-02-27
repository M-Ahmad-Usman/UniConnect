import { z } from "zod";
import { paginationQuerySchema } from "../../shared/utils/pagination.js";

// ─── Params ────────────────────────────────────────────────────────────────

export const serverIdParamSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Server ID must be a positive integer" }),
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
    id: z.coerce.number().int().positive({ error: "Server ID must be a positive integer" }),
  }),
};

// ─── List Server Members ───────────────────────────────────────────────────

export const listServerMembersSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Server ID must be a positive integer" }),
  }),
  query: paginationQuerySchema,
};

// ─── Create Channel in Server ──────────────────────────────────────────────

export const createChannelSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Server ID must be a positive integer" }),
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
