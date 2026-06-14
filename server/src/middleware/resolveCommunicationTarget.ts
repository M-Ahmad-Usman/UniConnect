import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { NotFoundError } from "../shared/errors/index.js";
import { parsePublicId } from "../shared/ids/index.js";
import type {
  ResolvedChannelTarget,
  ResolvedCommunicationTarget,
  ResolvedPostTarget,
  ResolvedServerTarget,
} from "../shared/types/index.js";

function routePublicId(req: Request): unknown {
  return req.params.publicId;
}

function requireTarget(req: Request): ResolvedCommunicationTarget {
  if (!req.communicationTarget) {
    throw new Error("Communication route target was not resolved");
  }

  return req.communicationTarget;
}

export function getResolvedServerTarget(req: Request): ResolvedServerTarget {
  return requireTarget(req).server;
}

export function getResolvedChannelTarget(req: Request): ResolvedChannelTarget {
  const channel = requireTarget(req).channel;
  if (!channel) {
    throw new Error("Channel route target was not resolved");
  }

  return channel;
}

export function getResolvedPostTarget(req: Request): ResolvedPostTarget {
  const post = requireTarget(req).post;
  if (!post) {
    throw new Error("Post route target was not resolved");
  }

  return post;
}

export async function resolveServerTarget(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const publicId = parsePublicId(routePublicId(req), "serverPublicId");
  const server = await prisma.server.findFirst({
    where: { publicId, isDeleted: false },
    select: { id: true, publicId: true },
  });

  if (!server) {
    throw new NotFoundError("Server not found");
  }

  req.communicationTarget = { server };
  next();
}

export async function resolveChannelTarget(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const publicId = parsePublicId(routePublicId(req), "channelPublicId");
  const channel = await prisma.channel.findFirst({
    where: {
      publicId,
      isDeleted: false,
      server: { isDeleted: false },
    },
    select: {
      id: true,
      publicId: true,
      serverId: true,
      isArchived: true,
      server: { select: { publicId: true } },
    },
  });

  if (!channel) {
    throw new NotFoundError("Channel not found");
  }

  req.communicationTarget = {
    server: { id: channel.serverId, publicId: channel.server.publicId },
    channel: {
      id: channel.id,
      publicId: channel.publicId,
      serverId: channel.serverId,
      serverPublicId: channel.server.publicId,
      isArchived: channel.isArchived,
    },
  };
  next();
}

export async function resolvePostTarget(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const publicId = parsePublicId(routePublicId(req), "postPublicId");
  const post = await prisma.post.findFirst({
    where: {
      publicId,
      isDeleted: false,
      channel: {
        isDeleted: false,
        server: { isDeleted: false },
      },
    },
    select: {
      id: true,
      publicId: true,
      channelId: true,
      channel: {
        select: {
          publicId: true,
          serverId: true,
          isArchived: true,
          server: { select: { publicId: true } },
        },
      },
    },
  });

  if (!post) {
    throw new NotFoundError("Post not found");
  }

  req.communicationTarget = {
    server: {
      id: post.channel.serverId,
      publicId: post.channel.server.publicId,
    },
    channel: {
      id: post.channelId,
      publicId: post.channel.publicId,
      serverId: post.channel.serverId,
      serverPublicId: post.channel.server.publicId,
      isArchived: post.channel.isArchived,
    },
    post: {
      id: post.id,
      publicId: post.publicId,
      channelId: post.channelId,
      channelPublicId: post.channel.publicId,
      serverId: post.channel.serverId,
      serverPublicId: post.channel.server.publicId,
      channelIsArchived: post.channel.isArchived,
    },
  };
  next();
}
