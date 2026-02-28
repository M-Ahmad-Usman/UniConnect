import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse, PaginatedResponse } from "../../shared/types/index.js";
import * as adminService from "./admin.service.js";

export async function handleGetSystemStats(_req: Request, res: Response): Promise<void> {
  const stats = await adminService.getSystemStats();

  const response: ApiResponse<typeof stats> = {
    success: true,
    data: stats,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleListAllUsers(req: Request, res: Response): Promise<void> {
  const result = await adminService.listAllUsers(req.query);

  const response: PaginatedResponse<typeof result.data[number]> = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };

  res.status(StatusCodes.OK).json(response);
}
