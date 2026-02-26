import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse } from "../../shared/types/index.js";
import * as disciplineService from "./discipline.service.js";

export async function handleCreateDiscipline(req: Request, res: Response): Promise<void> {
  const discipline = await disciplineService.createDiscipline(req.body.name);

  const response: ApiResponse<typeof discipline> = {
    success: true,
    data: discipline,
    message: "Discipline created successfully",
  };

  res.status(StatusCodes.CREATED).json(response);
}

export async function handleListDisciplines(_req: Request, res: Response): Promise<void> {
  const disciplines = await disciplineService.listDisciplines();

  const response: ApiResponse<typeof disciplines> = {
    success: true,
    data: disciplines,
  };

  res.status(StatusCodes.OK).json(response);
}
