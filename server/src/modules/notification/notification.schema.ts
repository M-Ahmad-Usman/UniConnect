import { z } from "zod";
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
    type: z.enum(["NEW_POST", "ROLE_ASSIGNED"]).optional(),
    unreadOnly: z
      .enum(["true", "false"])
      .transform((v) => v === "true")
      .optional(),
  }),
};

// ─── Update Notification Preference ────────────────────────────────────────

export const updatePreferenceSchema = {
  body: z
    .object({
      scopeType: z.enum(["SERVER", "CHANNEL"], {
        error: "Scope type must be SERVER or CHANNEL",
      }),
      serverId: z.coerce
        .number()
        .int()
        .positive({ error: "Server ID must be a positive integer" }),
      channelId: z.coerce
        .number()
        .int()
        .positive({ error: "Channel ID must be a positive integer" })
        .optional(),
      isSubscribed: z.boolean({ error: "isSubscribed must be a boolean" }),
    })
    .refine(
      (data) => {
        if (data.scopeType === "CHANNEL" && !data.channelId) {
          return false;
        }
        return true;
      },
      {
        error: "channelId is required when scopeType is CHANNEL",
        path: ["channelId"],
      }
    )
    .refine(
      (data) => {
        if (data.scopeType === "SERVER" && data.channelId) {
          return false;
        }
        return true;
      },
      {
        error: "channelId must not be provided when scopeType is SERVER",
        path: ["channelId"],
      }
    ),
};
