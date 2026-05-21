import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse } from "../../shared/types/index.js";
import * as roleService from "./role.service.js";
import { buildAuditContext } from "../audit/audit.service.js";

// ─── Role Handlers ─────────────────────────────────────────────────────────

export async function handleAssignRole(req: Request, res: Response): Promise<void> {
  const result = await roleService.assignRole(req.body, {
    id: req.user!.id,
    userType: req.user!.userType,
    departmentId: req.user!.departmentId,
  }, buildAuditContext({
    actorUserId: req.user!.id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  }));

  const response: ApiResponse<typeof result> = {
    success: true,
    data: result,
    message: "Role assigned successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleRevokeRole(req: Request, res: Response): Promise<void> {
  const result = await roleService.revokeRole(req.body, {
    id: req.user!.id,
    userType: req.user!.userType,
    departmentId: req.user!.departmentId,
  }, buildAuditContext({
    actorUserId: req.user!.id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  }));

  const response: ApiResponse<typeof result> = {
    success: true,
    data: result,
    message: "Role revoked successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleGetUserRoles(req: Request, res: Response): Promise<void> {
  const roles = await roleService.getUserRoles(Number(req.params.id), {
    id: req.user!.id,
    userType: req.user!.userType,
    departmentId: req.user!.departmentId,
  });

  const response: ApiResponse<typeof roles> = {
    success: true,
    data: roles,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleGetAssignableRoles(req: Request, res: Response): Promise<void> {
  const roles = await roleService.getAssignableRoles({
    id: req.user!.id,
    userType: req.user!.userType,
    departmentId: req.user!.departmentId,
  });

  const response: ApiResponse<typeof roles> = {
    success: true,
    data: roles,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleListAssignableScopes(req: Request, res: Response): Promise<void> {
  const result = await roleService.listAssignableScopes(
    req.query as unknown as Parameters<typeof roleService.listAssignableScopes>[0],
    {
    id: req.user!.id,
    userType: req.user!.userType,
    departmentId: req.user!.departmentId,
    }
  );

  res.status(StatusCodes.OK).json(result);
}

export async function handleListAssignableChannels(req: Request, res: Response): Promise<void> {
  const result = await roleService.listAssignableChannels(
    req.query as unknown as Parameters<typeof roleService.listAssignableChannels>[0],
    {
    id: req.user!.id,
    userType: req.user!.userType,
    departmentId: req.user!.departmentId,
    }
  );

  res.status(StatusCodes.OK).json(result);
}

export async function handleListAssignableUsers(req: Request, res: Response): Promise<void> {
  const result = await roleService.listAssignableUsers(
    req.query as unknown as Parameters<typeof roleService.listAssignableUsers>[0],
    {
    id: req.user!.id,
    userType: req.user!.userType,
    departmentId: req.user!.departmentId,
    }
  );

  res.status(StatusCodes.OK).json(result);
}

export async function handleListRevokableRoles(req: Request, res: Response): Promise<void> {
  const result = await roleService.listRevokableRoles(
    req.query as unknown as Parameters<typeof roleService.listRevokableRoles>[0],
    {
    id: req.user!.id,
    userType: req.user!.userType,
    departmentId: req.user!.departmentId,
    }
  );

  res.status(StatusCodes.OK).json(result);
}
