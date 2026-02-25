import bcrypt from "bcrypt";
import supertest from "supertest";
import { prisma } from "../../src/config/prisma.js";
import { TEMP_PASSWORD_PREFIX } from "../../src/shared/constants.js";
import { app } from "../../src/app.js";

/**
 * Create an admin user in the test database.
 */
export async function createAdmin(overrides?: { email?: string; fullName?: string }) {
  const passwordHash = await bcrypt.hash(`${TEMP_PASSWORD_PREFIX}admin123`, 10);

  return prisma.user.create({
    data: {
      fullName: overrides?.fullName ?? "Super Admin",
      email: overrides?.email ?? "admin@uniconnect.com",
      phone: "03001234567",
      passwordHash,
      gender: "MALE",
      userType: "ADMIN",
      departmentId: null,
      isActive: true,
      mustChangePassword: true,
    },
  });
}

/**
 * Create a user with custom fields.
 */
export async function createUser(overrides: {
  email?: string;
  fullName?: string;
  password?: string;
  userType?: "ADMIN" | "TEACHER" | "STUDENT";
  isActive?: boolean;
  mustChangePassword?: boolean;
  departmentId?: number | null;
}) {
  const password = overrides.password ?? "Test@1234";
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: {
      fullName: overrides.fullName ?? "Test User",
      email: overrides.email ?? `testuser-${Date.now()}@test.com`,
      phone: "03001234567",
      passwordHash,
      gender: "MALE",
      userType: overrides.userType ?? "STUDENT",
      departmentId: overrides.departmentId ?? null,
      isActive: overrides.isActive ?? true,
      mustChangePassword: overrides.mustChangePassword ?? false,
    },
  });
}

/**
 * Login as a user and return the set-cookie headers for authenticated requests.
 */
export async function loginAs(
  email: string,
  password: string
): Promise<string[]> {
  const res = await supertest(app)
    .post("/api/auth/login")
    .send({ email, password });

  const cookies = res.headers["set-cookie"];
  return (Array.isArray(cookies) ? cookies : cookies ? [cookies] : []) as string[];
}
