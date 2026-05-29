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

function userPublicIdFromRequest(req: Request): string {
  return String(req.params.publicId);
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

export async function handleGetUserByPublicId(req: Request, res: Response): Promise<void> {
  const user = await userService.getUserByPublicId(userPublicIdFromRequest(req), req.user!);

  const response: ApiResponse<typeof user> = {
    success: true,
    data: user,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleGetUserDeletionImpact(req: Request, res: Response): Promise<void> {
  const impact = await userService.getUserDeletionImpact(userPublicIdFromRequest(req));

  const response: ApiResponse<typeof impact> = {
    success: true,
    data: impact,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleUpdateUserStatus(req: Request, res: Response): Promise<void> {
  const user = await userService.updateUserStatus(
    userPublicIdFromRequest(req),
    req.body.status,
    req.user!.id,
    auditContextFromRequest(req),
    req.body.reason
  );

  const response: ApiResponse<typeof user> = {
    success: true,
    data: user,
    message: "User status updated successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleDeleteUser(req: Request, res: Response): Promise<void> {
  const user = await userService.deleteUser(
    userPublicIdFromRequest(req),
    req.user!.id,
    auditContextFromRequest(req),
    req.body.reason
  );

  const response: ApiResponse<typeof user> = {
    success: true,
    data: user,
    message: "User deleted successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleRestoreUser(req: Request, res: Response): Promise<void> {
  const user = await userService.restoreUser(
    userPublicIdFromRequest(req),
    auditContextFromRequest(req),
    req.body.reason
  );

  const response: ApiResponse<typeof user> = {
    success: true,
    data: user,
    message: "User restored successfully",
  };

  res.status(StatusCodes.OK).json(response);
}
