import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse } from "../../shared/types/index.js";
import * as departmentService from "./department.service.js";

export async function handleCreateDepartment(req: Request, res: Response): Promise<void> {
  const department = await departmentService.createDepartment(req.body, req.user!.id);

  const response: ApiResponse<typeof department> = {
    success: true,
    data: department,
    message: "Department created successfully",
  };

  res.status(StatusCodes.CREATED).json(response);
}

export async function handleListDepartments(_req: Request, res: Response): Promise<void> {
  const departments = await departmentService.listDepartments();

  const response: ApiResponse<typeof departments> = {
    success: true,
    data: departments,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleGetDepartmentById(req: Request, res: Response): Promise<void> {
  const department = await departmentService.getDepartmentById(Number(req.params.id));

  const response: ApiResponse<typeof department> = {
    success: true,
    data: department,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleUpdateDepartment(req: Request, res: Response): Promise<void> {
  const department = await departmentService.updateDepartment(Number(req.params.id), req.body);

  const response: ApiResponse<typeof department> = {
    success: true,
    data: department,
    message: "Department updated successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleCreateProgram(req: Request, res: Response): Promise<void> {
  const program = await departmentService.createProgram(
    { ...req.body, departmentId: Number(req.params.id) },
    req.user!.id
  );

  const response: ApiResponse<typeof program> = {
    success: true,
    data: program,
    message: "Program created successfully",
  };

  res.status(StatusCodes.CREATED).json(response);
}

export async function handleListPrograms(req: Request, res: Response): Promise<void> {
  const programs = await departmentService.listPrograms(Number(req.params.id));

  const response: ApiResponse<typeof programs> = {
    success: true,
    data: programs,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleGetDepartmentStats(req: Request, res: Response): Promise<void> {
  const stats = await departmentService.getDepartmentStats(Number(req.params.id), req.user!);

  const response: ApiResponse<typeof stats> = {
    success: true,
    data: stats,
  };

  res.status(StatusCodes.OK).json(response);
}
