import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { ForbiddenError, UnauthorizedError } from "../shared/errors/index.js";
import {
  ACADEMIC_ROLE_PERMISSIONS,
  activeStaffRoleAssignmentWhere,
  activePlatformRoleAssignmentWhere,
} from "../shared/roles/index.js";
import type { UserRole } from "../shared/types/index.js";

// ─── Types ─────────────────────────────────────────────────────────────────

type IdResolver = string | ((req: Request) => number | Promise<number>);

interface AuthorizeOptions {
  userTypes?: string[];
  permission?: string;
  serverIdFrom?: IdResolver;
  channelIdFrom?: IdResolver;
  adminBypass?: boolean;
}

// ─── Role-Permission Cache (5-minute TTL) ──────────────────────────────────

const ROLE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let rolePermissionMap: Map<string, Set<string>> | null = null;
let rolePermissionCachedAt = 0;

/**
 * Clear the cached role-permission map. Useful in tests after re-seeding.
 */
export function clearRolePermissionCache(): void {
  rolePermissionMap = null;
  rolePermissionCachedAt = 0;
}

async function getRolePermissionMap(): Promise<Map<string, Set<string>>> {
  if (rolePermissionMap && Date.now() - rolePermissionCachedAt < ROLE_CACHE_TTL_MS) {
    return rolePermissionMap;
  }

  const roles = await prisma.role.findMany({
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });

  rolePermissionMap = new Map<string, Set<string>>(
    Object.entries(ACADEMIC_ROLE_PERMISSIONS).map(([role, permissions]) => [
      role,
      new Set(permissions),
    ]),
  );

  for (const role of roles) {
    rolePermissionMap.set(
      role.name,
      new Set(role.permissions.map((relation) => relation.permission.name)),
    );
  }
  rolePermissionCachedAt = Date.now();

  return rolePermissionMap;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function resolveId(req: Request, resolver: IdResolver): Promise<number> {
  const rawValue =
    typeof resolver === "function"
      ? await resolver(req)
      : req.params[resolver];

  const value = typeof rawValue === "string" ? Number.parseInt(rawValue, 10) : Number(rawValue);

  if (!Number.isInteger(value) || value <= 0) {
    throw new ForbiddenError("Insufficient permissions");
  }

  return value;
}

function checkScopedPermission(
  roles: UserRole[],
  permission: string,
  targetServerId: number,
  targetChannelId: number | undefined,
  permissionsByRole: Map<string, Set<string>>
): boolean {
  for (const role of roles) {
    const allowedPermissions = permissionsByRole.get(role.role);
    if (!allowedPermissions?.has(permission)) {
      continue;
    }

    if (role.serverId !== targetServerId) {
      continue;
    }

    if (role.scopeType === "channel") {
      if (targetChannelId === undefined || role.channelId !== targetChannelId) {
        continue;
      }
    }

    return true;
  }

  return false;
}

function userTypeMatches(user: NonNullable<Request["user"]>, allowedTypes: string[]): boolean {
  return allowedTypes.some((type) => {
    if (type === "ADMIN") return user.isAdmin;
    return user.baseUserType === type || user.userType === type;
  });
}

// ─── Role Resolver ─────────────────────────────────────────────────────────

export async function getUserRoles(userId: number): Promise<UserRole[]> {
  const now = new Date();
  const [
    hodDepartments,
    directedPrograms,
    crClasses,
    presidentSocieties,
    convenorSocieties,
    platformAssignments,
    staffAssignments,
  ] =
    await Promise.all([
      prisma.department.findMany({
        where: { hodId: userId, server: { isDeleted: false } },
        select: { serverId: true },
      }),
      prisma.program.findMany({
        where: {
          programDirectorId: userId,
          department: { server: { isDeleted: false } },
        },
        select: { department: { select: { serverId: true } } },
      }),
      prisma.class.findMany({
        where: { crId: userId, status: "ACTIVE", server: { isDeleted: false } },
        select: { serverId: true },
      }),
      prisma.society.findMany({
        where: {
          presidentId: userId,
          status: "ACTIVE",
          isDeleted: false,
          server: { isDeleted: false },
        },
        select: { serverId: true },
      }),
      prisma.society.findMany({
        where: {
          convenorId: userId,
          status: "ACTIVE",
          isDeleted: false,
          server: { isDeleted: false },
        },
        select: { serverId: true },
      }),
      prisma.userRoleAssignment.findMany({
        where: {
          AND: [activePlatformRoleAssignmentWhere(now), { userId }],
        },
        select: {
          publicId: true,
          serverId: true,
          channelId: true,
          scopeType: true,
          expiresAt: true,
          role: { select: { name: true } },
        },
      }),
      prisma.staffRoleAssignment.findMany({
        where: {
          AND: [activeStaffRoleAssignmentWhere(now), { userId }],
        },
        select: {
          publicId: true,
          departmentId: true,
          scopeType: true,
          expiresAt: true,
          role: { select: { name: true } },
        },
      }),
    ]);

  const roles: UserRole[] = [];

  for (const department of hodDepartments) {
    roles.push({ role: "hod", serverId: department.serverId, scopeType: "server" });
  }

  for (const program of directedPrograms) {
    roles.push({ role: "program_director", serverId: program.department.serverId, scopeType: "server" });
  }

  for (const klass of crClasses) {
    roles.push({ role: "cr", serverId: klass.serverId, scopeType: "server" });
  }

  for (const society of presidentSocieties) {
    roles.push({ role: "society_president", serverId: society.serverId, scopeType: "server" });
  }

  for (const society of convenorSocieties) {
    roles.push({ role: "society_convenor", serverId: society.serverId, scopeType: "server" });
  }

  for (const assignment of platformAssignments) {
    roles.push({
      role: assignment.role.name,
      serverId: assignment.serverId,
      channelId: assignment.channelId,
      scopeType: assignment.scopeType === "CHANNEL" ? "channel" : "server",
      assignmentPublicId: assignment.publicId,
      expiresAt: assignment.expiresAt,
    });
  }

  for (const assignment of staffAssignments) {
    roles.push({
      role: assignment.role.name,
      departmentId: assignment.departmentId,
      scopeType: assignment.scopeType === "GLOBAL" ? "global" : "department",
      assignmentPublicId: assignment.publicId,
      expiresAt: assignment.expiresAt,
    });
  }

  return roles;
}

export async function getPublicUserRoles(userId: number) {
  const roles = await getUserRoles(userId);
  const serverIds = [...new Set(roles.flatMap((role) => role.serverId === undefined ? [] : [role.serverId]))];
  const channelIds = [
    ...new Set(
      roles.flatMap((role) => role.channelId === null || role.channelId === undefined
        ? []
        : [role.channelId]),
    ),
  ];
  const departmentIds = [
    ...new Set(
      roles.flatMap((role) => role.departmentId === null || role.departmentId === undefined
        ? []
        : [role.departmentId]),
    ),
  ];
  const [servers, channels, departments] = await Promise.all([
    prisma.server.findMany({
      where: { id: { in: serverIds } },
      select: { id: true, publicId: true },
    }),
    prisma.channel.findMany({
      where: { id: { in: channelIds } },
      select: { id: true, publicId: true },
    }),
    prisma.department.findMany({
      where: { id: { in: departmentIds } },
      select: { id: true, name: true },
    }),
  ]);
  const serverPublicIds = new Map(servers.map((server) => [server.id, server.publicId]));
  const channelPublicIds = new Map(channels.map((channel) => [channel.id, channel.publicId]));
  const departmentNames = new Map(departments.map((department) => [department.id, department.name]));

  return roles.map(({ serverId, channelId, departmentId, ...role }) => {
    if (role.scopeType === "global") {
      return role;
    }

    if (role.scopeType === "department") {
      const departmentName =
        departmentId === null || departmentId === undefined
          ? null
          : departmentNames.get(departmentId);
      if (!departmentName) {
        throw new Error("Role department could not be resolved");
      }
      return {
        ...role,
        departmentId,
        departmentName,
      };
    }

    if (serverId === undefined) {
      throw new Error("Role server ID could not be resolved");
    }
    const serverPublicId = serverPublicIds.get(serverId);
    if (!serverPublicId) {
      throw new Error("Role server public ID could not be resolved");
    }

    const channelPublicId =
      channelId === null || channelId === undefined
        ? null
        : channelPublicIds.get(channelId);
    if (channelId !== null && channelId !== undefined && !channelPublicId) {
      throw new Error("Role channel public ID could not be resolved");
    }

    return {
      ...role,
      serverPublicId,
      ...(channelPublicId === null ? {} : { channelPublicId }),
    };
  });
}

// ─── Middleware ────────────────────────────────────────────────────────────

export function authorize(options: AuthorizeOptions) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;

    if (!user) {
      throw new UnauthorizedError("Authentication required");
    }

    if (options.adminBypass !== false && user.isAdmin) {
      next();
      return;
    }

    if (options.userTypes && !userTypeMatches(user, options.userTypes)) {
      throw new ForbiddenError("Insufficient permissions");
    }

    if (options.userTypes && !options.permission) {
      next();
      return;
    }

    if (options.permission) {
      const serverId = await resolveId(req, options.serverIdFrom ?? "serverId");
      const channelId = options.channelIdFrom ? await resolveId(req, options.channelIdFrom) : undefined;

      if (!req.userRoles) {
        req.userRoles = await getUserRoles(user.id);
      }

      const permissionsByRole = await getRolePermissionMap();
      const isAllowed = checkScopedPermission(
        req.userRoles,
        options.permission,
        serverId,
        channelId,
        permissionsByRole
      );

      if (!isAllowed) {
        throw new ForbiddenError("Insufficient permissions");
      }
    }

    next();
  };
}
