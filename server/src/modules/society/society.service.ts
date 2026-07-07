import { randomUUID } from "node:crypto";
import type {
  Prisma,
  MembershipRequestStatus,
  SocietyStatus,
} from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { getModuleLogger } from "../../config/logger.js";
import {
  ApiErrorCode,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors/index.js";
import {
  resolveSocietyPublicId,
  resolveUserPublicId,
} from "../../shared/ids/index.js";
import {
  assertSocietyAcceptsWrites,
  lockSocietyLifecycleRow,
  type PrismaTransaction,
} from "../../shared/lifecycle/society.js";
import {
  buildSocietyPermissions,
  getPermissionContext,
} from "../../shared/permissions/index.js";
import {
  activePlatformRoleAssignmentWhere,
  activeStaffRoleAssignmentWhere,
} from "../../shared/roles/index.js";
import {
  buildPaginationResponse,
  parsePagination,
} from "../../shared/utils/pagination.js";
import { disconnectUserSockets, emitToUser } from "../../socket/index.js";
import { invalidateSystemStatsCache } from "../admin/admin.service.js";
import type { AuditContext } from "../audit/audit.service.js";
import { recordAuditLog } from "../audit/audit.service.js";
import * as notificationService from "../notification/notification.service.js";

const societyLogger = getModuleLogger("society");

type CreateSocietyInput = {
  name: string;
  description?: string;
  departmentId: number;
  presidentPublicId: string;
  convenorPublicId: string;
};

type UpdateSocietyInput = {
  name?: string;
  description?: string;
  presidentPublicId?: string;
  convenorPublicId?: string;
};

type ListSocietiesQuery = {
  departmentId?: number;
  status?: SocietyStatus;
  lifecycle?: "live" | "deleted" | "all";
  page?: number;
  limit?: number;
};

type ListJoinRequestsQuery = {
  status?: MembershipRequestStatus;
  page?: number;
  limit?: number;
};

type PaginationQuery = {
  page?: number;
  limit?: number;
};

type MemberCandidatesQuery = PaginationQuery & {
  search?: string;
};

type LeadershipCandidatesQuery = MemberCandidatesQuery & {
  departmentId: number;
  role: "president" | "convenor";
};

type CallerInfo = {
  id: number;
  userType: string;
};

type LifecycleResult<T> = {
  data: T;
  notificationIds: number[];
  refreshUserIds: number[];
};

const societyListSelect = {
  publicId: true,
  name: true,
  description: true,
  departmentId: true,
  status: true,
  isDeleted: true,
  deletedAt: true,
  createdAt: true,
  department: {
    select: { id: true, name: true },
  },
  president: {
    select: {
      user: { select: { publicId: true, fullName: true, email: true } },
    },
  },
  convenor: {
    select: {
      user: { select: { publicId: true, fullName: true, email: true } },
    },
  },
  server: {
    select: {
      publicId: true,
      _count: { select: { memberships: true } },
    },
  },
} as const;

const joinRequestSelect = {
  id: true,
  status: true,
  requestedAt: true,
  reviewedAt: true,
  society: {
    select: { publicId: true },
  },
  user: {
    select: {
      publicId: true,
      fullName: true,
      email: true,
      profilePictureUrl: true,
    },
  },
  reviewer: {
    select: { publicId: true, fullName: true },
  },
} as const;

const memberCandidateSelect = {
  publicId: true,
  fullName: true,
  email: true,
  userType: true,
  profilePictureUrl: true,
} as const;

const memberInternalSelect = {
  userId: true,
  joinedAt: true,
  isAutoJoined: true,
  user: {
    select: {
      publicId: true,
      fullName: true,
      email: true,
      userType: true,
      profilePictureUrl: true,
    },
  },
} as const;

async function findSocietyOrThrow(
  societyId: number,
  client: PrismaTransaction = prisma,
  includeDeleted = false,
) {
  const society = await client.society.findFirst({
    where: { id: societyId, ...(includeDeleted ? {} : { isDeleted: false }) },
    select: {
      id: true,
      publicId: true,
      name: true,
      serverId: true,
      presidentId: true,
      convenorId: true,
      departmentId: true,
      status: true,
      isDeleted: true,
      deletedCascadeId: true,
      president: { select: { user: { select: { id: true } } } },
      convenor: { select: { user: { select: { id: true } } } },
      department: { select: { id: true, hodId: true } },
    },
  });
  if (!society) {
    throw new NotFoundError("Society not found");
  }
  return society;
}

async function assertStudentForSocietyOrThrow(
  userPublicId: string,
  departmentId: number,
  client: PrismaTransaction = prisma,
) {
  const resolved = await resolveUserPublicId(userPublicId, {
    field: "presidentPublicId",
    client,
  });
  const user = await client.user.findFirst({
    where: {
      id: resolved.id,
      userType: "STUDENT",
      status: "ACTIVE",
      isDeleted: false,
    },
    select: {
      id: true,
      publicId: true,
      departmentId: true,
      studentInfo: { select: { studentId: true } },
    },
  });
  if (!user || !user.studentInfo) {
    throw new NotFoundError("Student not found for president role");
  }
  if (user.departmentId !== departmentId) {
    throw new ForbiddenError("President must belong to the same department as the society");
  }
  return user;
}

async function assertTeacherForSocietyOrThrow(
  userPublicId: string,
  departmentId: number,
  client: PrismaTransaction = prisma,
) {
  const resolved = await resolveUserPublicId(userPublicId, {
    field: "convenorPublicId",
    client,
  });
  const user = await client.user.findFirst({
    where: {
      id: resolved.id,
      userType: "TEACHER",
      status: "ACTIVE",
      isDeleted: false,
    },
    select: {
      id: true,
      publicId: true,
      departmentId: true,
      teacherInfo: { select: { teacherId: true } },
    },
  });
  if (!user || !user.teacherInfo) {
    throw new NotFoundError("Teacher not found for convenor role");
  }
  if (user.departmentId !== departmentId) {
    throw new ForbiddenError("Convenor must belong to the same department as the society");
  }
  return user;
}

function isCallerLeader(
  society: Awaited<ReturnType<typeof findSocietyOrThrow>>,
  caller: CallerInfo,
): boolean {
  return (
    society.president.user.id === caller.id ||
    society.convenor.user.id === caller.id
  );
}

function isCallerHodOrAdmin(
  society: Awaited<ReturnType<typeof findSocietyOrThrow>>,
  caller: CallerInfo,
): boolean {
  return caller.userType === "ADMIN" || society.department.hodId === caller.id;
}

function assertLifecycleAuthority(
  society: Awaited<ReturnType<typeof findSocietyOrThrow>>,
  caller: CallerInfo,
): void {
  if (!isCallerHodOrAdmin(society, caller)) {
    throw new ForbiddenError(
      "Only an admin or the department HOD can manage society lifecycle",
      ApiErrorCode.SCOPE_FORBIDDEN,
    );
  }
}

function assertLeadershipAuthority(
  society: Awaited<ReturnType<typeof findSocietyOrThrow>>,
  caller: CallerInfo,
): void {
  if (caller.userType !== "ADMIN" && !isCallerLeader(society, caller)) {
    throw new ForbiddenError(
      "You do not have permission to manage this society",
      ApiErrorCode.SCOPE_FORBIDDEN,
    );
  }
}

async function collectLifecycleRefreshUserIds(
  client: PrismaTransaction,
  serverId: number,
  departmentId: number,
  actorUserId: number,
): Promise<number[]> {
  const members = await client.serverMembership.findMany({
    where: {
      serverId,
      user: { status: "ACTIVE", isDeleted: false },
    },
    select: { userId: true },
  });
  const admins = await client.staffRoleAssignment.findMany({
    where: {
      AND: [activeStaffRoleAssignmentWhere(), { role: { name: "admin" } }],
    },
    select: { userId: true },
  });
  const department = await client.department.findUnique({
    where: { id: departmentId },
    select: { hodId: true },
  });
  return [
    ...new Set([
      actorUserId,
      ...members.map((member) => member.userId),
      ...admins.map((admin) => admin.userId),
      ...(department?.hodId ? [department.hodId] : []),
    ]),
  ];
}

async function emitLifecycleEffects(
  result: Pick<LifecycleResult<unknown>, "notificationIds" | "refreshUserIds">,
  societyPublicId: string,
): Promise<void> {
  try {
    await notificationService.emitCreatedNotifications(result.notificationIds);
  } catch (error) {
    societyLogger.error({ err: error, societyPublicId }, "Failed to emit lifecycle notifications");
  }
  for (const userId of result.refreshUserIds) {
    emitToUser(userId, "auth:roles-updated", {});
    emitToUser(userId, "society:lifecycle-updated", { societyPublicId });
  }
  invalidateSystemStatsCache();
}

async function resolveSocietyMemberBadges(
  serverId: number,
  memberUserIds: number[],
): Promise<Map<number, string[]>> {
  const badges = new Map<number, string[]>();
  const add = (userId: number, badge: string) => {
    badges.set(userId, [...(badges.get(userId) ?? []), badge]);
  };
  if (memberUserIds.length === 0) return badges;
  const [society, moderators] = await Promise.all([
    prisma.society.findUnique({
      where: { serverId },
      select: {
        president: { select: { user: { select: { id: true } } } },
        convenor: { select: { user: { select: { id: true } } } },
      },
    }),
    prisma.userRoleAssignment.findMany({
      where: {
        AND: [activePlatformRoleAssignmentWhere(), { serverId, userId: { in: memberUserIds } }],
      },
      select: { userId: true, role: { select: { name: true } } },
    }),
  ]);
  if (society) {
    if (memberUserIds.includes(society.president.user.id)) add(society.president.user.id, "president");
    if (memberUserIds.includes(society.convenor.user.id)) add(society.convenor.user.id, "convenor");
  }
  for (const moderator of moderators) add(moderator.userId, moderator.role.name);
  return badges;
}

export async function createSociety(data: CreateSocietyInput, caller: CallerInfo) {
  const department = await prisma.department.findUnique({
    where: { id: data.departmentId },
    select: { id: true, hodId: true },
  });
  if (!department) throw new NotFoundError("Department not found");
  if (caller.userType !== "ADMIN" && department.hodId !== caller.id) {
    throw new ForbiddenError("Only the HOD of this department can create societies");
  }
  const [president, convenor] = await Promise.all([
    assertStudentForSocietyOrThrow(data.presidentPublicId, data.departmentId),
    assertTeacherForSocietyOrThrow(data.convenorPublicId, data.departmentId),
  ]);
  const existing = await prisma.society.findFirst({
    where: { name: data.name, isDeleted: false },
    select: { id: true },
  });
  if (existing) {
    throw new ConflictError("A society with this name already exists", ApiErrorCode.DUPLICATE_SOCIETY_NAME);
  }
  return prisma.$transaction(async (tx) => {
    const server = await tx.server.create({
      data: {
        name: data.name,
        type: "SOCIETY",
        createdBy: caller.id,
      },
    });
    await tx.channel.createMany({
      data: [
        { serverId: server.id, name: "announcements", type: "ANNOUNCEMENT", isAutoCreated: true, createdBy: caller.id },
        { serverId: server.id, name: "general", type: "GENERAL", isAutoCreated: true, createdBy: caller.id },
      ],
    });
    const society = await tx.society.create({
      data: {
        name: data.name,
        description: data.description,
        departmentId: data.departmentId,
        presidentId: president.id,
        convenorId: convenor.id,
        serverId: server.id,
      },
      select: societyListSelect,
    });
    await tx.serverMembership.createMany({
      data: [
        { userId: convenor.id, serverId: server.id, isAutoJoined: true },
        { userId: president.id, serverId: server.id, isAutoJoined: true },
      ],
    });
    return society;
  });
}

export async function listSocieties(query: ListSocietiesQuery, caller: CallerInfo) {
  const { page, limit, skip, take } = parsePagination(query);
  const lifecycle = query.lifecycle ?? "live";
  const where: Prisma.SocietyWhereInput = {
    ...(query.departmentId ? { departmentId: query.departmentId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(lifecycle === "live" ? { isDeleted: false } : {}),
    ...(lifecycle === "deleted" ? { isDeleted: true } : {}),
  };
  if (caller.userType !== "ADMIN") {
    if (lifecycle === "deleted" || lifecycle === "all") {
      where.department = { hodId: caller.id };
    } else {
      where.OR = [
        { status: "ACTIVE" },
        { department: { hodId: caller.id } },
        { server: { memberships: { some: { userId: caller.id } } } },
      ];
    }
  }
  const [societies, total] = await Promise.all([
    prisma.society.findMany({ where, select: societyListSelect, orderBy: { name: "asc" }, skip, take }),
    prisma.society.count({ where }),
  ]);
  return { data: societies, pagination: buildPaginationResponse(page, limit, total) };
}

export async function getSocietyByPublicId(societyPublicId: string, caller: CallerInfo) {
  const resolved = await resolveSocietyPublicId(societyPublicId, {
    field: "publicId",
    includeDeleted: true,
  });
  const society = await findSocietyOrThrow(resolved.id, prisma, true);
  const [data, context, membership, request] = await Promise.all([
    prisma.society.findUniqueOrThrow({ where: { id: society.id }, select: societyListSelect }),
    getPermissionContext(caller.id),
    prisma.serverMembership.findUnique({
      where: { userId_serverId: { userId: caller.id, serverId: society.serverId } },
      select: { userId: true },
    }),
    prisma.societyMembershipRequest.findUnique({
      where: { societyId_userId: { societyId: society.id, userId: caller.id } },
      select: { status: true },
    }),
  ]);
  const isMember = Boolean(membership);
  if (
    (society.isDeleted && !isCallerHodOrAdmin(society, caller)) ||
    (society.status === "SUSPENDED" && !isMember && !isCallerHodOrAdmin(society, caller))
  ) {
    throw new NotFoundError("Society not found");
  }
  const viewer = { isMember, requestStatus: request?.status ?? null };
  return {
    ...data,
    viewer,
    permissions: buildSocietyPermissions(context, {
      id: society.id,
      serverId: society.serverId,
      departmentId: society.departmentId,
      status: society.status,
      isDeleted: society.isDeleted,
      presidentUserId: society.president.user.id,
      convenorUserId: society.convenor.user.id,
      departmentHodId: society.department.hodId,
    }, viewer),
  };
}

export async function updateSociety(societyPublicId: string, data: UpdateSocietyInput, caller: CallerInfo) {
  const resolved = await resolveSocietyPublicId(societyPublicId, { field: "publicId" });
  const updated = await prisma.$transaction(async (tx) => {
    await assertSocietyAcceptsWrites(resolved.id, tx);
    const society = await findSocietyOrThrow(resolved.id, tx);
    const leadershipChange = data.presidentPublicId !== undefined || data.convenorPublicId !== undefined;
    if (leadershipChange ? !isCallerHodOrAdmin(society, caller) : !isCallerHodOrAdmin(society, caller) && !isCallerLeader(society, caller)) {
      throw new ForbiddenError("You do not have permission to update this society", ApiErrorCode.SCOPE_FORBIDDEN);
    }
    if (data.name && data.name !== society.name) {
      const duplicate = await tx.society.findFirst({ where: { name: data.name, isDeleted: false, id: { not: society.id } }, select: { id: true } });
      if (duplicate) throw new ConflictError("A society with this name already exists", ApiErrorCode.DUPLICATE_SOCIETY_NAME);
    }
    const updateData: Prisma.SocietyUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.presidentPublicId !== undefined) {
      const president = await assertStudentForSocietyOrThrow(data.presidentPublicId, society.departmentId, tx);
      updateData.president = { connect: { studentId: president.id } };
      await tx.serverMembership.upsert({
        where: { userId_serverId: { userId: president.id, serverId: society.serverId } },
        create: { userId: president.id, serverId: society.serverId, isAutoJoined: true },
        update: {},
      });
    }
    if (data.convenorPublicId !== undefined) {
      const convenor = await assertTeacherForSocietyOrThrow(data.convenorPublicId, society.departmentId, tx);
      updateData.convenor = { connect: { teacherId: convenor.id } };
      await tx.serverMembership.upsert({
        where: { userId_serverId: { userId: convenor.id, serverId: society.serverId } },
        create: { userId: convenor.id, serverId: society.serverId, isAutoJoined: true },
        update: {},
      });
    }
    if (data.name !== undefined) await tx.server.update({ where: { id: society.serverId }, data: { name: data.name } });
    return tx.society.update({ where: { id: society.id }, data: updateData, select: societyListSelect });
  });
  return updated;
}

export async function submitJoinRequest(societyPublicId: string, userId: number) {
  const resolved = await resolveSocietyPublicId(societyPublicId, { field: "publicId" });
  return prisma.$transaction(async (tx) => {
    await assertSocietyAcceptsWrites(resolved.id, tx);
    const society = await findSocietyOrThrow(resolved.id, tx);
    const membership = await tx.serverMembership.findUnique({ where: { userId_serverId: { userId, serverId: society.serverId } }, select: { userId: true } });
    if (membership) throw new ConflictError("You are already a member of this society", ApiErrorCode.ALREADY_MEMBER);
    const existing = await tx.societyMembershipRequest.findUnique({ where: { societyId_userId: { societyId: society.id, userId } }, select: { id: true, status: true } });
    if (existing?.status === "PENDING") throw new ConflictError("You already have a pending join request", ApiErrorCode.JOIN_REQUEST_PENDING);
    if (existing?.status === "APPROVED") throw new ConflictError("Your request has already been approved");
    return existing
      ? tx.societyMembershipRequest.update({ where: { id: existing.id }, data: { status: "PENDING", reviewedBy: null, reviewedAt: null, requestedAt: new Date() }, select: joinRequestSelect })
      : tx.societyMembershipRequest.create({ data: { societyId: society.id, userId }, select: joinRequestSelect });
  });
}

export async function listJoinRequests(societyPublicId: string, query: ListJoinRequestsQuery, caller: CallerInfo) {
  const resolved = await resolveSocietyPublicId(societyPublicId, { field: "publicId" });
  const society = await findSocietyOrThrow(resolved.id);
  assertLeadershipAuthority(society, caller);
  const { page, limit, skip, take } = parsePagination(query);
  const where = { societyId: society.id, ...(query.status ? { status: query.status } : {}) };
  const [requests, total] = await Promise.all([
    prisma.societyMembershipRequest.findMany({ where, select: joinRequestSelect, orderBy: { requestedAt: "desc" }, skip, take }),
    prisma.societyMembershipRequest.count({ where }),
  ]);
  return { data: requests, pagination: buildPaginationResponse(page, limit, total) };
}

export async function reviewJoinRequest(societyPublicId: string, requestId: number, status: "APPROVED" | "REJECTED", caller: CallerInfo) {
  const resolved = await resolveSocietyPublicId(societyPublicId, { field: "publicId" });
  const result = await prisma.$transaction(async (tx) => {
    await assertSocietyAcceptsWrites(resolved.id, tx);
    const society = await findSocietyOrThrow(resolved.id, tx);
    assertLeadershipAuthority(society, caller);
    const request = await tx.societyMembershipRequest.findFirst({ where: { id: requestId, societyId: society.id }, select: { id: true, status: true, userId: true } });
    if (!request) throw new NotFoundError("Join request not found");
    if (request.status !== "PENDING") throw new ConflictError("This request has already been reviewed");
    const updated = await tx.societyMembershipRequest.update({ where: { id: request.id }, data: { status, reviewedBy: caller.id, reviewedAt: new Date() }, select: joinRequestSelect });
    if (status === "APPROVED") {
      await tx.serverMembership.createMany({ data: [{ userId: request.userId, serverId: society.serverId }], skipDuplicates: true });
    }
    return { updated, userId: request.userId, societyId: society.id, societyName: society.name };
  });
  try {
    await notificationService.createSocietyRequestReviewedNotification({
      userId: result.userId,
      societyId: result.societyId,
      societyName: result.societyName,
      status,
    });
  } catch (error) {
    societyLogger.error(
      { err: error, societyPublicId, userId: result.userId, status },
      "Failed to create membership review notification",
    );
  }
  return result.updated;
}

export async function addMember(societyPublicId: string, userPublicId: string, caller: CallerInfo) {
  const [societyResolution, userResolution] = await Promise.all([
    resolveSocietyPublicId(societyPublicId, { field: "publicId" }),
    resolveUserPublicId(userPublicId, { field: "userPublicId" }),
  ]);
  const membership = await prisma.$transaction(async (tx) => {
    await assertSocietyAcceptsWrites(societyResolution.id, tx);
    const society = await findSocietyOrThrow(societyResolution.id, tx);
    assertLeadershipAuthority(society, caller);
    const user = await tx.user.findFirst({ where: { id: userResolution.id, userType: "STUDENT", status: "ACTIVE", isDeleted: false }, select: { id: true } });
    if (!user) throw new ForbiddenError("Only active students can be added as society members");
    const existing = await tx.serverMembership.findUnique({ where: { userId_serverId: { userId: user.id, serverId: society.serverId } }, select: { userId: true } });
    if (existing) throw new ConflictError("User is already a member of this society", ApiErrorCode.ALREADY_MEMBER);
    const created = await tx.serverMembership.create({ data: { userId: user.id, serverId: society.serverId }, select: memberInternalSelect });
    await tx.societyMembershipRequest.updateMany({ where: { societyId: society.id, userId: user.id, status: "PENDING" }, data: { status: "APPROVED", reviewedBy: caller.id, reviewedAt: new Date() } });
    return created;
  });
  const { userId: _userId, ...publicMembership } = membership;
  return { ...publicMembership, badges: [] as string[] };
}

export async function removeMember(societyPublicId: string, userPublicId: string, caller: CallerInfo) {
  const [societyResolution, userResolution] = await Promise.all([
    resolveSocietyPublicId(societyPublicId, { field: "publicId" }),
    resolveUserPublicId(userPublicId, { field: "userPublicId" }),
  ]);
  await prisma.$transaction(async (tx) => {
    await assertSocietyAcceptsWrites(societyResolution.id, tx);
    const society = await findSocietyOrThrow(societyResolution.id, tx);
    assertLeadershipAuthority(society, caller);
    if (society.president.user.id === userResolution.id || society.convenor.user.id === userResolution.id) {
      throw new ForbiddenError("Cannot remove society leadership. Change leadership roles first");
    }
    const deleted = await tx.serverMembership.deleteMany({ where: { userId: userResolution.id, serverId: society.serverId } });
    if (deleted.count !== 1) throw new NotFoundError("User is not a member of this society");
  });
  disconnectUserSockets(userResolution.id);
}

export async function listMembers(societyPublicId: string, query: PaginationQuery, caller: CallerInfo) {
  const resolved = await resolveSocietyPublicId(societyPublicId, { field: "publicId" });
  const society = await findSocietyOrThrow(resolved.id);
  if (caller.userType !== "ADMIN") {
    const membership = await prisma.serverMembership.findUnique({ where: { userId_serverId: { userId: caller.id, serverId: society.serverId } }, select: { userId: true } });
    if (!membership) throw new ForbiddenError("You do not have permission to view members of this society", ApiErrorCode.SCOPE_FORBIDDEN);
  }
  const { page, limit, skip, take } = parsePagination(query);
  const [members, total] = await Promise.all([
    prisma.serverMembership.findMany({ where: { serverId: society.serverId }, select: memberInternalSelect, orderBy: { joinedAt: "asc" }, skip, take }),
    prisma.serverMembership.count({ where: { serverId: society.serverId } }),
  ]);
  const badges = await resolveSocietyMemberBadges(society.serverId, members.map((member) => member.userId));
  return {
    data: members.map(({ userId, ...member }) => ({ ...member, badges: badges.get(userId) ?? [] })),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function getMyMembershipStatus(societyPublicId: string, userId: number) {
  const resolved = await resolveSocietyPublicId(societyPublicId, { field: "publicId" });
  const society = await findSocietyOrThrow(resolved.id);
  const [membership, request] = await Promise.all([
    prisma.serverMembership.findUnique({ where: { userId_serverId: { userId, serverId: society.serverId } }, select: { userId: true } }),
    prisma.societyMembershipRequest.findUnique({ where: { societyId_userId: { societyId: society.id, userId } }, select: { status: true, requestedAt: true, reviewedAt: true } }),
  ]);
  return { isMember: Boolean(membership), requestStatus: request?.status ?? null, requestedAt: request?.requestedAt ?? null, reviewedAt: request?.reviewedAt ?? null };
}

export async function listMemberCandidates(societyPublicId: string, query: MemberCandidatesQuery, caller: CallerInfo) {
  const resolved = await resolveSocietyPublicId(societyPublicId, { field: "publicId" });
  const society = await prisma.$transaction(async (tx) => {
    await assertSocietyAcceptsWrites(resolved.id, tx);
    const current = await findSocietyOrThrow(resolved.id, tx);
    assertLeadershipAuthority(current, caller);
    return current;
  });
  const { page, limit, skip, take } = parsePagination(query);
  const search = query.search?.trim();
  const where: Prisma.UserWhereInput = {
    userType: "STUDENT",
    status: "ACTIVE",
    isDeleted: false,
    serverMemberships: { none: { serverId: society.serverId } },
    ...(search ? { OR: [{ fullName: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}),
  };
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, select: memberCandidateSelect, orderBy: [{ fullName: "asc" }, { id: "asc" }], skip, take }),
    prisma.user.count({ where }),
  ]);
  return { data: users, pagination: buildPaginationResponse(page, limit, total) };
}

export async function listLeadershipCandidates(query: LeadershipCandidatesQuery, caller: CallerInfo) {
  const department = await prisma.department.findUnique({ where: { id: query.departmentId }, select: { id: true, hodId: true } });
  if (!department) throw new NotFoundError("Department not found");
  if (caller.userType !== "ADMIN" && department.hodId !== caller.id) throw new ForbiddenError("Only an admin or the department HOD can view leadership candidates");
  const { page, limit, skip, take } = parsePagination(query);
  const search = query.search?.trim();
  const where: Prisma.UserWhereInput = {
    userType: query.role === "president" ? "STUDENT" : "TEACHER",
    status: "ACTIVE",
    isDeleted: false,
    departmentId: query.departmentId,
    ...(query.role === "president" ? { studentInfo: { isNot: null } } : { teacherInfo: { isNot: null } }),
    ...(search ? { OR: [{ fullName: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}),
  };
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, select: memberCandidateSelect, orderBy: [{ fullName: "asc" }, { id: "asc" }], skip, take }),
    prisma.user.count({ where }),
  ]);
  return { data: users, pagination: buildPaginationResponse(page, limit, total) };
}

export async function getSocietyDeletionImpact(societyPublicId: string, caller: CallerInfo) {
  const resolved = await resolveSocietyPublicId(societyPublicId, { field: "publicId", includeDeleted: true });
  return prisma.$transaction(async (tx) => {
    const society = await findSocietyOrThrow(resolved.id, tx, true);
    assertLifecycleAuthority(society, caller);
    const activeMemberCount = await tx.serverMembership.count({ where: { serverId: society.serverId, user: { status: "ACTIVE", isDeleted: false } } });
    const liveChannelCount = await tx.channel.count({ where: { serverId: society.serverId, isDeleted: false } });
    const pendingRequestCount = await tx.societyMembershipRequest.count({ where: { societyId: society.id, status: "PENDING" } });
    const preservedPostCount = await tx.post.count({ where: { channel: { serverId: society.serverId } } });
    const preservedPlatformRoleAssignmentCount = await tx.userRoleAssignment.count({ where: { serverId: society.serverId } });
    return { canDelete: !society.isDeleted, activeMemberCount, liveChannelCount, pendingRequestCount, preservedPostCount, preservedPlatformRoleAssignmentCount };
  });
}

export async function updateSocietyStatus(societyPublicId: string, status: SocietyStatus, caller: CallerInfo, auditContext: AuditContext, reason?: string) {
  const resolved = await resolveSocietyPublicId(societyPublicId, { field: "publicId" });
  const result = await prisma.$transaction(async (tx) => {
    const locked = await lockSocietyLifecycleRow(resolved.id, tx);
    const society = await findSocietyOrThrow(locked.id, tx);
    assertLifecycleAuthority(society, caller);
    if (locked.status === status) throw new ConflictError(`Society is already ${status.toLowerCase()}`);
    const updated = await tx.society.update({ where: { id: society.id }, data: { status }, select: societyListSelect });
    const notificationIds = await notificationService.createSocietyLifecycleNotifications(tx, { societyId: society.id, serverId: society.serverId, actorUserId: caller.id, societyName: society.name, type: status === "ACTIVE" ? "SOCIETY_ACTIVATED" : "SOCIETY_SUSPENDED" });
    await recordAuditLog({ action: "society.status_update", targetType: "society", targetId: society.publicId, summary: { status: { before: locked.status, after: status }, reason: reason ?? null } }, auditContext, tx);
    return { data: updated, notificationIds, refreshUserIds: await collectLifecycleRefreshUserIds(tx, society.serverId, society.departmentId, caller.id) };
  });
  await emitLifecycleEffects(result, societyPublicId);
  return result.data;
}

export async function deleteSociety(societyPublicId: string, caller: CallerInfo, auditContext: AuditContext, reason?: string) {
  const resolved = await resolveSocietyPublicId(societyPublicId, { field: "publicId", includeDeleted: true });
  const result = await prisma.$transaction(async (tx) => {
    const locked = await lockSocietyLifecycleRow(resolved.id, tx);
    const society = await findSocietyOrThrow(locked.id, tx, true);
    assertLifecycleAuthority(society, caller);
    if (locked.isDeleted) throw new ConflictError("Society is already deleted");
    const now = new Date();
    const cascadeId = randomUUID();
    const updated = await tx.society.update({ where: { id: society.id }, data: { isDeleted: true, deletedAt: now, deletedBy: caller.id, deletedCascadeId: cascadeId }, select: societyListSelect });
    await tx.server.update({ where: { id: society.serverId }, data: { isDeleted: true, deletedAt: now, deletedBy: caller.id, deletedCascadeId: cascadeId } });
    const channels = await tx.channel.updateMany({ where: { serverId: society.serverId, isDeleted: false }, data: { isDeleted: true, deletedAt: now, deletedBy: caller.id, deletedCascadeId: cascadeId } });
    const pendingRequests = await tx.societyMembershipRequest.deleteMany({ where: { societyId: society.id, status: "PENDING" } });
    const notificationIds = await notificationService.createSocietyLifecycleNotifications(tx, { societyId: society.id, serverId: society.serverId, actorUserId: caller.id, societyName: society.name, type: "SOCIETY_DELETED" });
    await recordAuditLog({ action: "society.delete", targetType: "society", targetId: society.publicId, summary: { statusPreserved: society.status, reason: reason ?? null, cascadeId, deletedChannels: channels.count, deletedPendingRequests: pendingRequests.count } }, auditContext, tx);
    return { data: updated, notificationIds, refreshUserIds: await collectLifecycleRefreshUserIds(tx, society.serverId, society.departmentId, caller.id) };
  });
  await emitLifecycleEffects(result, societyPublicId);
  return result.data;
}

export async function restoreSociety(societyPublicId: string, caller: CallerInfo, auditContext: AuditContext, reason?: string) {
  const resolved = await resolveSocietyPublicId(societyPublicId, { field: "publicId", includeDeleted: true });
  const result = await prisma.$transaction(async (tx) => {
    const locked = await lockSocietyLifecycleRow(resolved.id, tx);
    const society = await findSocietyOrThrow(locked.id, tx, true);
    assertLifecycleAuthority(society, caller);
    if (!locked.isDeleted) throw new ConflictError("Society is not deleted");
    if (!locked.deletedCascadeId) throw new ConflictError("Society deletion cascade metadata is missing");
    const duplicate = await tx.society.findFirst({ where: { id: { not: society.id }, name: society.name, isDeleted: false }, select: { id: true } });
    if (duplicate) throw new ConflictError("Society name has been reused", ApiErrorCode.DUPLICATE_SOCIETY_NAME);
    const server = await tx.server.updateMany({ where: { id: society.serverId, isDeleted: true, deletedCascadeId: locked.deletedCascadeId }, data: { isDeleted: false, deletedAt: null, deletedBy: null, deletedCascadeId: null } });
    if (server.count !== 1) throw new ConflictError("Society server cascade metadata is inconsistent");
    const channels = await tx.channel.updateMany({ where: { serverId: society.serverId, isDeleted: true, deletedCascadeId: locked.deletedCascadeId }, data: { isDeleted: false, deletedAt: null, deletedBy: null, deletedCascadeId: null } });
    const updated = await tx.society.update({ where: { id: society.id }, data: { isDeleted: false, deletedAt: null, deletedBy: null, deletedCascadeId: null }, select: societyListSelect });
    const notificationIds = await notificationService.createSocietyLifecycleNotifications(tx, { societyId: society.id, serverId: society.serverId, actorUserId: caller.id, societyName: society.name, type: "SOCIETY_RESTORED" });
    await recordAuditLog({ action: "society.restore", targetType: "society", targetId: society.publicId, summary: { restoredStatus: society.status, reason: reason ?? null, restoredChannels: channels.count } }, auditContext, tx);
    return { data: updated, notificationIds, refreshUserIds: await collectLifecycleRefreshUserIds(tx, society.serverId, society.departmentId, caller.id) };
  });
  await emitLifecycleEffects(result, societyPublicId);
  return result.data;
}
