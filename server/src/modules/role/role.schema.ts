import { z } from "zod";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../../shared/constants.js";
import { publicIdSchema } from "../../shared/ids/index.js";

const roleEnum = z.enum(
  [
    "enrollment_officer",
    "hod",
    "program_director",
    "cr",
    "server_moderator",
    "channel_moderator",
  ],
  { error: "Invalid role" },
);

const platformRoleEnum = z.enum(["server_moderator", "channel_moderator"], {
  error: "Invalid platform role",
});

const staffRoleEnum = z.enum(["enrollment_officer"], {
  error: "Invalid staff role",
});

const paginatedSearchSchema = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().max(100).optional(),
};

export const assignableScopesSchema = {
  query: z.object({
    ...paginatedSearchSchema,
    role: roleEnum,
  }),
};

export const assignableChannelsSchema = {
  query: z.object({
    ...paginatedSearchSchema,
    serverPublicId: publicIdSchema,
  }),
};

export const assignableUsersSchema = {
  query: z
    .object({
      ...paginatedSearchSchema,
      role: roleEnum,
      scopeId: z.coerce.number().int().positive().optional(),
      classPublicId: publicIdSchema.optional(),
      serverPublicId: publicIdSchema.optional(),
      channelPublicId: publicIdSchema.optional(),
    })
    .superRefine((data, ctx) => {
      if (data.role === "server_moderator") {
        if (!data.serverPublicId) {
          ctx.addIssue({ code: "custom", path: ["serverPublicId"], message: "Server public ID is required" });
        }
      } else if (data.role === "channel_moderator") {
        if (!data.serverPublicId) {
          ctx.addIssue({ code: "custom", path: ["serverPublicId"], message: "Server public ID is required" });
        }
        if (!data.channelPublicId) {
          ctx.addIssue({ code: "custom", path: ["channelPublicId"], message: "Channel public ID is required" });
        }
      } else if (data.role === "cr") {
        if (!data.classPublicId) {
          ctx.addIssue({ code: "custom", path: ["classPublicId"], message: "Class public ID is required" });
        }
      } else if (!data.scopeId) {
        ctx.addIssue({ code: "custom", path: ["scopeId"], message: "Scope ID is required" });
      }
    }),
};

export const revokableRolesSchema = {
  query: z.object({
    ...paginatedSearchSchema,
    role: roleEnum,
    scopeId: z.coerce.number().int().positive().optional(),
    classPublicId: publicIdSchema.optional(),
    serverPublicId: publicIdSchema.optional(),
    channelPublicId: publicIdSchema.optional(),
  }),
};

export const getUserRolesSchema = {
  params: z.object({
    userPublicId: publicIdSchema,
  }),
};

export const createPlatformAssignmentSchema = {
  body: z
    .object({
      userPublicId: publicIdSchema,
      role: platformRoleEnum,
      serverPublicId: publicIdSchema,
      channelPublicId: publicIdSchema.optional(),
      expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.role === "server_moderator" && data.channelPublicId !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["channelPublicId"],
          message: "Channel public ID is not applicable for a server moderator",
        });
      }
      if (data.role === "channel_moderator" && !data.channelPublicId) {
        ctx.addIssue({
          code: "custom",
          path: ["channelPublicId"],
          message: "Channel public ID is required for a channel moderator",
        });
      }
    }),
};

export const platformAssignmentParamSchema = {
  params: z.object({
    assignmentPublicId: publicIdSchema,
  }),
};

export const updatePlatformAssignmentExpirySchema = {
  params: platformAssignmentParamSchema.params,
  body: z.object({
    expiresAt: z.iso.datetime({ offset: true }).nullable(),
  }),
};

export const listPlatformAssignmentHistorySchema = {
  query: z.object({
    ...paginatedSearchSchema,
    state: z.enum(["ACTIVE", "EXPIRED", "REVOKED"]).optional(),
    role: platformRoleEnum.optional(),
    userPublicId: publicIdSchema.optional(),
    serverPublicId: publicIdSchema.optional(),
    channelPublicId: publicIdSchema.optional(),
  }),
};

export const createStaffAssignmentSchema = {
  body: z.object({
    userPublicId: publicIdSchema,
    role: staffRoleEnum,
    departmentId: z.number().int().positive({ error: "Department ID must be a positive integer" }),
    expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
  }),
};

export const staffAssignmentParamSchema = {
  params: z.object({
    assignmentPublicId: publicIdSchema,
  }),
};

export const transferAdminSchema = {
  body: z.object({
    userPublicId: publicIdSchema,
  }),
};
