import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";

describe("Express App Foundation", () => {
  describe("GET /api/health", () => {
    it("should return 200 with success response", async () => {
      const res = await request(app).get("/api/health");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, message: "OK", db: "ok" });
    });
  });

  describe("Unknown routes", () => {
    it("should return 404 with standard error format for unknown GET route", async () => {
      const res = await request(app).get("/api/unknown-route");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatchObject({
        code: "NOT_FOUND",
        message: "Route not found",
      });
      expect(res.body.error.requestId).toEqual(expect.any(String));
    });

    it("should return 404 for unknown POST route", async () => {
      const res = await request(app).post("/api/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("Prisma connectivity", () => {
    it("should connect to the test database successfully", async () => {
      // A simple raw query to verify DB connectivity
      const result = await prisma.$queryRawUnsafe("SELECT 1 as connected");
      expect(result).toEqual([{ connected: 1 }]);
    });
  });
});
