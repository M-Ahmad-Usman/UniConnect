import pino from "pino";
import pinoHttp from "pino-http";
import crypto from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Request, Response } from "express";
import { env } from "./env.js";

const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers['x-xsrf-token']",
  "req.headers['x-csrf-token']",
  "request.headers.authorization",
  "request.headers.cookie",
  "request.headers['x-xsrf-token']",
  "request.headers['x-csrf-token']",
  "headers.authorization",
  "headers.cookie",
  "headers['x-xsrf-token']",
  "headers['x-csrf-token']",
  "*.password",
  "*.currentPassword",
  "*.newPassword",
  "*.passwordHash",
  "*.passwordResetTokenHash",
  "*.token",
  "*.accessToken",
  "*.refreshToken",
  "*.resetToken",
  "*.tokenHash",
  "*.secret",
  "*.apiKey",
  "*.apiSecret",
  "*.cookie",
  "*.authorization",
  "password",
  "currentPassword",
  "newPassword",
  "passwordHash",
  "passwordResetTokenHash",
  "token",
  "accessToken",
  "refreshToken",
  "resetToken",
  "tokenHash",
  "secret",
  "apiKey",
  "apiSecret",
  "cookie",
  "authorization",
] as const;

function getTransport(): pino.TransportSingleOptions | undefined {
  if (env.NODE_ENV !== "development") {
    return undefined;
  }

  return {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
      singleLine: true,
    },
  };
}

export const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    service: "uniconnect-api",
    environment: env.NODE_ENV,
    ...(env.SENTRY_RELEASE ? { release: env.SENTRY_RELEASE } : {}),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [...REDACT_PATHS],
    censor: "[REDACTED]",
  },
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
  transport: getTransport(),
});

function isHealthCheck(req: Request): boolean {
  return req.method === "GET" && req.path === "/api/health";
}

export function getHttpLogLevel(
  req: Request,
  res: Pick<Response, "statusCode">,
  err?: Error,
): pino.LevelWithSilent {
  if (isHealthCheck(req) && res.statusCode < 500 && !err) {
    return "silent";
  }

  if (res.statusCode >= 500 || err) {
    return "error";
  }

  if (res.statusCode >= 400) {
    return "warn";
  }

  return "info";
}

function getRoute(req: Request): string {
  if (req.route && typeof req.route.path === "string") {
    return `${req.baseUrl}${req.route.path}`;
  }

  return req.baseUrl || req.path;
}

function getUserId(req: Request): number | undefined {
  return req.user?.id;
}

function buildHttpLogObject(req: Request, res: Response, responseTimeMs: number) {
  return {
    requestId: req.requestId,
    userId: getUserId(req),
    method: req.method,
    path: req.path,
    route: getRoute(req),
    statusCode: res.statusCode,
    responseTimeMs,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  };
}

export const httpLogger = pinoHttp({
  logger,
  quietReqLogger: true,
  quietResLogger: true,
  genReqId: (req, res) => {
    const request = req as Request;
    const requestId = request.requestId;
    if (requestId) {
      return requestId;
    }

    const fallbackId = crypto.randomUUID();
    request.requestId = fallbackId;
    res.setHeader("X-Request-ID", fallbackId);
    return fallbackId;
  },
  customAttributeKeys: {
    reqId: "requestId",
    responseTime: "responseTimeMs",
  },
  customLogLevel: (req, res, err) => {
    return getHttpLogLevel(req as Request, res as Response, err);
  },
  customSuccessMessage: (req) => `${req.method} request completed`,
  customErrorMessage: (req) => `${req.method} request failed`,
  customSuccessObject: (
    req: IncomingMessage,
    res: ServerResponse,
    loggableObject: { responseTime: number },
  ) => buildHttpLogObject(req as Request, res as Response, loggableObject.responseTime),
  customErrorObject: (
    req: IncomingMessage,
    res: ServerResponse,
    err: Error,
    loggableObject: { responseTime: number },
  ) => ({
    ...buildHttpLogObject(req as Request, res as Response, loggableObject.responseTime),
    err,
  }),
});

export function getModuleLogger(module: string): pino.Logger {
  return logger.child({ module });
}
