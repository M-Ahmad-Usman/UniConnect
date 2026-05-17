import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse } from "../../shared/types/index.js";
import * as degreeLevelService from "./degree-level.service.js";

export async function handleListDegreeLevels(_req: Request, res: Response): Promise<void> {
  const degreeLevels = await degreeLevelService.listDegreeLevels();

  const response: ApiResponse<typeof degreeLevels> = {
    success: true,
    data: degreeLevels,
  };

  res.status(StatusCodes.OK).json(response);
}
