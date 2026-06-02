import type { NextFunction, Request, Response } from "express";
import { resolveClassPublicId } from "../shared/ids/index.js";
import type { ResolvedClassTarget } from "../shared/types/index.js";

export function getResolvedClassTarget(req: Request): ResolvedClassTarget {
  if (!req.classTarget) {
    throw new Error("Class route target was not resolved");
  }

  return req.classTarget;
}

export async function resolveClassTarget(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  req.classTarget = await resolveClassPublicId(req.params.publicId, {
    field: "classPublicId",
  });
  next();
}
