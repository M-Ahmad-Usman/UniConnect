import { prisma } from "../../config/prisma.js";
import {
  ApiErrorCode,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors/index.js";
import { getChannelAccess } from "../../shared/access/channel-access.js";
import type { UserRole } from "../../shared/types/index.js";
import {
  assertServerAcceptsWrites,
  type PrismaTransaction,
} from "../../shared/lifecycle/society.js";

// ─── Types ─────────────────────────────────────────────────────────────────

type UpdateChannelInput = {
  name?: string;
  description?: string;
};

type CallerInfo = {
  id: number;
  userType: string;
};

// ─── Select Constants ──────────────────────────────────────────────────────

const channelDetailSelect = {
  id: true,
  publicId: true,
  serverId: true,
  server: { select: { publicId: true } },
  name: true,
  description: true,
  type: true,
  isLocked: true,
  isAutoCreated: true,
  isDeleted: true,
  isArchived: true,
  createdAt: true,
} as const;

// ─── Internal Helpers ──────────────────────────────────────────────────────

async function findActiveChannelOrThrow(
  channelId: number,
  client: PrismaTransaction = prisma,
) {
  const channel = await client.channel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      serverId: true,
      name: true,
      type: true,
      isLocked: true,
      isAutoCreated: true,
      isDeleted: true,
      isArchived: true,
      courseId: true,
      programId: true,
    },
  });

  if (!channel || channel.isDeleted) {
    throw new NotFoundError("Channel not found");
  }

  if (channel.isArchived) {
    throw new ConflictError(
      "Archived channels are read-only",
      ApiErrorCode.CHANNEL_ARCHIVED,
    );
  }

  return channel;
}

async function lockActiveChannelOrThrow(
  channelId: number,
  client: PrismaTransaction,
) {
  const rows = await client.$queryRaw<Array<{ id: number }>>`
    SELECT "id"
    FROM "channels"
    WHERE "id" = ${channelId}
      AND "is_deleted" = FALSE
    FOR UPDATE
  `;

  if (rows.length === 0) {
    throw new NotFoundError("Channel not found");
  }

  return findActiveChannelOrThrow(channelId, client);
}

function toPublicChannel<T extends {
  id: number;
  serverId: number;
  server: { publicId: string };
}>(channel: T): Omit<T, "id" | "serverId" | "server"> & { serverPublicId: string } {
  const { id: _id, serverId: _serverId, server, ...publicChannel } = channel;
  return {
    ...publicChannel,
    serverPublicId: server.publicId,
  };
}

/**
 * Resolve serverId from a channel ID. Used by the authorize middleware
 * as an async IdResolver for channel-level endpoints.
 */
export async function resolveServerIdFromChannel(channelId: number): Promise<number> {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { serverId: true, isDeleted: true },
  });

  if (!channel || channel.isDeleted) {
    throw new NotFoundError("Channel not found");
  }

  return channel.serverId;
}

// ─── Service Functions ─────────────────────────────────────────────────────

export async function updateChannel(
  channelId: number,
  data: UpdateChannelInput,
  _caller: CallerInfo
) {
  return prisma.$transaction(async (tx) => {
    const channel = await lockActiveChannelOrThrow(channelId, tx);
    await assertServerAcceptsWrites(channel.serverId, tx);
    const updated = await tx.channel.update({
      where: { id: channelId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
      },
      select: channelDetailSelect,
    });
    return toPublicChannel(updated);
  });
}

export async function lockChannel(channelId: number, caller: CallerInfo) {
  return prisma.$transaction(async (tx) => {
    const channel = await lockActiveChannelOrThrow(channelId, tx);
    await assertServerAcceptsWrites(channel.serverId, tx);
    if (channel.isLocked) {
      throw new ValidationError("Channel is already locked", undefined, ApiErrorCode.CHANNEL_LOCKED);
    }
    const updated = await tx.channel.update({
      where: { id: channelId },
      data: { isLocked: true, lockedBy: caller.id, lockedAt: new Date() },
      select: channelDetailSelect,
    });
    return toPublicChannel(updated);
  });
}

export async function unlockChannel(channelId: number, _caller: CallerInfo) {
  return prisma.$transaction(async (tx) => {
    const channel = await lockActiveChannelOrThrow(channelId, tx);
    await assertServerAcceptsWrites(channel.serverId, tx);
    if (!channel.isLocked) {
      throw new ValidationError("Channel is not locked");
    }
    const updated = await tx.channel.update({
      where: { id: channelId },
      data: { isLocked: false, lockedBy: null, lockedAt: null },
      select: channelDetailSelect,
    });
    return toPublicChannel(updated);
  });
}

export async function deleteChannel(channelId: number, caller: CallerInfo) {
  return prisma.$transaction(async (tx) => {
    const channel = await lockActiveChannelOrThrow(channelId, tx);
    await assertServerAcceptsWrites(channel.serverId, tx);
    if (channel.isAutoCreated) {
      throw new ValidationError("Auto-created channels cannot be deleted");
    }
    const updated = await tx.channel.update({
      where: { id: channelId },
      data: { isDeleted: true, deletedBy: caller.id, deletedAt: new Date() },
      select: channelDetailSelect,
    });
    return toPublicChannel(updated);
  });
}

// ─── Posting Rights ────────────────────────────────────────────────────────

/**
 * Determine whether a user can post in a given channel.
 * Used by Module 9 (posts). Returns true/false.
 */
export async function canPostInChannel(
  userId: number,
  userType: string,
  channelId: number,
  preloadedRoles?: UserRole[],
  client: PrismaTransaction = prisma,
): Promise<boolean> {
  const access = await getChannelAccess(
    { id: userId, userType },
    channelId,
    { userRoles: preloadedRoles },
    client,
  );
  return access.canPost;
}
