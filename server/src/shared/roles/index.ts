import type { Prisma } from "@prisma/client";

export * from "./staff.js";

export const PLATFORM_ROLE_NAMES = ["server_moderator", "channel_moderator"] as const;
export type PlatformRoleName = (typeof PLATFORM_ROLE_NAMES)[number];

export const ACADEMIC_ROLE_PERMISSIONS = {
  hod: [
    "post:channel",
    "create:channel",
    "delete:channel",
    "lock:channel",
    "create:society",
    "create:class",
    "assign:program_director",
    "assign:cr",
    "assign:society_president",
    "assign:society_convenor",
    "assign:server_moderator",
    "assign:channel_moderator",
  ],
  program_director: ["post:channel", "assign:cr"],
  society_president: [
    "post:channel",
    "create:channel",
    "delete:channel",
    "lock:channel",
    "assign:server_moderator",
    "assign:channel_moderator",
  ],
  society_convenor: [
    "post:channel",
    "create:channel",
    "delete:channel",
    "lock:channel",
    "assign:server_moderator",
    "assign:channel_moderator",
    "assign:society_president",
  ],
  cr: [
    "post:channel",
    "create:channel",
    "delete:channel",
    "lock:channel",
    "assign:server_moderator",
    "assign:channel_moderator",
  ],
} as const satisfies Record<string, readonly string[]>;

export type AcademicRoleName = keyof typeof ACADEMIC_ROLE_PERMISSIONS;

export function isPlatformRoleName(value: string): value is PlatformRoleName {
  return PLATFORM_ROLE_NAMES.some((role) => role === value);
}

/**
 * Scope lifecycle rules shared by every platform-role read path.
 * Department servers have neither a class nor society owner and pass both
 * negative relation filters.
 */
export function activePlatformRoleServerWhere(): Prisma.ServerWhereInput {
  return {
    isDeleted: false,
    class: { isNot: { status: "GRADUATED" } },
    society: {
      isNot: {
        OR: [{ status: "SUSPENDED" }, { isDeleted: true }],
      },
    },
  };
}

/**
 * Current platform roles exclude expired/revoked rows and unusable scope rows.
 * Pass one `now` value through a request when composing several queries so the
 * request observes a consistent temporal boundary.
 */
export function activePlatformRoleAssignmentWhere(
  now = new Date(),
): Prisma.UserRoleAssignmentWhereInput {
  return {
    revokedAt: null,
    user: {
      is: {
        status: "ACTIVE",
        isDeleted: false,
      },
    },
    server: { is: activePlatformRoleServerWhere() },
    AND: [
      {
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      {
        OR: [
          {
            scopeType: "SERVER",
            channelId: null,
          },
          {
            scopeType: "CHANNEL",
            channelId: { not: null },
            channel: {
              is: {
                isDeleted: false,
                isArchived: false,
              },
            },
          },
        ],
      },
    ],
  };
}
