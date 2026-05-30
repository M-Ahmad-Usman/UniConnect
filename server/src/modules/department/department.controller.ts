import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse } from "../../shared/types/index.js";
import * as departmentService from "./department.service.js";
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

export async function handleCreateDepartment(req: Request, res: Response): Promise<void> {
  const department = await departmentService.createDepartment(req.body, req.user!.id);
  await recordAuditLog(
    {
      action: "department.create",
      targetType: "department",
      targetId: department.id,
      summary: { name: department.name, code: department.code },
    },
    auditContextFromRequest(req)
  );

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
  await recordAuditLog(
    {
      action: "department.update",
      targetType: "department",
      targetId: req.params.id,
      summary: { changedFields: Object.keys(req.body as Record<string, unknown>) },
    },
    auditContextFromRequest(req)
  );

  const response: ApiResponse<typeof department> = {
    success: true,
    data: department,
    message: "Department updated successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleAssignDepartmentHod(req: Request, res: Response): Promise<void> {
  const assignment = await roleService.assignDepartmentHod(
    Number(req.params.id),
    req.body.userPublicId,
    callerFromRequest(req),
    auditContextFromRequest(req)
  );
  const response: ApiResponse<typeof assignment> = {
    success: true,
    data: assignment,
    message: "Department HOD assigned successfully",
  };
  res.status(StatusCodes.OK).json(response);
}

export async function handleRevokeDepartmentHod(req: Request, res: Response): Promise<void> {
  const assignment = await roleService.revokeDepartmentHod(
    Number(req.params.id),
    callerFromRequest(req),
    auditContextFromRequest(req)
  );
  const response: ApiResponse<typeof assignment> = {
    success: true,
    data: assignment,
    message: "Department HOD revoked successfully",
  };
  res.status(StatusCodes.OK).json(response);
}

export async function handleCreateProgram(req: Request, res: Response): Promise<void> {
  const program = await departmentService.createProgram(
    { ...req.body, departmentId: Number(req.params.id) },
    req.user!.id
  );
  await recordAuditLog(
    {
      action: "program.create",
      targetType: "program",
      targetId: program.id,
      summary: { departmentId: req.params.id, code: program.code },
    },
    auditContextFromRequest(req)
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
