import { appEvents, APP_EVENTS } from "../../shared/events.js";
import { createPostNotifications } from "./notification.service.js";

let listenersRegistered = false;

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
      console.error("[NOTIFICATION] Failed to create post notifications", { error });
    }
  });

  listenersRegistered = true;
}
