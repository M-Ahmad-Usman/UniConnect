import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse, PaginatedResponse } from "../../shared/types/index.js";
import * as courseService from "./course.service.js";
import { buildAuditContext, recordAuditLog } from "../audit/audit.service.js";

function auditContextFromRequest(req: Request) {
  return buildAuditContext({
    actorUserId: req.user?.id ?? null,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
}

// ─── Course Handlers ───────────────────────────────────────────────────────

export async function handleCreateCourse(req: Request, res: Response): Promise<void> {
  const course = await courseService.createCourse(req.body, req.user!.id, req.user!.userType);
  await recordAuditLog(
    {
      action: "course.create",
      targetType: "course",
      targetId: course.id,
      summary: { code: course.code, departmentId: course.departmentId },
    },
    auditContextFromRequest(req)
  );

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
  await recordAuditLog(
    {
      action: "course.update",
      targetType: "course",
      targetId: req.params.id,
      summary: { changedFields: Object.keys(req.body as Record<string, unknown>) },
    },
    auditContextFromRequest(req)
  );

  const response: ApiResponse<typeof course> = {
    success: true,
    data: course,
    message: "Course updated successfully",
  };

  res.status(StatusCodes.OK).json(response);
}
