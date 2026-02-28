import { prisma } from "../../config/prisma.js";
import { buildPaginationResponse, parsePagination } from "../../shared/utils/pagination.js";
import type { PaginatedResponse } from "../../shared/types/index.js";
import type { Prisma } from "../../generated/prisma/client.js";

// ─── Types ─────────────────────────────────────────────────────────────────

interface SystemStats {
  users: {
    total: number;
    students: number;
    teachers: number;
    admins: number;
    active: number;
  };
  servers: {
    total: number;
    department: number;
    class: number;
    society: number;
  };
  posts: {
    total: number;
  };
}

interface AdminListUsersQuery {
  page?: unknown;
  limit?: unknown;
  userType?: unknown;
  departmentId?: unknown;
  isActive?: unknown;
  search?: unknown;
}

interface UserListItem {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  userType: string;
  departmentId: number | null;
  isActive: boolean;
  createdAt: Date;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function parseAdminUserFilters(query: AdminListUsersQuery) {
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

// ─── System Stats ──────────────────────────────────────────────────────────

export async function getSystemStats(): Promise<SystemStats> {
  const [usersByType, activeUsers, serversByType, totalPosts] = await Promise.all([
    prisma.user.groupBy({
      by: ["userType"],
      _count: { _all: true },
    }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.server.groupBy({
      by: ["type"],
      _count: { _all: true },
    }),
    prisma.post.count({ where: { isDeleted: false } }),
  ]);

  const userCounts = { students: 0, teachers: 0, admins: 0, total: 0 };
  for (const group of usersByType) {
    const count = group._count._all;
    userCounts.total += count;
    if (group.userType === "STUDENT") userCounts.students = count;
    else if (group.userType === "TEACHER") userCounts.teachers = count;
    else if (group.userType === "ADMIN") userCounts.admins = count;
  }

  const serverCounts = { department: 0, class: 0, society: 0, total: 0 };
  for (const group of serversByType) {
    const count = group._count._all;
    serverCounts.total += count;
    if (group.type === "DEPARTMENT") serverCounts.department = count;
    else if (group.type === "CLASS") serverCounts.class = count;
    else if (group.type === "SOCIETY") serverCounts.society = count;
  }

  return {
    users: {
      total: userCounts.total,
      students: userCounts.students,
      teachers: userCounts.teachers,
      admins: userCounts.admins,
      active: activeUsers,
    },
    servers: serverCounts,
    posts: {
      total: totalPosts,
    },
  };
}

// ─── Admin User List ───────────────────────────────────────────────────────

export async function listAllUsers(
  query: AdminListUsersQuery
): Promise<PaginatedResponse<UserListItem>> {
  const { page, limit, skip, take } = parsePagination(query);
  const filters = parseAdminUserFilters(query);

  const where: Prisma.UserWhereInput = {};

  if (filters.userType) {
    where.userType = filters.userType;
  }

  if (filters.departmentId !== undefined) {
    where.departmentId = filters.departmentId;
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
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
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
