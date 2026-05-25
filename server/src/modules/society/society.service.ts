import type { MembershipRequestStatus } from "../../generated/prisma/enums.js";
import { prisma } from "../../config/prisma.js";
import {
  ApiErrorCode,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors/index.js";
import { parsePagination, buildPaginationResponse } from "../../shared/utils/pagination.js";
import {
  buildSocietyPermissions,
  getPermissionContext,
} from "../../shared/permissions/index.js";
import { emitToUser } from "../../socket/index.js";
import * as notificationService from "../notification/notification.service.js";

// ─── Types ─────────────────────────────────────────────────────────────────

type CreateSocietyInput = {
  name: string;
  description?: string;
  departmentId: number;
  presidentId: number; // User ID
  convenorId: number; // User ID
};

type UpdateSocietyInput = {
  name?: string;
  description?: string;
  presidentId?: number; // User ID
  convenorId?: number; // User ID
};

type ListSocietiesQuery = {
  departmentId?: number;
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

type MemberCandidatesQuery = {
  search?: string;
  page?: number;
  limit?: number;
};

type LeadershipCandidatesQuery = MemberCandidatesQuery & {
  departmentId: number;
  role: "president" | "convenor";
};

type CallerInfo = {
  id: number;
  userType: string;
};

// ─── Select Constants ──────────────────────────────────────────────────────

const societyListSelect = {
  id: true,
  name: true,
  description: true,
  departmentId: true,
  isActive: true,
  createdAt: true,
  department: {
    select: { id: true, name: true, serverId: true },
  },
  president: {
    select: {
      user: { select: { id: true, fullName: true, email: true } },
    },
  },
  convenor: {
    select: {
      user: { select: { id: true, fullName: true, email: true } },
    },
  },
  server: {
    select: {
      _count: { select: { memberships: true } },
    },
  },
} as const;

const societyDetailSelect = {
  ...societyListSelect,
  serverId: true,
  server: {
    select: {
      id: true,
      _count: { select: { memberships: true } },
    },
  },
} as const;

const joinRequestSelect = {
  id: true,
  societyId: true,
  userId: true,
  status: true,
  requestedAt: true,
  reviewedAt: true,
  user: {
    select: { id: true, fullName: true, email: true, profilePictureUrl: true },
  },
  reviewer: {
    select: { id: true, fullName: true },
  },
} as const;

const memberCandidateSelect = {
  id: true,
  fullName: true,
  email: true,
  userType: true,
  profilePictureUrl: true,
} as const;

const memberSelect = {
  userId: true,
  joinedAt: true,
  isAutoJoined: true,
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      userType: true,
      profilePictureUrl: true,
    },
  },
} as const;

// ─── Internal Helpers ──────────────────────────────────────────────────────

async function findSocietyOrThrow(id: number) {
  const society = await prisma.society.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      serverId: true,
      presidentId: true,
      convenorId: true,
      departmentId: true,
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

async function assertStudentForSocietyOrThrow(userId: number, departmentId: number) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      userType: "STUDENT",
      isActive: true,
    },
    select: { id: true, departmentId: true, studentInfo: { select: { studentId: true } } },
  });

  if (!user || !user.studentInfo) {
    throw new NotFoundError("Student not found for president role");
  }

  if (user.departmentId !== departmentId) {
    throw new ForbiddenError("President must belong to the same department as the society");
  }

  return user;
}

async function assertTeacherForSocietyOrThrow(userId: number, departmentId: number) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      userType: "TEACHER",
      isActive: true,
    },
    select: { id: true, departmentId: true, teacherInfo: { select: { teacherId: true } } },
  });

  if (!user || !user.teacherInfo) {
    throw new NotFoundError("Teacher not found for convenor role");
  }

  if (user.departmentId !== departmentId) {
    throw new ForbiddenError("Convenor must belong to the same department as the society");
  }

  return user;
}

function isCallerAuthorized(
  society: Awaited<ReturnType<typeof findSocietyOrThrow>>,
  caller: CallerInfo
): boolean {
  if (caller.userType === "ADMIN") return true;
  if (society.president.user.id === caller.id) return true;
  if (society.convenor.user.id === caller.id) return true;
  return false;
}

function isCallerHODOrAdmin(
  society: Awaited<ReturnType<typeof findSocietyOrThrow>>,
  caller: CallerInfo
): boolean {
  if (caller.userType === "ADMIN") return true;
  if (society.department.hodId === caller.id) return true;
  return false;
}

function emitRolesUpdated(userId: number): void {
  emitToUser(userId, "auth:roles-updated", { userId });
}

async function createSocietyRequestReviewedNotification(input: {
  userId: number;
  societyName: string;
  status: "APPROVED" | "REJECTED";
}): Promise<void> {
  try {
    await notificationService.createSocietyRequestReviewedNotification(input);
  } catch (error) {
    console.error("[SOCIETY] Failed to create membership review notification", { error });
  }
}

async function resolveSocietyMemberBadges(
  serverId: number,
  memberUserIds: number[]
): Promise<Map<number, string[]>> {
  const badgeMap = new Map<number, string[]>();

  const addBadge = (userId: number, badge: string) => {
    const current = badgeMap.get(userId) ?? [];
    current.push(badge);
    badgeMap.set(userId, current);
  };

  if (memberUserIds.length === 0) return badgeMap;

  const [society, moderators] = await Promise.all([
    prisma.society.findUnique({
      where: { serverId },
      select: {
        president: { select: { user: { select: { id: true } } } },
        convenor: { select: { user: { select: { id: true } } } },
      },
    }),
    prisma.moderatorAssignment.findMany({
      where: { serverId, userId: { in: memberUserIds } },
      select: { userId: true, scopeType: true },
    }),
  ]);

  if (society) {
    const presidentUserId = society.president.user.id;
    const convenorUserId = society.convenor.user.id;
    if (memberUserIds.includes(presidentUserId)) addBadge(presidentUserId, "president");
    if (memberUserIds.includes(convenorUserId)) addBadge(convenorUserId, "convenor");
  }

  for (const moderator of moderators) {
    addBadge(
      moderator.userId,
      moderator.scopeType === "SERVER" ? "server_moderator" : "channel_moderator"
    );
  }

  return badgeMap;
}

// ─── Service Functions ─────────────────────────────────────────────────────

export async function createSociety(data: CreateSocietyInput, caller: CallerInfo) {
  // 1. Verify department exists
  const department = await prisma.department.findUnique({
    where: { id: data.departmentId },
    select: { id: true, hodId: true },
  });

  if (!department) {
    throw new NotFoundError("Department not found");
  }

  // 2. HOD can only create in own department
  if (caller.userType !== "ADMIN") {
    if (department.hodId !== caller.id) {
      throw new ForbiddenError("Only the HOD of this department can create societies");
    }
  }

  // 3. Resolve and validate leadership users (parallel — independent checks)
  await Promise.all([
    assertStudentForSocietyOrThrow(data.presidentId, data.departmentId),
    assertTeacherForSocietyOrThrow(data.convenorId, data.departmentId),
  ]);

  // 5. Create everything in a transaction
  return prisma.$transaction(async (tx) => {
    const server = await tx.server.create({
      data: {
        name: data.name,
        type: "SOCIETY",
        createdBy: caller.id,
        isActive: true,
      },
    });

    await tx.channel.createMany({
      data: [
        {
          serverId: server.id,
          name: "announcements",
          type: "ANNOUNCEMENT",
          isAutoCreated: true,
          createdBy: caller.id,
        },
        {
          serverId: server.id,
          name: "general",
          type: "GENERAL",
          isAutoCreated: true,
          createdBy: caller.id,
        },
      ],
    });

    const society = await tx.society.create({
      data: {
        name: data.name,
        description: data.description,
        departmentId: data.departmentId,
        presidentId: data.presidentId,
        convenorId: data.convenorId,
        serverId: server.id,
      },
      select: societyListSelect,
    });

    // Auto-add convenor and president to server
    await tx.serverMembership.createMany({
      data: [
        { userId: data.convenorId, serverId: server.id, isAutoJoined: true },
        { userId: data.presidentId, serverId: server.id, isAutoJoined: true },
      ],
    });

    return society;
  });
}

export async function listSocieties(query: ListSocietiesQuery) {
  const { page, limit, skip, take } = parsePagination(query);

  const where: Record<string, unknown> = {};
  if (query.departmentId) where.departmentId = query.departmentId;

  const [societies, total] = await Promise.all([
    prisma.society.findMany({
      where,
      select: societyListSelect,
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    prisma.society.count({ where }),
  ]);

  return {
    data: societies,
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function getSocietyById(id: number, callerUserId: number) {
  const [society, target] = await Promise.all([
    prisma.society.findUnique({
    where: { id },
    select: societyDetailSelect,
    }),
    prisma.society.findUnique({
      where: { id },
      select: {
        id: true,
        serverId: true,
        departmentId: true,
        isActive: true,
        president: { select: { user: { select: { id: true } } } },
        convenor: { select: { user: { select: { id: true } } } },
        department: { select: { hodId: true } },
      },
    }),
  ]);

  if (!society || !target) {
    throw new NotFoundError("Society not found");
  }

  const [context, membership, request] = await Promise.all([
    getPermissionContext(callerUserId),
    prisma.serverMembership.findUnique({
      where: { userId_serverId: { userId: callerUserId, serverId: target.serverId } },
      select: { userId: true },
    }),
    prisma.societyMembershipRequest.findUnique({
      where: { societyId_userId: { societyId: id, userId: callerUserId } },
      select: { status: true },
    }),
  ]);
  const viewer = {
    isMember: Boolean(membership),
    requestStatus: request?.status ?? null,
  };
  const permissions = buildSocietyPermissions(
    context,
    {
      id: target.id,
      serverId: target.serverId,
      departmentId: target.departmentId,
      isActive: target.isActive,
      presidentUserId: target.president.user.id,
      convenorUserId: target.convenor.user.id,
      departmentHodId: target.department.hodId,
    },
    viewer
  );

  return {
    ...society,
    viewer,
    permissions,
  };
}

export async function updateSociety(id: number, data: UpdateSocietyInput, caller: CallerInfo) {
  const society = await findSocietyOrThrow(id);

  const hasLeadershipChange = data.presidentId !== undefined || data.convenorId !== undefined;
  const hasInfoChange = data.name !== undefined || data.description !== undefined;

  // Leadership changes require HOD or Admin
  if (hasLeadershipChange) {
    if (!isCallerHODOrAdmin(society, caller)) {
      throw new ForbiddenError("Only the HOD or an admin can change society leadership");
    }
  } else if (hasInfoChange) {
    // Info-only changes allowed for Convenor, President, HOD, or Admin
    if (!isCallerAuthorized(society, caller) && !isCallerHODOrAdmin(society, caller)) {
      throw new ForbiddenError(
        "You do not have permission to update this society",
        ApiErrorCode.SCOPE_FORBIDDEN
      );
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;

    // Handle president change
    if (data.presidentId !== undefined) {
      await assertStudentForSocietyOrThrow(data.presidentId, society.departmentId);

      updateData.presidentId = data.presidentId;

      // Add new president to server membership (upsert)
      await tx.serverMembership.upsert({
        where: {
          userId_serverId: {
            userId: data.presidentId,
            serverId: society.serverId,
          },
        },
        create: {
          userId: data.presidentId,
          serverId: society.serverId,
          isAutoJoined: true,
        },
        update: {},
      });
    }

    // Handle convenor change
    if (data.convenorId !== undefined) {
      await assertTeacherForSocietyOrThrow(data.convenorId, society.departmentId);

      updateData.convenorId = data.convenorId;

      // Add new convenor to server membership (upsert)
      await tx.serverMembership.upsert({
        where: {
          userId_serverId: {
            userId: data.convenorId,
            serverId: society.serverId,
          },
        },
        create: {
          userId: data.convenorId,
          serverId: society.serverId,
          isAutoJoined: true,
        },
        update: {},
      });
    }

    // Update server name if society name changes
    if (data.name !== undefined) {
      await tx.server.update({
        where: { id: society.serverId },
        data: { name: data.name },
      });
    }

    return tx.society.update({
      where: { id },
      data: updateData,
      select: societyListSelect,
    });
  });

  if (data.presidentId !== undefined) {
    emitRolesUpdated(data.presidentId);
    emitRolesUpdated(society.president.user.id);
  }
  if (data.convenorId !== undefined) {
    emitRolesUpdated(data.convenorId);
    emitRolesUpdated(society.convenor.user.id);
  }

  return updated;
}

export async function submitJoinRequest(societyId: number, userId: number) {
  const society = await findSocietyOrThrow(societyId);

  // Check if already a server member
  const existingMembership = await prisma.serverMembership.findUnique({
    where: {
      userId_serverId: { userId, serverId: society.serverId },
    },
  });

  if (existingMembership) {
    throw new ConflictError("You are already a member of this society", ApiErrorCode.ALREADY_MEMBER);
  }

  // Check existing request
  const existingRequest = await prisma.societyMembershipRequest.findUnique({
    where: { societyId_userId: { societyId, userId } },
    select: { id: true, status: true },
  });

  if (existingRequest) {
    if (existingRequest.status === "PENDING") {
      throw new ConflictError("You already have a pending join request", ApiErrorCode.JOIN_REQUEST_PENDING);
    }
    if (existingRequest.status === "APPROVED") {
      throw new ConflictError("Your request has already been approved");
    }
    // REJECTED → allow re-apply by resetting to PENDING
    return prisma.societyMembershipRequest.update({
      where: { id: existingRequest.id },
      data: {
        status: "PENDING",
        reviewedBy: null,
        reviewedAt: null,
        requestedAt: new Date(),
      },
      select: joinRequestSelect,
    });
  }

  return prisma.societyMembershipRequest.create({
    data: {
      societyId,
      userId,
      status: "PENDING",
    },
    select: joinRequestSelect,
  });
}

export async function listJoinRequests(
  societyId: number,
  query: ListJoinRequestsQuery,
  caller: CallerInfo
) {
  const society = await findSocietyOrThrow(societyId);

  if (!isCallerAuthorized(society, caller)) {
    throw new ForbiddenError(
      "You do not have permission to view join requests for this society",
      ApiErrorCode.SCOPE_FORBIDDEN
    );
  }

  const { page, limit, skip, take } = parsePagination(query);

  const where: Record<string, unknown> = { societyId };
  if (query.status) where.status = query.status;

  const [requests, total] = await Promise.all([
    prisma.societyMembershipRequest.findMany({
      where,
      select: joinRequestSelect,
      orderBy: { requestedAt: "desc" },
      skip,
      take,
    }),
    prisma.societyMembershipRequest.count({ where }),
  ]);

  return {
    data: requests,
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function reviewJoinRequest(
  societyId: number,
  requestId: number,
  status: "APPROVED" | "REJECTED",
  caller: CallerInfo
) {
  const society = await findSocietyOrThrow(societyId);

  if (!isCallerAuthorized(society, caller)) {
    throw new ForbiddenError(
      "You do not have permission to review join requests for this society",
      ApiErrorCode.SCOPE_FORBIDDEN
    );
  }

  const request = await prisma.societyMembershipRequest.findFirst({
    where: { id: requestId, societyId },
    select: { id: true, status: true, userId: true },
  });

  if (!request) {
    throw new NotFoundError("Join request not found");
  }

  if (request.status !== "PENDING") {
    throw new ConflictError("This request has already been reviewed");
  }

  const requestUserId = request.userId;
  const updated = await prisma.$transaction(async (tx) => {
    const updated = await tx.societyMembershipRequest.update({
      where: { id: requestId },
      data: {
        status,
        reviewedBy: caller.id,
        reviewedAt: new Date(),
      },
      select: joinRequestSelect,
    });

    if (status === "APPROVED") {
      await tx.serverMembership.createMany({
        data: [{
          userId: requestUserId,
          serverId: society.serverId,
          isAutoJoined: false,
        }],
        skipDuplicates: true,
      });
    }

    return updated;
  });

  await createSocietyRequestReviewedNotification({
    userId: requestUserId,
    societyName: society.name,
    status,
  });

  return updated;
}

export async function addMember(societyId: number, userId: number, caller: CallerInfo) {
  const society = await findSocietyOrThrow(societyId);

  if (!isCallerAuthorized(society, caller)) {
    throw new ForbiddenError(
      "You do not have permission to add members to this society",
      ApiErrorCode.SCOPE_FORBIDDEN
    );
  }

  // Verify target user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, userType: true, isActive: true },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (user.userType !== "STUDENT" || !user.isActive) {
    throw new ForbiddenError("Only active students can be added as society members");
  }

  // Check if already a member
  const existingMembership = await prisma.serverMembership.findUnique({
    where: {
      userId_serverId: { userId, serverId: society.serverId },
    },
  });

  if (existingMembership) {
    throw new ConflictError("User is already a member of this society", ApiErrorCode.ALREADY_MEMBER);
  }

  return prisma.$transaction(async (tx) => {
    const membership = await tx.serverMembership.create({
      data: {
        userId,
        serverId: society.serverId,
        isAutoJoined: false,
      },
      select: memberSelect,
    });

    // Auto-approve any pending request for this user
    await tx.societyMembershipRequest.updateMany({
      where: {
        societyId,
        userId,
        status: "PENDING",
      },
      data: {
        status: "APPROVED",
        reviewedBy: caller.id,
        reviewedAt: new Date(),
      },
    });

    return membership;
  });
}

export async function removeMember(societyId: number, userId: number, caller: CallerInfo) {
  const society = await findSocietyOrThrow(societyId);

  if (!isCallerAuthorized(society, caller)) {
    throw new ForbiddenError(
      "You do not have permission to remove members from this society",
      ApiErrorCode.SCOPE_FORBIDDEN
    );
  }

  // Cannot remove president or convenor
  if (society.president.user.id === userId || society.convenor.user.id === userId) {
    throw new ForbiddenError("Cannot remove society leadership. Change leadership roles first");
  }

  const membership = await prisma.serverMembership.findUnique({
    where: {
      userId_serverId: { userId, serverId: society.serverId },
    },
  });

  if (!membership) {
    throw new NotFoundError("User is not a member of this society");
  }

  await prisma.serverMembership.delete({
    where: {
      userId_serverId: { userId, serverId: society.serverId },
    },
  });
}

export async function listMembers(societyId: number, query: PaginationQuery, caller: CallerInfo) {
  const society = await findSocietyOrThrow(societyId);

  if (caller.userType !== "ADMIN") {
    const callerMembership = await prisma.serverMembership.findUnique({
      where: {
        userId_serverId: {
          userId: caller.id,
          serverId: society.serverId,
        },
      },
      select: { userId: true },
    });

    if (!callerMembership) {
      throw new ForbiddenError(
        "You do not have permission to view members of this society",
        ApiErrorCode.SCOPE_FORBIDDEN
      );
    }
  }

  const { page, limit, skip, take } = parsePagination(query);

  const where = { serverId: society.serverId };

  const [members, total] = await Promise.all([
    prisma.serverMembership.findMany({
      where,
      select: memberSelect,
      orderBy: { joinedAt: "asc" },
      skip,
      take,
    }),
    prisma.serverMembership.count({ where }),
  ]);

  const badgeMap = await resolveSocietyMemberBadges(
    society.serverId,
    members.map((member) => member.userId)
  );

  return {
    data: members.map((member) => ({
      ...member,
      badges: badgeMap.get(member.userId) ?? [],
    })),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function getMyMembershipStatus(societyId: number, userId: number) {
  const society = await findSocietyOrThrow(societyId);

  const [membership, request] = await Promise.all([
    prisma.serverMembership.findUnique({
      where: { userId_serverId: { userId, serverId: society.serverId } },
      select: { userId: true },
    }),
    prisma.societyMembershipRequest.findUnique({
      where: { societyId_userId: { societyId, userId } },
      select: { status: true, requestedAt: true, reviewedAt: true },
    }),
  ]);

  return {
    isMember: Boolean(membership),
    requestStatus: request?.status ?? null,
    requestedAt: request?.requestedAt ?? null,
    reviewedAt: request?.reviewedAt ?? null,
  };
}

export async function listMemberCandidates(
  societyId: number,
  query: MemberCandidatesQuery,
  caller: CallerInfo
) {
  const society = await findSocietyOrThrow(societyId);

  if (!isCallerAuthorized(society, caller)) {
    throw new ForbiddenError(
      "You do not have permission to add members to this society",
      ApiErrorCode.SCOPE_FORBIDDEN
    );
  }

  const { page, limit, skip, take } = parsePagination(query);
  const search = query.search?.trim();
  const where = {
    userType: "STUDENT" as const,
    isActive: true,
    serverMemberships: {
      none: { serverId: society.serverId },
    },
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: memberCandidateSelect,
      orderBy: [{ fullName: "asc" }, { id: "asc" }],
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users,
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function listLeadershipCandidates(
  query: LeadershipCandidatesQuery,
  caller: CallerInfo
) {
  const department = await prisma.department.findUnique({
    where: { id: query.departmentId },
    select: { id: true, hodId: true },
  });

  if (!department) {
    throw new NotFoundError("Department not found");
  }

  if (caller.userType !== "ADMIN" && department.hodId !== caller.id) {
    throw new ForbiddenError("Only an admin or the department HOD can view leadership candidates");
  }

  const { page, limit, skip, take } = parsePagination(query);
  const search = query.search?.trim();
  const where = {
    userType: query.role === "president" ? ("STUDENT" as const) : ("TEACHER" as const),
    isActive: true,
    departmentId: query.departmentId,
    ...(query.role === "president"
      ? { studentInfo: { isNot: null } }
      : { teacherInfo: { isNot: null } }),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: memberCandidateSelect,
      orderBy: [{ fullName: "asc" }, { id: "asc" }],
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users,
    pagination: buildPaginationResponse(page, limit, total),
  };
}
