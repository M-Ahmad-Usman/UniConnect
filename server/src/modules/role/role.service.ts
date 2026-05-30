import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import {
  ApiErrorCode,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors/index.js";
import {
  buildPaginationResponse,
  parsePagination,
} from "../../shared/utils/pagination.js";
import {
  resolveChannelPublicId,
  resolveClassPublicId,
  resolveServerPublicId,
  resolveUserPublicId,
} from "../../shared/ids/index.js";
import {
  activePlatformRoleAssignmentWhere,
  activePlatformRoleServerWhere,
  type PlatformRoleName,
} from "../../shared/roles/index.js";
import * as notificationService from "../notification/notification.service.js";
import { emitToUser } from "../../socket/index.js";
import type { AuditContext } from "../audit/audit.service.js";
import { recordAuditLog } from "../audit/audit.service.js";

// ─── Types ─────────────────────────────────────────────────────────────────

type ModeratorRole = "server_moderator" | "channel_moderator";
type AssignableRole = "hod" | "program_director" | "cr" | ModeratorRole;
type NonModeratorAssignableRole = Exclude<AssignableRole, ModeratorRole>;

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
  serverPublicId: string;
};

type AssignableUsersQuery = OptionQuery & {
  role: AssignableRole;
  scopeId?: number;
  classPublicId?: string;
  serverPublicId?: string;
  channelPublicId?: string;
};

type RevokableRolesQuery = OptionQuery & {
  role: AssignableRole;
  scopeId?: number;
  classPublicId?: string;
  serverPublicId?: string;
  channelPublicId?: string;
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
  id?: number;
  publicId?: string;
  label: string;
  kind: "department" | "program" | "class" | "server";
  serverPublicId?: string;
  disabled: boolean;
  disabledReason?: string;
  currentAssignee?: {
    publicId: string;
    fullName: string;
    email: string;
  };
};

type ChannelOption = {
  publicId: string;
  serverPublicId: string;
  label: string;
  type: string;
  isLocked: boolean;
};

type UserOption = {
  publicId: string;
  fullName: string;
  email: string;
  userType: string;
  departmentId: number | null;
};

type RevokableAssignment = {
  assignmentKey: string;
  role: AssignableRole;
  expiresAt?: Date | null;
  user: UserOption;
  scope?: {
    id?: number;
    publicId?: string;
    label: string;
    kind: "department" | "program" | "class";
  };
  server?: {
    publicId: string;
    label: string;
    type: string;
  };
  channel?: {
    publicId: string;
    label: string;
  };
  revokePayload:
    | { role: NonModeratorAssignableRole; scopeId: number }
    | { role: "cr"; classPublicId: string }
    | { assignmentPublicId: string };
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
  channelId?: number | null,
): Promise<void> {
  try {
    await notificationService.createRoleAssignedNotification({
      userId,
      role,
      serverId,
      channelId,
    });
  } catch (error) {
    console.error(
      "[RoleService] Failed to create role assignment notification:",
      error,
    );
  }
}

function emitRolesUpdated(userId: number): void {
  emitToUser(userId, "auth:roles-updated", {});
}

// ─── Internal Helpers ──────────────────────────────────────────────────────

async function findActiveUserOrThrow(userPublicId: string) {
  const resolved = await resolveUserPublicId(userPublicId);
  const user = await prisma.user.findUnique({
    where: { id: resolved.id },
    select: {
      id: true,
      publicId: true,
      userType: true,
      status: true,
      isActive: true,
      isDeleted: true,
      departmentId: true,
      studentInfo: { select: { studentId: true, classId: true } },
      teacherInfo: { select: { teacherId: true } },
    },
  });

  if (!user || user.status !== "ACTIVE" || !user.isActive || user.isDeleted) {
    throw new NotFoundError("User not found or inactive");
  }

  return user;
}

function assertTeacher(
  user: Awaited<ReturnType<typeof findActiveUserOrThrow>>,
) {
  if (user.userType !== "TEACHER" || !user.teacherInfo) {
    throw new ValidationError("Target user must be a teacher for this role");
  }
}

function assertStudent(
  user: Awaited<ReturnType<typeof findActiveUserOrThrow>>,
) {
  if (user.userType !== "STUDENT" || !user.studentInfo) {
    throw new ValidationError("Target user must be a student for this role");
  }
}

// ─── Authorization Helpers ─────────────────────────────────────────────────

/**
 * Resolve the department ID that the caller (HOD) heads.
 * Returns null if caller is not HOD of any department.
 */
async function getCallerHODDepartmentId(
  callerId: number,
): Promise<number | null> {
  const dept = await prisma.department.findFirst({
    where: {
      hodId: callerId,
      hod: { user: { status: "ACTIVE", isActive: true, isDeleted: false } },
      server: activePlatformRoleServerWhere(),
    },
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
    where: {
      programDirectorId: callerId,
      programDirector: {
        user: { status: "ACTIVE", isActive: true, isDeleted: false },
      },
      department: { server: activePlatformRoleServerWhere() },
    },
    select: { id: true, departmentId: true },
  });
}

/**
 * Get the class that the caller is CR of.
 */
async function getCallerCRClass(callerId: number) {
  return prisma.class.findFirst({
    where: {
      crId: callerId,
      status: "ACTIVE",
      cr: { user: { status: "ACTIVE", isActive: true, isDeleted: false } },
      server: activePlatformRoleServerWhere(),
    },
    select: { id: true, serverId: true },
  });
}

/**
 * Get the society where the caller is president or convenor.
 */
async function getCallerSocietyLeadership(callerId: number) {
  return prisma.society.findFirst({
    where: {
      status: "ACTIVE",
      isActive: true,
      isDeleted: false,
      server: activePlatformRoleServerWhere(),
      OR: [{ presidentId: callerId }, { convenorId: callerId }],
    },
    select: { id: true, serverId: true },
  });
}

async function getCallerSocietyLeadershipIds(
  callerId: number,
): Promise<number[]> {
  const societies = await prisma.society.findMany({
    where: {
      status: "ACTIVE",
      isActive: true,
      isDeleted: false,
      server: activePlatformRoleServerWhere(),
      OR: [{ presidentId: callerId }, { convenorId: callerId }],
    },
    select: { id: true },
  });

  return societies.map((society) => society.id);
}

async function getCallerCRClassIds(callerId: number): Promise<number[]> {
  const classes = await prisma.class.findMany({
    where: {
      crId: callerId,
      status: "ACTIVE",
      server: activePlatformRoleServerWhere(),
    },
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

function buildUserSearch(
  search: string | undefined,
): Prisma.UserWhereInput | undefined {
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

async function assertCallerCanOpenRoleManagement(
  caller: CallerInfo,
): Promise<void> {
  const options = await getAssignableRoles(caller);
  if (options.length === 0) {
    throw new ForbiddenError(
      "You do not have permission to manage roles in this scope",
      ApiErrorCode.SCOPE_FORBIDDEN,
    );
  }
}

async function getCallerModeratorServerWhere(
  caller: CallerInfo,
): Promise<Prisma.ServerWhereInput | null> {
  if (caller.userType === "ADMIN") {
    return activePlatformRoleServerWhere();
  }

  const conditions: Prisma.ServerWhereInput[] = [];
  const hodDeptId = await getCallerHODDepartmentId(caller.id);
  if (hodDeptId) {
    conditions.push(
      { department: { is: { id: hodDeptId } } },
      {
        class: {
          is: { status: "ACTIVE", program: { departmentId: hodDeptId } },
        },
      },
      {
        society: {
          is: {
            status: "ACTIVE",
            isActive: true,
            isDeleted: false,
            departmentId: hodDeptId,
          },
        },
      },
    );
  }

  const crClassIds = await getCallerCRClassIds(caller.id);
  if (crClassIds.length > 0) {
    conditions.push({
      class: { is: { id: { in: crClassIds }, status: "ACTIVE" } },
    });
  }

  const societyLeadershipIds = await getCallerSocietyLeadershipIds(caller.id);
  if (societyLeadershipIds.length > 0) {
    conditions.push({
      society: {
        is: {
          id: { in: societyLeadershipIds },
          status: "ACTIVE",
          isActive: true,
          isDeleted: false,
        },
      },
    });
  }

  if (conditions.length === 0) {
    return null;
  }

  return {
    ...activePlatformRoleServerWhere(),
    OR: conditions,
  };
}

async function assertCallerCanUseModeratorServer(
  caller: CallerInfo,
  serverId: number,
): Promise<void> {
  const where = await getCallerModeratorServerWhere(caller);
  if (!where) {
    throw new ForbiddenError(
      "You do not have permission to manage moderators for this server",
      ApiErrorCode.SCOPE_FORBIDDEN,
    );
  }

  const server = await prisma.server.findFirst({
    where: { ...where, id: serverId },
    select: { id: true },
  });

  if (!server) {
    throw new ForbiddenError(
      "You do not have permission to manage moderators for this server",
      ApiErrorCode.SCOPE_FORBIDDEN,
    );
  }
}

async function assertAssignableChannel(
  caller: CallerInfo,
  serverId: number,
  channelId: number,
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

export async function getAssignableRoles(
  caller: CallerInfo,
): Promise<RoleOption[]> {
  if (caller.userType === "ADMIN") {
    return [
      ROLE_OPTIONS.hod,
      ROLE_OPTIONS.program_director,
      ROLE_OPTIONS.cr,
      ROLE_OPTIONS.server_moderator,
      ROLE_OPTIONS.channel_moderator,
    ];
  }

  const [hodDeptId, pdProgram, crClassIds, societyLeadershipIds] =
    await Promise.all([
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

export async function listAssignableScopes(
  query: AssignableScopesQuery,
  caller: CallerInfo,
) {
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

async function listAssignableDepartmentScopes(
  query: OptionQuery,
  caller: CallerInfo,
) {
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
            user: { select: { publicId: true, fullName: true, email: true } },
          },
        },
      },
    }),
    prisma.department.count({ where }),
  ]);

  return {
    success: true as const,
    data: departments.map(
      (department): ScopeOption => ({
        id: department.id,
        label: `${department.code} · ${department.name}`,
        kind: "department",
        disabled: department.hod !== null,
        disabledReason: department.hod
          ? `Already assigned to ${labelUser(department.hod.user)}`
          : undefined,
        currentAssignee: department.hod?.user,
      }),
    ),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

async function listAssignableProgramScopes(
  query: OptionQuery,
  caller: CallerInfo,
) {
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
            user: { select: { publicId: true, fullName: true, email: true } },
          },
        },
      },
    }),
    prisma.program.count({ where }),
  ]);

  return {
    success: true as const,
    data: programs.map(
      (program): ScopeOption => ({
        id: program.id,
        label: `${program.code} · ${program.department.code}`,
        kind: "program",
        disabled: program.programDirector !== null,
        disabledReason: program.programDirector
          ? `Already assigned to ${labelUser(program.programDirector.user)}`
          : undefined,
        currentAssignee: program.programDirector?.user,
      }),
    ),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

async function listAssignableClassScopes(
  query: OptionQuery,
  caller: CallerInfo,
) {
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
      {
        program: {
          department: { code: { contains: search, mode: "insensitive" } },
        },
      },
    ];
    where.AND = [{ OR: where.OR }, { OR: searchOr }].filter(
      (item) => item.OR !== undefined,
    );
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
        publicId: true,
        server: { select: { publicId: true } },
        currentSemester: true,
        section: true,
        admissionYear: true,
        program: {
          select: { code: true, department: { select: { code: true } } },
        },
        cr: {
          select: {
            user: { select: { publicId: true, fullName: true, email: true } },
          },
        },
      },
    }),
    prisma.class.count({ where }),
  ]);

  return {
    success: true as const,
    data: classes.map(
      (classRecord): ScopeOption => ({
        publicId: classRecord.publicId,
        label: `${classRecord.program.code}-${classRecord.currentSemester}${classRecord.section} · ${classRecord.admissionYear}`,
        kind: "class",
        serverPublicId: classRecord.server.publicId,
        disabled: classRecord.cr !== null,
        disabledReason: classRecord.cr
          ? `Already assigned to ${labelUser(classRecord.cr.user)}`
          : undefined,
        currentAssignee: classRecord.cr?.user,
      }),
    ),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

async function listAssignableModeratorServerScopes(
  query: OptionQuery,
  caller: CallerInfo,
) {
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
      select: { publicId: true, name: true, type: true },
    }),
    prisma.server.count({ where: scopedWhere }),
  ]);

  return {
    success: true as const,
    data: servers.map(
      (server): ScopeOption => ({
        publicId: server.publicId,
        label: `${server.name} · ${server.type}`,
        kind: "server",
        serverPublicId: server.publicId,
        disabled: false,
      }),
    ),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function listAssignableChannels(
  query: AssignableChannelsQuery,
  caller: CallerInfo,
) {
  const { id: serverId, publicId: serverPublicId } =
    await resolveServerPublicId(query.serverPublicId);
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
      select: { publicId: true, name: true, type: true, isLocked: true },
    }),
    prisma.channel.count({ where }),
  ]);

  return {
    success: true as const,
    data: channels.map(
      (channel): ChannelOption => ({
        publicId: channel.publicId,
        serverPublicId,
        label: `#${channel.name}`,
        type: channel.type,
        isLocked: channel.isLocked,
      }),
    ),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function listAssignableUsers(
  query: AssignableUsersQuery,
  caller: CallerInfo,
) {
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

async function listHodCandidateUsers(
  query: AssignableUsersQuery,
  caller: CallerInfo,
) {
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

async function listProgramDirectorCandidateUsers(
  query: AssignableUsersQuery,
  caller: CallerInfo,
) {
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

async function listCrCandidateUsers(
  query: AssignableUsersQuery,
  caller: CallerInfo,
) {
  if (!query.classPublicId) {
    return emptyPaginated<UserOption>(query);
  }
  const { id: classId } = await resolveClassPublicId(query.classPublicId);

  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      status: true,
      programId: true,
      program: { select: { departmentId: true } },
    },
  });
  if (!classRecord || classRecord.status !== "ACTIVE") {
    throw new NotFoundError("Class not found");
  }

  await assertCallerCanAssignCR(
    caller,
    classRecord.program.departmentId,
    classRecord.programId,
  );
  return listStudentUsersByWhere(query, {
    studentInfo: { is: { classId: classRecord.id } },
  });
}

async function listModeratorCandidateUsers(
  query: AssignableUsersQuery,
  caller: CallerInfo,
) {
  if (!query.serverPublicId) {
    return emptyPaginated<UserOption>(query);
  }
  const { id: serverId } = await resolveServerPublicId(query.serverPublicId);
  const channelResolution = query.channelPublicId
    ? await resolveChannelPublicId(query.channelPublicId)
    : undefined;
  const channelId = channelResolution?.id;

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
  const where: Prisma.ServerMembershipWhereInput = {
    serverId,
    user: {
      status: "ACTIVE",
      isActive: true,
      isDeleted: false,
      ...(userSearch ?? {}),
      platformRoleAssignments: {
        none: {
          ...activePlatformRoleAssignmentWhere(),
          serverId,
          channelId: query.role === "channel_moderator" ? channelId! : null,
          role: { name: query.role },
        },
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
            publicId: true,
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

async function listTeacherUsersByWhere(
  query: OptionQuery,
  where: Prisma.UserWhereInput,
) {
  const { page, limit, skip, take } = parsePagination(query);
  const search = normalizeSearch(query.search);
  const userSearch = buildUserSearch(search);
  const scopedWhere: Prisma.UserWhereInput = {
    ...where,
    ...(userSearch ?? {}),
    userType: "TEACHER",
    status: "ACTIVE",
    isActive: true,
    isDeleted: false,
    teacherInfo: { isNot: null },
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where: scopedWhere,
      skip,
      take,
      orderBy: { fullName: "asc" },
      select: {
        publicId: true,
        fullName: true,
        email: true,
        userType: true,
        departmentId: true,
      },
    }),
    prisma.user.count({ where: scopedWhere }),
  ]);

  return {
    success: true as const,
    data: users,
    pagination: buildPaginationResponse(page, limit, total),
  };
}

async function listStudentUsersByWhere(
  query: OptionQuery,
  where: Prisma.UserWhereInput,
) {
  const { page, limit, skip, take } = parsePagination(query);
  const search = normalizeSearch(query.search);
  const userSearch = buildUserSearch(search);
  const scopedWhere: Prisma.UserWhereInput = {
    ...where,
    ...(userSearch ?? {}),
    userType: "STUDENT",
    status: "ACTIVE",
    isActive: true,
    isDeleted: false,
    studentInfo: where.studentInfo ?? { isNot: null },
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where: scopedWhere,
      skip,
      take,
      orderBy: { fullName: "asc" },
      select: {
        publicId: true,
        fullName: true,
        email: true,
        userType: true,
        departmentId: true,
      },
    }),
    prisma.user.count({ where: scopedWhere }),
  ]);

  return {
    success: true as const,
    data: users,
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function listRevokableRoles(
  query: RevokableRolesQuery,
  caller: CallerInfo,
) {
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

async function listRevokableHodAssignments(
  query: RevokableRolesQuery,
  caller: CallerInfo,
) {
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
            {
              hod: {
                user: { fullName: { contains: search, mode: "insensitive" } },
              },
            },
            {
              hod: {
                user: { email: { contains: search, mode: "insensitive" } },
              },
            },
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
        hod: {
          select: {
            user: {
              select: {
                publicId: true,
                fullName: true,
                email: true,
                userType: true,
                departmentId: true,
              },
            },
          },
        },
      },
    }),
    prisma.department.count({ where }),
  ]);

  return {
    success: true as const,
    data: departments
      .filter((department) => department.hod !== null)
      .map(
        (department): RevokableAssignment => ({
          assignmentKey: `hod:${department.id}:${department.hod!.user.publicId}`,
          role: "hod",
          user: department.hod!.user,
          scope: {
            id: department.id,
            kind: "department",
            label: `${department.code} · ${department.name}`,
          },
          revokePayload: { role: "hod", scopeId: department.id },
        }),
      ),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

async function listRevokableProgramDirectorAssignments(
  query: RevokableRolesQuery,
  caller: CallerInfo,
) {
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
      {
        programDirector: {
          user: { fullName: { contains: search, mode: "insensitive" } },
        },
      },
      {
        programDirector: {
          user: { email: { contains: search, mode: "insensitive" } },
        },
      },
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
        programDirector: {
          select: {
            user: {
              select: {
                publicId: true,
                fullName: true,
                email: true,
                userType: true,
                departmentId: true,
              },
            },
          },
        },
      },
    }),
    prisma.program.count({ where }),
  ]);

  return {
    success: true as const,
    data: programs
      .filter((program) => program.programDirector !== null)
      .map(
        (program): RevokableAssignment => ({
          assignmentKey: `program_director:${program.id}:${program.programDirector!.user.publicId}`,
          role: "program_director",
          user: program.programDirector!.user,
          scope: {
            id: program.id,
            kind: "program",
            label: `${program.code} · ${program.department.code}`,
          },
          revokePayload: {
            role: "program_director",
            scopeId: program.id,
          },
        }),
      ),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

async function listRevokableCrAssignments(
  query: RevokableRolesQuery,
  caller: CallerInfo,
) {
  const { page, limit, skip, take } = parsePagination(query);
  const search = normalizeSearch(query.search);
  const classResolution = query.classPublicId
    ? await resolveClassPublicId(query.classPublicId)
    : undefined;
  const where: Prisma.ClassWhereInput = {
    status: "ACTIVE",
    crId: { not: null },
    ...(classResolution ? { id: classResolution.id } : {}),
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
    where.AND = [{ OR: where.OR }, { OR: searchOr }].filter(
      (item) => item.OR !== undefined,
    );
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
      ],
      select: {
        publicId: true,
        currentSemester: true,
        section: true,
        admissionYear: true,
        program: { select: { code: true } },
        cr: {
          select: {
            user: {
              select: {
                publicId: true,
                fullName: true,
                email: true,
                userType: true,
                departmentId: true,
              },
            },
          },
        },
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
          assignmentKey: `cr:${classRecord.publicId}:${classRecord.cr!.user.publicId}`,
          role: "cr",
          user: classRecord.cr!.user,
          scope: { publicId: classRecord.publicId, kind: "class", label },
          revokePayload: { role: "cr", classPublicId: classRecord.publicId },
        };
      }),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

async function listRevokableModeratorAssignments(
  query: RevokableRolesQuery,
  caller: CallerInfo,
) {
  const { page, limit, skip, take } = parsePagination(query);
  const serverWhere = await getCallerModeratorServerWhere(caller);
  if (!serverWhere) {
    return emptyPaginated<RevokableAssignment>(query);
  }

  const serverResolution = query.serverPublicId
    ? await resolveServerPublicId(query.serverPublicId)
    : undefined;
  const channelResolution = query.channelPublicId
    ? await resolveChannelPublicId(query.channelPublicId)
    : undefined;
  const serverId = serverResolution?.id;
  const channelId = channelResolution?.id;

  if (serverId) {
    await assertCallerCanUseModeratorServer(caller, serverId);
  }
  if (query.role === "channel_moderator" && serverId && channelId) {
    await assertAssignableChannel(caller, serverId, channelId);
  }

  const search = normalizeSearch(query.search);
  const where: Prisma.UserRoleAssignmentWhereInput = {
    ...activePlatformRoleAssignmentWhere(),
    scopeType: query.role === "channel_moderator" ? "CHANNEL" : "SERVER",
    server: serverWhere,
    role: { name: query.role },
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
    prisma.userRoleAssignment.findMany({
      where,
      skip,
      take,
      orderBy: [{ assignedAt: "desc" }],
      select: {
        publicId: true,
        channelId: true,
        expiresAt: true,
        user: {
          select: {
            publicId: true,
            fullName: true,
            email: true,
            userType: true,
            departmentId: true,
          },
        },
        server: { select: { publicId: true, name: true, type: true } },
        channel: { select: { publicId: true, name: true } },
      },
    }),
    prisma.userRoleAssignment.count({ where }),
  ]);

  return {
    success: true as const,
    data: assignments.map((assignment): RevokableAssignment => {
      if (
        query.role === "channel_moderator" &&
        assignment.channelId &&
        assignment.channel
      ) {
        return {
          assignmentKey: `channel_moderator:${assignment.publicId}`,
          role: "channel_moderator",
          expiresAt: assignment.expiresAt,
          user: assignment.user,
          server: {
            publicId: assignment.server.publicId,
            label: assignment.server.name,
            type: assignment.server.type,
          },
          channel: {
            publicId: assignment.channel.publicId,
            label: `#${assignment.channel.name}`,
          },
          revokePayload: { assignmentPublicId: assignment.publicId },
        };
      }

      return {
        assignmentKey: `server_moderator:${assignment.publicId}`,
        role: "server_moderator",
        expiresAt: assignment.expiresAt,
        user: assignment.user,
        server: {
          publicId: assignment.server.publicId,
          label: assignment.server.name,
          type: assignment.server.type,
        },
        revokePayload: { assignmentPublicId: assignment.publicId },
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
  targetDepartmentId: number,
): Promise<void> {
  if (caller.userType === "ADMIN") return;

  // HOD can assign PD within their department
  const hodDeptId = await getCallerHODDepartmentId(caller.id);
  if (hodDeptId === targetDepartmentId) return;

  throw new ForbiddenError(
    "You do not have permission to assign a program director for this scope",
    ApiErrorCode.SCOPE_FORBIDDEN,
  );
}

async function assertCallerCanAssignCR(
  caller: CallerInfo,
  targetClassDepartmentId: number,
  targetClassProgramId: number,
): Promise<void> {
  if (caller.userType === "ADMIN") return;

  // HOD can assign CR within their department
  const hodDeptId = await getCallerHODDepartmentId(caller.id);
  if (hodDeptId === targetClassDepartmentId) return;

  // PD can assign CR within their program
  const pdProgram = await getCallerPDProgram(caller.id);
  if (pdProgram && pdProgram.id === targetClassProgramId) return;

  throw new ForbiddenError(
    "You do not have permission to assign a class representative for this scope",
    ApiErrorCode.SCOPE_FORBIDDEN,
  );
}

async function assertCallerCanAssignModerator(
  caller: CallerInfo,
  targetServerId: number,
): Promise<void> {
  await assertCallerCanUseModeratorServer(caller, targetServerId);
}

// ─── Academic Role Owner Operations ───────────────────────────────────────

async function assignHOD(
  departmentId: number,
  targetUser: Awaited<ReturnType<typeof findActiveUserOrThrow>>,
  caller: CallerInfo,
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
    throw new ConflictError(
      "Department already has an HOD assigned. Revoke the current HOD first",
    );
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
  caller: CallerInfo,
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
    throw new ConflictError(
      "Program already has a Program Director assigned. Revoke the current PD first",
    );
  }

  // Verify teacher belongs to the program's department
  if (targetUser.departmentId !== program.departmentId) {
    throw new ValidationError(
      "Teacher must belong to the program's department",
    );
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
  caller: CallerInfo,
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

  await assertCallerCanAssignCR(
    caller,
    classRecord.program.departmentId,
    classRecord.program.id,
  );

  if (classRecord.crId) {
    throw new ConflictError(
      "Class already has a CR assigned. Revoke the current CR first",
    );
  }

  // Verify student belongs to this class
  if (targetUser.studentInfo!.classId !== classId) {
    throw new ValidationError("Student must belong to the target class");
  }

  await prisma.class.update({
    where: { id: classId },
    data: { crId: targetUser.id },
  });

  return {
    role: "cr",
    userId: targetUser.id,
    classId,
    serverId: classRecord.serverId,
  };
}

async function revokeHOD(
  departmentId: number,
  userId: number,
  caller: CallerInfo,
) {
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

async function revokeProgramDirector(
  programId: number,
  userId: number,
  caller: CallerInfo,
) {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: {
      id: true,
      code: true,
      departmentId: true,
      programDirectorId: true,
    },
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

  return {
    role: "program_director",
    userId,
    programId,
    programCode: program.code,
  };
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

  await assertCallerCanAssignCR(
    caller,
    classRecord.program.departmentId,
    classRecord.program.id,
  );

  if (classRecord.crId !== userId) {
    throw new NotFoundError("User is not the CR of this class");
  }

  await prisma.class.update({
    where: { id: classId },
    data: { crId: null },
  });

  return { role: "cr", userId, classId };
}

async function finalizeAcademicChange(
  action: "assign" | "revoke",
  result: { role: string; userId: number; serverId?: number },
  targetUserPublicId: string,
  auditContext?: AuditContext,
): Promise<void> {
  emitRolesUpdated(result.userId);
  if (action === "assign" && result.serverId) {
    await notifyRoleAssigned(result.userId, result.role, result.serverId);
  }
  if (auditContext) {
    await recordAuditLog(
      {
        action: `role.${action}`,
        targetType: "role",
        targetId: targetUserPublicId,
        summary: { role: result.role },
      },
      auditContext,
    );
  }
}

export async function assignDepartmentHod(
  departmentId: number,
  userPublicId: string,
  caller: CallerInfo,
  auditContext?: AuditContext,
) {
  const targetUser = await findActiveUserOrThrow(userPublicId);
  const result = await assignHOD(departmentId, targetUser, caller);
  await finalizeAcademicChange(
    "assign",
    result,
    targetUser.publicId,
    auditContext,
  );
  return { ...result, userPublicId: targetUser.publicId };
}

export async function revokeDepartmentHod(
  departmentId: number,
  caller: CallerInfo,
  auditContext?: AuditContext,
) {
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: {
      hod: { select: { user: { select: { id: true, publicId: true } } } },
    },
  });
  if (!department?.hod)
    throw new NotFoundError("Department HOD assignment not found");
  const result = await revokeHOD(departmentId, department.hod.user.id, caller);
  await finalizeAcademicChange(
    "revoke",
    result,
    department.hod.user.publicId,
    auditContext,
  );
  return { ...result, userPublicId: department.hod.user.publicId };
}

export async function assignProgramDirectorRole(
  programId: number,
  userPublicId: string,
  caller: CallerInfo,
  auditContext?: AuditContext,
) {
  const targetUser = await findActiveUserOrThrow(userPublicId);
  const result = await assignProgramDirector(programId, targetUser, caller);
  await finalizeAcademicChange(
    "assign",
    result,
    targetUser.publicId,
    auditContext,
  );
  return { ...result, userPublicId: targetUser.publicId };
}

export async function revokeProgramDirectorRole(
  programId: number,
  caller: CallerInfo,
  auditContext?: AuditContext,
) {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: {
      programDirector: {
        select: { user: { select: { id: true, publicId: true } } },
      },
    },
  });
  if (!program?.programDirector)
    throw new NotFoundError("Program Director assignment not found");
  const result = await revokeProgramDirector(
    programId,
    program.programDirector.user.id,
    caller,
  );
  await finalizeAcademicChange(
    "revoke",
    result,
    program.programDirector.user.publicId,
    auditContext,
  );
  return { ...result, userPublicId: program.programDirector.user.publicId };
}

export async function assignClassCr(
  classPublicId: string,
  userPublicId: string,
  caller: CallerInfo,
  auditContext?: AuditContext,
) {
  const { id: classId } = await resolveClassPublicId(classPublicId);
  const targetUser = await findActiveUserOrThrow(userPublicId);
  const result = await assignCR(classId, targetUser, caller);
  await finalizeAcademicChange(
    "assign",
    result,
    targetUser.publicId,
    auditContext,
  );
  return { ...result, userPublicId: targetUser.publicId };
}

export async function revokeClassCr(
  classPublicId: string,
  caller: CallerInfo,
  auditContext?: AuditContext,
) {
  const { id: classId } = await resolveClassPublicId(classPublicId);
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      cr: { select: { user: { select: { id: true, publicId: true } } } },
    },
  });
  if (!classRecord?.cr)
    throw new NotFoundError("Class CR assignment not found");
  const result = await revokeCR(classId, classRecord.cr.user.id, caller);
  await finalizeAcademicChange(
    "revoke",
    result,
    classRecord.cr.user.publicId,
    auditContext,
  );
  return { ...result, userPublicId: classRecord.cr.user.publicId };
}

// ─── Platform Role Assignment Resources ────────────────────────────────────

type CreatePlatformAssignmentInput = {
  userPublicId: string;
  role: PlatformRoleName;
  serverPublicId: string;
  channelPublicId?: string;
  expiresAt?: string | null;
};

type UpdatePlatformAssignmentExpiryInput = {
  expiresAt: string | null;
};

type PlatformAssignmentHistoryQuery = OptionQuery & {
  state?: "ACTIVE" | "EXPIRED" | "REVOKED";
  role?: PlatformRoleName;
  userPublicId?: string;
  serverPublicId?: string;
  channelPublicId?: string;
};

const platformAssignmentSelect = {
  publicId: true,
  scopeType: true,
  assignedAt: true,
  expiresAt: true,
  revokedAt: true,
  user: { select: { publicId: true, fullName: true, email: true } },
  role: { select: { name: true } },
  server: { select: { publicId: true, name: true, type: true } },
  channel: { select: { publicId: true, name: true } },
  assigner: { select: { publicId: true, fullName: true } },
  revoker: { select: { publicId: true, fullName: true } },
} as const;

function parseFutureExpiry(value: string | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  const expiresAt = new Date(value);
  if (expiresAt <= new Date()) {
    throw new ValidationError("Expiry must be in the future", [
      { field: "expiresAt", message: "Expiry must be in the future" },
    ]);
  }
  return expiresAt;
}

function isOverlapConstraintError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("user_role_assignments_no_overlapping_periods")
  );
}

function platformAssignmentState(assignment: {
  revokedAt: Date | null;
  expiresAt: Date | null;
}): "ACTIVE" | "EXPIRED" | "REVOKED" {
  if (assignment.revokedAt) return "REVOKED";
  if (assignment.expiresAt && assignment.expiresAt <= new Date())
    return "EXPIRED";
  return "ACTIVE";
}

function mapPlatformAssignment(
  assignment: Prisma.UserRoleAssignmentGetPayload<{
    select: typeof platformAssignmentSelect;
  }>,
) {
  return {
    assignmentPublicId: assignment.publicId,
    role: assignment.role.name,
    scopeType: assignment.scopeType.toLowerCase(),
    assignedAt: assignment.assignedAt,
    expiresAt: assignment.expiresAt,
    revokedAt: assignment.revokedAt,
    state: platformAssignmentState(assignment),
    user: assignment.user,
    server: assignment.server,
    channel: assignment.channel,
    assignedBy: assignment.assigner,
    revokedBy: assignment.revoker,
  };
}

async function resolvePlatformScope(input: {
  role: PlatformRoleName;
  serverPublicId: string;
  channelPublicId?: string;
}) {
  const serverResolution = await resolveServerPublicId(input.serverPublicId);
  const server = await prisma.server.findFirst({
    where: { id: serverResolution.id, ...activePlatformRoleServerWhere() },
    select: { id: true, publicId: true },
  });
  if (!server) throw new NotFoundError("Server not found or inactive");

  if (input.role === "server_moderator") {
    return { server, channel: null, scopeType: "SERVER" as const };
  }

  const channelResolution = await resolveChannelPublicId(input.channelPublicId);
  const channel = await prisma.channel.findFirst({
    where: {
      id: channelResolution.id,
      serverId: server.id,
      isDeleted: false,
      isArchived: false,
    },
    select: { id: true, publicId: true },
  });
  if (!channel) throw new NotFoundError("Channel not found in this server");
  return { server, channel, scopeType: "CHANNEL" as const };
}

async function findCurrentPlatformAssignmentOrThrow(
  assignmentPublicId: string,
) {
  const assignment = await prisma.userRoleAssignment.findFirst({
    where: {
      publicId: assignmentPublicId,
      ...activePlatformRoleAssignmentWhere(),
    },
    select: {
      id: true,
      userId: true,
      serverId: true,
      channelId: true,
      ...platformAssignmentSelect,
    },
  });
  if (!assignment)
    throw new NotFoundError("Active platform role assignment not found");
  return assignment;
}

function findPlatformAssignmentByIdOrThrow(id: number) {
  return prisma.userRoleAssignment.findUniqueOrThrow({
    where: { id },
    select: platformAssignmentSelect,
  });
}

export async function createPlatformAssignment(
  input: CreatePlatformAssignmentInput,
  caller: CallerInfo,
  auditContext: AuditContext,
) {
  const [targetUser, scope] = await Promise.all([
    findActiveUserOrThrow(input.userPublicId),
    resolvePlatformScope(input),
  ]);
  await assertCallerCanAssignModerator(caller, scope.server.id);

  const membership = await prisma.serverMembership.findUnique({
    where: {
      userId_serverId: { userId: targetUser.id, serverId: scope.server.id },
    },
    select: { userId: true },
  });
  if (!membership) {
    throw new ValidationError(
      "User must be a member of the server to be assigned as moderator",
    );
  }

  const role = await prisma.role.findFirst({
    where: { name: input.role, scopeType: scope.scopeType },
    select: { id: true },
  });
  if (!role) throw new NotFoundError("Platform role definition not found");
  const expiresAt = parseFutureExpiry(input.expiresAt);

  try {
    const assignmentId = await prisma.$transaction(async (tx) => {
      const created = await tx.userRoleAssignment.create({
        data: {
          userId: targetUser.id,
          roleId: role.id,
          scopeType: scope.scopeType,
          serverId: scope.server.id,
          channelId: scope.channel?.id ?? null,
          assignedBy: caller.id,
          expiresAt,
        },
        select: { id: true, publicId: true },
      });
      await recordAuditLog(
        {
          action: "role.platform.assign",
          targetType: "platform_role_assignment",
          targetId: created.publicId,
          summary: {
            role: input.role,
            userPublicId: targetUser.publicId,
            serverPublicId: scope.server.publicId,
            channelPublicId: scope.channel?.publicId ?? null,
            expiresAt,
          },
        },
        auditContext,
        tx,
      );
      return created.id;
    });

    const assignment = await findPlatformAssignmentByIdOrThrow(assignmentId);
    await notifyRoleAssigned(
      targetUser.id,
      input.role,
      scope.server.id,
      scope.channel?.id,
    );
    emitRolesUpdated(targetUser.id);
    return mapPlatformAssignment(assignment);
  } catch (error) {
    if (isOverlapConstraintError(error)) {
      throw new ConflictError(
        "User already has an overlapping platform role assignment",
      );
    }
    throw error;
  }
}

export async function revokePlatformAssignment(
  assignmentPublicId: string,
  caller: CallerInfo,
  auditContext: AuditContext,
) {
  const current =
    await findCurrentPlatformAssignmentOrThrow(assignmentPublicId);
  await assertCallerCanAssignModerator(caller, current.serverId);
  const revokedAt = new Date();

  await prisma.$transaction(async (tx) => {
    const update = await tx.userRoleAssignment.updateMany({
      where: { id: current.id, revokedAt: null },
      data: { revokedAt, revokedBy: caller.id },
    });
    if (update.count !== 1)
      throw new ConflictError("Platform role assignment was already changed");
    await recordAuditLog(
      {
        action: "role.platform.revoke",
        targetType: "platform_role_assignment",
        targetId: assignmentPublicId,
        summary: { revokedAt },
      },
      auditContext,
      tx,
    );
  });
  const assignment = await findPlatformAssignmentByIdOrThrow(current.id);
  emitRolesUpdated(current.userId);
  return mapPlatformAssignment(assignment);
}

export async function updatePlatformAssignmentExpiry(
  assignmentPublicId: string,
  input: UpdatePlatformAssignmentExpiryInput,
  caller: CallerInfo,
  auditContext: AuditContext,
) {
  const current =
    await findCurrentPlatformAssignmentOrThrow(assignmentPublicId);
  await assertCallerCanAssignModerator(caller, current.serverId);
  const expiresAt = parseFutureExpiry(input.expiresAt);

  try {
    await prisma.$transaction(async (tx) => {
      const update = await tx.userRoleAssignment.updateMany({
        where: { id: current.id, revokedAt: null },
        data: { expiresAt },
      });
      if (update.count !== 1)
        throw new ConflictError("Platform role assignment was already changed");
      await recordAuditLog(
        {
          action: "role.platform.expiry.update",
          targetType: "platform_role_assignment",
          targetId: assignmentPublicId,
          summary: { previousExpiresAt: current.expiresAt, expiresAt },
        },
        auditContext,
        tx,
      );
    });
    const assignment = await findPlatformAssignmentByIdOrThrow(current.id);
    emitRolesUpdated(current.userId);
    return mapPlatformAssignment(assignment);
  } catch (error) {
    if (isOverlapConstraintError(error)) {
      throw new ConflictError(
        "Expiry overlaps another platform role assignment period",
      );
    }
    throw error;
  }
}

export async function listPlatformAssignmentHistory(
  query: PlatformAssignmentHistoryQuery,
) {
  const { page, limit, skip, take } = parsePagination(query);
  const now = new Date();
  const [user, server, channel] = await Promise.all([
    query.userPublicId
      ? resolveUserPublicId(query.userPublicId, { includeDeleted: true })
      : undefined,
    query.serverPublicId
      ? resolveServerPublicId(query.serverPublicId, { includeDeleted: true })
      : undefined,
    query.channelPublicId
      ? resolveChannelPublicId(query.channelPublicId, { includeDeleted: true })
      : undefined,
  ]);
  const search = normalizeSearch(query.search);
  const where: Prisma.UserRoleAssignmentWhereInput = {
    ...(query.role ? { role: { name: query.role } } : {}),
    ...(user ? { userId: user.id } : {}),
    ...(server ? { serverId: server.id } : {}),
    ...(channel ? { channelId: channel.id } : {}),
    ...(query.state === "ACTIVE"
      ? {
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        }
      : {}),
    ...(query.state === "EXPIRED"
      ? { revokedAt: null, expiresAt: { lte: now } }
      : {}),
    ...(query.state === "REVOKED" ? { revokedAt: { not: null } } : {}),
  };
  if (search) {
    where.AND = [
      {
        OR: [
          { user: { fullName: { contains: search, mode: "insensitive" } } },
          { user: { email: { contains: search, mode: "insensitive" } } },
          { server: { name: { contains: search, mode: "insensitive" } } },
          {
            channel: {
              is: { name: { contains: search, mode: "insensitive" } },
            },
          },
        ],
      },
    ];
  }

  const [assignments, total] = await prisma.$transaction([
    prisma.userRoleAssignment.findMany({
      where,
      skip,
      take,
      orderBy: [{ assignedAt: "desc" }, { id: "desc" }],
      select: platformAssignmentSelect,
    }),
    prisma.userRoleAssignment.count({ where }),
  ]);
  return {
    success: true as const,
    data: assignments.map(mapPlatformAssignment),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

// ─── Get User Roles ────────────────────────────────────────────────────────

export async function getUserRoles(userPublicId: string, caller: CallerInfo) {
  const resolved = await resolveUserPublicId(userPublicId);
  const targetUser = await prisma.user.findUnique({
    where: { id: resolved.id },
    select: {
      id: true,
      departmentId: true,
      isActive: true,
      isDeleted: true,
      status: true,
    },
  });

  if (!targetUser || targetUser.isDeleted) {
    throw new NotFoundError("User not found");
  }

  // Authorization: Admin unrestricted, HOD only within their department
  if (caller.userType !== "ADMIN") {
    const hodDeptId = await getCallerHODDepartmentId(caller.id);
    if (!hodDeptId) {
      throw new ForbiddenError(
        "You do not have permission to view roles for this user",
        ApiErrorCode.SCOPE_FORBIDDEN,
      );
    }
    if (targetUser.departmentId !== hodDeptId) {
      throw new ForbiddenError(
        "You can only view roles for users in your department",
      );
    }
  }

  // Query all role assignments in parallel
  const [
    hodDepartments,
    directedPrograms,
    crClasses,
    presidentSocieties,
    convenorSocieties,
    platformAssignments,
  ] = await Promise.all([
    prisma.department.findMany({
      where: { hodId: targetUser.id, server: activePlatformRoleServerWhere() },
      select: { id: true, name: true },
    }),
    prisma.program.findMany({
      where: {
        programDirectorId: targetUser.id,
        department: { server: activePlatformRoleServerWhere() },
      },
      select: { id: true, code: true, department: { select: { name: true } } },
    }),
    prisma.class.findMany({
      where: {
        crId: targetUser.id,
        status: "ACTIVE",
        server: activePlatformRoleServerWhere(),
      },
      select: {
        publicId: true,
        server: { select: { publicId: true } },
        currentSemester: true,
        section: true,
        program: { select: { code: true } },
      },
    }),
    prisma.society.findMany({
      where: {
        presidentId: targetUser.id,
        status: "ACTIVE",
        isActive: true,
        isDeleted: false,
      },
      select: { publicId: true, name: true },
    }),
    prisma.society.findMany({
      where: {
        convenorId: targetUser.id,
        status: "ACTIVE",
        isActive: true,
        isDeleted: false,
      },
      select: { publicId: true, name: true },
    }),
    prisma.userRoleAssignment.findMany({
      where: { userId: targetUser.id, ...activePlatformRoleAssignmentWhere() },
      select: {
        publicId: true,
        scopeType: true,
        expiresAt: true,
        role: { select: { name: true } },
        server: { select: { publicId: true, name: true } },
        channel: { select: { publicId: true, name: true } },
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
      classPublicId: cls.publicId,
      serverPublicId: cls.server.publicId,
      scopeContext: `CR of ${cls.program.code}-${cls.currentSemester}${cls.section}`,
    });
  }

  for (const soc of presidentSocieties) {
    roles.push({
      role: "society_president",
      societyPublicId: soc.publicId,
      societyName: soc.name,
      scopeContext: `President of ${soc.name}`,
    });
  }

  for (const soc of convenorSocieties) {
    roles.push({
      role: "society_convenor",
      societyPublicId: soc.publicId,
      societyName: soc.name,
      scopeContext: `Convenor of ${soc.name}`,
    });
  }

  for (const mod of platformAssignments) {
    const isChannel = mod.scopeType === "CHANNEL";
    roles.push({
      assignmentPublicId: mod.publicId,
      role: mod.role.name,
      serverPublicId: mod.server.publicId,
      channelPublicId: mod.channel?.publicId ?? null,
      expiresAt: mod.expiresAt,
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
