import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors/index.js";
import { buildPaginationResponse, parsePagination } from "../../shared/utils/pagination.js";
import * as notificationService from "../notification/notification.service.js";
import { emitToUser } from "../../socket/index.js";

// ─── Types ─────────────────────────────────────────────────────────────────

type AssignRoleInput = {
  userId: number;
  role: string;
  scopeId?: number;
  serverId?: number;
  channelId?: number;
};

type ModeratorRole = "server_moderator" | "channel_moderator";
type AssignableRole = "hod" | "program_director" | "cr" | ModeratorRole;
type NonModeratorAssignableRole = Exclude<AssignableRole, ModeratorRole>;

type RevokeRoleInput = {
  userId: number;
  role: string;
  scopeId?: number;
  serverId?: number;
  channelId?: number;
};

type CallerInfo = {
  id: number;
  userType: string;
  departmentId: number | null;
};

type OptionQuery = {
  page?: unknown;
  limit?: unknown;
  search?: unknown;
};

type AssignableScopesQuery = OptionQuery & {
  role: AssignableRole;
};

type AssignableChannelsQuery = OptionQuery & {
  serverId: number;
};

type AssignableUsersQuery = OptionQuery & {
  role: AssignableRole;
  scopeId?: number;
  serverId?: number;
  channelId?: number;
};

type RevokableRolesQuery = OptionQuery & {
  role: AssignableRole;
  scopeId?: number;
  serverId?: number;
  channelId?: number;
};

type RoleOption = {
  role: AssignableRole;
  label: string;
  targetUserTypes: Array<"ADMIN" | "TEACHER" | "STUDENT">;
  scopeKind: "department" | "program" | "class" | "server";
  requiresServer: boolean;
  requiresChannel: boolean;
};

type ScopeOption = {
  id: number;
  label: string;
  kind: "department" | "program" | "class" | "server";
  serverId?: number;
  disabled: boolean;
  disabledReason?: string;
  currentAssignee?: {
    id: number;
    fullName: string;
    email: string;
  };
};

type ChannelOption = {
  id: number;
  serverId: number;
  label: string;
  type: string;
  isLocked: boolean;
};

type UserOption = {
  id: number;
  fullName: string;
  email: string;
  userType: string;
  departmentId: number | null;
};

type RevokableAssignment = {
  assignmentKey: string;
  role: AssignableRole;
  user: UserOption;
  scope?: {
    id: number;
    label: string;
    kind: "department" | "program" | "class";
  };
  server?: {
    id: number;
    label: string;
    type: string;
  };
  channel?: {
    id: number;
    label: string;
  };
  revokePayload:
    | { userId: number; role: NonModeratorAssignableRole; scopeId: number }
    | { userId: number; role: "server_moderator"; serverId: number }
    | { userId: number; role: "channel_moderator"; serverId: number; channelId: number };
};

const ROLE_OPTIONS: Record<AssignableRole, RoleOption> = {
  hod: {
    role: "hod",
    label: "HOD",
    targetUserTypes: ["TEACHER"],
    scopeKind: "department",
    requiresServer: false,
    requiresChannel: false,
  },
  program_director: {
    role: "program_director",
    label: "Program Director",
    targetUserTypes: ["TEACHER"],
    scopeKind: "program",
    requiresServer: false,
    requiresChannel: false,
  },
  cr: {
    role: "cr",
    label: "Class Representative",
    targetUserTypes: ["STUDENT"],
    scopeKind: "class",
    requiresServer: false,
    requiresChannel: false,
  },
  server_moderator: {
    role: "server_moderator",
    label: "Server Moderator",
    targetUserTypes: ["TEACHER", "STUDENT"],
    scopeKind: "server",
    requiresServer: true,
    requiresChannel: false,
  },
  channel_moderator: {
    role: "channel_moderator",
    label: "Channel Moderator",
    targetUserTypes: ["TEACHER", "STUDENT"],
    scopeKind: "server",
    requiresServer: true,
    requiresChannel: true,
  },
};

async function notifyRoleAssigned(
  userId: number,
  role: string,
  serverId: number,
  channelId?: number | null
): Promise<void> {
  try {
    await notificationService.createRoleAssignedNotification({
      userId,
      role,
      serverId,
      channelId,
    });
  } catch (error) {
    console.error("[RoleService] Failed to create role assignment notification:", error);
  }
}

function emitRolesUpdated(userId: number): void {
  emitToUser(userId, "auth:roles-updated", { userId });
}

// ─── Internal Helpers ──────────────────────────────────────────────────────

async function findActiveUserOrThrow(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      userType: true,
      isActive: true,
      departmentId: true,
      studentInfo: { select: { studentId: true, classId: true } },
      teacherInfo: { select: { teacherId: true } },
    },
  });

  if (!user || !user.isActive) {
    throw new NotFoundError("User not found or inactive");
  }

  return user;
}

function assertTeacher(user: Awaited<ReturnType<typeof findActiveUserOrThrow>>) {
  if (user.userType !== "TEACHER" || !user.teacherInfo) {
    throw new ValidationError("Target user must be a teacher for this role");
  }
}

function assertStudent(user: Awaited<ReturnType<typeof findActiveUserOrThrow>>) {
  if (user.userType !== "STUDENT" || !user.studentInfo) {
    throw new ValidationError("Target user must be a student for this role");
  }
}

// ─── Authorization Helpers ─────────────────────────────────────────────────

/**
 * Resolve the department ID that the caller (HOD) heads.
 * Returns null if caller is not HOD of any department.
 */
async function getCallerHODDepartmentId(callerId: number): Promise<number | null> {
  const dept = await prisma.department.findFirst({
    where: { hodId: callerId },
    select: { id: true },
  });
  return dept?.id ?? null;
}

/**
 * Resolve the program that the caller (PD) directs.
 * Returns null if caller is not PD of any program.
 */
async function getCallerPDProgram(callerId: number) {
  return prisma.program.findFirst({
    where: { programDirectorId: callerId },
    select: { id: true, departmentId: true },
  });
}

/**
 * Get the class that the caller is CR of.
 */
async function getCallerCRClass(callerId: number) {
  return prisma.class.findFirst({
    where: { crId: callerId },
    select: { id: true, serverId: true },
  });
}

/**
 * Get the society where the caller is president or convenor.
 */
async function getCallerSocietyLeadership(callerId: number) {
  return prisma.society.findFirst({
    where: {
      OR: [{ presidentId: callerId }, { convenorId: callerId }],
    },
    select: { id: true, serverId: true },
  });
}

async function getCallerSocietyLeadershipIds(callerId: number): Promise<number[]> {
  const societies = await prisma.society.findMany({
    where: {
      isActive: true,
      OR: [{ presidentId: callerId }, { convenorId: callerId }],
    },
    select: { id: true },
  });

  return societies.map((society) => society.id);
}

async function getCallerCRClassIds(callerId: number): Promise<number[]> {
  const classes = await prisma.class.findMany({
    where: { crId: callerId, status: "ACTIVE" },
    select: { id: true },
  });

  return classes.map((classRecord) => classRecord.id);
}

function normalizeSearch(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function emptyPaginated<T>(query: OptionQuery) {
  const { page, limit } = parsePagination(query);
  return {
    success: true as const,
    data: [] as T[],
    pagination: buildPaginationResponse(page, limit, 0),
  };
}

function buildUserSearch(search: string | undefined): Prisma.UserWhereInput | undefined {
  if (!search) {
    return undefined;
  }

  return {
    OR: [
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ],
  };
}

async function assertCallerCanOpenRoleManagement(caller: CallerInfo): Promise<void> {
  const options = await getAssignableRoles(caller);
  if (options.length === 0) {
    throw new ForbiddenError("Insufficient permissions to manage roles");
  }
}

async function getCallerModeratorServerWhere(caller: CallerInfo): Promise<Prisma.ServerWhereInput | null> {
  if (caller.userType === "ADMIN") {
    return { isActive: true };
  }

  const conditions: Prisma.ServerWhereInput[] = [];
  const hodDeptId = await getCallerHODDepartmentId(caller.id);
  if (hodDeptId) {
    conditions.push(
      { department: { is: { id: hodDeptId } } },
      { class: { is: { status: "ACTIVE", program: { departmentId: hodDeptId } } } },
      { society: { is: { isActive: true, departmentId: hodDeptId } } },
    );
  }

  const crClassIds = await getCallerCRClassIds(caller.id);
  if (crClassIds.length > 0) {
    conditions.push({ class: { is: { id: { in: crClassIds }, status: "ACTIVE" } } });
  }

  const societyLeadershipIds = await getCallerSocietyLeadershipIds(caller.id);
  if (societyLeadershipIds.length > 0) {
    conditions.push({ society: { is: { id: { in: societyLeadershipIds }, isActive: true } } });
  }

  if (conditions.length === 0) {
    return null;
  }

  return {
    isActive: true,
    OR: conditions,
  };
}

async function assertCallerCanUseModeratorServer(
  caller: CallerInfo,
  serverId: number
): Promise<void> {
  const where = await getCallerModeratorServerWhere(caller);
  if (!where) {
    throw new ForbiddenError("Insufficient permissions to manage moderators for this server");
  }

  const server = await prisma.server.findFirst({
    where: { ...where, id: serverId },
    select: { id: true },
  });

  if (!server) {
    throw new ForbiddenError("Insufficient permissions to manage moderators for this server");
  }
}

async function assertAssignableChannel(
  caller: CallerInfo,
  serverId: number,
  channelId: number
): Promise<void> {
  await assertCallerCanUseModeratorServer(caller, serverId);

  const channel = await prisma.channel.findFirst({
    where: {
      id: channelId,
      serverId,
      isDeleted: false,
      isArchived: false,
    },
    select: { id: true },
  });

  if (!channel) {
    throw new NotFoundError("Channel not found in this server");
  }
}

function labelUser(user: { fullName: string; email: string }) {
  return `${user.fullName} · ${user.email}`;
}

function positiveInt(value: number | string | undefined): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

// ─── Scoped Option APIs ────────────────────────────────────────────────────

export async function getAssignableRoles(caller: CallerInfo): Promise<RoleOption[]> {
  if (caller.userType === "ADMIN") {
    return [
      ROLE_OPTIONS.hod,
      ROLE_OPTIONS.program_director,
      ROLE_OPTIONS.cr,
      ROLE_OPTIONS.server_moderator,
      ROLE_OPTIONS.channel_moderator,
    ];
  }

  const [hodDeptId, pdProgram, crClassIds, societyLeadershipIds] = await Promise.all([
    getCallerHODDepartmentId(caller.id),
    getCallerPDProgram(caller.id),
    getCallerCRClassIds(caller.id),
    getCallerSocietyLeadershipIds(caller.id),
  ]);

  const roles: RoleOption[] = [];
  if (hodDeptId) {
    roles.push(ROLE_OPTIONS.program_director, ROLE_OPTIONS.cr);
  }
  if (pdProgram) {
    roles.push(ROLE_OPTIONS.cr);
  }
  if (hodDeptId || crClassIds.length > 0 || societyLeadershipIds.length > 0) {
    roles.push(ROLE_OPTIONS.server_moderator, ROLE_OPTIONS.channel_moderator);
  }

  return [...new Map(roles.map((role) => [role.role, role])).values()];
}

export async function listAssignableScopes(query: AssignableScopesQuery, caller: CallerInfo) {
  await assertCallerCanOpenRoleManagement(caller);

  switch (query.role) {
    case "hod":
      return listAssignableDepartmentScopes(query, caller);
    case "program_director":
      return listAssignableProgramScopes(query, caller);
    case "cr":
      return listAssignableClassScopes(query, caller);
    case "server_moderator":
    case "channel_moderator":
      return listAssignableModeratorServerScopes(query, caller);
    default:
      return emptyPaginated<ScopeOption>(query);
  }
}

async function listAssignableDepartmentScopes(query: OptionQuery, caller: CallerInfo) {
  if (caller.userType !== "ADMIN") {
    return emptyPaginated<ScopeOption>(query);
  }

  const { page, limit, skip, take } = parsePagination(query);
  const search = normalizeSearch(query.search);
  const where: Prisma.DepartmentWhereInput = search
    ? {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ],
    }
    : {};

  const [departments, total] = await prisma.$transaction([
    prisma.department.findMany({
      where,
      skip,
      take,
      orderBy: [{ code: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        code: true,
        hod: {
          select: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    }),
    prisma.department.count({ where }),
  ]);

  return {
    success: true as const,
    data: departments.map((department): ScopeOption => ({
      id: department.id,
      label: `${department.code} · ${department.name}`,
      kind: "department",
      disabled: department.hod !== null,
      disabledReason: department.hod ? `Already assigned to ${labelUser(department.hod.user)}` : undefined,
      currentAssignee: department.hod?.user,
    })),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

async function listAssignableProgramScopes(query: OptionQuery, caller: CallerInfo) {
  const { page, limit, skip, take } = parsePagination(query);
  const search = normalizeSearch(query.search);
  const where: Prisma.ProgramWhereInput = {};

  if (caller.userType !== "ADMIN") {
    const hodDeptId = await getCallerHODDepartmentId(caller.id);
    if (!hodDeptId) {
      return emptyPaginated<ScopeOption>(query);
    }
    where.departmentId = hodDeptId;
  }

  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { department: { name: { contains: search, mode: "insensitive" } } },
      { department: { code: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [programs, total] = await prisma.$transaction([
    prisma.program.findMany({
      where,
      skip,
      take,
      orderBy: [{ department: { code: "asc" } }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        department: { select: { name: true, code: true } },
        programDirector: {
          select: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    }),
    prisma.program.count({ where }),
  ]);

  return {
    success: true as const,
    data: programs.map((program): ScopeOption => ({
      id: program.id,
      label: `${program.code} · ${program.department.code}`,
      kind: "program",
      disabled: program.programDirector !== null,
      disabledReason: program.programDirector
        ? `Already assigned to ${labelUser(program.programDirector.user)}`
        : undefined,
      currentAssignee: program.programDirector?.user,
    })),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

async function listAssignableClassScopes(query: OptionQuery, caller: CallerInfo) {
  const { page, limit, skip, take } = parsePagination(query);
  const search = normalizeSearch(query.search);
  const where: Prisma.ClassWhereInput = { status: "ACTIVE" };

  if (caller.userType !== "ADMIN") {
    const [hodDeptId, pdProgram] = await Promise.all([
      getCallerHODDepartmentId(caller.id),
      getCallerPDProgram(caller.id),
    ]);
    const scopedOr: Prisma.ClassWhereInput[] = [];
    if (hodDeptId) {
      scopedOr.push({ program: { departmentId: hodDeptId } });
    }
    if (pdProgram) {
      scopedOr.push({ programId: pdProgram.id });
    }
    if (scopedOr.length === 0) {
      return emptyPaginated<ScopeOption>(query);
    }
    where.OR = scopedOr;
  }

  if (search) {
    const searchOr: Prisma.ClassWhereInput[] = [
      { program: { code: { contains: search, mode: "insensitive" } } },
      { program: { department: { code: { contains: search, mode: "insensitive" } } } },
    ];
    where.AND = [{ OR: where.OR }, { OR: searchOr }].filter((item) => item.OR !== undefined);
    delete where.OR;
  }

  const [classes, total] = await prisma.$transaction([
    prisma.class.findMany({
      where,
      skip,
      take,
      orderBy: [
        { program: { code: "asc" } },
        { currentSemester: "asc" },
        { section: "asc" },
        { admissionYear: "desc" },
      ],
      select: {
        id: true,
        serverId: true,
        currentSemester: true,
        section: true,
        admissionYear: true,
        program: { select: { code: true, department: { select: { code: true } } } },
        cr: {
          select: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    }),
    prisma.class.count({ where }),
  ]);

  return {
    success: true as const,
    data: classes.map((classRecord): ScopeOption => ({
      id: classRecord.id,
      label: `${classRecord.program.code}-${classRecord.currentSemester}${classRecord.section} · ${classRecord.admissionYear}`,
      kind: "class",
      serverId: classRecord.serverId,
      disabled: classRecord.cr !== null,
      disabledReason: classRecord.cr ? `Already assigned to ${labelUser(classRecord.cr.user)}` : undefined,
      currentAssignee: classRecord.cr?.user,
    })),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

async function listAssignableModeratorServerScopes(query: OptionQuery, caller: CallerInfo) {
  const { page, limit, skip, take } = parsePagination(query);
  const where = await getCallerModeratorServerWhere(caller);
  if (!where) {
    return emptyPaginated<ScopeOption>(query);
  }

  const search = normalizeSearch(query.search);
  const scopedWhere: Prisma.ServerWhereInput = search
    ? { AND: [where, { name: { contains: search, mode: "insensitive" } }] }
    : where;

  const [servers, total] = await prisma.$transaction([
    prisma.server.findMany({
      where: scopedWhere,
      skip,
      take,
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, name: true, type: true },
    }),
    prisma.server.count({ where: scopedWhere }),
  ]);

  return {
    success: true as const,
    data: servers.map((server): ScopeOption => ({
      id: server.id,
      label: `${server.name} · ${server.type}`,
      kind: "server",
      serverId: server.id,
      disabled: false,
    })),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function listAssignableChannels(query: AssignableChannelsQuery, caller: CallerInfo) {
  const serverId = positiveInt(query.serverId)!;
  await assertCallerCanUseModeratorServer(caller, serverId);

  const { page, limit, skip, take } = parsePagination(query);
  const search = normalizeSearch(query.search);
  const where: Prisma.ChannelWhereInput = {
    serverId,
    isDeleted: false,
    isArchived: false,
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
  };

  const [channels, total] = await prisma.$transaction([
    prisma.channel.findMany({
      where,
      skip,
      take,
      orderBy: [{ name: "asc" }],
      select: { id: true, serverId: true, name: true, type: true, isLocked: true },
    }),
    prisma.channel.count({ where }),
  ]);

  return {
    success: true as const,
    data: channels.map((channel): ChannelOption => ({
      id: channel.id,
      serverId: channel.serverId,
      label: `#${channel.name}`,
      type: channel.type,
      isLocked: channel.isLocked,
    })),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function listAssignableUsers(query: AssignableUsersQuery, caller: CallerInfo) {
  await assertCallerCanOpenRoleManagement(caller);

  switch (query.role) {
    case "hod":
      return listHodCandidateUsers(query, caller);
    case "program_director":
      return listProgramDirectorCandidateUsers(query, caller);
    case "cr":
      return listCrCandidateUsers(query, caller);
    case "server_moderator":
    case "channel_moderator":
      return listModeratorCandidateUsers(query, caller);
    default:
      return emptyPaginated<UserOption>(query);
  }
}

async function listHodCandidateUsers(query: AssignableUsersQuery, caller: CallerInfo) {
  const scopeId = positiveInt(query.scopeId);
  if (caller.userType !== "ADMIN" || !scopeId) {
    return emptyPaginated<UserOption>(query);
  }

  const department = await prisma.department.findUnique({
    where: { id: scopeId },
    select: { id: true },
  });
  if (!department) {
    throw new NotFoundError("Department not found");
  }

  return listTeacherUsersByWhere(query, { departmentId: scopeId });
}

async function listProgramDirectorCandidateUsers(query: AssignableUsersQuery, caller: CallerInfo) {
  const scopeId = positiveInt(query.scopeId);
  if (!scopeId) {
    return emptyPaginated<UserOption>(query);
  }

  const program = await prisma.program.findUnique({
    where: { id: scopeId },
    select: { id: true, departmentId: true },
  });
  if (!program) {
    throw new NotFoundError("Program not found");
  }

  await assertCallerCanAssignPD(caller, program.departmentId);
  return listTeacherUsersByWhere(query, { departmentId: program.departmentId });
}

async function listCrCandidateUsers(query: AssignableUsersQuery, caller: CallerInfo) {
  const scopeId = positiveInt(query.scopeId);
  if (!scopeId) {
    return emptyPaginated<UserOption>(query);
  }

  const classRecord = await prisma.class.findUnique({
    where: { id: scopeId },
    select: { id: true, status: true, programId: true, program: { select: { departmentId: true } } },
  });
  if (!classRecord || classRecord.status !== "ACTIVE") {
    throw new NotFoundError("Class not found");
  }

  await assertCallerCanAssignCR(caller, classRecord.program.departmentId, classRecord.programId);
  return listStudentUsersByWhere(query, { studentInfo: { is: { classId: classRecord.id } } });
}

async function listModeratorCandidateUsers(query: AssignableUsersQuery, caller: CallerInfo) {
  const serverId = positiveInt(query.serverId);
  const channelId = positiveInt(query.channelId);
  if (!serverId) {
    return emptyPaginated<UserOption>(query);
  }

  if (query.role === "channel_moderator") {
    if (!channelId) {
      return emptyPaginated<UserOption>(query);
    }
    await assertAssignableChannel(caller, serverId, channelId);
  } else {
    await assertCallerCanUseModeratorServer(caller, serverId);
  }

  const { page, limit, skip, take } = parsePagination(query);
  const search = normalizeSearch(query.search);
  const userSearch = buildUserSearch(search);
  const moderatorWhere =
    query.role === "channel_moderator"
      ? { serverId, channelId: channelId! }
      : { serverId, channelId: null };
  const where: Prisma.ServerMembershipWhereInput = {
    serverId,
    user: {
      isActive: true,
      ...(userSearch ?? {}),
      moderatorAssignments: {
        none: moderatorWhere,
      },
    },
  };

  const [memberships, total] = await prisma.$transaction([
    prisma.serverMembership.findMany({
      where,
      skip,
      take,
      orderBy: { user: { fullName: "asc" } },
      select: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            userType: true,
            departmentId: true,
          },
        },
      },
    }),
    prisma.serverMembership.count({ where }),
  ]);

  return {
    success: true as const,
    data: memberships.map((membership) => membership.user),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

async function listTeacherUsersByWhere(query: OptionQuery, where: Prisma.UserWhereInput) {
  const { page, limit, skip, take } = parsePagination(query);
  const search = normalizeSearch(query.search);
  const userSearch = buildUserSearch(search);
  const scopedWhere: Prisma.UserWhereInput = {
    ...where,
    ...(userSearch ?? {}),
    userType: "TEACHER",
    isActive: true,
    teacherInfo: { isNot: null },
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where: scopedWhere,
      skip,
      take,
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, email: true, userType: true, departmentId: true },
    }),
    prisma.user.count({ where: scopedWhere }),
  ]);

  return {
    success: true as const,
    data: users,
    pagination: buildPaginationResponse(page, limit, total),
  };
}

async function listStudentUsersByWhere(query: OptionQuery, where: Prisma.UserWhereInput) {
  const { page, limit, skip, take } = parsePagination(query);
  const search = normalizeSearch(query.search);
  const userSearch = buildUserSearch(search);
  const scopedWhere: Prisma.UserWhereInput = {
    ...where,
    ...(userSearch ?? {}),
    userType: "STUDENT",
    isActive: true,
    studentInfo: where.studentInfo ?? { isNot: null },
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where: scopedWhere,
      skip,
      take,
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, email: true, userType: true, departmentId: true },
    }),
    prisma.user.count({ where: scopedWhere }),
  ]);

  return {
    success: true as const,
    data: users,
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function listRevokableRoles(query: RevokableRolesQuery, caller: CallerInfo) {
  await assertCallerCanOpenRoleManagement(caller);

  switch (query.role) {
    case "hod":
      return listRevokableHodAssignments(query, caller);
    case "program_director":
      return listRevokableProgramDirectorAssignments(query, caller);
    case "cr":
      return listRevokableCrAssignments(query, caller);
    case "server_moderator":
    case "channel_moderator":
      return listRevokableModeratorAssignments(query, caller);
    default:
      return emptyPaginated<RevokableAssignment>(query);
  }
}

async function listRevokableHodAssignments(query: RevokableRolesQuery, caller: CallerInfo) {
  if (caller.userType !== "ADMIN") {
    return emptyPaginated<RevokableAssignment>(query);
  }

  const { page, limit, skip, take } = parsePagination(query);
  const search = normalizeSearch(query.search);
  const scopeId = positiveInt(query.scopeId);
  const where: Prisma.DepartmentWhereInput = {
    hodId: { not: null },
    ...(scopeId ? { id: scopeId } : {}),
    ...(search
      ? {
        OR: [
          { code: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
          { hod: { user: { fullName: { contains: search, mode: "insensitive" } } } },
          { hod: { user: { email: { contains: search, mode: "insensitive" } } } },
        ],
      }
      : {}),
  };

  const [departments, total] = await prisma.$transaction([
    prisma.department.findMany({
      where,
      skip,
      take,
      orderBy: [{ code: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        hod: { select: { user: { select: { id: true, fullName: true, email: true, userType: true, departmentId: true } } } },
      },
    }),
    prisma.department.count({ where }),
  ]);

  return {
    success: true as const,
    data: departments
      .filter((department) => department.hod !== null)
      .map((department): RevokableAssignment => ({
        assignmentKey: `hod:${department.id}:${department.hod!.user.id}`,
        role: "hod",
        user: department.hod!.user,
        scope: { id: department.id, kind: "department", label: `${department.code} · ${department.name}` },
        revokePayload: { userId: department.hod!.user.id, role: "hod", scopeId: department.id },
      })),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

async function listRevokableProgramDirectorAssignments(query: RevokableRolesQuery, caller: CallerInfo) {
  const { page, limit, skip, take } = parsePagination(query);
  const search = normalizeSearch(query.search);
  const scopeId = positiveInt(query.scopeId);
  const where: Prisma.ProgramWhereInput = {
    programDirectorId: { not: null },
    ...(scopeId ? { id: scopeId } : {}),
  };

  if (caller.userType !== "ADMIN") {
    const hodDeptId = await getCallerHODDepartmentId(caller.id);
    if (!hodDeptId) {
      return emptyPaginated<RevokableAssignment>(query);
    }
    where.departmentId = hodDeptId;
  }

  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { department: { code: { contains: search, mode: "insensitive" } } },
      { programDirector: { user: { fullName: { contains: search, mode: "insensitive" } } } },
      { programDirector: { user: { email: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const [programs, total] = await prisma.$transaction([
    prisma.program.findMany({
      where,
      skip,
      take,
      orderBy: [{ code: "asc" }],
      select: {
        id: true,
        code: true,
        department: { select: { code: true } },
        programDirector: { select: { user: { select: { id: true, fullName: true, email: true, userType: true, departmentId: true } } } },
      },
    }),
    prisma.program.count({ where }),
  ]);

  return {
    success: true as const,
    data: programs
      .filter((program) => program.programDirector !== null)
      .map((program): RevokableAssignment => ({
        assignmentKey: `program_director:${program.id}:${program.programDirector!.user.id}`,
        role: "program_director",
        user: program.programDirector!.user,
        scope: { id: program.id, kind: "program", label: `${program.code} · ${program.department.code}` },
        revokePayload: {
          userId: program.programDirector!.user.id,
          role: "program_director",
          scopeId: program.id,
        },
      })),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

async function listRevokableCrAssignments(query: RevokableRolesQuery, caller: CallerInfo) {
  const { page, limit, skip, take } = parsePagination(query);
  const search = normalizeSearch(query.search);
  const scopeId = positiveInt(query.scopeId);
  const where: Prisma.ClassWhereInput = {
    status: "ACTIVE",
    crId: { not: null },
    ...(scopeId ? { id: scopeId } : {}),
  };

  if (caller.userType !== "ADMIN") {
    const [hodDeptId, pdProgram] = await Promise.all([
      getCallerHODDepartmentId(caller.id),
      getCallerPDProgram(caller.id),
    ]);
    const scopedOr: Prisma.ClassWhereInput[] = [];
    if (hodDeptId) {
      scopedOr.push({ program: { departmentId: hodDeptId } });
    }
    if (pdProgram) {
      scopedOr.push({ programId: pdProgram.id });
    }
    if (scopedOr.length === 0) {
      return emptyPaginated<RevokableAssignment>(query);
    }
    where.OR = scopedOr;
  }

  if (search) {
    const searchOr: Prisma.ClassWhereInput[] = [
      { program: { code: { contains: search, mode: "insensitive" } } },
      { cr: { user: { fullName: { contains: search, mode: "insensitive" } } } },
      { cr: { user: { email: { contains: search, mode: "insensitive" } } } },
    ];
    where.AND = [{ OR: where.OR }, { OR: searchOr }].filter((item) => item.OR !== undefined);
    delete where.OR;
  }

  const [classes, total] = await prisma.$transaction([
    prisma.class.findMany({
      where,
      skip,
      take,
      orderBy: [{ program: { code: "asc" } }, { currentSemester: "asc" }, { section: "asc" }],
      select: {
        id: true,
        currentSemester: true,
        section: true,
        admissionYear: true,
        program: { select: { code: true } },
        cr: { select: { user: { select: { id: true, fullName: true, email: true, userType: true, departmentId: true } } } },
      },
    }),
    prisma.class.count({ where }),
  ]);

  return {
    success: true as const,
    data: classes
      .filter((classRecord) => classRecord.cr !== null)
      .map((classRecord): RevokableAssignment => {
        const label = `${classRecord.program.code}-${classRecord.currentSemester}${classRecord.section} · ${classRecord.admissionYear}`;
        return {
          assignmentKey: `cr:${classRecord.id}:${classRecord.cr!.user.id}`,
          role: "cr",
          user: classRecord.cr!.user,
          scope: { id: classRecord.id, kind: "class", label },
          revokePayload: { userId: classRecord.cr!.user.id, role: "cr", scopeId: classRecord.id },
        };
      }),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

async function listRevokableModeratorAssignments(query: RevokableRolesQuery, caller: CallerInfo) {
  const { page, limit, skip, take } = parsePagination(query);
  const serverWhere = await getCallerModeratorServerWhere(caller);
  if (!serverWhere) {
    return emptyPaginated<RevokableAssignment>(query);
  }

  const serverId = positiveInt(query.serverId);
  const channelId = positiveInt(query.channelId);

  if (serverId) {
    await assertCallerCanUseModeratorServer(caller, serverId);
  }
  if (query.role === "channel_moderator" && serverId && channelId) {
    await assertAssignableChannel(caller, serverId, channelId);
  }

  const search = normalizeSearch(query.search);
  const where: Prisma.ModeratorAssignmentWhereInput = {
    scopeType: query.role === "channel_moderator" ? "CHANNEL" : "SERVER",
    server: serverWhere,
    ...(serverId ? { serverId } : {}),
    ...(query.role === "channel_moderator" && channelId ? { channelId } : {}),
    ...(query.role === "server_moderator" ? { channelId: null } : {}),
  };

  if (query.role === "channel_moderator") {
    where.channel = { is: { isDeleted: false, isArchived: false } };
  }

  if (search) {
    where.OR = [
      { user: { fullName: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { server: { name: { contains: search, mode: "insensitive" } } },
      { channel: { is: { name: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const [assignments, total] = await prisma.$transaction([
    prisma.moderatorAssignment.findMany({
      where,
      skip,
      take,
      orderBy: [{ assignedAt: "desc" }],
      select: {
        id: true,
        serverId: true,
        channelId: true,
        user: { select: { id: true, fullName: true, email: true, userType: true, departmentId: true } },
        server: { select: { id: true, name: true, type: true } },
        channel: { select: { id: true, name: true } },
      },
    }),
    prisma.moderatorAssignment.count({ where }),
  ]);

  return {
    success: true as const,
    data: assignments.map((assignment): RevokableAssignment => {
      if (query.role === "channel_moderator" && assignment.channelId && assignment.channel) {
        return {
          assignmentKey: `channel_moderator:${assignment.id}`,
          role: "channel_moderator",
          user: assignment.user,
          server: {
            id: assignment.server.id,
            label: assignment.server.name,
            type: assignment.server.type,
          },
          channel: { id: assignment.channel.id, label: `#${assignment.channel.name}` },
          revokePayload: {
            userId: assignment.user.id,
            role: "channel_moderator",
            serverId: assignment.serverId,
            channelId: assignment.channelId,
          },
        };
      }

      return {
        assignmentKey: `server_moderator:${assignment.id}`,
        role: "server_moderator",
        user: assignment.user,
        server: {
          id: assignment.server.id,
          label: assignment.server.name,
          type: assignment.server.type,
        },
        revokePayload: {
          userId: assignment.user.id,
          role: "server_moderator",
          serverId: assignment.serverId,
        },
      };
    }),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

// ─── Assign Authorization ──────────────────────────────────────────────────

async function assertCallerCanAssignHOD(caller: CallerInfo): Promise<void> {
  if (caller.userType === "ADMIN") return;
  throw new ForbiddenError("Only admin can assign the HOD role");
}

async function assertCallerCanAssignPD(
  caller: CallerInfo,
  targetDepartmentId: number
): Promise<void> {
  if (caller.userType === "ADMIN") return;

  // HOD can assign PD within their department
  const hodDeptId = await getCallerHODDepartmentId(caller.id);
  if (hodDeptId === targetDepartmentId) return;

  throw new ForbiddenError("Insufficient permissions to assign program director");
}

async function assertCallerCanAssignCR(
  caller: CallerInfo,
  targetClassDepartmentId: number,
  targetClassProgramId: number
): Promise<void> {
  if (caller.userType === "ADMIN") return;

  // HOD can assign CR within their department
  const hodDeptId = await getCallerHODDepartmentId(caller.id);
  if (hodDeptId === targetClassDepartmentId) return;

  // PD can assign CR within their program
  const pdProgram = await getCallerPDProgram(caller.id);
  if (pdProgram && pdProgram.id === targetClassProgramId) return;

  throw new ForbiddenError("Insufficient permissions to assign CR");
}

async function assertCallerCanAssignModerator(
  caller: CallerInfo,
  targetServerId: number
): Promise<void> {
  if (caller.userType === "ADMIN") return;

  // HOD can assign moderator in servers within their department
  const hodDeptId = await getCallerHODDepartmentId(caller.id);
  if (hodDeptId) {
    // Check if the target server belongs to their department (dept server, class server, or society server)
    const deptServer = await prisma.department.findFirst({
      where: { id: hodDeptId, serverId: targetServerId },
    });
    if (deptServer) return;

    const classServer = await prisma.class.findFirst({
      where: {
        serverId: targetServerId,
        program: { departmentId: hodDeptId },
      },
    });
    if (classServer) return;

    const societyServer = await prisma.society.findFirst({
      where: { serverId: targetServerId, departmentId: hodDeptId },
    });
    if (societyServer) return;
  }

  // CR can assign moderator in their class server
  const crClass = await getCallerCRClass(caller.id);
  if (crClass && crClass.serverId === targetServerId) return;

  // Society convenor/president can assign moderator in their society server
  const societyLeadership = await getCallerSocietyLeadership(caller.id);
  if (societyLeadership && societyLeadership.serverId === targetServerId) return;

  throw new ForbiddenError("Insufficient permissions to assign moderator");
}

// ─── Assign Role ───────────────────────────────────────────────────────────

export async function assignRole(input: AssignRoleInput, caller: CallerInfo) {
  const targetUser = await findActiveUserOrThrow(input.userId);

  switch (input.role) {
    case "hod": {
      const result = await assignHOD(input.scopeId!, targetUser, caller);
      await notifyRoleAssigned(result.userId, result.role, result.serverId);
      emitRolesUpdated(result.userId);
      return result;
    }
    case "program_director": {
      const result = await assignProgramDirector(input.scopeId!, targetUser, caller);
      await notifyRoleAssigned(result.userId, result.role, result.serverId);
      emitRolesUpdated(result.userId);
      return result;
    }
    case "cr": {
      const result = await assignCR(input.scopeId!, targetUser, caller);
      await notifyRoleAssigned(result.userId, result.role, result.serverId);
      emitRolesUpdated(result.userId);
      return result;
    }
    case "society_president": {
      throw new ValidationError(
        "Society president changes must use PATCH /api/societies/:id"
      );
    }
    case "society_convenor": {
      throw new ValidationError(
        "Society convenor changes must use PATCH /api/societies/:id"
      );
    }
    case "server_moderator": {
      const result = await assignModerator("server_moderator", input.serverId!, undefined, targetUser, caller);
      await notifyRoleAssigned(result.userId, result.role, result.serverId);
      emitRolesUpdated(result.userId);
      return result;
    }
    case "channel_moderator": {
      const result = await assignModerator("channel_moderator", input.serverId!, input.channelId!, targetUser, caller);
      await notifyRoleAssigned(result.userId, result.role, result.serverId, result.channelId);
      emitRolesUpdated(result.userId);
      return result;
    }
    default:
      throw new ValidationError("Unknown role");
  }
}

async function assignHOD(
  departmentId: number,
  targetUser: Awaited<ReturnType<typeof findActiveUserOrThrow>>,
  caller: CallerInfo
) {
  assertTeacher(targetUser);
  await assertCallerCanAssignHOD(caller);

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true, name: true, hodId: true, serverId: true },
  });

  if (!department) {
    throw new NotFoundError("Department not found");
  }

  if (department.hodId) {
    throw new ConflictError("Department already has an HOD assigned. Revoke the current HOD first");
  }

  // Verify teacher belongs to this department
  if (targetUser.departmentId !== departmentId) {
    throw new ValidationError("Teacher must belong to the target department");
  }

  await prisma.department.update({
    where: { id: departmentId },
    data: { hodId: targetUser.id },
  });

  return {
    role: "hod",
    userId: targetUser.id,
    departmentId,
    departmentName: department.name,
    serverId: department.serverId,
  };
}

async function assignProgramDirector(
  programId: number,
  targetUser: Awaited<ReturnType<typeof findActiveUserOrThrow>>,
  caller: CallerInfo
) {
  assertTeacher(targetUser);

  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: {
      id: true,
      code: true,
      departmentId: true,
      programDirectorId: true,
      department: { select: { serverId: true } },
    },
  });

  if (!program) {
    throw new NotFoundError("Program not found");
  }

  await assertCallerCanAssignPD(caller, program.departmentId);

  if (program.programDirectorId) {
    throw new ConflictError("Program already has a Program Director assigned. Revoke the current PD first");
  }

  // Verify teacher belongs to the program's department
  if (targetUser.departmentId !== program.departmentId) {
    throw new ValidationError("Teacher must belong to the program's department");
  }

  await prisma.program.update({
    where: { id: programId },
    data: { programDirectorId: targetUser.id },
  });

  return {
    role: "program_director",
    userId: targetUser.id,
    programId,
    programCode: program.code,
    serverId: program.department.serverId,
  };
}

async function assignCR(
  classId: number,
  targetUser: Awaited<ReturnType<typeof findActiveUserOrThrow>>,
  caller: CallerInfo
) {
  assertStudent(targetUser);

  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      crId: true,
      serverId: true,
      program: { select: { id: true, departmentId: true } },
    },
  });

  if (!classRecord) {
    throw new NotFoundError("Class not found");
  }

  await assertCallerCanAssignCR(caller, classRecord.program.departmentId, classRecord.program.id);

  if (classRecord.crId) {
    throw new ConflictError("Class already has a CR assigned. Revoke the current CR first");
  }

  // Verify student belongs to this class
  if (targetUser.studentInfo!.classId !== classId) {
    throw new ValidationError("Student must belong to the target class");
  }

  await prisma.class.update({
    where: { id: classId },
    data: { crId: targetUser.id },
  });

  return { role: "cr", userId: targetUser.id, classId, serverId: classRecord.serverId };
}

async function assignModerator(
  role: ModeratorRole,
  serverId: number,
  channelId: number | undefined,
  targetUser: Awaited<ReturnType<typeof findActiveUserOrThrow>>,
  caller: CallerInfo
) {
  await assertCallerCanAssignModerator(caller, serverId);

  // Verify server exists
  const server = await prisma.server.findUnique({
    where: { id: serverId },
    select: { id: true, name: true, isActive: true },
  });

  if (!server || !server.isActive) {
    throw new NotFoundError("Server not found or inactive");
  }

  // Verify user is a member of the server
  const membership = await prisma.serverMembership.findUnique({
    where: {
      userId_serverId: { userId: targetUser.id, serverId },
    },
  });

  if (!membership) {
    throw new ValidationError("User must be a member of the server to be assigned as moderator");
  }

  // If channel-scoped, verify channel belongs to server
  if (role === "channel_moderator") {
    const channel = await prisma.channel.findFirst({
      where: { id: channelId, serverId, isDeleted: false },
    });

    if (!channel) {
      throw new NotFoundError("Channel not found in this server");
    }
  }

  const scopeType = role === "channel_moderator" ? "CHANNEL" : "SERVER";

  // Check for existing assignment (NULL channelId doesn't trigger unique constraint in PostgreSQL)
  const existing = await prisma.moderatorAssignment.findFirst({
    where: {
      userId: targetUser.id,
      serverId,
      channelId: channelId ?? null,
    },
  });

  if (existing) {
    throw new ConflictError("User is already a moderator for this scope");
  }

  const assignment = await prisma.moderatorAssignment.create({
    data: {
      userId: targetUser.id,
      scopeType,
      serverId,
      channelId: channelId ?? null,
      assignedBy: caller.id,
    },
  });

  return {
    role,
    userId: targetUser.id,
    serverId,
    channelId: role === "channel_moderator" ? (channelId ?? null) : null,
    scopeType: scopeType.toLowerCase(),
    assignmentId: assignment.id,
  };
}

// ─── Revoke Role ───────────────────────────────────────────────────────────

export async function revokeRole(input: RevokeRoleInput, caller: CallerInfo) {
  const result = await (async () => {
    switch (input.role) {
    case "hod":
      return revokeHOD(input.scopeId!, input.userId, caller);
    case "program_director":
      return revokeProgramDirector(input.scopeId!, input.userId, caller);
    case "cr":
      return revokeCR(input.scopeId!, input.userId, caller);
    case "server_moderator":
      return revokeModerator("server_moderator", input.serverId!, undefined, input.userId, caller);
    case "channel_moderator":
      return revokeModerator("channel_moderator", input.serverId!, input.channelId!, input.userId, caller);
    default:
      throw new ValidationError("Unknown role");
    }
  })();

  emitRolesUpdated(input.userId);
  return result;
}

async function revokeHOD(departmentId: number, userId: number, caller: CallerInfo) {
  await assertCallerCanAssignHOD(caller);

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true, name: true, hodId: true },
  });

  if (!department) {
    throw new NotFoundError("Department not found");
  }

  if (department.hodId !== userId) {
    throw new NotFoundError("User is not the HOD of this department");
  }

  await prisma.department.update({
    where: { id: departmentId },
    data: { hodId: null },
  });

  return { role: "hod", userId, departmentId, departmentName: department.name };
}

async function revokeProgramDirector(programId: number, userId: number, caller: CallerInfo) {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { id: true, code: true, departmentId: true, programDirectorId: true },
  });

  if (!program) {
    throw new NotFoundError("Program not found");
  }

  await assertCallerCanAssignPD(caller, program.departmentId);

  if (program.programDirectorId !== userId) {
    throw new NotFoundError("User is not the Program Director of this program");
  }

  await prisma.program.update({
    where: { id: programId },
    data: { programDirectorId: null },
  });

  return { role: "program_director", userId, programId, programCode: program.code };
}

async function revokeCR(classId: number, userId: number, caller: CallerInfo) {
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      crId: true,
      program: { select: { id: true, departmentId: true } },
    },
  });

  if (!classRecord) {
    throw new NotFoundError("Class not found");
  }

  await assertCallerCanAssignCR(caller, classRecord.program.departmentId, classRecord.program.id);

  if (classRecord.crId !== userId) {
    throw new NotFoundError("User is not the CR of this class");
  }

  await prisma.class.update({
    where: { id: classId },
    data: { crId: null },
  });

  return { role: "cr", userId, classId };
}

async function revokeModerator(
  role: ModeratorRole,
  serverId: number,
  channelId: number | undefined,
  userId: number,
  caller: CallerInfo
) {
  await assertCallerCanAssignModerator(caller, serverId);

  const assignment = await prisma.moderatorAssignment.findFirst({
    where: {
      userId,
      serverId,
      channelId: channelId ?? null,
    },
  });

  if (!assignment) {
    throw new NotFoundError("Moderator assignment not found");
  }

  await prisma.moderatorAssignment.delete({
    where: { id: assignment.id },
  });

  return {
    role,
    userId,
    serverId,
    channelId: role === "channel_moderator" ? (channelId ?? null) : null,
    scopeType: assignment.scopeType.toLowerCase(),
  };
}

// ─── Get User Roles ────────────────────────────────────────────────────────

export async function getUserRoles(userId: number, caller: CallerInfo) {
  // Verify target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, departmentId: true, isActive: true },
  });

  if (!targetUser) {
    throw new NotFoundError("User not found");
  }

  // Authorization: Admin unrestricted, HOD only within their department
  if (caller.userType !== "ADMIN") {
    const hodDeptId = await getCallerHODDepartmentId(caller.id);
    if (!hodDeptId) {
      throw new ForbiddenError("Insufficient permissions to view user roles");
    }
    if (targetUser.departmentId !== hodDeptId) {
      throw new ForbiddenError("You can only view roles for users in your department");
    }
  }

  // Query all role assignments in parallel
  const [hodDepartments, directedPrograms, crClasses, presidentSocieties, convenorSocieties, moderatorAssignments] =
    await Promise.all([
      prisma.department.findMany({
        where: { hodId: userId },
        select: { id: true, name: true },
      }),
      prisma.program.findMany({
        where: { programDirectorId: userId },
        select: { id: true, code: true, department: { select: { name: true } } },
      }),
      prisma.class.findMany({
        where: { crId: userId },
        select: {
          id: true,
          serverId: true,
          currentSemester: true,
          section: true,
          program: { select: { code: true } },
        },
      }),
      prisma.society.findMany({
        where: { presidentId: userId },
        select: { id: true, name: true },
      }),
      prisma.society.findMany({
        where: { convenorId: userId },
        select: { id: true, name: true },
      }),
      prisma.moderatorAssignment.findMany({
        where: { userId },
        select: {
          id: true,
          serverId: true,
          channelId: true,
          scopeType: true,
          server: { select: { name: true } },
          channel: { select: { name: true } },
        },
      }),
    ]);

  const roles: Array<Record<string, unknown>> = [];

  for (const dept of hodDepartments) {
    roles.push({
      role: "hod",
      departmentId: dept.id,
      departmentName: dept.name,
      scopeContext: `HOD of ${dept.name}`,
    });
  }

  for (const prog of directedPrograms) {
    roles.push({
      role: "program_director",
      programId: prog.id,
      programCode: prog.code,
      scopeContext: `Program Director of ${prog.code} (${prog.department.name})`,
    });
  }

  for (const cls of crClasses) {
    roles.push({
      role: "cr",
      classId: cls.id,
      serverId: cls.serverId,
      scopeContext: `CR of ${cls.program.code}-${cls.currentSemester}${cls.section}`,
    });
  }

  for (const soc of presidentSocieties) {
    roles.push({
      role: "society_president",
      societyId: soc.id,
      societyName: soc.name,
      scopeContext: `President of ${soc.name}`,
    });
  }

  for (const soc of convenorSocieties) {
    roles.push({
      role: "society_convenor",
      societyId: soc.id,
      societyName: soc.name,
      scopeContext: `Convenor of ${soc.name}`,
    });
  }

  for (const mod of moderatorAssignments) {
    const isChannel = mod.scopeType === "CHANNEL";
    roles.push({
      role: isChannel ? "channel_moderator" : "server_moderator",
      serverId: mod.serverId,
      channelId: mod.channelId,
      scopeType: mod.scopeType.toLowerCase(),
      serverName: mod.server.name,
      channelName: mod.channel?.name ?? null,
      scopeContext: isChannel
        ? `Channel Moderator of #${mod.channel?.name ?? "unknown"} in ${mod.server.name}`
        : `Server Moderator of ${mod.server.name}`,
    });
  }

  return roles;
}
