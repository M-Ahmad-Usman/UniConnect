import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse } from "../../shared/types/index.js";
import * as permissionService from "./permission.service.js";

export async function handleGetMyPermissions(req: Request, res: Response): Promise<void> {
  const permissions = await permissionService.getMyPermissions(req.user!.id);

  res.set("Cache-Control", "private, no-store");

  const response: ApiResponse<typeof permissions> = {
    success: true,
    data: permissions,
  };

  res.status(StatusCodes.OK).json(response);
}
