import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse } from "../../shared/types/index.js";
import { getResolvedChannelTarget } from "../../middleware/resolveCommunicationTarget.js";
import * as channelService from "./channel.service.js";
import { buildAuditContext, recordAuditLog } from "../audit/audit.service.js";

function auditContextFromRequest(req: Request) {
  return buildAuditContext({
    actorUserId: req.user?.id ?? null,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
}

// ─── Channel Handlers ──────────────────────────────────────────────────────

export async function handleUpdateChannel(req: Request, res: Response): Promise<void> {
  const channel = await channelService.updateChannel(
    getResolvedChannelTarget(req).id,
    req.body,
    { id: req.user!.id, userType: req.user!.userType }
  );
  await recordAuditLog(
    {
      action: "channel.update",
      targetType: "channel",
      targetId: getResolvedChannelTarget(req).publicId,
      summary: { changedFields: Object.keys(req.body as Record<string, unknown>) },
    },
    auditContextFromRequest(req)
  );

  const response: ApiResponse<typeof channel> = {
    success: true,
    data: channel,
    message: "Channel updated successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleLockChannel(req: Request, res: Response): Promise<void> {
  const channel = await channelService.lockChannel(getResolvedChannelTarget(req).id, {
    id: req.user!.id,
    userType: req.user!.userType,
  });
  await recordAuditLog(
    {
      action: "channel.lock",
      targetType: "channel",
      targetId: getResolvedChannelTarget(req).publicId,
      summary: { isLocked: { before: false, after: true } },
    },
    auditContextFromRequest(req)
  );

  const response: ApiResponse<typeof channel> = {
    success: true,
    data: channel,
    message: "Channel locked successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleUnlockChannel(req: Request, res: Response): Promise<void> {
  const channel = await channelService.unlockChannel(getResolvedChannelTarget(req).id, {
    id: req.user!.id,
    userType: req.user!.userType,
  });
  await recordAuditLog(
    {
      action: "channel.unlock",
      targetType: "channel",
      targetId: getResolvedChannelTarget(req).publicId,
      summary: { isLocked: { before: true, after: false } },
    },
    auditContextFromRequest(req)
  );

  const response: ApiResponse<typeof channel> = {
    success: true,
    data: channel,
    message: "Channel unlocked successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleDeleteChannel(req: Request, res: Response): Promise<void> {
  await channelService.deleteChannel(getResolvedChannelTarget(req).id, {
    id: req.user!.id,
    userType: req.user!.userType,
  });
  await recordAuditLog(
    {
      action: "channel.delete",
      targetType: "channel",
      targetId: getResolvedChannelTarget(req).publicId,
    },
    auditContextFromRequest(req)
  );

  const response: ApiResponse<null> = {
    success: true,
    data: null,
    message: "Channel deleted successfully",
  };

  res.status(StatusCodes.OK).json(response);
}
