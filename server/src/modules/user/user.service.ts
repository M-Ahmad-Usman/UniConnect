import bcrypt from "bcrypt";
import crypto from "crypto";
import csvParser from "csv-parser";
import { Readable } from "stream";
import { prisma } from "../../config/prisma.js";
import { emailService } from "../../config/email.js";
import { cloudinaryService } from "../../config/cloudinary.js";
import { BCRYPT_ROUNDS, TEMP_PASSWORD_PREFIX } from "../../shared/constants.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors/index.js";
import { buildPaginationResponse, parsePagination } from "../../shared/utils/pagination.js";
import type { AuthUser, PaginatedResponse } from "../../shared/types/index.js";
import { getUserRoles } from "../../middleware/authorize.js";
import { invalidateSystemStatsCache } from "../admin/admin.service.js";
import { createUserBodySchema } from "./user.schema.js";

// ─── Types ─────────────────────────────────────────────────────────────────

type CreateUserInput = {
  fullName: string;
  email: string;
  phone: string;
  gender: "MALE" | "FEMALE";
  userType: "STUDENT" | "TEACHER" | "ADMIN";
  departmentId?: number;
  classId?: number;
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
  isActive?: unknown;
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
    classId: row.classId ? Number.parseInt(row.classId, 10) : undefined,
    rollNumber: row.rollNumber?.trim() ? row.rollNumber.trim().toUpperCase() : undefined,
    designation: row.designation?.trim() ? row.designation.trim() : undefined,
  };
}

function parseUserListFilters(query: ListUsersQuery): {
  userType?: "STUDENT" | "TEACHER" | "ADMIN";
  departmentId?: number;
  isActive?: boolean;
  search?: string;
} {
  const filters: {
    userType?: "STUDENT" | "TEACHER" | "ADMIN";
    departmentId?: number;
    isActive?: boolean;
    search?: string;
  } = {};

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

  if (query.isActive !== undefined) {
    const value = query.isActive;
    if (value === true || value === "true") {
      filters.isActive = true;
    } else if (value === false || value === "false") {
      filters.isActive = false;
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

// ─── Create User ───────────────────────────────────────────────────────────

export async function createUser(input: CreateUserInput) {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existingUser) {
    throw new ConflictError("A user with this email already exists");
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

    if (input.userType === "STUDENT" && input.classId) {
      const classRecord = await tx.class.findUnique({
        where: { id: input.classId },
        select: { serverId: true, program: { select: { departmentId: true } } },
      });

      if (!classRecord) {
        throw new NotFoundError("Class not found");
      }

      classServerId = classRecord.serverId;
      classDepartmentId = classRecord.program.departmentId;

      if (input.departmentId && input.departmentId !== classDepartmentId) {
        throw new ValidationError("classId does not belong to the provided departmentId");
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
        mustChangePassword: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        gender: true,
        userType: true,
        departmentId: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    if (input.userType === "STUDENT") {
      await tx.studentInfo.create({
        data: {
          studentId: user.id,
          classId: input.classId!,
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

    return user;
  });

  try {
    await emailService.sendTempPasswordEmail(createdUser.email, tempPassword);
  } catch (error) {
    console.error("Failed to send temp-password email:", error);
    invalidateSystemStatsCache();
    return { ...createdUser, warning: "User created but welcome email could not be sent. Please share the credentials manually." };
  }

  invalidateSystemStatsCache();
  return createdUser;
}

// ─── Bulk Import ───────────────────────────────────────────────────────────

export async function bulkImportUsers(fileBuffer: Buffer): Promise<BulkImportResult> {
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
        createUser(row.data).then(
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      gender: true,
      bio: true,
      profilePictureUrl: true,
      userType: true,
      departmentId: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
      studentInfo: {
        select: {
          rollNumber: true,
          classId: true,
          class: {
            select: {
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

  const roles = await getUserRoles(userId);

  return {
    ...user,
    roles,
  };
}

export async function updateProfile(userId: number, input: { bio?: string }) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { bio: input.bio },
    select: {
      id: true,
      bio: true,
      updatedAt: true,
    },
  });

  return user;
}

export async function updateProfilePicture(userId: number, fileBuffer: Buffer) {
  const uploaded = await cloudinaryService.uploadImage(fileBuffer, "profile-pictures");

  const user = await prisma.user.update({
    where: { id: userId },
    data: { profilePictureUrl: uploaded.url },
    select: {
      profilePictureUrl: true,
    },
  });

  return user;
}

// ─── Users List / Detail ───────────────────────────────────────────────────

export async function listUsers(
  query: ListUsersQuery,
  requestingUser: AuthUser
): Promise<PaginatedResponse<{
  id: number;
  fullName: string;
  email: string;
  phone: string;
  userType: string;
  departmentId: number | null;
  isActive: boolean;
  createdAt: Date;
}>> {
  const { page, limit, skip, take } = parsePagination(query);
  const filters = parseUserListFilters(query);

  const where: {
    userType?: "STUDENT" | "TEACHER" | "ADMIN";
    departmentId?: number;
    isActive?: boolean;
    OR?: Array<{ fullName: { contains: string; mode: "insensitive" } } | { email: { contains: string; mode: "insensitive" } }>;
  } = {};

  if (filters.userType) {
    where.userType = filters.userType;
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (requestingUser.userType === "ADMIN") {
    if (filters.departmentId !== undefined) {
      where.departmentId = filters.departmentId;
    }
  } else if (requestingUser.userType === "TEACHER") {
    const departmentId = await resolveHodDepartmentId(requestingUser.id);
    where.departmentId = departmentId;
  } else {
    throw new ForbiddenError("Insufficient permissions");
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
        fullName: true,
        email: true,
        phone: true,
        userType: true,
        departmentId: true,
        isActive: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    success: true,
    data: users,
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function getUserById(userId: number, requestingUser: AuthUser) {
  if (requestingUser.userType === "ADMIN") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        gender: true,
        bio: true,
        profilePictureUrl: true,
        userType: true,
        departmentId: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        studentInfo: {
          select: {
            classId: true,
            rollNumber: true,
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

    return user;
  }

  if (requestingUser.userType !== "TEACHER") {
    throw new ForbiddenError("Insufficient permissions");
  }

  const departmentId = await resolveHodDepartmentId(requestingUser.id);

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      departmentId,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      gender: true,
      bio: true,
      profilePictureUrl: true,
      userType: true,
      departmentId: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
      studentInfo: {
        select: {
          classId: true,
          rollNumber: true,
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

  return user;
}

// ─── Account Activation State ──────────────────────────────────────────────

export async function deactivateUser(targetUserId: number, requestingUserId: number) {
  if (targetUserId === requestingUserId) {
    throw new ForbiddenError("You cannot deactivate your own account");
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, isActive: true },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (!user.isActive) {
    throw new ConflictError("User is already deactivated");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: targetUserId },
      data: { isActive: false },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: targetUserId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  invalidateSystemStatsCache();
}

export async function reactivateUser(targetUserId: number) {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, isActive: true },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (user.isActive) {
    throw new ConflictError("User is already active");
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: { isActive: true },
  });

  invalidateSystemStatsCache();
}
