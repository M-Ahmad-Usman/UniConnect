import type { PrismaClient } from "../../generated/prisma/client.js";
import { prisma } from "../../config/prisma.js";
import { NotFoundError } from "../errors/index.js";
import {
  parsePublicId,
  type PublicId,
} from "./public-id.js";

export const corePublicEntities = ["user", "class", "society", "server", "channel", "post"] as const;

export type CorePublicEntity = (typeof corePublicEntities)[number];

export interface PublicIdResolution {
  id: number;
  publicId: string;
}

export type PublicIdPrismaClient = Pick<
  PrismaClient,
  "user" | "class" | "society" | "server" | "channel" | "post"
>;

export interface ResolvePublicIdOptions {
  client?: PublicIdPrismaClient;
  includeDeleted?: boolean;
  field?: string;
}

const publicIdResolutionSelect = {
  id: true,
  publicId: true,
} as const;

const entityLabels: Record<CorePublicEntity, string> = {
  user: "User",
  class: "Class",
  society: "Society",
  server: "Server",
  channel: "Channel",
  post: "Post",
};

const defaultFields: Record<CorePublicEntity, string> = {
  user: "userPublicId",
  class: "classPublicId",
  society: "societyPublicId",
  server: "serverPublicId",
  channel: "channelPublicId",
  post: "postPublicId",
};

function notFound(entity: CorePublicEntity): NotFoundError {
  return new NotFoundError(`${entityLabels[entity]} not found`);
}

async function findByPublicId(
  entity: CorePublicEntity,
  publicId: PublicId,
  client: PublicIdPrismaClient,
  includeDeleted: boolean,
): Promise<PublicIdResolution | null> {
  switch (entity) {
    case "user":
      return client.user.findFirst({
        where: { publicId, ...(includeDeleted ? {} : { isDeleted: false }) },
        select: publicIdResolutionSelect,
      });
    case "class":
      return client.class.findFirst({
        where: { publicId },
        select: publicIdResolutionSelect,
      });
    case "society":
      return client.society.findFirst({
        where: { publicId, ...(includeDeleted ? {} : { isDeleted: false }) },
        select: publicIdResolutionSelect,
      });
    case "server":
      return client.server.findFirst({
        where: { publicId, ...(includeDeleted ? {} : { isDeleted: false }) },
        select: publicIdResolutionSelect,
      });
    case "channel":
      return client.channel.findFirst({
        where: { publicId, ...(includeDeleted ? {} : { isDeleted: false }) },
        select: publicIdResolutionSelect,
      });
    case "post":
      return client.post.findFirst({
        where: { publicId, ...(includeDeleted ? {} : { isDeleted: false }) },
        select: publicIdResolutionSelect,
      });
  }
}

export async function resolvePublicId(
  entity: CorePublicEntity,
  value: unknown,
  options: ResolvePublicIdOptions = {},
): Promise<PublicIdResolution> {
  const field = options.field ?? defaultFields[entity];
  const publicId = parsePublicId(value, field);
  const resolved = await findByPublicId(
    entity,
    publicId,
    options.client ?? prisma,
    options.includeDeleted ?? false,
  );

  if (!resolved) {
    throw notFound(entity);
  }

  return resolved;
}

export function resolveUserPublicId(
  value: unknown,
  options?: ResolvePublicIdOptions,
): Promise<PublicIdResolution> {
  return resolvePublicId("user", value, options);
}

export function resolveClassPublicId(
  value: unknown,
  options?: ResolvePublicIdOptions,
): Promise<PublicIdResolution> {
  return resolvePublicId("class", value, options);
}

export function resolveSocietyPublicId(
  value: unknown,
  options?: ResolvePublicIdOptions,
): Promise<PublicIdResolution> {
  return resolvePublicId("society", value, options);
}

export function resolveServerPublicId(
  value: unknown,
  options?: ResolvePublicIdOptions,
): Promise<PublicIdResolution> {
  return resolvePublicId("server", value, options);
}

export function resolveChannelPublicId(
  value: unknown,
  options?: ResolvePublicIdOptions,
): Promise<PublicIdResolution> {
  return resolvePublicId("channel", value, options);
}

export function resolvePostPublicId(
  value: unknown,
  options?: ResolvePublicIdOptions,
): Promise<PublicIdResolution> {
  return resolvePublicId("post", value, options);
}
