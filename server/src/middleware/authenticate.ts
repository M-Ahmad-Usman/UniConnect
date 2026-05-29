import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { ApiErrorCode, UnauthorizedError, ForbiddenError } from "../shared/errors/index.js";

interface AccessTokenPayload {
  sub: string;
  email: string;
  userType: string;
  departmentId: number | null;
  mustChangePassword: boolean;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.access_token;

  if (!token) {
    throw new UnauthorizedError("Authentication required");
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    const userId = Number(payload.sub);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedError("Authentication required");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        userType: true,
        departmentId: true,
        mustChangePassword: true,
        status: true,
        isActive: true,
        isDeleted: true,
      },
    });

    if (!user || user.isDeleted || !user.isActive || user.status !== "ACTIVE") {
      throw new UnauthorizedError("Authentication required");
    }

    req.user = {
      id: user.id,
      email: user.email,
      userType: user.userType,
      departmentId: user.departmentId,
      mustChangePassword: user.mustChangePassword,
    };

    // Block all non-change-password routes when mustChangePassword is true
    if (user.mustChangePassword && !req.path.endsWith("/change-password")) {
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
