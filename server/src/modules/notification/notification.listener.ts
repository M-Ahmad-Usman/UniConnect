import { appEvents, APP_EVENTS } from "../../shared/events.js";
import { getModuleLogger } from "../../config/logger.js";
import { createPostNotifications } from "./notification.service.js";

let listenersRegistered = false;
const notificationLogger = getModuleLogger("notification");

/**
 * Register event listeners for the notification module.
 * Must be called once during app startup.
 */
export function registerNotificationListeners(): void {
  if (listenersRegistered) {
    return;
  }

  appEvents.on(APP_EVENTS.POST_CREATED, async (payload) => {
    try {
      await createPostNotifications(payload);
    } catch (error) {
      notificationLogger.error({ err: error }, "Failed to create post notifications");
    }
  });

  listenersRegistered = true;
}
