import type {
  NotificationType,
  NotificationScopeType,
  PostPriority,
  ServerType,
} from "../../generated/prisma/enums.js";
import { prisma } from "../../config/prisma.js";
import {
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors/index.js";
import {
  parsePagination,
  buildPaginationResponse,
} from "../../shared/utils/pagination.js";
import { getIO } from "../../socket/index.js";

// ─── Types ─────────────────────────────────────────────────────────────────

type CreatePostNotificationsInput = {
  postId: number;
  channelId: number;
  serverId: number;
  authorId: number;
  title: string;
  priority: PostPriority;
  serverType: ServerType;
};

type ListNotificationsQuery = {
  page?: number;
  limit?: number;
  type?: NotificationType;
  unreadOnly?: boolean;
};

type UpdatePreferenceInput = {
  scopeType: NotificationScopeType;
  serverId: number;
  channelId?: number;
  isSubscribed: boolean;
};

// ─── Select Constants ──────────────────────────────────────────────────────

const notificationListSelect = {
  id: true,
  type: true,
  title: true,
  message: true,
  readAt: true,
  createdAt: true,
  postId: true,
  post: {
    select: {
      channelId: true,
      channel: {
        select: {
          name: true,
          serverId: true,
        },
      },
    },
  },
} as const;

const preferenceListSelect = {
  id: true,
  scopeType: true,
  serverId: true,
  channelId: true,
  isSubscribed: true,
  updatedAt: true,
  server: {
    select: {
      name: true,
      type: true,
    },
  },
  channel: {
    select: {
      name: true,
    },
  },
} as const;

// ─── Internal Helpers ──────────────────────────────────────────────────────

/**
 * Get the list of user IDs who are subscribed to receive notifications
 * for a given channel in a server. Uses implicit subscription model:
 * - No preference record = subscribed (default)
 * - Only users with explicit isSubscribed=false are excluded
 * - Server-level unsubscribe suppresses all channel notifications
 */
async function getSubscribedMemberIds(
  serverId: number,
  channelId: number,
  excludeUserId: number
): Promise<number[]> {
  // Get all server members except the excluded user (post author)
  const members = await prisma.serverMembership.findMany({
    where: {
      serverId,
      userId: { not: excludeUserId },
      user: {
        isActive: true,
      },
    },
    select: { userId: true },
  });

  if (members.length === 0) return [];

  const memberIds = members.map((m) => m.userId);

  // Find users who have explicitly unsubscribed (server-level or channel-level)
  const unsubscribed = await prisma.notificationPreference.findMany({
    where: {
      userId: { in: memberIds },
      isSubscribed: false,
      OR: [
        // Server-level unsubscribe
        { scopeType: "SERVER", serverId },
        // Channel-level unsubscribe
        { scopeType: "CHANNEL", serverId, channelId },
      ],
    },
    select: { userId: true },
  });

  const unsubscribedIds = new Set(unsubscribed.map((u) => u.userId));

  return memberIds.filter((id) => !unsubscribedIds.has(id));
}

/**
 * Emit real-time notification event to a user via Socket.IO.
 */
function emitToUser(userId: number, event: string, data: unknown): void {
  const io = getIO();
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

/**
 * Get unread count for a user and emit it via Socket.IO.
 */
async function emitUnreadCount(userId: number): Promise<void> {
  const count = await prisma.notification.count({
    where: { userId, readAt: null },
  });
  emitToUser(userId, "notification:unread-count", { count });
}

// ─── Service Functions ─────────────────────────────────────────────────────

/**
 * Create notifications for all subscribed members when a post is created.
 * Called asynchronously via EventEmitter — errors are logged, not thrown.
 */
export async function createPostNotifications(
  input: CreatePostNotificationsInput
): Promise<void> {
  const { postId, channelId, serverId, authorId, title, priority, serverType } = input;

  if (serverType !== "DEPARTMENT" && serverType !== "CLASS" && serverType !== "SOCIETY") {
    return;
  }

  // Get channel name for notification message
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { name: true },
  });

  if (!channel) return;

  const subscribedIds = await getSubscribedMemberIds(serverId, channelId, authorId);

  if (subscribedIds.length === 0) return;

  // Build notification data
  const isUrgent = priority === "URGENT";
  const notificationTitle = isUrgent ? `🚨 [URGENT] ${title}` : title;
  const message = isUrgent
    ? `Urgent post in #${channel.name} requires your attention`
    : `New post in #${channel.name}`;

  // Bulk create notifications
  await prisma.notification.createMany({
    data: subscribedIds.map((userId) => ({
      userId,
      postId,
      type: "NEW_POST" as const,
      title: notificationTitle,
      message,
    })),
  });

  // Fetch created notifications with userId for real-time delivery routing
  const notifications = await prisma.notification.findMany({
    where: { postId, userId: { in: subscribedIds } },
    select: { ...notificationListSelect, userId: true },
  });

  // Emit real-time events to each recipient
  await Promise.all(
    notifications.map(async (notification) => {
      emitToUser(notification.userId, "notification:new", {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
        postId: notification.postId,
        post: notification.post,
      });
      await emitUnreadCount(notification.userId);
    })
  );
}

export async function listNotifications(
  userId: number,
  query: ListNotificationsQuery
) {
  const { page, limit, skip, take } = parsePagination(query);

  const where: {
    userId: number;
    type?: NotificationType;
    readAt?: null;
  } = { userId };

  if (query.type) {
    where.type = query.type;
  }

  if (query.unreadOnly) {
    where.readAt = null;
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      select: notificationListSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    data: notifications,
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function getUnreadCount(userId: number) {
  const count = await prisma.notification.count({
    where: { userId, readAt: null },
  });

  return { count };
}

export async function markAsRead(notificationId: number, userId: number) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, userId: true, readAt: true },
  });

  if (!notification || notification.userId !== userId) {
    throw new NotFoundError("Notification not found");
  }

  if (notification.readAt) {
    return { id: notification.id, readAt: notification.readAt };
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
    select: { id: true, readAt: true },
  });

  void emitUnreadCount(userId).catch((error) => {
    console.error("[NotificationService] Failed to emit unread count:", error);
  });

  return updated;
}

export async function markAllAsRead(userId: number) {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });

  void emitUnreadCount(userId).catch((error) => {
    console.error("[NotificationService] Failed to emit unread count:", error);
  });

  return { count: result.count };
}

export async function getPreferences(userId: number) {
  const preferences = await prisma.notificationPreference.findMany({
    where: { userId },
    select: preferenceListSelect,
    orderBy: [{ serverId: "asc" }, { channelId: "asc" }],
  });

  return preferences;
}

export async function updatePreference(userId: number, input: UpdatePreferenceInput) {
  const { scopeType, serverId, channelId, isSubscribed } = input;

  // Validate user is a member of the server
  const membership = await prisma.serverMembership.findUnique({
    where: { userId_serverId: { userId, serverId } },
  });

  if (!membership) {
    throw new ForbiddenError("You are not a member of this server");
  }

  // If channel-level, validate channel belongs to server
  if (scopeType === "CHANNEL" && channelId) {
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { serverId: true, isDeleted: true },
    });

    if (!channel || channel.isDeleted || channel.serverId !== serverId) {
      throw new NotFoundError("Channel not found in this server");
    }
  }

  // Upsert the preference record
  // For CHANNEL scope, use the compound unique key
  // For SERVER scope (channelId is null), use findFirst + create/update
  if (scopeType === "CHANNEL" && channelId) {
    const preference = await prisma.notificationPreference.upsert({
      where: {
        userId_scopeType_serverId_channelId: {
          userId,
          scopeType,
          serverId,
          channelId,
        },
      },
      update: { isSubscribed },
      create: {
        userId,
        scopeType,
        serverId,
        channelId,
        isSubscribed,
      },
      select: preferenceListSelect,
    });

    return preference;
  }

  // SERVER scope — channelId is null, can't use compound unique directly
  const existing = await prisma.notificationPreference.findFirst({
    where: { userId, scopeType, serverId, channelId: null },
  });

  if (existing) {
    const preference = await prisma.notificationPreference.update({
      where: { id: existing.id },
      data: { isSubscribed },
      select: preferenceListSelect,
    });
    return preference;
  }

  const preference = await prisma.notificationPreference.create({
    data: {
      userId,
      scopeType,
      serverId,
      isSubscribed,
    },
    select: preferenceListSelect,
  });

  return preference;
}
