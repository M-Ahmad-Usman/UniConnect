import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { env } from "../../config/env.js";
import * as authService from "./auth.service.js";
import type { ApiResponse } from "../../shared/types/index.js";
import { parseExpiry } from "../../shared/utils/parseExpiry.js";
import {
  clearCsrfCookie,
  getAuthCookieOptions,
  issueCsrfCookie,
} from "../../shared/security/csrf.js";

// ─── Cookie Helpers ─────────────────────────────────────────────────────────

function setCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie("access_token", accessToken, {
    ...getAuthCookieOptions(parseExpiry(env.JWT_ACCESS_EXPIRY)),
    path: "/api",
  });

  res.cookie("refresh_token", refreshToken, {
    ...getAuthCookieOptions(parseExpiry(env.JWT_REFRESH_EXPIRY)),
    path: "/api/auth/refresh",
  });

  issueCsrfCookie(res);
}

function clearCookies(res: Response): void {
  res.clearCookie("access_token", {
    ...getAuthCookieOptions(),
    path: "/api",
  });

  res.clearCookie("refresh_token", {
    ...getAuthCookieOptions(),
    path: "/api/auth/refresh",
  });

  clearCsrfCookie(res);
}

// ─── Handlers ───────────────────────────────────────────────────────────────

export async function handleLogin(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  const result = await authService.login(email, password);

  setCookies(res, result.accessToken, result.refreshToken);

  const response: ApiResponse<typeof result.user> = {
    success: true,
    data: result.user,
    message: result.user.mustChangePassword
      ? "Login successful. Password change required."
      : "Login successful",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleRefresh(req: Request, res: Response): Promise<void> {
  const refreshTokenCookie = req.cookies?.refresh_token;

  if (!refreshTokenCookie) {
    res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "No refresh token provided" },
    });
    return;
  }

  const result = await authService.refresh(refreshTokenCookie);

  setCookies(res, result.accessToken, result.refreshToken);

  const response: ApiResponse<null> = {
    success: true,
    data: null,
    message: "Token refreshed",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleLogout(req: Request, res: Response): Promise<void> {
  const refreshTokenCookie = req.cookies?.refresh_token;
  await authService.logout(refreshTokenCookie);
  clearCookies(res);

  const response: ApiResponse<null> = {
    success: true,
    data: null,
    message: "Logged out successfully",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleForgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body;
  await authService.forgotPassword(email);

  const response: ApiResponse<null> = {
    success: true,
    data: null,
    message: "If an account exists with that email, a reset link has been sent",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleResetPassword(req: Request, res: Response): Promise<void> {
  const { token, newPassword } = req.body;
  await authService.resetPassword(token, newPassword);
  clearCookies(res);

  const response: ApiResponse<null> = {
    success: true,
    data: null,
    message: "Password reset successful. Please log in with your new password.",
  };

  res.status(StatusCodes.OK).json(response);
}

export async function handleChangePassword(req: Request, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user!.id, currentPassword, newPassword);
  clearCookies(res);

  const response: ApiResponse<null> = {
    success: true,
    data: null,
    message: "Password changed successfully. Please log in again.",
  };

  res.status(StatusCodes.OK).json(response);
}

export function handleGetCsrfToken(_req: Request, res: Response): void {
  const token = issueCsrfCookie(res);

  const response: ApiResponse<{ token: string }> = {
    success: true,
    data: { token },
  };

  res.status(StatusCodes.OK).json(response);
}
