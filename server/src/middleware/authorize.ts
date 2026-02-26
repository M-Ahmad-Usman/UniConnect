import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { ForbiddenError, UnauthorizedError } from "../shared/errors/index.js";
import type { UserRole } from "../shared/types/index.js";

// ─── Types ─────────────────────────────────────────────────────────────────

type IdResolver = string | ((req: Request) => number);

interface AuthorizeOptions {
  userTypes?: string[];
  permission?: string;
  serverIdFrom?: IdResolver;
  channelIdFrom?: IdResolver;
  adminBypass?: boolean;
}

// ─── Role-Permission Cache ─────────────────────────────────────────────────

let rolePermissionMap: Map<string, Set<string>> | null = null;

async function getRolePermissionMap(): Promise<Map<string, Set<string>>> {
  if (rolePermissionMap) {
    return rolePermissionMap;
  }

  const roles = await prisma.role.findMany({
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });

  rolePermissionMap = new Map(
    roles.map((role) => [
      role.name,
      new Set(role.permissions.map((relation) => relation.permission.name)),
    ])
  );

  return rolePermissionMap;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function resolveId(req: Request, resolver: IdResolver): number {
  const rawValue =
    typeof resolver === "function"
      ? resolver(req)
      : req.params[resolver] ??
        (req.body && typeof req.body === "object" ? req.body[resolver] : undefined) ??
        req.query[resolver];

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

// ─── Role Resolver ─────────────────────────────────────────────────────────

export async function getUserRoles(userId: number): Promise<UserRole[]> {
  const [hodDepartments, directedPrograms, crClasses, presidentSocieties, convenorSocieties, moderatorAssignments] =
    await Promise.all([
      prisma.department.findMany({ where: { hodId: userId }, select: { serverId: true } }),
      prisma.program.findMany({
        where: { programDirectorId: userId },
        select: { department: { select: { serverId: true } } },
      }),
      prisma.class.findMany({ where: { crId: userId }, select: { serverId: true } }),
      prisma.society.findMany({ where: { presidentId: userId }, select: { serverId: true } }),
      prisma.society.findMany({ where: { convenorId: userId }, select: { serverId: true } }),
      prisma.moderatorAssignment.findMany({
        where: { userId },
        select: { serverId: true, channelId: true, scopeType: true },
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

  for (const assignment of moderatorAssignments) {
    roles.push({
      role: "moderator",
      serverId: assignment.serverId,
      channelId: assignment.channelId,
      scopeType: assignment.scopeType === "CHANNEL" ? "channel" : "server",
    });
  }

  return roles;
}

// ─── Middleware ────────────────────────────────────────────────────────────

export function authorize(options: AuthorizeOptions) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;

    if (!user) {
      throw new UnauthorizedError("Authentication required");
    }

    if (options.adminBypass !== false && user.userType === "ADMIN") {
      next();
      return;
    }

    if (options.userTypes && !options.userTypes.includes(user.userType)) {
      throw new ForbiddenError("Insufficient permissions");
    }

    if (options.userTypes && !options.permission) {
      next();
      return;
    }

    if (options.permission) {
      const serverId = resolveId(req, options.serverIdFrom ?? "serverId");
      const channelId = options.channelIdFrom ? resolveId(req, options.channelIdFrom) : undefined;

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
