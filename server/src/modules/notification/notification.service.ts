import type {
  NotificationType,
  NotificationScopeType,
  PostPriority,
  ServerType,
} from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import {
  ApiErrorCode,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors/index.js";
import {
  parsePagination,
  buildPaginationResponse,
} from "../../shared/utils/pagination.js";
import { getIO } from "../../socket/index.js";
import type { PrismaTransaction } from "../../shared/lifecycle/society.js";
import { resolveServerPublicId } from "../../shared/ids/index.js";

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

type ListPreferencesQuery = {
  serverPublicId?: string;
  notificationType?: NotificationType;
};

type UpdatePreferenceInput = {
  notificationType?: NotificationType;
  scopeType: NotificationScopeType;
  serverPublicId: string;
  channelPublicId?: string;
  isSubscribed: boolean;
};

type CreateRoleAssignedNotificationInput = {
  userId: number;
  serverId: number;
  channelId?: number | null;
  role: string;
};

type CreateSocietyRequestReviewedNotificationInput = {
  userId: number;
  societyId: number;
  societyName: string;
  status: "APPROVED" | "REJECTED";
};

type SocietyLifecycleNotificationType =
  | "SOCIETY_SUSPENDED"
  | "SOCIETY_ACTIVATED"
  | "SOCIETY_DELETED"
  | "SOCIETY_RESTORED";

type CreateSocietyLifecycleNotificationsInput = {
  societyId: number;
  serverId: number;
  actorUserId: number;
  societyName: string;
  type: SocietyLifecycleNotificationType;
};

// ─── Select Constants ──────────────────────────────────────────────────────

const notificationListSelect = {
  id: true,
  type: true,
  title: true,
  message: true,
  readAt: true,
  createdAt: true,
  post: {
    select: {
      publicId: true,
      priority: true,
      channel: {
        select: {
          publicId: true,
          name: true,
          server: {
            select: {
              publicId: true,
              name: true,
            },
          },
        },
      },
    },
  },
  society: {
    select: {
      publicId: true,
      name: true,
      isDeleted: true,
    },
  },
} as const;

const preferenceListSelect = {
  id: true,
  notificationType: true,
  scopeType: true,
  isSubscribed: true,
  updatedAt: true,
  server: {
    select: {
      publicId: true,
      name: true,
      type: true,
    },
  },
  channel: {
    select: {
      publicId: true,
      name: true,
    },
  },
} as const;

// ─── Internal Helpers ──────────────────────────────────────────────────────

function toPublicNotification<T extends {
  post: null | {
    publicId: string;
    priority: PostPriority;
    channel: {
      publicId: string;
      name: string;
      server: { publicId: string; name: string };
    };
  };
}>(notification: T) {
  const { post, ...notificationData } = notification;
  return {
    ...notificationData,
    postPublicId: post?.publicId ?? null,
    post: post
      ? {
          channelPublicId: post.channel.publicId,
          priority: post.priority,
          channel: {
            name: post.channel.name,
            serverPublicId: post.channel.server.publicId,
            server: { name: post.channel.server.name },
          },
        }
      : null,
  };
}

function toPublicPreference<T extends {
  server: { publicId: string };
  channel: { publicId: string } | null;
}>(preference: T) {
  const { server, channel, ...preferenceData } = preference;
  return {
    ...preferenceData,
    serverPublicId: server.publicId,
    channelPublicId: channel?.publicId ?? null,
    server,
    channel,
  };
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

function formatRoleName(role: string): string {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function isRoleNotificationSubscribed(
  userId: number,
  serverId: number,
): Promise<boolean> {
  const preference = await prisma.notificationPreference.findFirst({
    where: {
      userId,
      notificationType: "ROLE_ASSIGNED",
      scopeType: "SERVER",
      serverId,
      channelId: null,
    },
    select: { isSubscribed: true },
  });

  return preference?.isSubscribed ?? true;
}

// ─── Service Functions ─────────────────────────────────────────────────────

/**
 * Create notifications for all subscribed members when a post is created.
 * Called asynchronously via EventEmitter — errors are logged, not thrown.
 */
export async function createPostNotifications(
  input: CreatePostNotificationsInput,
): Promise<void> {
  const { postId, channelId, serverId, authorId, title, priority, serverType } =
    input;

  if (
    serverType !== "DEPARTMENT" &&
    serverType !== "CLASS" &&
    serverType !== "SOCIETY"
  ) {
    return;
  }

  // Get channel and server names for notification message
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { name: true, server: { select: { name: true } } },
  });

  if (!channel) return;

  const isUrgent = priority === "URGENT";
  const notificationTitle = isUrgent ? `🚨 [URGENT] ${title}` : title;
  const message = isUrgent
    ? `Urgent post in ${channel.server.name} / #${channel.name} requires your attention`
    : `New post in ${channel.server.name} / #${channel.name}`;
  const notifications = await prisma.$queryRaw<Array<{ id: number }>>`
    INSERT INTO "notifications" (
      "user_id",
      "post_id",
      "type",
      "title",
      "message"
    )
    SELECT
      membership."user_id",
      ${postId},
      'new_post'::"notification_type",
      ${notificationTitle},
      ${message}
    FROM "server_memberships" AS membership
    INNER JOIN "users" AS member ON member."id" = membership."user_id"
    WHERE membership."server_id" = ${serverId}
      AND membership."user_id" <> ${authorId}
      AND member."status" = 'active'::"user_status"
      AND member."is_deleted" = FALSE
      AND NOT EXISTS (
        SELECT 1
        FROM "notification_preferences" AS preference
        WHERE preference."user_id" = membership."user_id"
          AND preference."notification_type" = 'new_post'::"notification_type"
          AND preference."is_subscribed" = FALSE
          AND (
            (
              preference."scope_type" = 'server'::"notification_scope_type"
              AND preference."server_id" = ${serverId}
              AND preference."channel_id" IS NULL
            )
            OR (
              preference."scope_type" = 'channel'::"notification_scope_type"
              AND preference."server_id" = ${serverId}
              AND preference."channel_id" = ${channelId}
            )
          )
      )
    RETURNING "id"
  `;

  await emitCreatedNotifications(notifications.map((notification) => notification.id));
}

export async function emitPostNotificationsDeleted(
  postPublicId: string,
  notifications: Array<{ id: number; userId: number }>,
): Promise<void> {
  if (notifications.length === 0) {
    return;
  }

  const userIds = [
    ...new Set(notifications.map((notification) => notification.userId)),
  ];
  const notificationIdsByUserId = new Map<number, number[]>();
  for (const notification of notifications) {
    const current = notificationIdsByUserId.get(notification.userId) ?? [];
    current.push(notification.id);
    notificationIdsByUserId.set(notification.userId, current);
  }

  const unreadCounts = await prisma.notification.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds }, readAt: null },
    _count: { _all: true },
  });
  const unreadCountMap = new Map(
    unreadCounts.map((r) => [r.userId, r._count._all]),
  );

  for (const userId of userIds) {
    emitToUser(userId, "notification:deleted", {
      postPublicId,
      notificationIds: notificationIdsByUserId.get(userId) ?? [],
    });
    emitToUser(userId, "notification:unread-count", {
      count: unreadCountMap.get(userId) ?? 0,
    });
  }
}

export async function createRoleAssignedNotification(
  input: CreateRoleAssignedNotificationInput,
): Promise<void> {
  const isSubscribed = await isRoleNotificationSubscribed(
    input.userId,
    input.serverId,
  );
  if (!isSubscribed) {
    return;
  }

  const server = await prisma.server.findUnique({
    where: { id: input.serverId },
    select: { name: true, isDeleted: true },
  });

  if (!server || server.isDeleted) {
    return;
  }

  const channel =
    input.channelId === null || input.channelId === undefined
      ? null
      : await prisma.channel.findUnique({
          where: { id: input.channelId },
          select: { name: true, serverId: true, isDeleted: true },
        });

  if (channel && (channel.isDeleted || channel.serverId !== input.serverId)) {
    return;
  }

  const roleLabel = formatRoleName(input.role);
  const message = channel
    ? `You were assigned ${roleLabel} in #${channel.name} on ${server.name}`
    : `You were assigned ${roleLabel} on ${server.name}`;

  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: "ROLE_ASSIGNED",
      title: `${roleLabel} assigned`,
      message,
    },
    select: notificationListSelect,
  });

  emitToUser(input.userId, "notification:new", toPublicNotification(notification));
  await emitUnreadCount(input.userId);
}

export async function createSocietyRequestReviewedNotification(
  input: CreateSocietyRequestReviewedNotificationInput,
): Promise<void> {
  const isApproved = input.status === "APPROVED";
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      societyId: input.societyId,
      type: "SOCIETY_REQUEST_REVIEWED",
      title: isApproved
        ? "Society request approved"
        : "Society request rejected",
      message: isApproved
        ? `Your request to join ${input.societyName} was approved`
        : `Your request to join ${input.societyName} was rejected`,
    },
    select: notificationListSelect,
  });

  emitToUser(input.userId, "notification:new", toPublicNotification(notification));
  await emitUnreadCount(input.userId);
}

function societyLifecycleCopy(
  type: SocietyLifecycleNotificationType,
  societyName: string,
): { title: string; message: string } {
  switch (type) {
    case "SOCIETY_SUSPENDED":
      return {
        title: "Society suspended",
        message: `${societyName} is temporarily read-only`,
      };
    case "SOCIETY_ACTIVATED":
      return {
        title: "Society activated",
        message: `${societyName} is active again`,
      };
    case "SOCIETY_DELETED":
      return {
        title: "Society deleted",
        message: `${societyName} has been removed`,
      };
    case "SOCIETY_RESTORED":
      return {
        title: "Society restored",
        message: `${societyName} has been restored`,
      };
  }
}

/**
 * Persist lifecycle notices inside the caller's lifecycle transaction. The
 * set-based insert avoids loading large membership lists into application
 * memory and intentionally bypasses preferences: lifecycle notices are
 * mandatory operational messages.
 */
export async function createSocietyLifecycleNotifications(
  client: PrismaTransaction,
  input: CreateSocietyLifecycleNotificationsInput,
): Promise<number[]> {
  const copy = societyLifecycleCopy(input.type, input.societyName);
  const databaseType = input.type.toLowerCase();
  const notifications = await client.$queryRaw<Array<{ id: number }>>`
    INSERT INTO "notifications" (
      "user_id",
      "society_id",
      "type",
      "title",
      "message"
    )
    SELECT
      membership."user_id",
      ${input.societyId},
      ${databaseType}::"notification_type",
      ${copy.title},
      ${copy.message}
    FROM "server_memberships" AS membership
    INNER JOIN "users" AS member ON member."id" = membership."user_id"
    WHERE membership."server_id" = ${input.serverId}
      AND membership."user_id" <> ${input.actorUserId}
      AND member."status" = 'active'::"user_status"
      AND member."is_deleted" = FALSE
    RETURNING "id"
  `;
  return notifications.map((notification) => notification.id);
}

export async function emitCreatedNotifications(notificationIds: number[]): Promise<void> {
  if (notificationIds.length === 0) {
    return;
  }
  const notifications = await prisma.notification.findMany({
    where: { id: { in: notificationIds } },
    select: { ...notificationListSelect, userId: true },
  });
  if (notifications.length === 0) {
    return;
  }
  const userIds = [...new Set(notifications.map((notification) => notification.userId))];
  const unreadCounts = await prisma.notification.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds }, readAt: null },
    _count: { _all: true },
  });
  const unreadCountMap = new Map(
    unreadCounts.map((row) => [row.userId, row._count._all]),
  );
  for (const { userId, ...notification } of notifications) {
    emitToUser(userId, "notification:new", toPublicNotification(notification));
    emitToUser(userId, "notification:unread-count", {
      count: unreadCountMap.get(userId) ?? 0,
    });
  }
}

export async function listNotifications(
  userId: number,
  query: ListNotificationsQuery,
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
    data: notifications.map(toPublicNotification),
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
    console.error("[NOTIFICATION] Failed to emit unread count", { error });
  });

  return updated;
}

export async function markAllAsRead(userId: number) {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });

  void emitUnreadCount(userId).catch((error) => {
    console.error("[NOTIFICATION] Failed to emit unread count", { error });
  });

  return { count: result.count };
}

export async function getPreferences(
  userId: number,
  query: ListPreferencesQuery = {},
) {
  const server = query.serverPublicId
    ? await resolveServerPublicId(query.serverPublicId)
    : undefined;
  const preferences = await prisma.notificationPreference.findMany({
    where: {
      userId,
      serverId: server?.id,
      notificationType: query.notificationType,
    },
    select: preferenceListSelect,
    orderBy: [
      { serverId: "asc" },
      { notificationType: "asc" },
      { scopeType: "desc" },
      { channelId: "asc" },
    ],
  });

  return preferences.map(toPublicPreference);
}

export async function updatePreference(
  userId: number,
  input: UpdatePreferenceInput,
) {
  const notificationType = input.notificationType ?? "NEW_POST";
  const {
    scopeType,
    serverPublicId,
    channelPublicId,
    isSubscribed,
  } = input;
  const server = await resolveServerPublicId(serverPublicId);
  const serverId = server.id;
  let channelId: number | undefined;

  if (notificationType === "ROLE_ASSIGNED" && scopeType !== "SERVER") {
    throw new ValidationError(
      "Role assignment notifications only support server-level preferences",
    );
  }

  if (notificationType === "ROLE_ASSIGNED" && channelPublicId) {
    throw new ValidationError(
      "channelPublicId is not supported for role assignment notifications",
    );
  }

  // Validate user is a member of the server
  const membership = await prisma.serverMembership.findUnique({
    where: { userId_serverId: { userId, serverId } },
  });

  if (!membership) {
    throw new ForbiddenError("You are not a member of this server");
  }

  // If channel-level, validate channel belongs to server
  if (scopeType === "CHANNEL" && channelPublicId) {
    const channel = await prisma.channel.findUnique({
      where: { publicId: channelPublicId },
      select: { id: true, serverId: true, isDeleted: true, isArchived: true },
    });

    if (!channel || channel.isDeleted || channel.serverId !== serverId) {
      throw new NotFoundError("Channel not found in this server");
    }
    if (channel.isArchived) {
      throw new ConflictError(
        "Archived channels are read-only",
        ApiErrorCode.CHANNEL_ARCHIVED,
      );
    }
    channelId = channel.id;
  }

  // The SQL-only null-safe unique index covers server and channel scopes.
  // Use one atomic statement so concurrent first writes cannot create duplicate
  // server-scope rows or surface a uniqueness race as a 500.
  const databaseType = notificationType.toLowerCase();
  const databaseScope = scopeType.toLowerCase();
  const rows = await prisma.$queryRaw<Array<{ id: number }>>`
    INSERT INTO "notification_preferences" (
      "user_id",
      "notification_type",
      "scope_type",
      "server_id",
      "channel_id",
      "is_subscribed",
      "updated_at"
    )
    VALUES (
      ${userId},
      ${databaseType}::"notification_type",
      ${databaseScope}::"notification_scope_type",
      ${serverId},
      ${channelId ?? null},
      ${isSubscribed},
      NOW()
    )
    ON CONFLICT (
      "user_id",
      "notification_type",
      "scope_type",
      "server_id",
      (COALESCE("channel_id", 0))
    )
    DO UPDATE SET
      "is_subscribed" = EXCLUDED."is_subscribed",
      "updated_at" = NOW()
    RETURNING "id"
  `;
  const preference = rows[0];
  if (!preference) {
    throw new NotFoundError("Notification preference could not be saved");
  }
  const savedPreference = await prisma.notificationPreference.findUniqueOrThrow({
    where: { id: preference.id },
    select: preferenceListSelect,
  });
  return toPublicPreference(savedPreference);
}
