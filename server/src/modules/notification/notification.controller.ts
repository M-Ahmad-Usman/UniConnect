import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse, PaginatedResponse } from "../../shared/types/index.js";
import * as notificationService from "./notification.service.js";

// ─── Notification Handlers ─────────────────────────────────────────────────

export async function handleListNotifications(req: Request, res: Response): Promise<void> {
  const result = await notificationService.listNotifications(
    req.user!.id,
    req.query as Record<string, unknown>
  );

  const response: PaginatedResponse<(typeof result.data)[number]> = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleGetUnreadCount(req: Request, res: Response): Promise<void> {
  const result = await notificationService.getUnreadCount(req.user!.id);

  const response: ApiResponse<typeof result> = {
    success: true,
    data: result,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleMarkAsRead(req: Request, res: Response): Promise<void> {
  const result = await notificationService.markAsRead(
    Number(req.params.id),
    req.user!.id
  );

  const response: ApiResponse<typeof result> = {
    success: true,
    data: result,
    message: "Notification marked as read",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleMarkAllAsRead(req: Request, res: Response): Promise<void> {
  const result = await notificationService.markAllAsRead(req.user!.id);

  const response: ApiResponse<typeof result> = {
    success: true,
    data: result,
    message: "All notifications marked as read",
  };

  res.status(StatusCodes.OK).json(response);
}

// ─── Preference Handlers ───────────────────────────────────────────────────

export async function handleGetPreferences(req: Request, res: Response): Promise<void> {
  const preferences = await notificationService.getPreferences(req.user!.id);

  const response: ApiResponse<typeof preferences> = {
    success: true,
    data: preferences,
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleUpdatePreference(req: Request, res: Response): Promise<void> {
  const preference = await notificationService.updatePreference(
    req.user!.id,
    req.body
  );

  const response: ApiResponse<typeof preference> = {
    success: true,
    data: preference,
    message: req.body.isSubscribed
      ? "Subscribed successfully"
      : "Unsubscribed successfully",
  };

  res.status(StatusCodes.OK).json(response);
}
