import { prisma } from "../../config/prisma.js";
import { buildPaginationResponse, parsePagination } from "../../shared/utils/pagination.js";
import type { PaginatedResponse } from "../../shared/types/index.js";
import type { Prisma, UserStatus  } from "@prisma/client";
import { mapUserPublicDto } from "../../shared/ids/index.js";

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
  status?: unknown;
  lifecycle?: unknown;
  search?: unknown;
}

interface UserListItem {
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
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function parseAdminUserFilters(query: AdminListUsersQuery) {
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

// ─── System Stats ──────────────────────────────────────────────────────────

interface StatsCache {
  data: SystemStats;
  cachedAt: number;
}

const STATS_CACHE_TTL_MS = 60_000; // 60 seconds
let statsCache: StatsCache | null = null;

/**
 * Clear the stats cache. Exported for test isolation.
 */
export function clearStatsCache(): void {
  statsCache = null;
}

export function invalidateSystemStatsCache(): void {
  statsCache = null;
}

export async function getSystemStats(): Promise<SystemStats> {
  const now = Date.now();
  if (statsCache && now - statsCache.cachedAt < STATS_CACHE_TTL_MS) {
    return statsCache.data;
  }

  const [usersByType, activeUsers, serversByType, totalPosts] = await Promise.all([
    prisma.user.groupBy({
      by: ["userType"],
      where: { isDeleted: false },
      _count: { _all: true },
    }),
    prisma.user.count({ where: { status: "ACTIVE", isDeleted: false } }),
    prisma.server.groupBy({
      by: ["type"],
      where: { isDeleted: false },
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

  const result: SystemStats = {
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

  statsCache = { data: result, cachedAt: Date.now() };
  return result;
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

  if (filters.status !== undefined) {
    where.status = filters.status;
  }

  if (filters.lifecycle === "live") {
    where.isDeleted = false;
  } else if (filters.lifecycle === "deleted") {
    where.isDeleted = true;
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
    data: users.map((user) => mapUserPublicDto(user)),
    pagination: buildPaginationResponse(page, limit, total),
  };
}
