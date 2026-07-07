import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse } from "../../shared/types/index.js";
import { buildAuditContext } from "../audit/audit.service.js";
import * as roleService from "./role.service.js";

function callerFrom(req: Request) {
  return {
    id: req.user!.id,
    userType: req.user!.userType,
    departmentId: req.user!.departmentId,
  };
}

function auditFrom(req: Request) {
  return buildAuditContext({
    actorUserId: req.user!.id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
}

export async function handleGetAssignableRoles(req: Request, res: Response): Promise<void> {
  res.status(StatusCodes.OK).json({ success: true, data: await roleService.getAssignableRoles(callerFrom(req)) });
}

export async function handleListAssignableScopes(req: Request, res: Response): Promise<void> {
  res.status(StatusCodes.OK).json(await roleService.listAssignableScopes(req.query as never, callerFrom(req)));
}

export async function handleListAssignableChannels(req: Request, res: Response): Promise<void> {
  res.status(StatusCodes.OK).json(await roleService.listAssignableChannels(req.query as never, callerFrom(req)));
}

export async function handleListAssignableUsers(req: Request, res: Response): Promise<void> {
  res.status(StatusCodes.OK).json(await roleService.listAssignableUsers(req.query as never, callerFrom(req)));
}

export async function handleListRevokableRoles(req: Request, res: Response): Promise<void> {
  res.status(StatusCodes.OK).json(await roleService.listRevokableRoles(req.query as never, callerFrom(req)));
}

export async function handleGetUserRoles(req: Request, res: Response): Promise<void> {
  const roles = await roleService.getUserRoles(String(req.params.userPublicId), callerFrom(req));
  const response: ApiResponse<typeof roles> = { success: true, data: roles };
  res.status(StatusCodes.OK).json(response);
}

export async function handleCreatePlatformAssignment(req: Request, res: Response): Promise<void> {
  const assignment = await roleService.createPlatformAssignment(req.body, callerFrom(req), auditFrom(req));
  const response: ApiResponse<typeof assignment> = {
    success: true,
    data: assignment,
    message: "Platform role assigned successfully",
  };
  res.status(StatusCodes.CREATED).json(response);
}

export async function handleCreateStaffAssignment(req: Request, res: Response): Promise<void> {
  const assignment = await roleService.createStaffAssignment(req.body, callerFrom(req), auditFrom(req));
  const response: ApiResponse<typeof assignment> = {
    success: true,
    data: assignment,
    message: "Staff role assigned successfully",
  };
  res.status(StatusCodes.CREATED).json(response);
}

export async function handleRevokeStaffAssignment(req: Request, res: Response): Promise<void> {
  const assignment = await roleService.revokeStaffAssignment(String(req.params.assignmentPublicId), callerFrom(req), auditFrom(req));
  const response: ApiResponse<typeof assignment> = {
    success: true,
    data: assignment,
    message: "Staff role revoked successfully",
  };
  res.status(StatusCodes.OK).json(response);
}

export async function handleTransferAdmin(req: Request, res: Response): Promise<void> {
  const assignment = await roleService.transferAdminRole(req.body, callerFrom(req), auditFrom(req));
  const response: ApiResponse<typeof assignment> = {
    success: true,
    data: assignment,
    message: "Admin role transferred successfully",
  };
  res.status(StatusCodes.OK).json(response);
}

export async function handleRevokePlatformAssignment(req: Request, res: Response): Promise<void> {
  const assignment = await roleService.revokePlatformAssignment(String(req.params.assignmentPublicId), callerFrom(req), auditFrom(req));
  const response: ApiResponse<typeof assignment> = {
    success: true,
    data: assignment,
    message: "Platform role revoked successfully",
  };
  res.status(StatusCodes.OK).json(response);
}

export async function handleUpdatePlatformAssignmentExpiry(req: Request, res: Response): Promise<void> {
  const assignment = await roleService.updatePlatformAssignmentExpiry(String(req.params.assignmentPublicId), req.body, callerFrom(req), auditFrom(req));
  const response: ApiResponse<typeof assignment> = {
    success: true,
    data: assignment,
    message: "Platform role expiry updated successfully",
  };
  res.status(StatusCodes.OK).json(response);
}

export async function handleListPlatformAssignmentHistory(req: Request, res: Response): Promise<void> {
  res.status(StatusCodes.OK).json(await roleService.listPlatformAssignmentHistory(req.query as never));
}
