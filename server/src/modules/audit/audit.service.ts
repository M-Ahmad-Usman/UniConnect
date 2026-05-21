import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import { prisma } from "../../config/prisma.js";

export type AuditContext = {
  actorUserId: number | null;
  ipAddress?: string;
  userAgent?: string;
};

export type AuditSummary = Record<string, unknown>;

export type AuditEvent = {
  action: string;
  targetType: string;
  targetId?: unknown;
  summary?: AuditSummary;
};

type PrismaTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

const REDACTED = "[REDACTED]";
const SENSITIVE_KEY_PATTERN = /password|token|secret|cookie|authorization|hash/i;

function isJsonPrimitive(value: unknown): value is string | number | boolean | null {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  );
}

function redactValue(key: string, value: unknown): unknown {
  if (value === undefined) {
    return null;
  }

  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return REDACTED;
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      typeof item === "object" && item !== null ? redactObject(item as Record<string, unknown>) : item
    );
  }

  if (typeof value === "object" && value !== null) {
    if (value instanceof Date) {
      return value.toISOString();
    }

    return redactObject(value as Record<string, unknown>);
  }

  if (typeof value === "string" && value.length > 300) {
    return `${value.slice(0, 300)}...`;
  }

  return isJsonPrimitive(value) ? value : String(value);
}

function redactObject(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, redactValue(key, value)])
  );
}

function sanitizeSummary(summary: AuditSummary | undefined): Prisma.InputJsonObject | undefined {
  if (!summary) {
    return undefined;
  }

  return redactObject(summary) as Prisma.InputJsonObject;
}

export function buildAuditContext(input: {
  actorUserId: number | null;
  ipAddress?: string;
  userAgent?: string;
}): AuditContext {
  return {
    actorUserId: input.actorUserId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  };
}

export async function recordAuditLog(
  event: AuditEvent,
  context: AuditContext,
  tx: PrismaTransaction = prisma
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorUserId: context.actorUserId,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId === undefined || event.targetId === null ? null : String(event.targetId),
      summary: sanitizeSummary(event.summary),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    },
  });
}
