import { prisma } from "../../config/prisma.js";
import type { PrismaTransaction } from "./society.js";
import { buildImpactGroup, IMPACT_PREVIEW_LIMIT } from "./impact.js";

export async function getServerCommunicationImpact(
  serverId: number,
  client: PrismaTransaction = prisma,
) {
  const [channelCount, channelPreview, postCount, membershipCount, preferenceCount, roleCount] =
    await Promise.all([
      client.channel.count({ where: { serverId } }),
      client.channel.findMany({
        where: { serverId },
        select: {
          publicId: true,
          name: true,
          type: true,
          isDeleted: true,
          isArchived: true,
        },
        orderBy: { createdAt: "asc" },
        take: IMPACT_PREVIEW_LIMIT,
      }),
      client.post.count({ where: { channel: { serverId } } }),
      client.serverMembership.count({ where: { serverId } }),
      client.notificationPreference.count({ where: { serverId } }),
      client.userRoleAssignment.count({ where: { serverId } }),
    ]);

  return {
    channels: buildImpactGroup(channelCount, channelPreview),
    posts: { count: postCount },
    serverMemberships: { count: membershipCount },
    notificationPreferences: { count: preferenceCount },
    platformRoleAssignments: { count: roleCount },
  };
}
