import request from "supertest";
import express from "express";
import { z } from "zod";
import { validate } from "../../src/middleware/validate.js";
import { errorHandler } from "../../src/middleware/errorHandler.js";

// Create a minimal test app
function createTestApp() {
  const app = express();
  app.use(express.json());

  // Test route with body validation
  app.post(
    "/test-body",
    validate({
      body: z.object({
        name: z.string().min(1),
        email: z.string().email(),
        age: z.number().int().positive(),
      }),
    }),
    (_req, res) => {
      res.json({ success: true, data: _req.body });
    }
  );

  // Test route with query validation
  app.get(
    "/test-query",
    validate({
      query: z.object({
        page: z.coerce.number().int().positive(),
        search: z.string().optional(),
      }),
    }),
    (req, res) => {
      res.json({ success: true, data: req.query });
    }
  );

  // Test route with params validation
  app.get(
    "/test-params/:id",
    validate({
      params: z.object({
        id: z.coerce.number().int().positive(),
      }),
    }),
    (req, res) => {
      res.json({ success: true, data: req.params });
    }
  );

  app.use(errorHandler);
  return app;
}

describe("Zod Validation Middleware", () => {
  const app = createTestApp();

  describe("Body validation", () => {
    it("should reject invalid body and return field-level errors", async () => {
      const res = await request(app)
        .post("/test-body")
        .send({ name: "", email: "not-an-email", age: -5 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toBe("Invalid input");
      expect(Array.isArray(res.body.error.details)).toBe(true);
      expect(res.body.error.details.length).toBeGreaterThan(0);

      // Check that each detail has field, message, and source
      for (const detail of res.body.error.details) {
        expect(detail).toHaveProperty("field");
        expect(detail).toHaveProperty("message");
        expect(detail.source).toBe("body");
      }
    });

    it("should pass valid body and call next()", async () => {
      const res = await request(app)
        .post("/test-body")
        .send({ name: "Ahmad", email: "ahmad@test.com", age: 25 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        name: "Ahmad",
        email: "ahmad@test.com",
        age: 25,
      });
    });

    it("should reject missing required fields", async () => {
      const res = await request(app).post("/test-body").send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details.length).toBeGreaterThan(0);
    });
  });

  describe("Query validation", () => {
    it("should reject invalid query params", async () => {
      const res = await request(app).get("/test-query?page=abc");

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should pass valid query params", async () => {
      const res = await request(app).get("/test-query?page=1&search=hello");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("Params validation", () => {
    it("should reject invalid route params", async () => {
      const res = await request(app).get("/test-params/abc");

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should pass valid route params", async () => {
      const res = await request(app).get("/test-params/42");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
