import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";

export const STAFF_ROLE_NAMES = ["admin", "enrollment_officer"] as const;
export type StaffRoleName = (typeof STAFF_ROLE_NAMES)[number];

type PrismaClientLike = typeof prisma | Prisma.TransactionClient;

export function activeStaffRoleAssignmentWhere(
  now = new Date(),
): Prisma.StaffRoleAssignmentWhereInput {
  return {
    revokedAt: null,
    user: {
      is: {
        userType: "STAFF",
        status: "ACTIVE",
        isDeleted: false,
      },
    },
    AND: [
      {
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      {
        OR: [
          { scopeType: "GLOBAL", departmentId: null },
          { scopeType: "DEPARTMENT", departmentId: { not: null } },
        ],
      },
    ],
  };
}

export async function hasActiveStaffRole(
  userId: number,
  roleName: StaffRoleName,
  client: PrismaClientLike = prisma,
): Promise<boolean> {
  const role = await client.staffRoleAssignment.findFirst({
    where: {
      AND: [
        activeStaffRoleAssignmentWhere(),
        {
          userId,
          role: { name: roleName },
        },
      ],
    },
    select: { id: true },
  });

  return role !== null;
}

export function hasAdminRoleInList(
  roles: Array<{ role: string; scopeType?: string | null }>,
): boolean {
  return roles.some((role) => role.role === "admin" && role.scopeType === "global");
}

export async function hasActiveAdminRole(
  userId: number,
  client: PrismaClientLike = prisma,
): Promise<boolean> {
  return hasActiveStaffRole(userId, "admin", client);
}

export async function countActiveAdmins(client: PrismaClientLike = prisma): Promise<number> {
  return client.staffRoleAssignment.count({
    where: {
      AND: [
        activeStaffRoleAssignmentWhere(),
        {
          role: { name: "admin" },
          scopeType: "GLOBAL",
          departmentId: null,
        },
      ],
    },
  });
}
