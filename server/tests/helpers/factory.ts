import bcrypt from "bcrypt";
import supertest from "supertest";
import { prisma } from "../../src/config/prisma.js";
import { TEMP_PASSWORD_PREFIX } from "../../src/shared/constants.js";
import { app } from "../../src/app.js";

// ─── Internal Helpers ──────────────────────────────────────────────────────

async function ensureCreatorUser(userId?: number): Promise<number> {
  if (userId) {
    return userId;
  }

  const creator = await createAdmin({ email: `creator-${Date.now()}@test.com` });
  return creator.id;
}

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

// ─── Module 2 Helpers ──────────────────────────────────────────────────────

export async function createDiscipline(overrides?: { name?: string }) {
  return prisma.discipline.create({
    data: {
      name: overrides?.name ?? `Discipline-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    },
  });
}

export async function createDegreeLevelIfNeeded(level: string = "Bachelors") {
  return (
    (await prisma.degreeLevel.findFirst({ where: { level } })) ??
    (await prisma.degreeLevel.create({ data: { level } }))
  );
}

export async function createServer(
  type: "DEPARTMENT" | "CLASS" | "SOCIETY",
  creatorId?: number,
  overrides?: { name?: string; description?: string }
) {
  const createdBy = await ensureCreatorUser(creatorId);

  return prisma.server.create({
    data: {
      name: overrides?.name ?? `${type}-server-${Date.now()}`,
      description: overrides?.description ?? null,
      type,
      createdBy,
      isActive: true,
    },
  });
}

export async function createDepartment(overrides?: {
  name?: string;
  code?: string;
  creatorId?: number;
}) {
  const server = await createServer("DEPARTMENT", overrides?.creatorId, {
    name: `${overrides?.name ?? "Computer Science"} Server ${Date.now()}`,
  });

  return prisma.department.create({
    data: {
      name: overrides?.name ?? `Computer Science ${Date.now()}`,
      code: overrides?.code ?? `CS-${Date.now()}`,
      serverId: server.id,
    },
  });
}

export async function createProgram(
  departmentId: number,
  overrides?: { code?: string; semesters?: number }
) {
  const discipline = await prisma.discipline.create({
    data: { name: `Discipline-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
  });

  const degreeLevel =
    (await prisma.degreeLevel.findFirst({ where: { level: "Bachelors" } })) ??
    (await prisma.degreeLevel.create({ data: { level: "Bachelors" } }));

  return prisma.program.create({
    data: {
      departmentId,
      disciplineId: discipline.id,
      degreeLevelId: degreeLevel.id,
      semesters: overrides?.semesters ?? 8,
      code: overrides?.code ?? `P-${Date.now().toString(36)}`,
    },
  });
}

export async function createClass(
  programId: number,
  overrides?: { creatorId?: number; section?: "A" | "B"; currentSemester?: number }
) {
  const server = await createServer("CLASS", overrides?.creatorId, {
    name: `Class Server ${Date.now()}`,
  });

  return prisma.class.create({
    data: {
      programId,
      currentSemester: overrides?.currentSemester ?? 1,
      academicYear: 2026,
      admissionYear: 2026,
      section: overrides?.section ?? "A",
      serverId: server.id,
    },
  });
}

export async function createTeacherWithInfo(
  departmentId: number,
  overrides?: { email?: string; designation?: string; fullName?: string; password?: string }
) {
  const teacher = await createUser({
    email: overrides?.email ?? `teacher-${Date.now()}@test.com`,
    fullName: overrides?.fullName ?? "Test Teacher",
    password: overrides?.password ?? "Pass@1234",
    userType: "TEACHER",
    departmentId,
  });

  await prisma.teacherInfo.create({
    data: {
      teacherId: teacher.id,
      designation: overrides?.designation ?? "Lecturer",
    },
  });

  const department = await prisma.department.findUnique({ where: { id: departmentId } });
  if (department?.serverId) {
    await prisma.serverMembership.create({
      data: {
        userId: teacher.id,
        serverId: department.serverId,
        isAutoJoined: true,
      },
    });
  }

  return teacher;
}

export async function createStudentWithInfo(
  classId: number,
  departmentId: number,
  overrides?: {
    email?: string;
    fullName?: string;
    rollNumber?: number;
    password?: string;
  }
) {
  const student = await createUser({
    email: overrides?.email ?? `student-${Date.now()}@test.com`,
    fullName: overrides?.fullName ?? "Test Student",
    password: overrides?.password ?? "Pass@1234",
    userType: "STUDENT",
    departmentId,
  });

  await prisma.studentInfo.create({
    data: {
      studentId: student.id,
      classId,
      rollNumber: overrides?.rollNumber ?? Math.floor(Math.random() * 100000) + 1,
    },
  });

  const [department, classRecord] = await Promise.all([
    prisma.department.findUnique({ where: { id: departmentId } }),
    prisma.class.findUnique({ where: { id: classId } }),
  ]);

  if (department?.serverId) {
    await prisma.serverMembership.create({
      data: {
        userId: student.id,
        serverId: department.serverId,
        isAutoJoined: true,
      },
    });
  }

  if (classRecord?.serverId) {
    await prisma.serverMembership.create({
      data: {
        userId: student.id,
        serverId: classRecord.serverId,
        isAutoJoined: true,
      },
    });
  }

  return student;
}

// ─── Module 4 Helpers ──────────────────────────────────────────────────────

export async function createCourse(
  departmentId: number,
  overrides?: { title?: string; code?: string; creditHours?: number }
) {
  return prisma.course.create({
    data: {
      title: overrides?.title ?? `Course-${Date.now()}`,
      code: overrides?.code ?? `CRS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      creditHours: overrides?.creditHours ?? 3,
      departmentId,
    },
  });
}

export function generateCSV(rows: Record<string, string>[]): Buffer {
  if (rows.length === 0) {
    return Buffer.from("");
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => row[header] ?? "").join(",")),
  ];

  return Buffer.from(lines.join("\n"), "utf-8");
}
