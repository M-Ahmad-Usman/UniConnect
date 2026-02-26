import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse } from "../../shared/types/index.js";
import * as programService from "./program.service.js";

export async function handleUpdateProgram(req: Request, res: Response): Promise<void> {
  const program = await programService.updateProgram(Number(req.params.id), req.body);

  const response: ApiResponse<typeof program> = {
    success: true,
    data: program,
    message: "Program updated successfully",
  };

  res.status(StatusCodes.OK).json(response);
}
