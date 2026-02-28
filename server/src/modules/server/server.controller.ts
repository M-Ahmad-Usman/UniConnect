import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse, PaginatedResponse } from "../../shared/types/index.js";
import * as serverService from "./server.service.js";

// ─── Server Handlers ───────────────────────────────────────────────────────

export async function handleListServers(req: Request, res: Response): Promise<void> {
  const query = req.query as Record<string, string | undefined>;
  const result = await serverService.listServers(
    {
      type: query.type as "DEPARTMENT" | "CLASS" | "SOCIETY" | undefined,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    },
    { id: req.user!.id, userType: req.user!.userType }
  );

  const response: PaginatedResponse<(typeof result.data)[number]> = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleGetServer(req: Request, res: Response): Promise<void> {
  const server = await serverService.getServer(Number(req.params.id), {
    id: req.user!.id,
    userType: req.user!.userType,
  });

  const response: ApiResponse<typeof server> = {
    success: true,
    data: server,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleListServerChannels(req: Request, res: Response): Promise<void> {
  const query = req.query as { includeArchived?: boolean };
  const channels = await serverService.listServerChannels(
    Number(req.params.id),
    { id: req.user!.id, userType: req.user!.userType },
    { includeArchived: query.includeArchived ?? false }
  );

  const response: ApiResponse<typeof channels> = {
    success: true,
    data: channels,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleListServerMembers(req: Request, res: Response): Promise<void> {
  const query = req.query as Record<string, string | undefined>;
  const result = await serverService.listServerMembers(
    Number(req.params.id),
    {
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    },
    { id: req.user!.id, userType: req.user!.userType }
  );

  const response: PaginatedResponse<(typeof result.data)[number]> = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleCreateChannel(req: Request, res: Response): Promise<void> {
  const channel = await serverService.createChannel(
    Number(req.params.id),
    req.body,
    { id: req.user!.id, userType: req.user!.userType }
  );

  const response: ApiResponse<typeof channel> = {
    success: true,
    data: channel,
    message: "Channel created successfully",
  };

  res.status(StatusCodes.CREATED).json(response);
}
