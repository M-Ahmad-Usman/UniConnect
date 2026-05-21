import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse } from "../../shared/types/index.js";
import * as disciplineService from "./discipline.service.js";
import { buildAuditContext, recordAuditLog } from "../audit/audit.service.js";

function auditContextFromRequest(req: Request) {
  return buildAuditContext({
    actorUserId: req.user?.id ?? null,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
}

export async function handleCreateDiscipline(req: Request, res: Response): Promise<void> {
  const discipline = await disciplineService.createDiscipline(req.body.name);
  await recordAuditLog(
    {
      action: "discipline.create",
      targetType: "discipline",
      targetId: discipline.id,
      summary: { name: discipline.name },
    },
    auditContextFromRequest(req)
  );

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

export async function handleUpdateDiscipline(req: Request, res: Response): Promise<void> {
  const discipline = await disciplineService.updateDiscipline(Number(req.params.id), req.body.name);
  await recordAuditLog(
    {
      action: "discipline.update",
      targetType: "discipline",
      targetId: req.params.id,
      summary: { name: discipline.name },
    },
    auditContextFromRequest(req)
  );

  const response: ApiResponse<typeof discipline> = {
    success: true,
    data: discipline,
    message: "Discipline updated successfully",
  };

  res.status(StatusCodes.OK).json(response);
}
