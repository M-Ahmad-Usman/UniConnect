import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const REQUEST_ID_HEADER = "X-Request-ID";
const REQUEST_ID_PATTERN = /^[a-zA-Z0-9._:-]{8,128}$/;

function getIncomingRequestId(req: Request): string | null {
  const value = req.header(REQUEST_ID_HEADER);
  if (!value || !REQUEST_ID_PATTERN.test(value)) {
    return null;
  }

  return value;
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = getIncomingRequestId(req) ?? crypto.randomUUID();
  req.requestId = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
}
