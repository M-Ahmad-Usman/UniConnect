import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type {
  ApiResponse,
  PaginatedResponse,
} from "../../shared/types/index.js";
import { ValidationError } from "../../shared/errors/index.js";
import { getResolvedServerTarget } from "../../middleware/resolveCommunicationTarget.js";
import * as serverService from "./server.service.js";
import { buildAuditContext, recordAuditLog } from "../audit/audit.service.js";

function auditContextFromRequest(req: Request) {
  return buildAuditContext({
    actorUserId: req.user?.id ?? null,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
}

// ─── Server Handlers ───────────────────────────────────────────────────────

export async function handleListServers(
  req: Request,
  res: Response,
): Promise<void> {
  const query = req.query as Record<string, string | undefined>;
  const result = await serverService.listServers(
    {
      type: query.type as "DEPARTMENT" | "CLASS" | "SOCIETY" | undefined,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    },
    { id: req.user!.id, userType: req.user!.userType },
  );

  const response: PaginatedResponse<(typeof result.data)[number]> = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleGetServer(
  req: Request,
  res: Response,
): Promise<void> {
  const server = await serverService.getServer(getResolvedServerTarget(req).id, {
    id: req.user!.id,
    userType: req.user!.userType,
  });

  const response: ApiResponse<typeof server> = {
    success: true,
    data: server,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleListServerChannels(
  req: Request,
  res: Response,
): Promise<void> {
  const query = req.query as { includeArchived?: boolean };
  const channels = await serverService.listServerChannels(
    getResolvedServerTarget(req).id,
    { id: req.user!.id, userType: req.user!.userType },
    { includeArchived: query.includeArchived ?? false },
  );

  const response: ApiResponse<typeof channels> = {
    success: true,
    data: channels,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleListServerMembers(
  req: Request,
  res: Response,
): Promise<void> {
  const query = req.query as Record<string, string | undefined>;
  const result = await serverService.listServerMembers(
    getResolvedServerTarget(req).id,
    {
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    },
    { id: req.user!.id, userType: req.user!.userType },
  );

  const response: PaginatedResponse<(typeof result.data)[number]> = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleCreateChannel(
  req: Request,
  res: Response,
): Promise<void> {
  const channel = await serverService.createChannel(
    getResolvedServerTarget(req).id,
    req.body,
    { id: req.user!.id, userType: req.user!.userType },
  );
  await recordAuditLog(
    {
      action: "channel.create",
      targetType: "channel",
      targetId: channel.publicId,
      summary: {
        serverPublicId: getResolvedServerTarget(req).publicId,
        name: channel.name,
        type: channel.type,
      },
    },
    auditContextFromRequest(req),
  );

  const response: ApiResponse<typeof channel> = {
    success: true,
    data: channel,
    message: "Channel created successfully",
  };

  res.status(StatusCodes.CREATED).json(response);
}

export async function handleUpdateServerIcon(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.file?.buffer) {
    throw new ValidationError("Server icon file is required");
  }

  const updated = await serverService.updateServerIcon(
    getResolvedServerTarget(req).id,
    req.file.buffer,
  );
  await recordAuditLog(
    {
      action: "server.icon.update",
      targetType: "server",
      targetId: getResolvedServerTarget(req).publicId,
      summary: {
        serverPublicId: getResolvedServerTarget(req).publicId,
      },
    },
    auditContextFromRequest(req),
  );

  const response: ApiResponse<typeof updated> = {
    success: true,
    data: updated,
    message: "Server icon updated successfully",
  };

  res.status(StatusCodes.OK).json(response);
}
