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

// ─── Curriculum Handlers ───────────────────────────────────────────────────

export async function handleGetCurriculum(req: Request, res: Response): Promise<void> {
  const query = req.query as Record<string, string | undefined>;
  const curriculum = await programService.getCurriculum(Number(req.params.id), {
    semesterNumber: query.semesterNumber ? Number(query.semesterNumber) : undefined,
    batchYear: query.batchYear ? Number(query.batchYear) : undefined,
  });

  const response: ApiResponse<typeof curriculum> = {
    success: true,
    data: curriculum,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleAddCurriculum(req: Request, res: Response): Promise<void> {
  const entry = await programService.addCurriculum(
    req.user!.id,
    req.user!.userType,
    Number(req.params.id),
    req.body
  );

  const response: ApiResponse<typeof entry> = {
    success: true,
    data: entry,
    message: "Curriculum entry added successfully",
  };

  res.status(StatusCodes.CREATED).json(response);
}

export async function handleRemoveCurriculum(req: Request, res: Response): Promise<void> {
  await programService.removeCurriculum(
    req.user!.id,
    req.user!.userType,
    Number(req.params.id),
    Number(req.params.curriculumId)
  );

  const response: ApiResponse<null> = {
    success: true,
    data: null,
    message: "Curriculum entry removed successfully",
  };

  res.status(StatusCodes.OK).json(response);
}
