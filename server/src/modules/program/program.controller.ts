import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse, PaginatedResponse } from "../../shared/types/index.js";
import * as programService from "./program.service.js";
import * as roleService from "../role/role.service.js";
import { buildAuditContext, recordAuditLog } from "../audit/audit.service.js";

function auditContextFromRequest(req: Request) {
  return buildAuditContext({
    actorUserId: req.user?.id ?? null,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
}

function callerFromRequest(req: Request) {
  return {
    id: req.user!.id,
    userType: req.user!.userType,
    departmentId: req.user!.departmentId,
  };
}

export async function handleListPrograms(req: Request, res: Response): Promise<void> {
  const query = req.query as Record<string, string | undefined>;
  const result = await programService.listPrograms({
    departmentId: query.departmentId ? Number(query.departmentId) : undefined,
    disciplineId: query.disciplineId ? Number(query.disciplineId) : undefined,
    degreeLevelId: query.degreeLevelId ? Number(query.degreeLevelId) : undefined,
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

export async function handleGetProgramById(req: Request, res: Response): Promise<void> {
  const program = await programService.getProgramById(Number(req.params.id));

  const response: ApiResponse<typeof program> = {
    success: true,
    data: program,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleUpdateProgram(req: Request, res: Response): Promise<void> {
  const program = await programService.updateProgram(Number(req.params.id), req.body);
  await recordAuditLog(
    {
      action: "program.update",
      targetType: "program",
      targetId: req.params.id,
      summary: { changedFields: Object.keys(req.body as Record<string, unknown>) },
    },
    auditContextFromRequest(req)
  );

  const response: ApiResponse<typeof program> = {
    success: true,
    data: program,
    message: "Program updated successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleAssignProgramDirector(req: Request, res: Response): Promise<void> {
  const assignment = await roleService.assignProgramDirectorRole(
    Number(req.params.id),
    req.body.userPublicId,
    callerFromRequest(req),
    auditContextFromRequest(req)
  );
  const response: ApiResponse<typeof assignment> = {
    success: true,
    data: assignment,
    message: "Program Director assigned successfully",
  };
  res.status(StatusCodes.OK).json(response);
}

export async function handleRevokeProgramDirector(req: Request, res: Response): Promise<void> {
  const assignment = await roleService.revokeProgramDirectorRole(
    Number(req.params.id),
    callerFromRequest(req),
    auditContextFromRequest(req)
  );
  const response: ApiResponse<typeof assignment> = {
    success: true,
    data: assignment,
    message: "Program Director revoked successfully",
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
  await recordAuditLog(
    {
      action: "curriculum.add",
      targetType: "program",
      targetId: req.params.id,
      summary: {
        curriculumId: entry.id,
        courseId: req.body.courseId,
        semesterNumber: req.body.semesterNumber,
        batchYear: req.body.batchYear,
      },
    },
    auditContextFromRequest(req)
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
  await recordAuditLog(
    {
      action: "curriculum.remove",
      targetType: "program",
      targetId: req.params.id,
      summary: { curriculumId: req.params.curriculumId },
    },
    auditContextFromRequest(req)
  );

  const response: ApiResponse<null> = {
    success: true,
    data: null,
    message: "Curriculum entry removed successfully",
  };

  res.status(StatusCodes.OK).json(response);
}
