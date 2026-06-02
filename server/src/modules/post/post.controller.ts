import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse, PaginatedResponse } from "../../shared/types/index.js";
import {
  getResolvedChannelTarget,
  getResolvedPostTarget,
} from "../../middleware/resolveCommunicationTarget.js";
import * as postService from "./post.service.js";

// ─── Channel-Scoped Handlers ───────────────────────────────────────────────

export async function handleCreatePost(req: Request, res: Response): Promise<void> {
  const channelId = getResolvedChannelTarget(req).id;
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const uploadedFiles = files.map((f) => ({
    buffer: f.buffer,
    mimetype: f.mimetype,
    size: f.size,
  }));

  const post = await postService.createPost(channelId, req.body, uploadedFiles, {
    id: req.user!.id,
    userType: req.user!.userType,
    userRoles: req.userRoles,
  });

  const response: ApiResponse<typeof post> = {
    success: true,
    data: post,
    message: "Post created successfully",
  };

  res.status(StatusCodes.CREATED).json(response);
}

export async function handleListPosts(req: Request, res: Response): Promise<void> {
  const channelId = getResolvedChannelTarget(req).id;
  const result = await postService.listPosts(channelId, req.query as Record<string, unknown>, {
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

// ─── Post-Scoped Handlers ──────────────────────────────────────────────────

export async function handleGetPost(req: Request, res: Response): Promise<void> {
  const post = await postService.getPost(getResolvedPostTarget(req).id, {
    id: req.user!.id,
    userType: req.user!.userType,
  });

  const response: ApiResponse<typeof post> = {
    success: true,
    data: post,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleUpdatePost(req: Request, res: Response): Promise<void> {
  const post = await postService.updatePost(getResolvedPostTarget(req).id, req.body, {
    id: req.user!.id,
    userType: req.user!.userType,
  });

  const response: ApiResponse<typeof post> = {
    success: true,
    data: post,
    message: "Post updated successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleDeletePost(req: Request, res: Response): Promise<void> {
  await postService.deletePost(getResolvedPostTarget(req).id, {
    id: req.user!.id,
    userType: req.user!.userType,
  });

  const response: ApiResponse<null> = {
    success: true,
    data: null,
    message: "Post deleted successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handlePinPost(req: Request, res: Response): Promise<void> {
  const post = await postService.pinPost(getResolvedPostTarget(req).id, req.body, {
    id: req.user!.id,
    userType: req.user!.userType,
  });

  const response: ApiResponse<typeof post> = {
    success: true,
    data: post,
    message: req.body.isPinned ? "Post pinned successfully" : "Post unpinned successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleAddAttachments(req: Request, res: Response): Promise<void> {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const uploadedFiles = files.map((f) => ({
    buffer: f.buffer,
    mimetype: f.mimetype,
    size: f.size,
  }));

  const post = await postService.addAttachments(getResolvedPostTarget(req).id, uploadedFiles, {
    id: req.user!.id,
    userType: req.user!.userType,
  });

  const response: ApiResponse<typeof post> = {
    success: true,
    data: post,
    message: "Attachments uploaded successfully",
  };

  res.status(StatusCodes.CREATED).json(response);
}
