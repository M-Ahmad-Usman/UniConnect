import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse, PaginatedResponse } from "../../shared/types/index.js";
import * as societyService from "./society.service.js";
import { buildAuditContext, recordAuditLog } from "../audit/audit.service.js";

function auditContextFromRequest(req: Request) {
  return buildAuditContext({
    actorUserId: req.user?.id ?? null,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
}

function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string") {
    throw new Error(`Missing validated route parameter: ${name}`);
  }
  return value;
}

// ─── Society Handlers ──────────────────────────────────────────────────────

export async function handleCreateSociety(req: Request, res: Response): Promise<void> {
  const society = await societyService.createSociety(req.body, {
    id: req.user!.id,
    userType: req.user!.userType,
  });
  await recordAuditLog(
    {
      action: "society.create",
      targetType: "society",
      targetId: society.publicId,
      summary: {
        name: society.name,
        departmentId: society.department.id,
        presidentPublicId: req.body.presidentPublicId,
        convenorPublicId: req.body.convenorPublicId,
      },
    },
    auditContextFromRequest(req)
  );

  const response: ApiResponse<typeof society> = {
    success: true,
    data: society,
    message: "Society created successfully",
  };

  res.status(StatusCodes.CREATED).json(response);
}

export async function handleListSocieties(req: Request, res: Response): Promise<void> {
  const query = req.query as Record<string, string | undefined>;
  const result = await societyService.listSocieties({
    departmentId: query.departmentId ? Number(query.departmentId) : undefined,
    status: query.status as "ACTIVE" | "SUSPENDED" | undefined,
    lifecycle: query.lifecycle as "live" | "deleted" | "all" | undefined,
    page: query.page ? Number(query.page) : undefined,
    limit: query.limit ? Number(query.limit) : undefined,
  }, { id: req.user!.id, userType: req.user!.userType });

  const response: PaginatedResponse<(typeof result.data)[number]> = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleGetSociety(req: Request, res: Response): Promise<void> {
  const society = await societyService.getSocietyByPublicId(routeParam(req, "publicId"), {
    id: req.user!.id,
    userType: req.user!.userType,
  });

  const response: ApiResponse<typeof society> = {
    success: true,
    data: society,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleUpdateSociety(req: Request, res: Response): Promise<void> {
  const society = await societyService.updateSociety(routeParam(req, "publicId"), req.body, {
    id: req.user!.id,
    userType: req.user!.userType,
  });
  await recordAuditLog(
    {
      action: "society.update",
      targetType: "society",
      targetId: routeParam(req, "publicId"),
      summary: {
        changedFields: Object.keys(req.body as Record<string, unknown>),
      },
    },
    auditContextFromRequest(req)
  );

  const response: ApiResponse<typeof society> = {
    success: true,
    data: society,
    message: "Society updated successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleSubmitJoinRequest(req: Request, res: Response): Promise<void> {
  const joinRequest = await societyService.submitJoinRequest(
    routeParam(req, "publicId"),
    req.user!.id
  );

  const response: ApiResponse<typeof joinRequest> = {
    success: true,
    data: joinRequest,
    message: "Join request submitted successfully",
  };

  res.status(StatusCodes.CREATED).json(response);
}

export async function handleListJoinRequests(req: Request, res: Response): Promise<void> {
  const query = req.query as Record<string, string | undefined>;
  const result = await societyService.listJoinRequests(
    routeParam(req, "publicId"),
    {
      status: query.status as "PENDING" | "APPROVED" | "REJECTED" | undefined,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    },
    { id: req.user!.id, userType: req.user!.userType }
  );

  const response: PaginatedResponse<(typeof result.data)[number]> = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleReviewJoinRequest(req: Request, res: Response): Promise<void> {
  const result = await societyService.reviewJoinRequest(
    routeParam(req, "publicId"),
    Number(req.params.requestId),
    req.body.status,
    { id: req.user!.id, userType: req.user!.userType }
  );
  await recordAuditLog(
    {
      action: "society.join_request.review",
      targetType: "society",
      targetId: routeParam(req, "publicId"),
      summary: { requestId: req.params.requestId, status: req.body.status },
    },
    auditContextFromRequest(req)
  );

  const response: ApiResponse<typeof result> = {
    success: true,
    data: result,
    message: `Join request ${req.body.status.toLowerCase()} successfully`,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleAddMember(req: Request, res: Response): Promise<void> {
  const member = await societyService.addMember(
    routeParam(req, "publicId"),
    req.body.userPublicId,
    { id: req.user!.id, userType: req.user!.userType }
  );
  await recordAuditLog(
    {
      action: "society.member.add",
      targetType: "society",
      targetId: routeParam(req, "publicId"),
      summary: { userPublicId: req.body.userPublicId },
    },
    auditContextFromRequest(req)
  );

  const response: ApiResponse<typeof member> = {
    success: true,
    data: member,
    message: "Member added successfully",
  };

  res.status(StatusCodes.CREATED).json(response);
}

export async function handleRemoveMember(req: Request, res: Response): Promise<void> {
  await societyService.removeMember(
    routeParam(req, "publicId"),
    routeParam(req, "userPublicId"),
    { id: req.user!.id, userType: req.user!.userType }
  );
  await recordAuditLog(
    {
      action: "society.member.remove",
      targetType: "society",
      targetId: routeParam(req, "publicId"),
      summary: { userPublicId: routeParam(req, "userPublicId") },
    },
    auditContextFromRequest(req)
  );

  const response: ApiResponse<null> = {
    success: true,
    data: null,
    message: "Member removed successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleListMembers(req: Request, res: Response): Promise<void> {
  const query = req.query as Record<string, string | undefined>;
  const result = await societyService.listMembers(routeParam(req, "publicId"), {
    page: query.page ? Number(query.page) : undefined,
    limit: query.limit ? Number(query.limit) : undefined,
  }, {
    id: req.user!.id,
    userType: req.user!.userType,
  });

  const response: PaginatedResponse<(typeof result.data)[number]> = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleGetMyMembershipStatus(req: Request, res: Response): Promise<void> {
  const result = await societyService.getMyMembershipStatus(routeParam(req, "publicId"), req.user!.id);

  const response: ApiResponse<typeof result> = {
    success: true,
    data: result,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleListMemberCandidates(req: Request, res: Response): Promise<void> {
  const query = req.query as Record<string, string | undefined>;
  const result = await societyService.listMemberCandidates(
    routeParam(req, "publicId"),
    {
      search: query.search,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    },
    {
      id: req.user!.id,
      userType: req.user!.userType,
    }
  );

  const response: PaginatedResponse<(typeof result.data)[number]> = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleGetSocietyDeletionImpact(req: Request, res: Response): Promise<void> {
  const impact = await societyService.getSocietyDeletionImpact(routeParam(req, "publicId"), {
    id: req.user!.id,
    userType: req.user!.userType,
  });
  const response: ApiResponse<typeof impact> = { success: true, data: impact };
  res.status(StatusCodes.OK).json(response);
}

export async function handleGetSocietyLeadershipConflicts(req: Request, res: Response): Promise<void> {
  const query = req.query as Record<string, string | undefined>;
  const conflicts = await societyService.getSocietyLeadershipConflicts(
    routeParam(req, "publicId"),
    query.action as "activate" | "restore",
    {
      id: req.user!.id,
      userType: req.user!.userType,
    },
  );
  const response: ApiResponse<typeof conflicts> = { success: true, data: conflicts };
  res.status(StatusCodes.OK).json(response);
}

export async function handleUpdateSocietyStatus(req: Request, res: Response): Promise<void> {
  const society = await societyService.updateSocietyStatus(
    routeParam(req, "publicId"),
    req.body.status,
    { id: req.user!.id, userType: req.user!.userType },
    auditContextFromRequest(req),
    req.body.reason,
  );
  const response: ApiResponse<typeof society> = {
    success: true,
    data: society,
    message: "Society status updated successfully",
  };
  res.status(StatusCodes.OK).json(response);
}

export async function handleDeleteSociety(req: Request, res: Response): Promise<void> {
  const society = await societyService.deleteSociety(
    routeParam(req, "publicId"),
    { id: req.user!.id, userType: req.user!.userType },
    auditContextFromRequest(req),
    req.body.reason,
  );
  const response: ApiResponse<typeof society> = {
    success: true,
    data: society,
    message: "Society deleted successfully",
  };
  res.status(StatusCodes.OK).json(response);
}

export async function handleRestoreSociety(req: Request, res: Response): Promise<void> {
  const society = await societyService.restoreSociety(
    routeParam(req, "publicId"),
    { id: req.user!.id, userType: req.user!.userType },
    auditContextFromRequest(req),
    req.body.reason,
  );
  const response: ApiResponse<typeof society> = {
    success: true,
    data: society,
    message: "Society restored successfully",
  };
  res.status(StatusCodes.OK).json(response);
}

export async function handleListLeadershipCandidates(req: Request, res: Response): Promise<void> {
  const query = req.query as Record<string, string | undefined>;
  const result = await societyService.listLeadershipCandidates(
    {
      departmentId: Number(query.departmentId),
      role: query.role as "president" | "convenor",
      search: query.search,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    },
    {
      id: req.user!.id,
      userType: req.user!.userType,
    }
  );

  const response: PaginatedResponse<(typeof result.data)[number]> = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };

  res.status(StatusCodes.OK).json(response);
}
