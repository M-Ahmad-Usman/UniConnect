import { z } from "zod";
import { publicIdSchema } from "../../shared/ids/index.js";
import { paginationQuerySchema } from "../../shared/utils/pagination.js";

// ─── Params ────────────────────────────────────────────────────────────────

export const societyPublicIdParamSchema = {
  params: z.object({
    publicId: publicIdSchema,
  }),
};

const lifecycleReasonSchema = z.string().trim().min(1).max(500).optional();

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
    presidentPublicId: publicIdSchema,
    convenorPublicId: publicIdSchema,
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
    status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
    lifecycle: z.enum(["live", "deleted", "all"]).optional(),
  }),
};

// ─── Update Society ────────────────────────────────────────────────────────

export const updateSocietySchema = {
  params: z.object({
    publicId: publicIdSchema,
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
      presidentPublicId: publicIdSchema.optional(),
      convenorPublicId: publicIdSchema.optional(),
    })
    .refine(
      (data) =>
        data.name !== undefined ||
        data.description !== undefined ||
        data.presidentPublicId !== undefined ||
        data.convenorPublicId !== undefined,
      {
        error: "At least one field (name, description, presidentPublicId, or convenorPublicId) must be provided",
        path: ["name"],
      }
    ),
};

// ─── Join Request ──────────────────────────────────────────────────────────

export const joinRequestSchema = {
  params: societyPublicIdParamSchema.params,
};

// ─── List Join Requests ────────────────────────────────────────────────────

export const listJoinRequestsSchema = {
  params: z.object({
    publicId: publicIdSchema,
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
    publicId: publicIdSchema,
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
    publicId: publicIdSchema,
  }),
  body: z.object({
    userPublicId: publicIdSchema,
  }),
};

// ─── Remove Member ─────────────────────────────────────────────────────────

export const removeMemberSchema = {
  params: z.object({
    publicId: publicIdSchema,
    userPublicId: publicIdSchema,
  }),
};

// ─── List Members ──────────────────────────────────────────────────────────

export const listMembersSchema = {
  params: z.object({
    publicId: publicIdSchema,
  }),
  query: paginationQuerySchema,
};

export const listMemberCandidatesSchema = {
  params: z.object({
    publicId: publicIdSchema,
  }),
  query: paginationQuerySchema.extend({
    search: z.string().trim().max(100, { error: "Search must be at most 100 characters" }).optional(),
  }),
};

export const listLeadershipCandidatesSchema = {
  query: paginationQuerySchema.extend({
    departmentId: z.coerce
      .number()
      .int()
      .positive({ error: "Department ID must be a positive integer" }),
    role: z.enum(["president", "convenor"], {
      error: "Role must be either president or convenor",
    }),
    search: z.string().trim().max(100, { error: "Search must be at most 100 characters" }).optional(),
  }),
};

export const leadershipConflictsSchema = {
  params: societyPublicIdParamSchema.params,
  query: z.object({
    action: z.enum(["activate", "restore"], {
      error: "Action must be either activate or restore",
    }),
  }),
};

export const updateSocietyStatusSchema = {
  params: societyPublicIdParamSchema.params,
  body: z.object({
    status: z.enum(["ACTIVE", "SUSPENDED"]),
    reason: lifecycleReasonSchema,
  }),
};

export const societyLifecycleReasonSchema = {
  params: societyPublicIdParamSchema.params,
  body: z.preprocess(
    (value) => value ?? {},
    z.object({ reason: lifecycleReasonSchema }),
  ),
};
