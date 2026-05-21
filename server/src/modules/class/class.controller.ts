import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse, PaginatedResponse } from "../../shared/types/index.js";
import * as classService from "./class.service.js";
import { buildAuditContext, recordAuditLog } from "../audit/audit.service.js";

function auditContextFromRequest(req: Request) {
  return buildAuditContext({
    actorUserId: req.user?.id ?? null,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
}

// ─── Class Handlers ────────────────────────────────────────────────────────

export async function handleCreateClass(req: Request, res: Response): Promise<void> {
  const classRecord = await classService.createClass(
    req.body,
    req.user!.id,
    req.user!.userType
  );
  await recordAuditLog(
    {
      action: "class.create",
      targetType: "class",
      targetId: classRecord.id,
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

export async function handleListClasses(req: Request, res: Response): Promise<void> {
  const query = req.query as Record<string, string | undefined>;
  const result = await classService.listClasses({
    programId: query.programId ? Number(query.programId) : undefined,
    departmentId: query.departmentId ? Number(query.departmentId) : undefined,
    semester: query.semester ? Number(query.semester) : undefined,
    section: query.section === "A" || query.section === "B" ? query.section : undefined,
    status:
      query.status === "ACTIVE" || query.status === "GRADUATED" || query.status === "ALL"
        ? query.status
        : undefined,
    page: query.page ? Number(query.page) : undefined,
    limit: query.limit ? Number(query.limit) : undefined,
  }, req.user!.id);

  const response: PaginatedResponse<(typeof result.data)[number]> = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleGetClass(req: Request, res: Response): Promise<void> {
  const classRecord = await classService.getClassById(Number(req.params.id), req.user!.id);

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
  await recordAuditLog(
    {
      action: "class.course.assign",
      targetType: "class",
      targetId: req.params.id,
      summary: { courseId: req.body.courseId, teacherId: req.body.teacherId },
    },
    auditContextFromRequest(req)
  );

  const response: ApiResponse<typeof assignment> = {
    success: true,
    data: assignment,
    message: "Course assigned to class successfully",
  };

  res.status(StatusCodes.CREATED).json(response);
}

export async function handleListClassCourses(req: Request, res: Response): Promise<void> {
  const courses = await classService.listClassCourses(Number(req.params.id), req.user!.id);

  const response: ApiResponse<typeof courses> = {
    success: true,
    data: courses,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleReplaceCourseTeacher(req: Request, res: Response): Promise<void> {
  const assignment = await classService.replaceClassCourseTeacher(
    Number(req.params.id),
    Number(req.params.courseId),
    req.body,
    req.user!.id,
    req.user!.userType
  );
  await recordAuditLog(
    {
      action: "class.course.teacher.replace",
      targetType: "class",
      targetId: req.params.id,
      summary: { courseId: req.params.courseId, teacherId: req.body.teacherId },
    },
    auditContextFromRequest(req)
  );

  const response: ApiResponse<typeof assignment> = {
    success: true,
    data: assignment,
    message: "Course teacher replaced successfully",
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
  await recordAuditLog(
    {
      action: "class.course.remove",
      targetType: "class",
      targetId: req.params.id,
      summary: { courseId: req.params.courseId },
    },
    auditContextFromRequest(req)
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
  await recordAuditLog(
    {
      action: "class.semester.advance",
      targetType: "class",
      targetId: req.params.id,
      summary: { nextSemester: result.currentSemester },
    },
    auditContextFromRequest(req)
  );

  const response: ApiResponse<typeof result> = {
    success: true,
    data: result,
    message: "Semester advanced successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleListClassStudents(req: Request, res: Response): Promise<void> {
  const query = req.query as Record<string, string | undefined>;
  const result = await classService.listClassStudents(
    Number(req.params.id),
    {
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      search: query.search,
    },
    req.user!.id,
    req.user!.userType
  );

  const response: PaginatedResponse<(typeof result.data)[number]> = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleListStudentCandidates(req: Request, res: Response): Promise<void> {
  const query = req.query as Record<string, string | undefined>;
  const result = await classService.listStudentCandidates(
    Number(req.params.id),
    {
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      search: query.search,
    },
    req.user!.id,
    req.user!.userType
  );

  const response: PaginatedResponse<(typeof result.data)[number]> = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleTransferStudent(req: Request, res: Response): Promise<void> {
  const student = await classService.transferStudentToClass(
    Number(req.params.id),
    req.body,
    req.user!.id,
    req.user!.userType
  );
  await recordAuditLog(
    {
      action: "class.student.transfer",
      targetType: "class",
      targetId: req.params.id,
      summary: { studentId: req.body.studentId },
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

export async function handleListTeacherCandidates(req: Request, res: Response): Promise<void> {
  const query = req.query as Record<string, string | undefined>;
  const result = await classService.listTeacherCandidates(
    Number(req.params.id),
    {
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      search: query.search,
    },
    req.user!.id,
    req.user!.userType
  );

  const response: PaginatedResponse<(typeof result.data)[number]> = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleGraduateClass(req: Request, res: Response): Promise<void> {
  const result = await classService.graduateClass(
    Number(req.params.id),
    req.user!.id,
    req.user!.userType
  );
  await recordAuditLog(
    {
      action: "class.graduate",
      targetType: "class",
      targetId: req.params.id,
      summary: { status: result.status, graduatedAt: result.graduatedAt ?? null },
    },
    auditContextFromRequest(req)
  );

  const response: ApiResponse<typeof result> = {
    success: true,
    data: result,
    message: "Class graduated successfully",
  };

  res.status(StatusCodes.OK).json(response);
}
