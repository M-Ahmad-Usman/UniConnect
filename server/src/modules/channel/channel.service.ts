import { prisma } from "../../config/prisma.js";
import { NotFoundError, ValidationError } from "../../shared/errors/index.js";
import { getUserRoles } from "../../middleware/authorize.js";
import type { UserRole } from "../../shared/types/index.js";

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
  serverId: true,
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

async function findActiveChannelOrThrow(channelId: number) {
  const channel = await prisma.channel.findUnique({
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

  return channel;
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
  await findActiveChannelOrThrow(channelId);

  const channel = await prisma.channel.update({
    where: { id: channelId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
    },
    select: channelDetailSelect,
  });

  return channel;
}

export async function lockChannel(channelId: number, caller: CallerInfo) {
  const channel = await findActiveChannelOrThrow(channelId);

  if (channel.isLocked) {
    throw new ValidationError("Channel is already locked");
  }

  const updated = await prisma.channel.update({
    where: { id: channelId },
    data: {
      isLocked: true,
      lockedBy: caller.id,
      lockedAt: new Date(),
    },
    select: channelDetailSelect,
  });

  return updated;
}

export async function unlockChannel(channelId: number, _caller: CallerInfo) {
  const channel = await findActiveChannelOrThrow(channelId);

  if (!channel.isLocked) {
    throw new ValidationError("Channel is not locked");
  }

  const updated = await prisma.channel.update({
    where: { id: channelId },
    data: {
      isLocked: false,
      lockedBy: null,
      lockedAt: null,
    },
    select: channelDetailSelect,
  });

  return updated;
}

export async function deleteChannel(channelId: number, caller: CallerInfo) {
  const channel = await findActiveChannelOrThrow(channelId);

  if (channel.isAutoCreated) {
    throw new ValidationError("Auto-created channels cannot be deleted");
  }

  const updated = await prisma.channel.update({
    where: { id: channelId },
    data: {
      isDeleted: true,
      deletedBy: caller.id,
      deletedAt: new Date(),
    },
    select: channelDetailSelect,
  });

  return updated;
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
  preloadedRoles?: UserRole[]
): Promise<boolean> {
  // 1. Admin can post anywhere
  if (userType === "ADMIN") return true;

  // 2. Fetch channel + server + membership in one round-trip
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      serverId: true,
      type: true,
      isLocked: true,
      isDeleted: true,
      isArchived: true,
      courseId: true,
      programId: true,
      server: {
        select: {
          type: true,
          memberships: {
            where: { userId },
            select: { userId: true },
            take: 1,
          },
          class: { select: { id: true } },
        },
      },
    },
  });

  if (!channel || channel.isDeleted || channel.isArchived) return false;

  // 3. Must be a server member (derived from the single query above)
  if (channel.server.memberships.length === 0) return false;

  // 4. Locked channels: no one posts
  if (channel.isLocked) return false;

  // 5. Resolve user roles
  const roles = preloadedRoles ?? await getUserRoles(userId);

  for (const role of roles) {
    if (role.serverId !== channel.serverId) continue;

    switch (role.role) {
      case "hod":
        // HOD can post in all department server channels (FR-22)
        return true;

      case "program_director": {
        // PD can post in their program channel (FR-23)
        if (channel.type === "PROGRAM" && channel.programId) {
          const program = await prisma.program.findFirst({
            where: { id: channel.programId, programDirectorId: userId },
            select: { id: true },
          });
          if (program) return true;
        }
        // PD can also post in general channels as a member
        break;
      }

      case "cr":
        // CR can post in all class server channels
        return true;

      case "society_president":
      case "society_convenor":
        // President/Convenor can post in all society server channels
        return true;

      case "moderator":
        // Server moderator can post in all channels (FR-29)
        if (role.scopeType === "server") return true;
        // Channel moderator can post in assigned channel (FR-30)
        if (role.scopeType === "channel" && role.channelId === channelId) return true;
        break;
    }
  }

  // 6. Teacher assigned to a course channel (FR-34)
  if (channel.type === "COURSE" && channel.courseId && userType === "TEACHER") {
    // Class info already fetched from the combined query above
    const classRecord = channel.server.class;

    if (classRecord) {
      const teaches = await prisma.teaches.findUnique({
        where: {
          teacherId_courseId_classId: {
            teacherId: userId,
            courseId: channel.courseId,
            classId: classRecord.id,
          },
        },
      });
      if (teaches) return true;
    }
  }

  // 7. GENERAL channels: any member can post
  if (channel.type === "GENERAL") return true;

  // 8. ANNOUNCEMENT channels: only roles above can post (already checked)
  return false;
}
