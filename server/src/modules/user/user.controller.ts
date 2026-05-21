import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse, PaginatedResponse } from "../../shared/types/index.js";
import { ValidationError } from "../../shared/errors/index.js";
import * as userService from "./user.service.js";
import { buildAuditContext } from "../audit/audit.service.js";

function auditContextFromRequest(req: Request) {
  return buildAuditContext({
    actorUserId: req.user?.id ?? null,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
}

export async function handleCreateUser(req: Request, res: Response): Promise<void> {
  const user = await userService.createUser(req.body, auditContextFromRequest(req));

  const response: ApiResponse<typeof user> = {
    success: true,
    data: user,
    message: "User created successfully",
  };

  res.status(StatusCodes.CREATED).json(response);
}

export async function handleBulkImport(req: Request, res: Response): Promise<void> {
  if (!req.file?.buffer) {
    throw new ValidationError("CSV file is required");
  }

  const result = await userService.bulkImportUsers(req.file.buffer, auditContextFromRequest(req));

  const response: ApiResponse<typeof result> = {
    success: true,
    data: result,
    message: "Bulk import completed",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleGetProfile(req: Request, res: Response): Promise<void> {
  const profile = await userService.getProfile(req.user!.id);

  const response: ApiResponse<typeof profile> = {
    success: true,
    data: profile,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleUpdateProfile(req: Request, res: Response): Promise<void> {
  const updated = await userService.updateProfile(req.user!.id, req.body);

  const response: ApiResponse<typeof updated> = {
    success: true,
    data: updated,
    message: "Profile updated successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleUpdateProfilePicture(req: Request, res: Response): Promise<void> {
  if (!req.file?.buffer) {
    throw new ValidationError("Profile picture file is required");
  }

  const updated = await userService.updateProfilePicture(req.user!.id, req.file.buffer);

  const response: ApiResponse<typeof updated> = {
    success: true,
    data: updated,
    message: "Profile picture updated successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleListUsers(req: Request, res: Response): Promise<void> {
  const result = await userService.listUsers(req.query, req.user!);

  const response: PaginatedResponse<typeof result.data[number]> = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleGetUserById(req: Request, res: Response): Promise<void> {
  const user = await userService.getUserById(Number(req.params.id), req.user!);

  const response: ApiResponse<typeof user> = {
    success: true,
    data: user,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleDeactivateUser(req: Request, res: Response): Promise<void> {
  await userService.deactivateUser(Number(req.params.id), req.user!.id, auditContextFromRequest(req));

  const response: ApiResponse<null> = {
    success: true,
    data: null,
    message: "User deactivated successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleReactivateUser(req: Request, res: Response): Promise<void> {
  await userService.reactivateUser(Number(req.params.id), auditContextFromRequest(req));

  const response: ApiResponse<null> = {
    success: true,
    data: null,
    message: "User reactivated successfully",
  };

  res.status(StatusCodes.OK).json(response);
}
