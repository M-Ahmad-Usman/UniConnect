import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import {
  listNotificationsSchema,
  listPreferencesSchema,
  notificationIdParamSchema,
  updatePreferenceSchema,
} from "./notification.schema.js";
import {
  handleListNotifications,
  handleGetUnreadCount,
  handleMarkAsRead,
  handleMarkAllAsRead,
  handleGetPreferences,
  handleUpdatePreference,
} from "./notification.controller.js";

// ─── Notification Routes ───────────────────────────────────────────────────

const notificationRoutes = Router();

notificationRoutes.get(
  "/",
  authenticate,
  validate(listNotificationsSchema),
  handleListNotifications
);

notificationRoutes.get(
  "/unread-count",
  authenticate,
  handleGetUnreadCount
);

notificationRoutes.patch(
  "/read-all",
  authenticate,
  handleMarkAllAsRead
);

notificationRoutes.patch(
  "/:id/read",
  authenticate,
  validate(notificationIdParamSchema),
  handleMarkAsRead
);

// ─── Notification Preference Routes ────────────────────────────────────────

const notificationPreferenceRoutes = Router();

notificationPreferenceRoutes.get(
  "/",
  authenticate,
  validate(listPreferencesSchema),
  handleGetPreferences
);

notificationPreferenceRoutes.patch(
  "/",
  authenticate,
  validate(updatePreferenceSchema),
  handleUpdatePreference
);

export { notificationRoutes, notificationPreferenceRoutes };
