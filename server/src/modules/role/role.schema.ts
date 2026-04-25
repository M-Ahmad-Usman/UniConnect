import { z } from "zod";

// ─── Role Enum ─────────────────────────────────────────────────────────────

const roleEnum = z.enum(
  [
    "hod",
    "program_director",
    "cr",
    "society_president",
    "society_convenor",
    "server_moderator",
    "channel_moderator",
  ],
  { error: "Invalid role" }
);

// ─── Assign Role ───────────────────────────────────────────────────────────

export const assignRoleSchema = {
  body: z
    .object({
      userId: z.coerce.number().int().positive({ error: "User ID must be a positive integer" }),
      role: roleEnum,
      scopeId: z.coerce
        .number()
        .int()
        .positive({ error: "Scope ID must be a positive integer" })
        .optional(),
      serverId: z.coerce
        .number()
        .int()
        .positive({ error: "Server ID must be a positive integer" })
        .optional(),
      channelId: z.coerce
        .number()
        .int()
        .positive({ error: "Channel ID must be a positive integer" })
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (data.role === "server_moderator") {
        if (!data.serverId) {
          ctx.addIssue({
            code: "custom",
            path: ["serverId"],
            message: "Server ID is required for server moderator role",
          });
        }
        if (data.channelId !== undefined) {
          ctx.addIssue({
            code: "custom",
            path: ["channelId"],
            message: "Channel ID is not applicable for server moderator role",
          });
        }
        if (data.scopeId !== undefined) {
          ctx.addIssue({
            code: "custom",
            path: ["scopeId"],
            message: "Scope ID is not applicable for server moderator role",
          });
        }
      } else if (data.role === "channel_moderator") {
        if (!data.serverId) {
          ctx.addIssue({
            code: "custom",
            path: ["serverId"],
            message: "Server ID is required for channel moderator role",
          });
        }
        if (!data.channelId) {
          ctx.addIssue({
            code: "custom",
            path: ["channelId"],
            message: "Channel ID is required for channel moderator role",
          });
        }
        if (data.scopeId !== undefined) {
          ctx.addIssue({
            code: "custom",
            path: ["scopeId"],
            message: "Scope ID is not applicable for channel moderator role",
          });
        }
      } else {
        if (!data.scopeId) {
          ctx.addIssue({
            code: "custom",
            path: ["scopeId"],
            message: "Scope ID is required for this role",
          });
        }
        if (data.serverId !== undefined) {
          ctx.addIssue({
            code: "custom",
            path: ["serverId"],
            message: "Server ID is not applicable for this role",
          });
        }
        if (data.channelId !== undefined) {
          ctx.addIssue({
            code: "custom",
            path: ["channelId"],
            message: "Channel ID is not applicable for this role",
          });
        }
      }
    }),
};

// ─── Revoke Role ───────────────────────────────────────────────────────────

const revokableRoleEnum = z.enum(
  ["hod", "program_director", "cr", "server_moderator", "channel_moderator"],
  { error: "Invalid role. Society president and convenor cannot be revoked — use PATCH /api/societies/:id to change leadership" }
);

export const revokeRoleSchema = {
  body: z
    .object({
      userId: z.coerce.number().int().positive({ error: "User ID must be a positive integer" }),
      role: revokableRoleEnum,
      scopeId: z.coerce
        .number()
        .int()
        .positive({ error: "Scope ID must be a positive integer" })
        .optional(),
      serverId: z.coerce
        .number()
        .int()
        .positive({ error: "Server ID must be a positive integer" })
        .optional(),
      channelId: z.coerce
        .number()
        .int()
        .positive({ error: "Channel ID must be a positive integer" })
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (data.role === "server_moderator") {
        if (!data.serverId) {
          ctx.addIssue({
            code: "custom",
            path: ["serverId"],
            message: "Server ID is required for server moderator role",
          });
        }
        if (data.channelId !== undefined) {
          ctx.addIssue({
            code: "custom",
            path: ["channelId"],
            message: "Channel ID is not applicable for server moderator role",
          });
        }
        if (data.scopeId !== undefined) {
          ctx.addIssue({
            code: "custom",
            path: ["scopeId"],
            message: "Scope ID is not applicable for server moderator role",
          });
        }
      } else if (data.role === "channel_moderator") {
        if (!data.serverId) {
          ctx.addIssue({
            code: "custom",
            path: ["serverId"],
            message: "Server ID is required for channel moderator role",
          });
        }
        if (!data.channelId) {
          ctx.addIssue({
            code: "custom",
            path: ["channelId"],
            message: "Channel ID is required for channel moderator role",
          });
        }
        if (data.scopeId !== undefined) {
          ctx.addIssue({
            code: "custom",
            path: ["scopeId"],
            message: "Scope ID is not applicable for channel moderator role",
          });
        }
      } else {
        if (!data.scopeId) {
          ctx.addIssue({
            code: "custom",
            path: ["scopeId"],
            message: "Scope ID is required for this role",
          });
        }
        if (data.serverId !== undefined) {
          ctx.addIssue({
            code: "custom",
            path: ["serverId"],
            message: "Server ID is not applicable for this role",
          });
        }
        if (data.channelId !== undefined) {
          ctx.addIssue({
            code: "custom",
            path: ["channelId"],
            message: "Channel ID is not applicable for this role",
          });
        }
      }
    }),
};

// ─── Get User Roles ────────────────────────────────────────────────────────

export const getUserRolesSchema = {
  params: z.object({
    id: z.coerce.number().int().positive({ error: "User ID must be a positive integer" }),
  }),
};
