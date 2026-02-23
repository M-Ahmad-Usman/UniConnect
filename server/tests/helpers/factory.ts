import bcrypt from "bcrypt";
import { prisma } from "../../src/config/prisma.js";
import { TEMP_PASSWORD_PREFIX } from "../../src/shared/constants.js";

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

// Stubs for later modules
// export async function createTeacher(departmentId: number) {}
// export async function createStudent(classId: number) {}
