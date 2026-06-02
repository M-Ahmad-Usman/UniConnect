import { z } from "zod";
import { publicIdSchema } from "../../shared/ids/index.js";
import { paginationQuerySchema } from "../../shared/utils/pagination.js";

// ─── Param Schemas ─────────────────────────────────────────────────────────

export const notificationIdParamSchema = {
  params: z.object({
    id: z.coerce
      .number()
      .int()
      .positive({ error: "Notification ID must be a positive integer" }),
  }),
};

// ─── List Notifications ────────────────────────────────────────────────────

export const listNotificationsSchema = {
  query: paginationQuerySchema.extend({
    type: z.enum([
      "NEW_POST",
      "ROLE_ASSIGNED",
      "SOCIETY_REQUEST_REVIEWED",
      "SOCIETY_SUSPENDED",
      "SOCIETY_ACTIVATED",
      "SOCIETY_DELETED",
      "SOCIETY_RESTORED",
    ]).optional(),
    unreadOnly: z
      .enum(["true", "false"])
      .transform((v) => v === "true")
      .optional(),
  }),
};

// ─── List Notification Preferences ────────────────────────────────────────

export const listPreferencesSchema = {
  query: z.object({
    serverPublicId: publicIdSchema.optional(),
    notificationType: z.enum(["NEW_POST", "ROLE_ASSIGNED"]).optional(),
  }),
};

// ─── Update Notification Preference ────────────────────────────────────────

export const updatePreferenceSchema = {
  body: z
    .object({
      notificationType: z.enum(["NEW_POST", "ROLE_ASSIGNED"]).default("NEW_POST"),
      scopeType: z.enum(["SERVER", "CHANNEL"], {
        error: "Scope type must be SERVER or CHANNEL",
      }),
      serverPublicId: publicIdSchema,
      channelPublicId: publicIdSchema.optional(),
      isSubscribed: z.boolean({ error: "isSubscribed must be a boolean" }),
    })
    .refine(
      (data) => {
        if (data.scopeType === "CHANNEL" && !data.channelPublicId) {
          return false;
        }
        return true;
      },
      {
        error: "channelPublicId is required when scopeType is CHANNEL",
        path: ["channelPublicId"],
      }
    )
    .refine(
      (data) => {
        if (data.scopeType === "SERVER" && data.channelPublicId) {
          return false;
        }
        return true;
      },
      {
        error: "channelPublicId must not be provided when scopeType is SERVER",
        path: ["channelPublicId"],
      }
    )
    .refine(
      (data) => {
        if (data.notificationType === "ROLE_ASSIGNED" && data.scopeType === "CHANNEL") {
          return false;
        }
        return true;
      },
      {
        error: "Role assignment notifications only support SERVER scope",
        path: ["scopeType"],
      }
    ),
};
