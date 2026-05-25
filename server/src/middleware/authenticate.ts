import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiErrorCode, UnauthorizedError, ForbiddenError } from "../shared/errors/index.js";
import type { AuthUser } from "../shared/types/index.js";

interface AccessTokenPayload {
  id: number;
  email: string;
  userType: string;
  departmentId: number | null;
  mustChangePassword: boolean;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.access_token;

  if (!token) {
    throw new UnauthorizedError("Authentication required");
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;

    req.user = {
      id: payload.id,
      email: payload.email,
      userType: payload.userType,
      departmentId: payload.departmentId,
      mustChangePassword: payload.mustChangePassword,
    };

    // Block all non-change-password routes when mustChangePassword is true
    if (payload.mustChangePassword && !req.path.endsWith("/change-password")) {
      throw new ForbiddenError(
        "Password change required before accessing this resource",
        ApiErrorCode.PASSWORD_CHANGE_REQUIRED
      );
    }

    next();
  } catch (error) {
    if (error instanceof ForbiddenError) {
      throw error;
    }
    throw new UnauthorizedError("Authentication required");
  }
}
