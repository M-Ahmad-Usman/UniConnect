import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse, PaginatedResponse } from "../../shared/types/index.js";
import * as societyService from "./society.service.js";

// ─── Society Handlers ──────────────────────────────────────────────────────

export async function handleCreateSociety(req: Request, res: Response): Promise<void> {
  const society = await societyService.createSociety(req.body, {
    id: req.user!.id,
    userType: req.user!.userType,
  });

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

export async function handleGetSociety(req: Request, res: Response): Promise<void> {
  const society = await societyService.getSocietyById(Number(req.params.id), req.user!.id);

  const response: ApiResponse<typeof society> = {
    success: true,
    data: society,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleUpdateSociety(req: Request, res: Response): Promise<void> {
  const society = await societyService.updateSociety(Number(req.params.id), req.body, {
    id: req.user!.id,
    userType: req.user!.userType,
  });

  const response: ApiResponse<typeof society> = {
    success: true,
    data: society,
    message: "Society updated successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleSubmitJoinRequest(req: Request, res: Response): Promise<void> {
  const joinRequest = await societyService.submitJoinRequest(
    Number(req.params.id),
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
    Number(req.params.id),
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
    Number(req.params.id),
    Number(req.params.requestId),
    req.body.status,
    { id: req.user!.id, userType: req.user!.userType }
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
    Number(req.params.id),
    req.body.userId,
    { id: req.user!.id, userType: req.user!.userType }
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
    Number(req.params.id),
    Number(req.params.userId),
    { id: req.user!.id, userType: req.user!.userType }
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
  const result = await societyService.listMembers(Number(req.params.id), {
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
  const result = await societyService.getMyMembershipStatus(Number(req.params.id), req.user!.id);

  const response: ApiResponse<typeof result> = {
    success: true,
    data: result,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleListMemberCandidates(req: Request, res: Response): Promise<void> {
  const query = req.query as Record<string, string | undefined>;
  const result = await societyService.listMemberCandidates(
    Number(req.params.id),
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
