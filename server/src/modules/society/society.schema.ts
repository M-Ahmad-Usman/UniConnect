import { z } from "zod";
import { paginationQuerySchema } from "../../shared/utils/pagination.js";

// ─── Params ────────────────────────────────────────────────────────────────

export const societyIdParamSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Society ID must be a positive integer" }),
  }),
};

// ─── Create Society ────────────────────────────────────────────────────────

export const createSocietySchema = {
  body: z.object({
    name: z
      .string()
      .trim()
      .min(3, { error: "Society name must be at least 3 characters" })
      .max(100, { error: "Society name must be at most 100 characters" }),
    description: z
      .string()
      .trim()
      .max(500, { error: "Description must be at most 500 characters" })
      .optional(),
    departmentId: z
      .number()
      .int()
      .positive({ error: "Department ID must be a positive integer" }),
    presidentId: z
      .number()
      .int()
      .positive({ error: "President ID must be a positive integer" }),
    convenorId: z
      .number()
      .int()
      .positive({ error: "Convenor ID must be a positive integer" }),
  }),
};

// ─── List Societies ────────────────────────────────────────────────────────

export const listSocietiesSchema = {
  query: paginationQuerySchema.extend({
    departmentId: z.coerce
      .number()
      .int()
      .positive({ error: "Department ID must be a positive integer" })
      .optional(),
  }),
};

// ─── Update Society ────────────────────────────────────────────────────────

export const updateSocietySchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Society ID must be a positive integer" }),
  }),
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(3, { error: "Society name must be at least 3 characters" })
        .max(100, { error: "Society name must be at most 100 characters" })
        .optional(),
      description: z
        .string()
        .trim()
        .max(500, { error: "Description must be at most 500 characters" })
        .optional(),
      presidentId: z
        .number()
        .int()
        .positive({ error: "President ID must be a positive integer" })
        .optional(),
      convenorId: z
        .number()
        .int()
        .positive({ error: "Convenor ID must be a positive integer" })
        .optional(),
    })
    .refine(
      (data) =>
        data.name !== undefined ||
        data.description !== undefined ||
        data.presidentId !== undefined ||
        data.convenorId !== undefined,
      {
        error: "At least one field (name, description, presidentId, or convenorId) must be provided",
        path: ["name"],
      }
    ),
};

// ─── Join Request ──────────────────────────────────────────────────────────

export const joinRequestSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Society ID must be a positive integer" }),
  }),
};

// ─── List Join Requests ────────────────────────────────────────────────────

export const listJoinRequestsSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Society ID must be a positive integer" }),
  }),
  query: paginationQuerySchema.extend({
    status: z.enum(["PENDING", "APPROVED", "REJECTED"], {
      error: "Status must be one of: PENDING, APPROVED, REJECTED",
    }).optional(),
  }),
};

// ─── Review Join Request ───────────────────────────────────────────────────

export const reviewJoinRequestSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Society ID must be a positive integer" }),
    requestId: z.coerce.number().int().positive({ error: "Request ID must be a positive integer" }),
  }),
  body: z.object({
    status: z.enum(["APPROVED", "REJECTED"], {
      error: "Status must be either APPROVED or REJECTED",
    }),
  }),
};

// ─── Add Member ────────────────────────────────────────────────────────────

export const addMemberSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Society ID must be a positive integer" }),
  }),
  body: z.object({
    userId: z
      .number()
      .int()
      .positive({ error: "User ID must be a positive integer" }),
  }),
};

// ─── Remove Member ─────────────────────────────────────────────────────────

export const removeMemberSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Society ID must be a positive integer" }),
    userId: z.coerce.number().int().positive({ error: "User ID must be a positive integer" }),
  }),
};

// ─── List Members ──────────────────────────────────────────────────────────

export const listMembersSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Society ID must be a positive integer" }),
  }),
  query: paginationQuerySchema,
};

export const listMemberCandidatesSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "Society ID must be a positive integer" }),
  }),
  query: paginationQuerySchema.extend({
    search: z.string().trim().max(100, { error: "Search must be at most 100 characters" }).optional(),
  }),
};
