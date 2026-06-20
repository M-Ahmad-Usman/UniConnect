import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { getHttpLogLevel, logger } from "../../src/config/logger.js";
import type { Request, Response } from "express";

describe("Express App Foundation", () => {
  describe("GET /api/health", () => {
    it("should return 200 with success response", async () => {
      const res = await request(app).get("/api/health");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, message: "OK", db: "ok" });
    });

    it("should silence successful health-check auto logs", () => {
      const req = { method: "GET", path: "/api/health" } as Request;
      const res = { statusCode: 200 } as Response;

      expect(getHttpLogLevel(req, res)).toBe("silent");
    });

    it("should log failed health checks as errors", () => {
      const req = { method: "GET", path: "/api/health" } as Request;
      const res = { statusCode: 503 } as Response;

      expect(getHttpLogLevel(req, res)).toBe("error");
    });
  });

  describe("Logging", () => {
    it("should default to silent logging in test", () => {
      expect(logger.level).toBe("silent");
    });
  });

  describe("GET /.well-known/assetlinks.json", () => {
    it("should return Android App Links verification metadata", async () => {
      const res = await request(app).get("/.well-known/assetlinks.json");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("application/json");
      expect(res.headers["cache-control"]).toBe("public, max-age=3600");
      expect(res.body).toEqual([
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: "dev.uniconnect.app",
            sha256_cert_fingerprints: [
              "77:50:D0:97:F9:39:A4:76:33:D5:A2:3C:C6:08:38:89:80:6F:33:A6:9F:BE:52:90:7B:73:D3:5B:8B:5A:0B:64",
            ],
          },
        },
      ]);
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
