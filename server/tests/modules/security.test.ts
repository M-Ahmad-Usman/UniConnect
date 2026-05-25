import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { env, csrfTrustedOrigins } from "../../src/config/env.js";
import { createUser, loginAs } from "../helpers/factory.js";

const PASSWORD = "Pass@1234";
const TRUSTED_ORIGIN = "http://localhost:5173";

function suffix(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function extractCookie(cookies: string[], name: string): string {
  const cookie = cookies.find((value) => value.startsWith(`${name}=`));
  if (!cookie) {
    throw new Error(`Missing ${name} cookie`);
  }

  return cookie.split(";")[0]!;
}

function createOversizedPng(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(45);
  Buffer.from("89504e470d0a1a0a", "hex").copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  Buffer.from("IHDR").copy(buffer, 12);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  buffer[24] = 8;
  buffer[25] = 2;
  buffer[26] = 0;
  buffer[27] = 0;
  buffer[28] = 0;
  buffer.writeUInt32BE(0, 29);
  buffer.writeUInt32BE(0, 33);
  Buffer.from("IEND").copy(buffer, 37);
  buffer.writeUInt32BE(0, 41);
  return buffer;
}

describe("Module 5 security hardening", () => {
  describe("CSRF protection", () => {
    const originalEnabled = env.CSRF_ENABLED;
    const originalOrigins = [...csrfTrustedOrigins];

    beforeEach(() => {
      env.CSRF_ENABLED = true;
      csrfTrustedOrigins.splice(0, csrfTrustedOrigins.length, TRUSTED_ORIGIN);
    });

    afterEach(() => {
      env.CSRF_ENABLED = originalEnabled;
      csrfTrustedOrigins.splice(0, csrfTrustedOrigins.length, ...originalOrigins);
    });

    it("rejects unsafe requests without a CSRF token", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .set("Origin", TRUSTED_ORIGIN)
        .send({ email: "missing@example.com", password: PASSWORD });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("CSRF_INVALID");
    });

    it("allows unsafe requests with a valid CSRF token and trusted origin", async () => {
      const admin = await createUser({
        email: `csrf-admin-${suffix()}@test.com`,
        userType: "ADMIN",
        password: PASSWORD,
      });
      const csrf = await request(app).get("/api/auth/csrf");
      const cookies = csrf.headers["set-cookie"] as unknown as string[];
      const csrfCookie = extractCookie(cookies, "XSRF-TOKEN");
      const token = csrf.body.data.token;

      const res = await request(app)
        .post("/api/auth/login")
        .set("Origin", TRUSTED_ORIGIN)
        .set("Cookie", [csrfCookie])
        .set("X-XSRF-TOKEN", token)
        .send({ email: admin.email, password: PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  it("creates redacted audit logs for privileged user activation changes", async () => {
    const admin = await createUser({
      email: `audit-admin-${suffix()}@test.com`,
      userType: "ADMIN",
      password: PASSWORD,
    });
    const target = await createUser({
      email: `audit-target-${suffix()}@test.com`,
      userType: "STUDENT",
      departmentId: null,
      password: PASSWORD,
    });
    const cookies = await loginAs(admin.email, PASSWORD);

    const res = await request(app)
      .patch(`/api/users/${target.id}/deactivate`)
      .set("Cookie", cookies);

    expect(res.status).toBe(200);

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        actorUserId: admin.id,
        action: "user.deactivate",
        targetType: "user",
        targetId: String(target.id),
      },
    });

    expect(auditLog).not.toBeNull();
    expect(JSON.stringify(auditLog?.summary)).not.toMatch(/password|token|secret|cookie/i);
  });

  it("rejects uploaded images over the configured pixel-count limit", async () => {
    const user = await createUser({
      email: `pixels-${suffix()}@test.com`,
      userType: "STUDENT",
      departmentId: null,
      password: PASSWORD,
    });
    const cookies = await loginAs(user.email, PASSWORD);

    const res = await request(app)
      .patch("/api/users/me/profile-picture")
      .set("Cookie", cookies)
      .attach("profilePicture", createOversizedPng(5000, 3000), {
        filename: "large.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("UPLOAD_IMAGE_TOO_LARGE");
  });
});
