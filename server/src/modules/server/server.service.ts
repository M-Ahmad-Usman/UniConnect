import type { ServerType } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import {
  cleanupCloudinaryUploads,
  cloudinaryService,
} from "../../config/cloudinary.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../../shared/errors/index.js";
import {
  parsePagination,
  buildPaginationResponse,
} from "../../shared/utils/pagination.js";
import { activePlatformRoleAssignmentWhere } from "../../shared/roles/index.js";
import { assertServerAcceptsWrites } from "../../shared/lifecycle/society.js";

// ─── Types ─────────────────────────────────────────────────────────────────

type ListServersQuery = {
  type?: ServerType;
  page?: number;
  limit?: number;
};

type ListMembersQuery = {
  page?: number;
  limit?: number;
};

type CreateChannelInput = {
  name: string;
  description?: string;
};

type CallerInfo = {
  id: number;
  userType: string;
};

// ─── Select Constants ──────────────────────────────────────────────────────

const serverListSelect = {
  id: true,
  publicId: true,
  name: true,
  description: true,
  type: true,
  iconUrl: true,
  createdAt: true,
} as const;

const serverDetailSelect = {
  id: true,
  publicId: true,
  name: true,
  description: true,
  type: true,
  iconUrl: true,
  createdAt: true,
  department: {
    select: { id: true, name: true, code: true },
  },
  class: {
    select: {
      id: true,
      publicId: true,
      currentSemester: true,
      section: true,
      program: {
        select: {
          id: true,
          code: true,
          discipline: { select: { name: true } },
          degreeLevel: { select: { level: true } },
        },
      },
    },
  },
  society: {
    select: { id: true, publicId: true, name: true },
  },
  _count: {
    select: { memberships: true, channels: true },
  },
} as const;

const channelListSelect = {
  id: true,
  publicId: true,
  name: true,
  description: true,
  type: true,
  isLocked: true,
  isArchived: true,
  isAutoCreated: true,
  courseId: true,
  programId: true,
  createdAt: true,
} as const;

const memberSelect = {
  userId: true,
  joinedAt: true,
  isAutoJoined: true,
  user: {
    select: {
      id: true,
      publicId: true,
      fullName: true,
      email: true,
      userType: true,
      profilePictureUrl: true,
    },
  },
} as const;

const channelCreatedSelect = {
  id: true,
  publicId: true,
  serverId: true,
  server: { select: { publicId: true } },
  name: true,
  description: true,
  type: true,
  isLocked: true,
  isAutoCreated: true,
  createdAt: true,
} as const;

// ─── Internal Helpers ──────────────────────────────────────────────────────

function toPublicServerListItem<T extends { id: number }>(
  server: T,
): Omit<T, "id"> {
  const { id: _id, ...publicServer } = server;
  return publicServer;
}

function toPublicChannel<T extends { id: number }>(
  channel: T,
): Omit<T, "id"> {
  const { id: _id, ...publicChannel } = channel;
  return publicChannel;
}

async function assertMembershipOrAdmin(serverId: number, caller: CallerInfo) {
  if (caller.userType === "ADMIN") return;

  const membership = await prisma.serverMembership.findUnique({
    where: { userId_serverId: { userId: caller.id, serverId } },
  });

  if (!membership) {
    const canManage = await canManageServer(caller.id, serverId);
    if (!canManage) {
      throw new ForbiddenError("You are not a member of this server");
    }
  }
}

async function canManageServer(
  userId: number,
  serverId: number,
): Promise<boolean> {
  const [department, classRecord, society] = await Promise.all([
    prisma.department.findFirst({
      where: { hodId: userId },
      select: { id: true, serverId: true },
    }),
    prisma.class.findFirst({
      where: { crId: userId },
      select: { serverId: true },
    }),
    prisma.society.findFirst({
      where: { isDeleted: false, OR: [{ presidentId: userId }, { convenorId: userId }] },
      select: { serverId: true },
    }),
  ]);

  if (department) {
    if (department.serverId === serverId) return true;

    const scopedServer = await prisma.server.findFirst({
      where: {
        id: serverId,
        isDeleted: false,
        OR: [
          { class: { program: { departmentId: department.id } } },
          { society: { departmentId: department.id, isDeleted: false } },
        ],
      },
      select: { id: true },
    });
    if (scopedServer) return true;
  }

  if (classRecord?.serverId === serverId) return true;
  if (society?.serverId === serverId) return true;

  return false;
}

async function findServerOrThrow(serverId: number) {
  const server = await prisma.server.findFirst({
    where: { id: serverId, isDeleted: false },
    select: { id: true },
  });

  if (!server) {
    throw new NotFoundError("Server not found");
  }

  return server;
}

type MemberBadge = string;

async function resolveMemberBadges(
  serverId: number,
  serverType: ServerType,
  memberUserIds: number[],
): Promise<Map<number, MemberBadge[]>> {
  const badgeMap = new Map<number, MemberBadge[]>();

  if (memberUserIds.length === 0) {
    return badgeMap;
  }

  const addBadge = (userId: number, badge: MemberBadge) => {
    const current = badgeMap.get(userId) ?? [];
    current.push(badge);
    badgeMap.set(userId, current);
  };

  if (serverType === "DEPARTMENT") {
    const [department, programs, moderators] = await Promise.all([
      prisma.department.findUnique({
        where: { serverId },
        select: { hodId: true },
      }),
      prisma.program.findMany({
        where: { department: { serverId } },
        select: { programDirectorId: true },
      }),
      prisma.userRoleAssignment.findMany({
        where: { AND: [activePlatformRoleAssignmentWhere(), { serverId }] },
        select: { userId: true, role: { select: { name: true } } },
      }),
    ]);

    if (department?.hodId && memberUserIds.includes(department.hodId)) {
      addBadge(department.hodId, "hod");
    }
    for (const program of programs) {
      if (
        program.programDirectorId &&
        memberUserIds.includes(program.programDirectorId)
      ) {
        addBadge(program.programDirectorId, "program_director");
      }
    }
    for (const mod of moderators) {
      if (memberUserIds.includes(mod.userId)) {
        addBadge(
          mod.userId,
          mod.role.name,
        );
      }
    }
  } else if (serverType === "CLASS") {
    const [classRecord, moderators] = await Promise.all([
      prisma.class.findUnique({
        where: { serverId },
        select: { crId: true },
      }),
      prisma.userRoleAssignment.findMany({
        where: { AND: [activePlatformRoleAssignmentWhere(), { serverId }] },
        select: { userId: true, role: { select: { name: true } } },
      }),
    ]);

    if (classRecord?.crId && memberUserIds.includes(classRecord.crId)) {
      addBadge(classRecord.crId, "cr");
    }
    for (const mod of moderators) {
      if (memberUserIds.includes(mod.userId)) {
        addBadge(
          mod.userId,
          mod.role.name,
        );
      }
    }
  } else if (serverType === "SOCIETY") {
    const [society, moderators] = await Promise.all([
      prisma.society.findUnique({
        where: { serverId },
        select: {
          presidentId: true,
          convenorId: true,
          president: { select: { user: { select: { id: true } } } },
          convenor: { select: { user: { select: { id: true } } } },
        },
      }),
      prisma.userRoleAssignment.findMany({
        where: { AND: [activePlatformRoleAssignmentWhere(), { serverId }] },
        select: { userId: true, role: { select: { name: true } } },
      }),
    ]);

    if (society) {
      const presidentUserId = society.president.user.id;
      const convenorUserId = society.convenor.user.id;

      if (memberUserIds.includes(presidentUserId)) {
        addBadge(presidentUserId, "president");
      }
      if (memberUserIds.includes(convenorUserId)) {
        addBadge(convenorUserId, "convenor");
      }
    }
    for (const mod of moderators) {
      if (memberUserIds.includes(mod.userId)) {
        addBadge(
          mod.userId,
          mod.role.name,
        );
      }
    }
  }

  return badgeMap;
}

// ─── Service Functions ─────────────────────────────────────────────────────

export async function listServers(query: ListServersQuery, caller: CallerInfo) {
  const { page, limit, skip, take } = parsePagination(query);

  const where = {
    isDeleted: false,
    ...(caller.userType !== "ADMIN"
      ? { memberships: { some: { userId: caller.id } } }
      : {}),
    ...(query.type ? { type: query.type } : {}),
  };

  const [servers, total] = await Promise.all([
    prisma.server.findMany({
      where,
      select: serverListSelect,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.server.count({ where }),
  ]);

  return {
    data: servers.map(toPublicServerListItem),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function getServer(serverId: number, caller: CallerInfo) {
  const server = await prisma.server.findFirst({
    where: { id: serverId, isDeleted: false },
    select: serverDetailSelect,
  });

  if (!server) {
    throw new NotFoundError("Server not found");
  }

  await assertMembershipOrAdmin(serverId, caller);

  const { id: _id, class: classRecord, society, ...publicServer } = server;
  return {
    ...publicServer,
    class: classRecord
      ? (({ id: _classId, ...publicClass }) => publicClass)(classRecord)
      : null,
    society: society
      ? (({ id: _societyId, ...publicSociety }) => publicSociety)(society)
      : null,
  };
}

export async function listServerChannels(
  serverId: number,
  caller: CallerInfo,
  options: { includeArchived?: boolean } = {},
) {
  await findServerOrThrow(serverId);
  await assertMembershipOrAdmin(serverId, caller);

  const where: Record<string, unknown> = {
    serverId,
    isDeleted: false,
  };

  if (!options.includeArchived) {
    where.isArchived = false;
  }

  const channels = await prisma.channel.findMany({
    where,
    select: channelListSelect,
    orderBy: { createdAt: "asc" },
  });

  return channels.map(toPublicChannel);
}

export async function listServerMembers(
  serverId: number,
  query: ListMembersQuery,
  caller: CallerInfo,
) {
  const server = await prisma.server.findFirst({
    where: { id: serverId, isDeleted: false },
    select: { id: true, type: true },
  });

  if (!server) {
    throw new NotFoundError("Server not found");
  }

  await assertMembershipOrAdmin(serverId, caller);

  const { page, limit, skip, take } = parsePagination(query);

  const where = { serverId };

  const [memberships, total] = await Promise.all([
    prisma.serverMembership.findMany({
      where,
      select: memberSelect,
      skip,
      take,
      orderBy: { joinedAt: "asc" },
    }),
    prisma.serverMembership.count({ where }),
  ]);

  // Resolve role badges for current page members
  const memberUserIds = memberships.map((m) => m.userId);
  const badgeMap = await resolveMemberBadges(
    serverId,
    server.type,
    memberUserIds,
  );

  const data = memberships.map((m) => ({
    joinedAt: m.joinedAt,
    isAutoJoined: m.isAutoJoined,
    user: (({ id: _userId, ...publicUser }) => publicUser)(m.user),
    badges: badgeMap.get(m.userId) ?? [],
  }));

  return {
    data,
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function createChannel(
  serverId: number,
  data: CreateChannelInput,
  caller: CallerInfo,
) {
  return prisma.$transaction(async (tx) => {
    await assertServerAcceptsWrites(serverId, tx);
    const existing = await tx.channel.findFirst({
      where: { serverId, name: data.name, isDeleted: false },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictError("A channel with this name already exists in this server");
    }
    const channel = await tx.channel.create({
      data: {
        serverId,
        name: data.name,
        description: data.description ?? null,
        type: "GENERAL",
        isAutoCreated: false,
        createdBy: caller.id,
      },
      select: channelCreatedSelect,
    });
    const {
      id: _channelId,
      serverId: _serverId,
      server,
      ...publicChannel
    } = channel;
    return {
      ...publicChannel,
      serverPublicId: server.publicId,
    };
  });
}

export async function updateServerIcon(serverId: number, fileBuffer: Buffer) {
  await prisma.$transaction((tx) => assertServerAcceptsWrites(serverId, tx));

  const uploaded = await cloudinaryService.uploadImage(
    fileBuffer,
    "server-icons",
  );

  try {
    return await prisma.$transaction(async (tx) => {
      await assertServerAcceptsWrites(serverId, tx);
      const updated = await tx.server.update({
        where: { id: serverId },
        data: { iconUrl: uploaded.url },
        select: {
          id: true,
          publicId: true,
          iconUrl: true,
        },
      });
      const { id: _serverId, ...publicServer } = updated;
      return publicServer;
    });
  } catch (error) {
    await cleanupCloudinaryUploads([uploaded]);
    throw error;
  }
}
