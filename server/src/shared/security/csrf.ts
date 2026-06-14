import crypto from "node:crypto";
import type { CookieOptions, Request, Response } from "express";
import { csrfTrustedOrigins, env } from "../../config/env.js";
import { CsrfError } from "../errors/index.js";

export const CSRF_COOKIE_NAME = "XSRF-TOKEN";
export const CSRF_HEADER_NAME = "x-xsrf-token";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function signToken(nonce: string): string {
  return crypto.createHmac("sha256", env.CSRF_SECRET).update(nonce).digest("base64url");
}

function timingSafeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function createCsrfToken(): string {
  const nonce = crypto.randomBytes(32).toString("base64url");
  return `${nonce}.${signToken(nonce)}`;
}

export function verifyCsrfToken(token: string): boolean {
  const [nonce, signature, extra] = token.split(".");
  if (!nonce || !signature || extra !== undefined) {
    return false;
  }

  return timingSafeEqual(signature, signToken(nonce));
}

export function getAuthCookieOptions(maxAge?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: env.AUTH_COOKIE_SECURE,
    sameSite: env.AUTH_COOKIE_SAME_SITE,
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}

export function getCsrfCookieOptions(): CookieOptions {
  return {
    httpOnly: false,
    secure: env.AUTH_COOKIE_SECURE,
    sameSite: env.AUTH_COOKIE_SAME_SITE,
    path: "/",
  };
}

export function issueCsrfCookie(res: Response): string {
  const token = createCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, getCsrfCookieOptions());
  return token;
}

export function clearCsrfCookie(res: Response): void {
  res.clearCookie(CSRF_COOKIE_NAME, getCsrfCookieOptions());
}

export function isUnsafeMethod(method: string): boolean {
  return UNSAFE_METHODS.has(method.toUpperCase());
}

function parseOrigin(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return null;
  }
}

function requestOrigin(req: Request): string | null {
  const origin = parseOrigin(req.get("origin"));
  if (origin) {
    return origin;
  }

  return parseOrigin(req.get("referer"));
}

export function assertTrustedOrigin(req: Request): void {
  const origin = requestOrigin(req);
  if (!origin || !csrfTrustedOrigins.includes(origin)) {
    throw new CsrfError("Request origin is not trusted");
  }
}

export function assertValidCsrf(req: Request): void {
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerValue = req.get(CSRF_HEADER_NAME);

  if (typeof cookieToken !== "string" || typeof headerValue !== "string") {
    throw new CsrfError("CSRF token is required");
  }

  if (!timingSafeEqual(cookieToken, headerValue) || !verifyCsrfToken(cookieToken)) {
    throw new CsrfError();
  }
}
