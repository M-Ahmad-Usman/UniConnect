import request from "supertest";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { env } from "../../src/config/env.js";
import { resetDB } from "../helpers/db.helper.js";
import { createUser, createAdmin, loginAs } from "../helpers/factory.js";
import { TEMP_PASSWORD_PREFIX } from "../../src/shared/constants.js";

beforeAll(async () => {
  await resetDB();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ─── Helper ─────────────────────────────────────────────────────────────────

function extractCookies(res: request.Response): Record<string, string> {
  const cookies: Record<string, string> = {};
  const setCookie = res.headers["set-cookie"];
  if (!setCookie) return cookies;
  const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const c of arr) {
    const [nameVal] = c.split(";");
    const [name, ...rest] = nameVal.split("=");
    cookies[name.trim()] = rest.join("=");
  }
  return cookies;
}

function cookieHeader(cookies: string[]): string {
  return cookies
    .map((c) => c.split(";")[0])
    .join("; ");
}

// ─── POST /api/auth/login ───────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  const PASSWORD = "Secure@123";
  let activeUserEmail: string;
  let inactiveUserEmail: string;
  let tempPasswordEmail: string;

  beforeAll(async () => {
    await resetDB();

    const activeUser = await createUser({ email: "active@test.com", password: PASSWORD });
    activeUserEmail = activeUser.email;

    const inactiveUser = await createUser({
      email: "inactive@test.com",
      password: PASSWORD,
      isActive: false,
    });
    inactiveUserEmail = inactiveUser.email;

    const tempUser = await createUser({
      email: "temppw@test.com",
      password: `${TEMP_PASSWORD_PREFIX}Temp@123`,
      mustChangePassword: true,
    });
    tempPasswordEmail = tempUser.email;
  });

  it("should return 200 with user data and set cookies for valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: activeUserEmail, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      email: activeUserEmail,
      mustChangePassword: false,
    });
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data).toHaveProperty("fullName");
    expect(res.body.data).toHaveProperty("userType");
    expect(res.body.data).not.toHaveProperty("passwordHash");

    const cookies = extractCookies(res);
    expect(cookies).toHaveProperty("access_token");
    expect(cookies).toHaveProperty("refresh_token");
  });

  it("should return 401 for non-existent email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@test.com", password: PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("should return 401 for wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: activeUserEmail, password: "WrongPassword@1" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("should return 401 for deactivated user", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: inactiveUserEmail, password: PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return mustChangePassword: true for first-login user", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: tempPasswordEmail, password: `${TEMP_PASSWORD_PREFIX}Temp@123` });

    expect(res.status).toBe(200);
    expect(res.body.data.mustChangePassword).toBe(true);
    expect(res.body.message).toContain("Password change required");
  });

  it("should return 400 for missing email or password", async () => {
    const res = await request(app).post("/api/auth/login").send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ─── POST /api/auth/refresh ─────────────────────────────────────────────────

describe("POST /api/auth/refresh", () => {
  const PASSWORD = "Secure@123";
  let cookies: string[];

  beforeAll(async () => {
    await resetDB();
    await createUser({ email: "refresh@test.com", password: PASSWORD });
    cookies = await loginAs("refresh@test.com", PASSWORD);
  });

  it("should return 200 and set new cookies with valid refresh token", async () => {
    // Extract just the refresh_token cookie
    const refreshCookie = cookies.find((c) => c.startsWith("refresh_token="));
    expect(refreshCookie).toBeDefined();

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", refreshCookie!);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const newCookies = extractCookies(res);
    expect(newCookies).toHaveProperty("access_token");
    expect(newCookies).toHaveProperty("refresh_token");
  });

  it("should return 401 without refresh token cookie", async () => {
    const res = await request(app).post("/api/auth/refresh");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 401 with revoked refresh token", async () => {
    // Login to get a token, then logout (which revokes it), then try refresh
    const freshCookies = await loginAs("refresh@test.com", PASSWORD);
    const refreshCookie = freshCookies.find((c) => c.startsWith("refresh_token="));

    // Logout to revoke
    await request(app)
      .post("/api/auth/logout")
      .set("Cookie", freshCookies);

    // Try refreshing with the revoked token
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", refreshCookie!);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should allow only one successful refresh when the same token is used concurrently", async () => {
    const freshCookies = await loginAs("refresh@test.com", PASSWORD);
    const refreshCookie = freshCookies.find((c) => c.startsWith("refresh_token="));
    expect(refreshCookie).toBeDefined();

    const [resA, resB] = await Promise.all([
      request(app)
        .post("/api/auth/refresh")
        .set("Cookie", refreshCookie!),
      request(app)
        .post("/api/auth/refresh")
        .set("Cookie", refreshCookie!),
    ]);

    const statuses = [resA.status, resB.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 401]);
  });
});

// ─── POST /api/auth/logout ──────────────────────────────────────────────────

describe("POST /api/auth/logout", () => {
  const PASSWORD = "Secure@123";

  beforeAll(async () => {
    await resetDB();
    await createUser({ email: "logout@test.com", password: PASSWORD });
  });

  it("should return 200 and clear cookies", async () => {
    const cookies = await loginAs("logout@test.com", PASSWORD);

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Cookies should be cleared (set to empty or max-age=0)
    const setCookies = res.headers["set-cookie"] as unknown as string[];
    const accessCookie = setCookies?.find((c) => c.startsWith("access_token="));
    expect(accessCookie).toBeDefined();
  });

  it("should return 401 without auth cookie", async () => {
    const res = await request(app).post("/api/auth/logout");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─── PATCH /api/auth/change-password ────────────────────────────────────────

describe("PATCH /api/auth/change-password", () => {
  const OLD_PASSWORD = "OldPass@123";
  const NEW_PASSWORD = "NewPass@456";

  beforeAll(async () => {
    await resetDB();
    await createUser({ email: "changepw@test.com", password: OLD_PASSWORD });
  });

  it("should return 200 and update password", async () => {
    const cookies = await loginAs("changepw@test.com", OLD_PASSWORD);

    const res = await request(app)
      .patch("/api/auth/change-password")
      .set("Cookie", cookies)
      .send({ currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Old password should no longer work
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "changepw@test.com", password: OLD_PASSWORD });
    expect(loginRes.status).toBe(401);

    // New password should work
    const loginRes2 = await request(app)
      .post("/api/auth/login")
      .send({ email: "changepw@test.com", password: NEW_PASSWORD });
    expect(loginRes2.status).toBe(200);
  });

  it("should return 401 for wrong current password", async () => {
    const cookies = await loginAs("changepw@test.com", NEW_PASSWORD);

    const res = await request(app)
      .patch("/api/auth/change-password")
      .set("Cookie", cookies)
      .send({ currentPassword: "WrongPass@1", newPassword: "Another@123" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 401 without auth cookie", async () => {
    const res = await request(app)
      .patch("/api/auth/change-password")
      .send({ currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 when new password equals current password", async () => {
    const cookies = await loginAs("changepw@test.com", NEW_PASSWORD);

    const res = await request(app)
      .patch("/api/auth/change-password")
      .set("Cookie", cookies)
      .send({ currentPassword: NEW_PASSWORD, newPassword: NEW_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ─── POST /api/auth/forgot-password ─────────────────────────────────────────

describe("POST /api/auth/forgot-password", () => {
  beforeAll(async () => {
    await resetDB();
    await createUser({ email: "forgot@test.com", password: "Pass@1234" });
  });

  it("should return 200 for existing email (no enumeration)", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "forgot@test.com" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain("reset link");
  });

  it("should return 200 for non-existent email (no enumeration)", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "noone@nowhere.com" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── POST /api/auth/reset-password ──────────────────────────────────────────

describe("POST /api/auth/reset-password", () => {
  beforeAll(async () => {
    await resetDB();
    await createUser({ email: "reset@test.com", password: "OldPass@123" });
  });

  it("should return 200 and reset password with valid token", async () => {
    const user = await prisma.user.findUnique({ where: { email: "reset@test.com" } });
    const resetToken = jwt.sign(
      { id: user!.id, email: user!.email },
      env.RESET_PASSWORD_SECRET,
      { expiresIn: "1h" }
    );

    // Simulate what forgotPassword does: store the token hash
    const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    await prisma.user.update({
      where: { id: user!.id },
      data: { passwordResetTokenHash: tokenHash },
    });

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: resetToken, newPassword: "NewReset@123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Can log in with new password
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "reset@test.com", password: "NewReset@123" });
    expect(loginRes.status).toBe(200);

    // Hash should be cleared after use
    const updated = await prisma.user.findUnique({ where: { id: user!.id } });
    expect(updated!.passwordResetTokenHash).toBeNull();
  });

  it("should return 401 for expired token", async () => {
    const user = await prisma.user.findUnique({ where: { email: "reset@test.com" } });
    const expiredToken = jwt.sign(
      { id: user!.id, email: user!.email },
      env.RESET_PASSWORD_SECRET,
      { expiresIn: "0s" }
    );

    // Wait briefly for token to expire
    await new Promise((r) => setTimeout(r, 1100));

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: expiredToken, newPassword: "AnyPass@123" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 401 for invalid token", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "invalid.jwt.token", newPassword: "AnyPass@123" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 401 when using the same reset token twice", async () => {
    const user = await prisma.user.findUnique({ where: { email: "reset@test.com" } });
    const resetToken = jwt.sign(
      { id: user!.id, email: user!.email },
      env.RESET_PASSWORD_SECRET,
      { expiresIn: "1h" }
    );

    // Store token hash (simulating forgotPassword)
    const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    await prisma.user.update({
      where: { id: user!.id },
      data: { passwordResetTokenHash: tokenHash },
    });

    // First use — should succeed
    const res1 = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: resetToken, newPassword: "FirstReset@123" });
    expect(res1.status).toBe(200);

    // Second use — should fail (token hash was cleared)
    const res2 = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: resetToken, newPassword: "SecondReset@123" });
    expect(res2.status).toBe(401);
    expect(res2.body.success).toBe(false);
  });
});

// ─── First-Login Guard (mustChangePassword) ─────────────────────────────────

describe("First-login mustChangePassword guard", () => {
  const TEMP_PASS = `${TEMP_PASSWORD_PREFIX}Guard@123`;
  const NEW_PASS = "Changed@456";

  beforeAll(async () => {
    await resetDB();
    await createUser({
      email: "firstlogin@test.com",
      password: TEMP_PASS,
      mustChangePassword: true,
    });
  });

  it("should block access to protected routes when mustChangePassword is true", async () => {
    const cookies = await loginAs("firstlogin@test.com", TEMP_PASS);

    // Try accessing health check which goes through /api path
    // Instead, let's try logout which requires authenticate middleware
    // The authenticate middleware should block non change-password routes
    // We simulate by hitting a route that uses authenticate.
    // Since logout uses authenticate, it's a good test:
    // Actually logout path is /api/auth/logout which goes through authenticate
    // But the path check in authenticate is req.path which is relative to the router mount
    // Let's verify: for /api/auth/logout, req.path in authenticate (mounted on /api/auth) is /logout
    // So it should be blocked.

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookies);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("should allow access to change-password when mustChangePassword is true", async () => {
    const cookies = await loginAs("firstlogin@test.com", TEMP_PASS);

    const res = await request(app)
      .patch("/api/auth/change-password")
      .set("Cookie", cookies)
      .send({ currentPassword: TEMP_PASS, newPassword: NEW_PASS });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify the flag is cleared in DB
    const user = await prisma.user.findUnique({ where: { email: "firstlogin@test.com" } });
    expect(user!.mustChangePassword).toBe(false);
  });

  it("should allow normal access after changing password", async () => {
    // Login with new password — mustChangePassword should be false now
    const cookies = await loginAs("firstlogin@test.com", NEW_PASS);

    // Logout should work now
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
