import bcrypt from "bcrypt";
import crypto from "crypto";
import csvParser from "csv-parser";
import { Readable } from "stream";
import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type { UserStatus } from "../../generated/prisma/enums.js";
import { emailService } from "../../config/email.js";
import {
  cleanupCloudinaryUploads,
  cloudinaryService,
} from "../../config/cloudinary.js";
import { BCRYPT_ROUNDS, TEMP_PASSWORD_PREFIX } from "../../shared/constants.js";
import {
  ApiErrorCode,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors/index.js";
import { buildPaginationResponse, parsePagination } from "../../shared/utils/pagination.js";
import type { AuthUser, PaginatedResponse } from "../../shared/types/index.js";
import { mapUserPublicDto, resolveUserPublicId } from "../../shared/ids/index.js";
import { disconnectUserSockets } from "../../socket/index.js";
import { getPublicUserRoles } from "../../middleware/authorize.js";
import { invalidateSystemStatsCache } from "../admin/admin.service.js";
import type { AuditContext } from "../audit/audit.service.js";
import { recordAuditLog } from "../audit/audit.service.js";
import { createUserBodySchema } from "./user.schema.js";

// ─── Types ─────────────────────────────────────────────────────────────────

type CreateUserInput = {
  fullName: string;
  email: string;
  phone: string;
  gender: "MALE" | "FEMALE";
  userType: "STUDENT" | "TEACHER" | "ADMIN";
  departmentId?: number;
  classPublicId?: string;
  rollNumber?: string;
  designation?: string;
};

interface BulkImportError {
  row: number;
  message: string;
}

interface BulkImportResult {
  successful: number;
  failed: number;
  errors: BulkImportError[];
}

interface ListUsersQuery {
  page?: unknown;
  limit?: unknown;
  userType?: unknown;
  departmentId?: unknown;
  status?: unknown;
  lifecycle?: unknown;
  search?: unknown;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function generateTempPassword(): string {
  const randomPart = crypto.randomBytes(4).toString("hex");
  return `${TEMP_PASSWORD_PREFIX}Aa1@${randomPart}`;
}

function normalizeCsvRow(row: Record<string, string>): CreateUserInput {
  const userType = (row.userType ?? "").trim().toUpperCase();
  const gender = (row.gender ?? "").trim().toUpperCase();

  return {
    fullName: (row.fullName ?? "").trim(),
    email: (row.email ?? "").trim(),
    phone: (row.phone ?? "").trim(),
    gender: gender as "MALE" | "FEMALE",
    userType: userType as "STUDENT" | "TEACHER" | "ADMIN",
    departmentId: row.departmentId ? Number.parseInt(row.departmentId, 10) : undefined,
    classPublicId: row.classPublicId?.trim() || undefined,
    rollNumber: row.rollNumber?.trim() ? row.rollNumber.trim().toUpperCase() : undefined,
    designation: row.designation?.trim() ? row.designation.trim() : undefined,
  };
}

function parseUserListFilters(query: ListUsersQuery): {
  userType?: "STUDENT" | "TEACHER" | "ADMIN";
  departmentId?: number;
  status?: UserStatus;
  lifecycle: "live" | "deleted" | "all";
  search?: string;
} {
  const filters: {
    userType?: "STUDENT" | "TEACHER" | "ADMIN";
    departmentId?: number;
    status?: UserStatus;
    lifecycle: "live" | "deleted" | "all";
    search?: string;
  } = { lifecycle: "live" };

  if (query.userType && typeof query.userType === "string") {
    const userType = query.userType.toUpperCase();
    if (userType === "STUDENT" || userType === "TEACHER" || userType === "ADMIN") {
      filters.userType = userType;
    }
  }

  if (query.departmentId !== undefined) {
    const parsed = Number(query.departmentId);
    if (Number.isInteger(parsed) && parsed > 0) {
      filters.departmentId = parsed;
    }
  }

  if (query.status && typeof query.status === "string") {
    const status = query.status.toUpperCase();
    if (status === "ACTIVE" || status === "SUSPENDED") {
      filters.status = status;
    }
  }

  if (query.lifecycle && typeof query.lifecycle === "string") {
    const lifecycle = query.lifecycle.toLowerCase();
    if (lifecycle === "live" || lifecycle === "deleted" || lifecycle === "all") {
      filters.lifecycle = lifecycle;
    }
  }

  if (query.search && typeof query.search === "string") {
    const trimmed = query.search.trim();
    if (trimmed.length > 0) {
      filters.search = trimmed;
    }
  }

  return filters;
}

async function resolveHodDepartmentId(requestingUserId: number): Promise<number> {
  const department = await prisma.department.findFirst({
    where: { hodId: requestingUserId },
    select: { id: true },
  });

  if (!department) {
    throw new ForbiddenError("Only HOD can view department users");
  }

  return department.id;
}

async function parseCsvBuffer(fileBuffer: Buffer): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];

    Readable.from([fileBuffer])
      .pipe(
        csvParser({
          mapHeaders: ({ header }) => header.replace(/^\uFEFF/, "").trim(),
        })
      )
      .on("data", (row) => rows.push(row as Record<string, string>))
      .on("error", (error) => reject(error))
      .on("end", () => resolve(rows));
  });
}

async function assertDesignationExists(designation: string): Promise<void> {
  const existing = await prisma.designation.findUnique({
    where: { value: designation },
    select: { value: true },
  });

  if (!existing) {
    throw new ValidationError("Designation does not exist");
  }
}

const userLifecycleSelect = {
  id: true,
  publicId: true,
  fullName: true,
  email: true,
  phone: true,
  gender: true,
  profilePictureUrl: true,
  bio: true,
  userType: true,
  departmentId: true,
  status: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
  mustChangePassword: true,
  createdAt: true,
} as const satisfies Prisma.UserSelect;

type PrismaTx = Prisma.TransactionClient;

interface UserDeletionImpact {
  user: {
    publicId: string;
    fullName: string;
    email: string;
    userType: string;
    status: UserStatus;
    isDeleted: boolean;
  };
  canDelete: boolean;
  blockers: {
    hodDepartments: Array<{ id: number; name: string; code: string }>;
    directedPrograms: Array<{
      id: number;
      code: string;
      disciplineName: string;
      degreeLevel: string;
    }>;
    crClasses: Array<{
      publicId: string;
      programCode: string;
      section: string;
      currentSemester: number;
      admissionYear: number;
    }>;
    presidentSocieties: Array<{ publicId: string; name: string }>;
    convenorSocieties: Array<{ publicId: string; name: string }>;
    teachingAssignments: Array<{
      classPublicId: string;
      courseId: number;
      courseCode: string;
      courseTitle: string;
      programCode: string;
      section: string;
      currentSemester: number;
    }>;
  };
}

function mapLifecycleUser<T extends { id: number; publicId: string }>(user: T) {
  return mapUserPublicDto(user);
}

function hasDeletionBlockers(impact: UserDeletionImpact): boolean {
  return Object.values(impact.blockers).some((items) => items.length > 0);
}

// ─── Create User ───────────────────────────────────────────────────────────

export async function createUser(input: CreateUserInput, auditContext?: AuditContext) {
  const existingUser = await prisma.user.findFirst({
    where: { email: input.email, isDeleted: false },
    select: { id: true },
  });

  if (existingUser) {
    throw new ConflictError("A user with this email already exists", ApiErrorCode.DUPLICATE_EMAIL);
  }

  if (input.userType === "TEACHER") {
    await assertDesignationExists(input.designation!);
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

  const createdUser = await prisma.$transaction(async (tx) => {
    let departmentServerId: number | undefined;
    let classServerId: number | undefined;
    let classDepartmentId: number | undefined;

    if (input.userType !== "ADMIN" && input.departmentId) {
      const department = await tx.department.findUnique({
        where: { id: input.departmentId },
        select: { id: true, serverId: true },
      });

      if (!department) {
        throw new NotFoundError("Department not found");
      }

      departmentServerId = department.serverId;
    }

    let resolvedClassId: number | undefined;
    if (input.userType === "STUDENT" && input.classPublicId) {
      const classRecord = await tx.class.findUnique({
        where: { publicId: input.classPublicId },
        select: { id: true, serverId: true, program: { select: { departmentId: true } } },
      });

      if (!classRecord) {
        throw new NotFoundError("Class not found");
      }

      classServerId = classRecord.serverId;
      resolvedClassId = classRecord.id;
      classDepartmentId = classRecord.program.departmentId;

      if (input.departmentId && input.departmentId !== classDepartmentId) {
        throw new ValidationError("classPublicId does not belong to the provided departmentId");
      }
    }

    const user = await tx.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        passwordHash,
        gender: input.gender,
        userType: input.userType,
        departmentId: input.userType === "ADMIN" ? null : (input.departmentId ?? classDepartmentId ?? null),
        status: "ACTIVE",
        isActive: true,
        isDeleted: false,
        mustChangePassword: true,
      },
      select: {
        id: true,
        publicId: true,
        fullName: true,
        email: true,
        phone: true,
        gender: true,
        userType: true,
        departmentId: true,
        status: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    if (input.userType === "STUDENT") {
      await tx.studentInfo.create({
        data: {
          studentId: user.id,
          classId: resolvedClassId!,
          rollNumber: input.rollNumber!,
        },
      });
    }

    if (input.userType === "TEACHER") {
      await tx.teacherInfo.create({
        data: {
          teacherId: user.id,
          designation: input.designation!,
        },
      });
    }

    const membershipRows: { userId: number; serverId: number; isAutoJoined: boolean }[] = [];

    if ((input.userType === "STUDENT" || input.userType === "TEACHER") && departmentServerId) {
      membershipRows.push({ userId: user.id, serverId: departmentServerId, isAutoJoined: true });
    }

    if (input.userType === "STUDENT" && classServerId) {
      membershipRows.push({ userId: user.id, serverId: classServerId, isAutoJoined: true });
    }

    if (membershipRows.length > 0) {
      await tx.serverMembership.createMany({
        data: membershipRows,
        skipDuplicates: true,
      });
    }

    if (auditContext) {
      await recordAuditLog(
        {
          action: "user.create",
          targetType: "user",
          targetId: user.publicId,
          summary: {
            fullName: user.fullName,
            email: user.email,
            userType: user.userType,
            departmentId: user.departmentId,
            classPublicId: input.classPublicId ?? null,
          },
        },
        auditContext,
        tx
      );
    }

    return user;
  });

  try {
    await emailService.sendTempPasswordEmail(createdUser.email, tempPassword);
  } catch (error) {
    console.error("Failed to send temp-password email:", error);
    invalidateSystemStatsCache();
    return {
      ...mapLifecycleUser(createdUser),
      warning: "User created but welcome email could not be sent. Please share the credentials manually.",
    };
  }

  invalidateSystemStatsCache();
  return mapLifecycleUser(createdUser);
}

// ─── Bulk Import ───────────────────────────────────────────────────────────

export async function bulkImportUsers(
  fileBuffer: Buffer,
  auditContext?: AuditContext
): Promise<BulkImportResult> {
  const rows = await parseCsvBuffer(fileBuffer);

  const errors: BulkImportError[] = [];
  const validRows: Array<{ rowNumber: number; data: CreateUserInput }> = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const normalized = normalizeCsvRow(row);
    const result = createUserBodySchema.safeParse(normalized);

    if (!result.success) {
      errors.push({
        row: rowNumber,
        message: result.error.issues.map((issue) => issue.message).join("; "),
      });
      return;
    }

    validRows.push({ rowNumber, data: result.data });
  });

  let successful = 0;
  const BATCH_SIZE = 5;

  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((row) =>
        createUser(row.data, auditContext).then(
          () => ({ rowNumber: row.rowNumber, ok: true as const }),
          (error: unknown) => ({ rowNumber: row.rowNumber, ok: false as const, error }),
        ),
      ),
    );

    for (const result of results) {
      const value = result.status === "fulfilled" ? result.value : { rowNumber: 0, ok: false as const, error: result.reason };
      if (value.ok) {
        successful += 1;
      } else {
        errors.push({
          row: value.rowNumber,
          message: value.error instanceof Error ? value.error.message : "Failed to import user",
        });
      }
    }
  }

  return {
    successful,
    failed: errors.length,
    errors,
  };
}

// ─── Profile ───────────────────────────────────────────────────────────────

export async function getProfile(userId: number) {
  const user = await prisma.user.findFirst({
    where: { id: userId, isDeleted: false },
    select: {
      id: true,
      publicId: true,
      fullName: true,
      email: true,
      phone: true,
      gender: true,
      bio: true,
      profilePictureUrl: true,
      userType: true,
      departmentId: true,
      status: true,
      mustChangePassword: true,
      createdAt: true,
      studentInfo: {
        select: {
          rollNumber: true,
          class: {
            select: {
              publicId: true,
              program: {
                select: {
                  code: true,
                },
              },
            },
          },
        },
      },
      teacherInfo: {
        select: {
          designation: true,
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const roles = await getPublicUserRoles(userId);

  const publicUser = mapLifecycleUser(user);
  const studentInfo = publicUser.studentInfo
    ? {
        rollNumber: publicUser.studentInfo.rollNumber,
        classPublicId: publicUser.studentInfo.class.publicId,
        class: { program: publicUser.studentInfo.class.program },
      }
    : null;

  return {
    ...publicUser,
    studentInfo,
    roles,
  };
}

export async function updateProfile(userId: number, input: { bio?: string }) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { bio: input.bio },
    select: {
      id: true,
      publicId: true,
      bio: true,
      updatedAt: true,
    },
  });

  return mapLifecycleUser(user);
}

export async function updateProfilePicture(userId: number, fileBuffer: Buffer) {
  const uploaded = await cloudinaryService.uploadImage(fileBuffer, "profile-pictures");

  try {
    return await prisma.user.update({
      where: { id: userId },
      data: { profilePictureUrl: uploaded.url },
      select: {
        profilePictureUrl: true,
      },
    });
  } catch (error) {
    await cleanupCloudinaryUploads([uploaded]);
    throw error;
  }
}

// ─── Users List / Detail ───────────────────────────────────────────────────

export async function listUsers(
  query: ListUsersQuery,
  requestingUser: AuthUser
): Promise<PaginatedResponse<{
  publicId: string;
  fullName: string;
  email: string;
  phone: string;
  userType: string;
  departmentId: number | null;
  status: UserStatus;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
}>> {
  const { page, limit, skip, take } = parsePagination(query);
  const filters = parseUserListFilters(query);

  const where: {
    userType?: "STUDENT" | "TEACHER" | "ADMIN";
    departmentId?: number;
    status?: UserStatus;
    isDeleted?: boolean;
    OR?: Array<{ fullName: { contains: string; mode: "insensitive" } } | { email: { contains: string; mode: "insensitive" } }>;
  } = {};

  if (filters.userType) {
    where.userType = filters.userType;
  }

  if (filters.status !== undefined) {
    where.status = filters.status;
  }

  if (requestingUser.userType === "ADMIN") {
    if (filters.departmentId !== undefined) {
      where.departmentId = filters.departmentId;
    }

    if (filters.lifecycle === "live") {
      where.isDeleted = false;
    } else if (filters.lifecycle === "deleted") {
      where.isDeleted = true;
    }
  } else if (requestingUser.userType === "TEACHER") {
    const departmentId = await resolveHodDepartmentId(requestingUser.id);
    where.departmentId = departmentId;
    where.isDeleted = false;
  } else {
    throw new ForbiddenError("You do not have permission to view this user", ApiErrorCode.SCOPE_FORBIDDEN);
  }

  if (filters.search) {
    where.OR = [
      { fullName: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        publicId: true,
        fullName: true,
        email: true,
        phone: true,
        userType: true,
        departmentId: true,
        status: true,
        isDeleted: true,
        deletedAt: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    success: true,
    data: users.map((user) => mapLifecycleUser(user)),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function getUserByPublicId(userPublicId: string, requestingUser: AuthUser) {
  const resolved = await resolveUserPublicId(userPublicId, {
    field: "publicId",
    includeDeleted: requestingUser.userType === "ADMIN",
  });

  const select = {
    ...userLifecycleSelect,
    studentInfo: {
      select: {
        rollNumber: true,
        class: { select: { publicId: true } },
      },
    },
    teacherInfo: {
      select: {
        designation: true,
      },
    },
    deletedByUser: {
      select: {
        publicId: true,
        fullName: true,
        email: true,
      },
    },
  } as const satisfies Prisma.UserSelect;

  if (requestingUser.userType === "ADMIN") {
    const user = await prisma.user.findUnique({
      where: { id: resolved.id },
      select,
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const publicUser = mapLifecycleUser(user);
    return {
      ...publicUser,
      studentInfo: publicUser.studentInfo
        ? {
            classPublicId: publicUser.studentInfo.class.publicId,
            rollNumber: publicUser.studentInfo.rollNumber,
          }
        : null,
    };
  }

  if (requestingUser.userType !== "TEACHER") {
    throw new ForbiddenError("You do not have permission to view this user", ApiErrorCode.SCOPE_FORBIDDEN);
  }

  const departmentId = await resolveHodDepartmentId(requestingUser.id);
  const user = await prisma.user.findFirst({
    where: {
      id: resolved.id,
      departmentId,
      isDeleted: false,
    },
    select,
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const publicUser = mapLifecycleUser(user);
  return {
    ...publicUser,
    studentInfo: publicUser.studentInfo
      ? {
          classPublicId: publicUser.studentInfo.class.publicId,
          rollNumber: publicUser.studentInfo.rollNumber,
        }
      : null,
  };
}

// ─── User Lifecycle ────────────────────────────────────────────────────────

async function buildUserDeletionImpact(tx: PrismaTx, targetUserId: number): Promise<UserDeletionImpact> {
  const user = await tx.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      publicId: true,
      fullName: true,
      email: true,
      userType: true,
      status: true,
      isDeleted: true,
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const hodDepartments = await tx.department.findMany({
    where: { hodId: targetUserId },
    orderBy: { id: "asc" },
    select: { id: true, name: true, code: true },
  });

  const directedPrograms = await tx.program.findMany({
    where: { programDirectorId: targetUserId },
    orderBy: { id: "asc" },
    select: {
      id: true,
      code: true,
      discipline: { select: { name: true } },
      degreeLevel: { select: { level: true } },
    },
  });

  const crClasses = await tx.class.findMany({
    where: { crId: targetUserId },
    orderBy: [{ admissionYear: "desc" }, { id: "asc" }],
    select: {
      publicId: true,
      currentSemester: true,
      admissionYear: true,
      section: true,
      program: { select: { code: true } },
    },
  });

  const presidentSocieties = await tx.society.findMany({
    where: { presidentId: targetUserId, isDeleted: false },
    orderBy: { name: "asc" },
    select: { publicId: true, name: true },
  });

  const convenorSocieties = await tx.society.findMany({
    where: { convenorId: targetUserId, isDeleted: false },
    orderBy: { name: "asc" },
    select: { publicId: true, name: true },
  });

  const teachingAssignments = await tx.teaches.findMany({
    where: {
      teacherId: targetUserId,
      class: { status: "ACTIVE" },
    },
    orderBy: [{ classId: "asc" }, { courseId: "asc" }],
    select: {
      courseId: true,
      course: { select: { code: true, title: true } },
      class: {
        select: {
          publicId: true,
          currentSemester: true,
          section: true,
          program: { select: { code: true } },
        },
      },
    },
  });

  const impact: UserDeletionImpact = {
    user: {
      publicId: user.publicId,
      fullName: user.fullName,
      email: user.email,
      userType: user.userType,
      status: user.status,
      isDeleted: user.isDeleted,
    },
    canDelete: false,
    blockers: {
      hodDepartments,
      directedPrograms: directedPrograms.map((program) => ({
        id: program.id,
        code: program.code,
        disciplineName: program.discipline.name,
        degreeLevel: program.degreeLevel.level,
      })),
      crClasses: crClasses.map((classRecord) => ({
        publicId: classRecord.publicId,
        programCode: classRecord.program.code,
        section: classRecord.section,
        currentSemester: classRecord.currentSemester,
        admissionYear: classRecord.admissionYear,
      })),
      presidentSocieties,
      convenorSocieties,
      teachingAssignments: teachingAssignments.map((assignment) => ({
        classPublicId: assignment.class.publicId,
        courseId: assignment.courseId,
        courseCode: assignment.course.code,
        courseTitle: assignment.course.title,
        programCode: assignment.class.program.code,
        section: assignment.class.section,
        currentSemester: assignment.class.currentSemester,
      })),
    },
  };

  impact.canDelete = !user.isDeleted && !hasDeletionBlockers(impact);
  return impact;
}

export async function getUserDeletionImpact(userPublicId: string): Promise<UserDeletionImpact> {
  const resolved = await resolveUserPublicId(userPublicId, {
    field: "publicId",
    includeDeleted: true,
  });

  return prisma.$transaction((tx) => buildUserDeletionImpact(tx, resolved.id));
}

export async function updateUserStatus(
  userPublicId: string,
  status: UserStatus,
  requestingUserId: number,
  auditContext?: AuditContext,
  reason?: string,
) {
  const resolved = await resolveUserPublicId(userPublicId, { field: "publicId" });

  if (resolved.id === requestingUserId) {
    throw new ForbiddenError("You cannot update your own lifecycle status");
  }

  const { user, revokedRefreshTokens } = await prisma.$transaction(async (tx) => {
    const current = await tx.user.findUnique({
      where: { id: resolved.id },
      select: { id: true, publicId: true, status: true, isDeleted: true },
    });

    if (!current || current.isDeleted) {
      throw new NotFoundError("User not found");
    }

    if (current.status === status) {
      throw new ConflictError(`User is already ${status.toLowerCase()}`);
    }

    const now = new Date();
    const revokeResult =
      status === "SUSPENDED"
        ? await tx.refreshToken.updateMany({
            where: { userId: current.id, revokedAt: null },
            data: { revokedAt: now },
          })
        : { count: 0 };

    const updated = await tx.user.update({
      where: { id: current.id },
      data: {
        status,
        isActive: status === "ACTIVE",
        ...(status === "SUSPENDED" ? { passwordResetTokenHash: null } : {}),
      },
      select: userLifecycleSelect,
    });

    if (auditContext) {
      await recordAuditLog(
        {
          action: "user.status_update",
          targetType: "user",
          targetId: current.publicId,
          summary: {
            status: { before: current.status, after: status },
            reason: reason ?? null,
            revokedSessions: revokeResult.count,
          },
        },
        auditContext,
        tx
      );
    }

    return { user: updated, revokedRefreshTokens: revokeResult.count };
  });

  if (status === "SUSPENDED") {
    disconnectUserSockets(resolved.id);
  }

  invalidateSystemStatsCache();
  return {
    ...mapLifecycleUser(user),
    revokedRefreshTokens,
  };
}

export async function deleteUser(
  userPublicId: string,
  requestingUserId: number,
  auditContext?: AuditContext,
  reason?: string,
) {
  const resolved = await resolveUserPublicId(userPublicId, {
    field: "publicId",
    includeDeleted: true,
  });

  if (resolved.id === requestingUserId) {
    throw new ForbiddenError("You cannot delete your own account");
  }

  const { user, sideEffects } = await prisma.$transaction(async (tx) => {
    const current = await tx.user.findUnique({
      where: { id: resolved.id },
      select: { id: true, publicId: true, status: true, isDeleted: true },
    });

    if (!current) {
      throw new NotFoundError("User not found");
    }

    if (current.isDeleted) {
      throw new ConflictError("User is already deleted");
    }

    const impact = await buildUserDeletionImpact(tx, current.id);
    if (!impact.canDelete) {
      throw new ConflictError("User has deletion blockers", ApiErrorCode.RESOURCE_IN_USE);
    }

    const now = new Date();
    const notifications = await tx.notification.deleteMany({ where: { userId: current.id } });
    const pendingRequests = await tx.societyMembershipRequest.deleteMany({
      where: { userId: current.id, status: "PENDING" },
    });
    const refreshTokens = await tx.refreshToken.updateMany({
      where: { userId: current.id, revokedAt: null },
      data: { revokedAt: now },
    });
    const updated = await tx.user.update({
      where: { id: current.id },
      data: {
        isDeleted: true,
        deletedAt: now,
        deletedBy: requestingUserId,
        isActive: false,
        passwordResetTokenHash: null,
      },
      select: userLifecycleSelect,
    });

    const sideEffects = {
      deletedNotifications: notifications.count,
      deletedPendingSocietyRequests: pendingRequests.count,
      revokedRefreshTokens: refreshTokens.count,
    };

    if (auditContext) {
      await recordAuditLog(
        {
          action: "user.delete",
          targetType: "user",
          targetId: current.publicId,
          summary: {
            statusPreserved: current.status,
            reason: reason ?? null,
            deletedNotifications: sideEffects.deletedNotifications,
            deletedPendingSocietyRequests: sideEffects.deletedPendingSocietyRequests,
            revokedSessions: sideEffects.revokedRefreshTokens,
          },
        },
        auditContext,
        tx
      );
    }

    return { user: updated, sideEffects };
  });

  disconnectUserSockets(resolved.id);
  invalidateSystemStatsCache();

  return {
    ...mapLifecycleUser(user),
    sideEffects,
  };
}

export async function restoreUser(
  userPublicId: string,
  auditContext?: AuditContext,
  reason?: string,
) {
  const resolved = await resolveUserPublicId(userPublicId, {
    field: "publicId",
    includeDeleted: true,
  });

  const user = await prisma.$transaction(async (tx) => {
    const current = await tx.user.findUnique({
      where: { id: resolved.id },
      select: {
        id: true,
        publicId: true,
        email: true,
        status: true,
        isDeleted: true,
      },
    });

    if (!current) {
      throw new NotFoundError("User not found");
    }

    if (!current.isDeleted) {
      throw new ConflictError("User is not deleted");
    }

    const emailConflict = await tx.user.findFirst({
      where: {
        id: { not: current.id },
        email: current.email,
        isDeleted: false,
      },
      select: { publicId: true },
    });

    if (emailConflict) {
      throw new ConflictError("User email has been reused", ApiErrorCode.DUPLICATE_EMAIL);
    }

    const restored = await tx.user.update({
      where: { id: current.id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        isActive: current.status === "ACTIVE",
      },
      select: userLifecycleSelect,
    });

    if (auditContext) {
      await recordAuditLog(
        {
          action: "user.restore",
          targetType: "user",
          targetId: current.publicId,
          summary: {
            restoredStatus: current.status,
            reason: reason ?? null,
          },
        },
        auditContext,
        tx
      );
    }

    return restored;
  });

  invalidateSystemStatsCache();
  return mapLifecycleUser(user);
}
