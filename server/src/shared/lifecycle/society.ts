import type { PrismaClient } from "../../generated/prisma/client.js";
import { prisma } from "../../config/prisma.js";
import {
  ApiErrorCode,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../errors/index.js";

export type PrismaTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

type SocietyLifecycleRow = {
  id: number;
  publicId: string;
  name: string;
  status: "ACTIVE" | "SUSPENDED";
  isActive: boolean;
  isDeleted: boolean;
  deletedCascadeId: string | null;
  serverId: number;
  serverIsActive: boolean;
  serverIsDeleted: boolean;
};

type SocietyLifecycleSqlRow = {
  id: number;
  public_id: string;
  name: string;
  status: "active" | "suspended";
  is_active: boolean;
  is_deleted: boolean;
  deleted_cascade_id: string | null;
  server_id: number;
  server_is_active: boolean;
  server_is_deleted: boolean;
};

function mapLifecycleRow(row: SocietyLifecycleSqlRow): SocietyLifecycleRow {
  return {
    id: row.id,
    publicId: row.public_id,
    name: row.name,
    status: row.status === "active" ? "ACTIVE" : "SUSPENDED",
    isActive: row.is_active,
    isDeleted: row.is_deleted,
    deletedCascadeId: row.deleted_cascade_id,
    serverId: row.server_id,
    serverIsActive: row.server_is_active,
    serverIsDeleted: row.server_is_deleted,
  };
}

/**
 * Lock the society and owned server together before lifecycle and society-owned
 * writes. The targeted SQL lock keeps concurrent cascades and writes ordered;
 * Prisma does not currently expose SELECT FOR UPDATE.
 */
export async function lockSocietyLifecycleRow(
  societyId: number,
  client: PrismaTransaction = prisma,
): Promise<SocietyLifecycleRow> {
  const rows = await client.$queryRaw<SocietyLifecycleSqlRow[]>`
    SELECT
      society."id",
      society."public_id",
      society."name",
      society."status",
      society."is_active",
      society."is_deleted",
      society."deleted_cascade_id",
      server."id" AS "server_id",
      server."is_active" AS "server_is_active",
      server."is_deleted" AS "server_is_deleted"
    FROM "societies" AS society
    INNER JOIN "servers" AS server ON server."id" = society."server_id"
    WHERE society."id" = ${societyId}
    FOR UPDATE OF society, server
  `;
  const row = rows[0];
  if (!row) {
    throw new NotFoundError("Society not found");
  }
  return mapLifecycleRow(row);
}

export function assertLiveSocietyAcceptsWrites(society: SocietyLifecycleRow): void {
  if (society.isDeleted || society.serverIsDeleted) {
    throw new NotFoundError("Society not found");
  }
  if (
    society.status !== "ACTIVE" ||
    !society.isActive ||
    !society.serverIsActive
  ) {
    throw new ConflictError(
      "Suspended societies are read-only",
      ApiErrorCode.SOCIETY_SUSPENDED,
    );
  }
}

export async function assertSocietyAcceptsWrites(
  societyId: number,
  client: PrismaTransaction = prisma,
): Promise<SocietyLifecycleRow> {
  const society = await lockSocietyLifecycleRow(societyId, client);
  assertLiveSocietyAcceptsWrites(society);
  return society;
}

export async function assertServerAcceptsWrites(
  serverId: number,
  client: PrismaTransaction = prisma,
): Promise<void> {
  const server = await client.server.findUnique({
    where: { id: serverId },
    select: { id: true, type: true, isActive: true, isDeleted: true },
  });
  if (!server || server.isDeleted) {
    throw new NotFoundError("Server not found");
  }
  if (server.type === "SOCIETY") {
    const society = await client.society.findUnique({
      where: { serverId },
      select: { id: true },
    });
    if (!society) {
      throw new NotFoundError("Society not found");
    }
    await assertSocietyAcceptsWrites(society.id, client);
    return;
  }
  if (!server.isActive) {
    throw new ForbiddenError("Inactive servers are read-only");
  }
}
