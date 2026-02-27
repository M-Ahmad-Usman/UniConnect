import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse } from "../../shared/types/index.js";
import * as channelService from "./channel.service.js";

// ─── Channel Handlers ──────────────────────────────────────────────────────

export async function handleUpdateChannel(req: Request, res: Response): Promise<void> {
  const channel = await channelService.updateChannel(
    Number(req.params.id),
    req.body,
    { id: req.user!.id, userType: req.user!.userType }
  );

  const response: ApiResponse<typeof channel> = {
    success: true,
    data: channel,
    message: "Channel updated successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleLockChannel(req: Request, res: Response): Promise<void> {
  const channel = await channelService.lockChannel(Number(req.params.id), {
    id: req.user!.id,
    userType: req.user!.userType,
  });

  const response: ApiResponse<typeof channel> = {
    success: true,
    data: channel,
    message: "Channel locked successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleUnlockChannel(req: Request, res: Response): Promise<void> {
  const channel = await channelService.unlockChannel(Number(req.params.id), {
    id: req.user!.id,
    userType: req.user!.userType,
  });

  const response: ApiResponse<typeof channel> = {
    success: true,
    data: channel,
    message: "Channel unlocked successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleDeleteChannel(req: Request, res: Response): Promise<void> {
  await channelService.deleteChannel(Number(req.params.id), {
    id: req.user!.id,
    userType: req.user!.userType,
  });

  const response: ApiResponse<null> = {
    success: true,
    data: null,
    message: "Channel deleted successfully",
  };

  res.status(StatusCodes.OK).json(response);
}
