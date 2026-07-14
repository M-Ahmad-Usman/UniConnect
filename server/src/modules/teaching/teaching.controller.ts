import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse } from "../../shared/types/index.js";
import * as teachingService from "./teaching.service.js";

export async function handleGetMyTeaching(req: Request, res: Response): Promise<void> {
  const query = req.query as Record<string, string | undefined>;
  const result = await teachingService.getMyTeaching(req.user!.id, {
    includeHistory: query.includeHistory === undefined ? true : query.includeHistory === "true",
    historyPage: query.historyPage ? Number(query.historyPage) : undefined,
    historyLimit: query.historyLimit ? Number(query.historyLimit) : undefined,
  });
  const response: ApiResponse<typeof result> = { success: true, data: result };
  res.set("Cache-Control", "private, no-store");
  res.status(StatusCodes.OK).json(response);
}
