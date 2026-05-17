import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse, PaginatedResponse } from "../../shared/types/index.js";
import * as courseService from "./course.service.js";

// ─── Course Handlers ───────────────────────────────────────────────────────

export async function handleCreateCourse(req: Request, res: Response): Promise<void> {
  const course = await courseService.createCourse(req.body);

  const response: ApiResponse<typeof course> = {
    success: true,
    data: course,
    message: "Course created successfully",
  };

  res.status(StatusCodes.CREATED).json(response);
}

export async function handleListCourses(req: Request, res: Response): Promise<void> {
  const query = req.query as Record<string, string | undefined>;
  const result = await courseService.listCourses({
    departmentId: query.departmentId ? Number(query.departmentId) : undefined,
    search: query.search,
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

export async function handleGetCourseById(req: Request, res: Response): Promise<void> {
  const course = await courseService.getCourseById(Number(req.params.id));

  const response: ApiResponse<typeof course> = {
    success: true,
    data: course,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleUpdateCourse(req: Request, res: Response): Promise<void> {
  const course = await courseService.updateCourse(Number(req.params.id), req.body);

  const response: ApiResponse<typeof course> = {
    success: true,
    data: course,
    message: "Course updated successfully",
  };

  res.status(StatusCodes.OK).json(response);
}
