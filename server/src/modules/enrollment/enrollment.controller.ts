import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse, PaginatedResponse } from "../../shared/types/index.js";
import { ValidationError } from "../../shared/errors/index.js";
import { buildAuditContext, recordAuditLog } from "../audit/audit.service.js";
import * as enrollmentService from "./enrollment.service.js";

function auditContextFromRequest(req: Request) {
  return buildAuditContext({
    actorUserId: req.user?.id ?? null,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
}

export async function handleGetEnrollmentBootstrap(req: Request, res: Response): Promise<void> {
  const bootstrap = await enrollmentService.getBootstrap(req.user!.id);
  const response: ApiResponse<typeof bootstrap> = { success: true, data: bootstrap };
  res.status(StatusCodes.OK).json(response);
}

export async function handleListEnrollmentPrograms(req: Request, res: Response): Promise<void> {
  const result = await enrollmentService.listPrograms(
    req.user!.id,
    req.query as {
      page?: number;
      limit?: number;
      departmentId?: number;
      search?: string;
    }
  );
  const response: PaginatedResponse<(typeof result.data)[number]> = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };
  res.status(StatusCodes.OK).json(response);
}

export async function handleGetEnrollmentCurriculum(req: Request, res: Response): Promise<void> {
  const query = req.query as Record<string, number | undefined>;
  const curriculum = await enrollmentService.getCurriculum(req.user!.id, Number(req.params.programId), {
    semesterNumber: query.semesterNumber,
    batchYear: query.batchYear,
  });
  const response: ApiResponse<typeof curriculum> = { success: true, data: curriculum };
  res.status(StatusCodes.OK).json(response);
}

export async function handleListEnrollmentClasses(req: Request, res: Response): Promise<void> {
  const result = await enrollmentService.listClasses(
    req.user!.id,
    req.query as {
      page?: number;
      limit?: number;
      departmentId?: number;
      programId?: number;
      semester?: number;
      section?: "A" | "B";
      status?: "ACTIVE" | "GRADUATED" | "ALL";
    }
  );
  const response: PaginatedResponse<(typeof result.data)[number]> = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };
  res.status(StatusCodes.OK).json(response);
}

export async function handleCreateEnrollmentClass(req: Request, res: Response): Promise<void> {
  const classRecord = await enrollmentService.createClass(req.user!.id, req.body);
  await recordAuditLog(
    {
      action: "enrollment.class.create",
      targetType: "class",
      targetId: classRecord.publicId,
      summary: {
        programId: classRecord.program.id,
        currentSemester: classRecord.currentSemester,
        section: classRecord.section,
        admissionYear: classRecord.admissionYear,
      },
    },
    auditContextFromRequest(req)
  );
  const response: ApiResponse<typeof classRecord> = {
    success: true,
    data: classRecord,
    message: "Class created successfully",
  };
  res.status(StatusCodes.CREATED).json(response);
}

export async function handleGetEnrollmentClass(req: Request, res: Response): Promise<void> {
  const classRecord = await enrollmentService.getClass(req.user!.id, String(req.params.publicId));
  const response: ApiResponse<typeof classRecord> = { success: true, data: classRecord };
  res.status(StatusCodes.OK).json(response);
}

export async function handleListEnrollmentClassStudents(req: Request, res: Response): Promise<void> {
  const result = await enrollmentService.listClassStudents(
    req.user!.id,
    String(req.params.publicId),
    req.query as { page?: number; limit?: number; search?: string }
  );
  const response: PaginatedResponse<(typeof result.data)[number]> = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };
  res.status(StatusCodes.OK).json(response);
}

export async function handleListEnrollmentTransferCandidates(req: Request, res: Response): Promise<void> {
  const result = await enrollmentService.listTransferCandidates(
    req.user!.id,
    String(req.params.publicId),
    req.query as { page?: number; limit?: number; search?: string }
  );
  const response: PaginatedResponse<(typeof result.data)[number]> = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };
  res.status(StatusCodes.OK).json(response);
}

export async function handleTransferEnrollmentStudent(req: Request, res: Response): Promise<void> {
  const student = await enrollmentService.transferStudent(
    req.user!.id,
    String(req.params.publicId),
    req.body
  );
  await recordAuditLog(
    {
      action: "enrollment.student.transfer",
      targetType: "class",
      targetId: String(req.params.publicId),
      summary: { studentPublicId: req.body.studentPublicId },
    },
    auditContextFromRequest(req)
  );
  const response: ApiResponse<typeof student> = {
    success: true,
    data: student,
    message: "Student transferred successfully",
  };
  res.status(StatusCodes.OK).json(response);
}

export async function handleCreateEnrollmentStudent(req: Request, res: Response): Promise<void> {
  const student = await enrollmentService.createStudent(req.user!.id, req.body, auditContextFromRequest(req));
  const response: ApiResponse<typeof student> = {
    success: true,
    data: student,
    message: "Student created successfully",
  };
  res.status(StatusCodes.CREATED).json(response);
}

export async function handleImportEnrollmentStudents(req: Request, res: Response): Promise<void> {
  if (!req.file?.buffer) {
    throw new ValidationError("CSV file is required");
  }

  const result = await enrollmentService.importStudents(
    req.user!.id,
    req.file.buffer,
    auditContextFromRequest(req)
  );
  const response: ApiResponse<typeof result> = {
    success: true,
    data: result,
    message: "Student import completed",
  };
  res.status(StatusCodes.OK).json(response);
}
