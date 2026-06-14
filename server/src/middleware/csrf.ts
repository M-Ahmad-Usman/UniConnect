import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { assertTrustedOrigin, assertValidCsrf, isUnsafeMethod } from "../shared/security/csrf.js";

export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  if (!env.CSRF_ENABLED || !isUnsafeMethod(req.method)) {
    next();
    return;
  }

  assertTrustedOrigin(req);
  assertValidCsrf(req);
  next();
}
