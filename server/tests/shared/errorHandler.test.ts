import request from "supertest";
import express from "express";
import { errorHandler } from "../../src/middleware/errorHandler.js";
import { requestId } from "../../src/middleware/requestId.js";
import {
  AppError,
  ApiErrorCode,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from "../../src/shared/errors/index.js";

function createTestApp(errorToThrow: Error) {
  const app = express();
  app.use(express.json());
  app.use(requestId);

  app.get("/test", () => {
    throw errorToThrow;
  });

  app.use(errorHandler);
  return app;
}

describe("Error Handler Middleware", () => {
  it("should format AppError into standard JSON response", async () => {
    const app = createTestApp(new AppError("Test error", 418, ApiErrorCode.INTERNAL_ERROR));
    const res = await request(app).get("/test");

    expect(res.status).toBe(418);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatchObject({
      code: "INTERNAL_ERROR",
      message: "Test error",
    });
  });

  it("should handle NotFoundError → 404", async () => {
    const app = createTestApp(new NotFoundError("User not found"));
    const res = await request(app).get("/test");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(res.body.error.message).toBe("User not found");
  });

  it("should handle UnauthorizedError → 401", async () => {
    const app = createTestApp(new UnauthorizedError());
    const res = await request(app).get("/test");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("should handle ForbiddenError → 403", async () => {
    const app = createTestApp(new ForbiddenError());
    const res = await request(app).get("/test");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("should handle ConflictError → 409", async () => {
    const app = createTestApp(new ConflictError("Email already exists"));
    const res = await request(app).get("/test");

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
    expect(res.body.error.message).toBe("Email already exists");
  });

  it("should handle ValidationError with details → 400", async () => {
    const details = [{ field: "email", message: "Invalid email format" }];
    const app = createTestApp(new ValidationError("Validation failed", details));
    const res = await request(app).get("/test");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toEqual(details);
  });

  it("should handle Prisma unique constraint error (P2002) → 409", async () => {
    const prismaError = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
      meta: { target: ["email"] },
    });
    const app = createTestApp(prismaError);
    const res = await request(app).get("/test");

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DUPLICATE_EMAIL");
    expect(res.body.error.message).toBe("A user with this email already exists");
  });

  it("should handle Prisma not found error (P2025) → 404", async () => {
    const prismaError = Object.assign(new Error("Record not found"), {
      code: "P2025",
    });
    const app = createTestApp(prismaError);
    const res = await request(app).get("/test");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("should handle unknown errors → 500 with generic message", async () => {
    const app = createTestApp(new Error("Something broke"));
    const res = await request(app).get("/test");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
    expect(res.body.error.message).toBe("An unexpected error occurred");
    expect(res.body.error.debug).toBe("Something broke");
  });

  it("should include a trusted request ID in error responses", async () => {
    const app = createTestApp(new NotFoundError("User not found"));
    const res = await request(app).get("/test").set("X-Request-ID", "error-handler-test-request");

    expect(res.status).toBe(404);
    expect(res.headers["x-request-id"]).toBe("error-handler-test-request");
    expect(res.body.error.requestId).toBe("error-handler-test-request");
  });
});
