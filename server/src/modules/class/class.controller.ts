import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse, PaginatedResponse } from "../../shared/types/index.js";
import * as classService from "./class.service.js";

// ─── Class Handlers ────────────────────────────────────────────────────────

export async function handleCreateClass(req: Request, res: Response): Promise<void> {
  const classRecord = await classService.createClass(
    req.body,
    req.user!.id,
    req.user!.userType
  );

  const response: ApiResponse<typeof classRecord> = {
    success: true,
    data: classRecord,
    message: "Class created successfully",
  };

  res.status(StatusCodes.CREATED).json(response);
}

export async function handleListClasses(req: Request, res: Response): Promise<void> {
  const query = req.query as Record<string, string | undefined>;
  const result = await classService.listClasses({
    programId: query.programId ? Number(query.programId) : undefined,
    departmentId: query.departmentId ? Number(query.departmentId) : undefined,
    semester: query.semester ? Number(query.semester) : undefined,
    section: query.section === "A" || query.section === "B" ? query.section : undefined,
    page: query.page ? Number(query.page) : undefined,
    limit: query.limit ? Number(query.limit) : undefined,
  });

  const response: PaginatedResponse<(typeof result.data)[number]> = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleGetClass(req: Request, res: Response): Promise<void> {
  const classRecord = await classService.getClassById(Number(req.params.id));

  const response: ApiResponse<typeof classRecord> = {
    success: true,
    data: classRecord,
  };

  res.status(StatusCodes.OK).json(response);
}

// ─── Course Assignment Handlers ────────────────────────────────────────────

export async function handleAssignCourse(req: Request, res: Response): Promise<void> {
  const assignment = await classService.assignCourseToClass(
    Number(req.params.id),
    req.body,
    req.user!.id,
    req.user!.userType
  );

  const response: ApiResponse<typeof assignment> = {
    success: true,
    data: assignment,
    message: "Course assigned to class successfully",
  };

  res.status(StatusCodes.CREATED).json(response);
}

export async function handleListClassCourses(req: Request, res: Response): Promise<void> {
  const courses = await classService.listClassCourses(Number(req.params.id));

  const response: ApiResponse<typeof courses> = {
    success: true,
    data: courses,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleRemoveCourse(req: Request, res: Response): Promise<void> {
  await classService.removeCourseFromClass(
    Number(req.params.id),
    Number(req.params.courseId),
    req.user!.id,
    req.user!.userType
  );

  const response: ApiResponse<null> = {
    success: true,
    data: null,
    message: "Course removed from class successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

// ─── Semester Progression Handler ─────────────────────────────────────────

export async function handleAdvanceSemester(req: Request, res: Response): Promise<void> {
  const result = await classService.advanceSemester(
    Number(req.params.id),
    req.body,
    req.user!.id,
    req.user!.userType
  );

  const response: ApiResponse<typeof result> = {
    success: true,
    data: result,
    message: "Semester advanced successfully",
  };

  res.status(StatusCodes.OK).json(response);
}
