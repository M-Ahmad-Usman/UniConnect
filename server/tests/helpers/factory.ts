import bcrypt from "bcrypt";
import supertest from "supertest";
import { prisma } from "../../src/config/prisma.js";
import { TEMP_PASSWORD_PREFIX } from "../../src/shared/constants.js";
import { app } from "../../src/app.js";
import { clearRolePermissionCache } from "../../src/middleware/authorize.js";

let uniqueCounter = 0;

function uniqueSuffix(): string {
  uniqueCounter += 1;
  const t = Date.now().toString(36).slice(-6);
  const c = (uniqueCounter % 1296).toString(36).padStart(2, "0");
  const r = Math.random().toString(36).slice(2, 4);
  return `${t}${c}${r}`;
}

// ─── Seed Helpers ──────────────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<string, string[]> = {
  hod: [
    "post:channel", "create:channel", "delete:channel", "lock:channel",
    "create:society", "create:class", "assign:program_director", "assign:cr",
    "assign:society_president", "assign:society_convenor", "assign:moderator",
  ],
  program_director: ["post:channel", "assign:cr"],
  society_president: [
    "post:channel", "create:channel", "delete:channel", "lock:channel", "assign:moderator",
  ],
  society_convenor: [
    "post:channel", "create:channel", "delete:channel", "lock:channel",
    "assign:moderator", "assign:society_president",
  ],
  cr: [
    "post:channel", "create:channel", "delete:channel", "lock:channel", "assign:moderator",
  ],
  moderator: ["post:channel"],
};

/**
 * Seed roles, permissions, and role-permission mappings.
 * Required for tests that use the permission-based authorize middleware.
 */
export async function seedRolesAndPermissions() {
  const permNames = [
    "post:channel", "create:channel", "delete:channel", "lock:channel",
    "create:society", "create:department", "create:class",
    "assign:hod", "assign:program_director", "assign:cr",
    "assign:society_president", "assign:society_convenor", "assign:moderator",
  ];
  const roleNames = Object.keys(ROLE_PERMISSIONS);

  // Create roles and permissions
  await Promise.all([
    ...roleNames.map((name) =>
      prisma.role.upsert({ where: { name }, update: {}, create: { name } })
    ),
    ...permNames.map((name) =>
      prisma.permission.upsert({ where: { name }, update: {}, create: { name } })
    ),
  ]);

  // Create mappings
  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) continue;
    for (const permName of perms) {
      const perm = await prisma.permission.findUnique({ where: { name: permName } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }

  // Clear the cached role-permission map so it reloads from DB
  clearRolePermissionCache();
}

// ─── Internal Helpers ──────────────────────────────────────────────────────

async function ensureCreatorUser(userId?: number): Promise<number> {
  if (userId) {
    return userId;
  }

  const creator = await createAdmin({ email: `creator-${uniqueSuffix()}@test.com` });
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
      email: overrides.email ?? `testuser-${uniqueSuffix()}@test.com`,
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
      name: overrides?.name ?? `Computer Science ${uniqueSuffix()}`,
      code: overrides?.code ?? `CS-${uniqueSuffix()}`,
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
      code: overrides?.code ?? `P-${uniqueSuffix()}`,
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
    email: overrides?.email ?? `teacher-${uniqueSuffix()}@test.com`,
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
    email: overrides?.email ?? `student-${uniqueSuffix()}@test.com`,
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

// ─── Module 6 Helpers ──────────────────────────────────────────────────────

export async function createSociety(
  departmentId: number,
  presidentUserId: number,
  convenorUserId: number,
  overrides?: { name?: string; description?: string; creatorId?: number }
) {
  const createdBy = await ensureCreatorUser(overrides?.creatorId);

  const server = await prisma.server.create({
    data: {
      name: overrides?.name ?? `Society-${uniqueSuffix()}`,
      type: "SOCIETY",
      createdBy,
      isActive: true,
    },
  });

  await prisma.channel.createMany({
    data: [
      { serverId: server.id, name: "announcements", type: "ANNOUNCEMENT", isAutoCreated: true, createdBy },
      { serverId: server.id, name: "general", type: "GENERAL", isAutoCreated: true, createdBy },
    ],
  });

  const society = await prisma.society.create({
    data: {
      name: overrides?.name ?? `Society-${uniqueSuffix()}`,
      description: overrides?.description ?? null,
      departmentId,
      presidentId: presidentUserId,
      convenorId: convenorUserId,
      serverId: server.id,
    },
  });

  await prisma.serverMembership.createMany({
    data: [
      { userId: presidentUserId, serverId: server.id, isAutoJoined: true },
      { userId: convenorUserId, serverId: server.id, isAutoJoined: true },
    ],
  });

  return { society, server };
}

export async function createSocietyMembershipRequest(
  societyId: number,
  userId: number,
  status: "PENDING" | "APPROVED" | "REJECTED" = "PENDING"
) {
  return prisma.societyMembershipRequest.create({
    data: {
      societyId,
      userId,
      status,
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

// ─── Module 7 Helpers ──────────────────────────────────────────────────────

export async function createChannel(
  serverId: number,
  overrides?: {
    name?: string;
    description?: string;
    type?: "ANNOUNCEMENT" | "COURSE" | "GENERAL" | "PROGRAM";
    isAutoCreated?: boolean;
    courseId?: number;
    programId?: number;
    createdBy?: number;
  }
) {
  return prisma.channel.create({
    data: {
      serverId,
      name: overrides?.name ?? `channel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      description: overrides?.description ?? null,
      type: overrides?.type ?? "GENERAL",
      isAutoCreated: overrides?.isAutoCreated ?? false,
      courseId: overrides?.courseId ?? null,
      programId: overrides?.programId ?? null,
      createdBy: overrides?.createdBy ?? null,
    },
  });
}

export async function assignHOD(departmentId: number, teacherUserId: number) {
  return prisma.department.update({
    where: { id: departmentId },
    data: { hodId: teacherUserId },
  });
}

export async function assignCR(classId: number, studentUserId: number) {
  return prisma.class.update({
    where: { id: classId },
    data: { crId: studentUserId },
  });
}

export async function assignPD(programId: number, teacherUserId: number) {
  return prisma.program.update({
    where: { id: programId },
    data: { programDirectorId: teacherUserId },
  });
}

export async function addServerMembership(userId: number, serverId: number) {
  return prisma.serverMembership.upsert({
    where: { userId_serverId: { userId, serverId } },
    create: { userId, serverId, isAutoJoined: false },
    update: {},
  });
}

// ─── Module 9 Helpers ──────────────────────────────────────────────────────

export async function createPost(
  channelId: number,
  authorId: number,
  overrides?: {
    title?: string;
    content?: string;
    priority?: "NORMAL" | "IMPORTANT" | "URGENT";
    isPinned?: boolean;
    pinnedBy?: number;
    pinnedAt?: Date;
    createdAt?: Date;
  }
) {
  return prisma.post.create({
    data: {
      channelId,
      authorId,
      title: overrides?.title ?? `Post Title ${uniqueSuffix()}`,
      content: overrides?.content ?? "This is a test post content.",
      priority: overrides?.priority ?? "NORMAL",
      isPinned: overrides?.isPinned ?? false,
      pinnedBy: overrides?.pinnedBy ?? null,
      pinnedAt: overrides?.pinnedAt ?? null,
      createdAt: overrides?.createdAt ?? undefined,
    },
  });
}

export async function createPostAttachment(
  postId: number,
  overrides?: {
    fileUrl?: string;
    fileType?: string;
    fileSize?: number;
  }
) {
  return prisma.postAttachment.create({
    data: {
      postId,
      fileUrl: overrides?.fileUrl ?? `https://res.cloudinary.com/test/post-attachments/${uniqueSuffix()}.jpg`,
      fileType: overrides?.fileType ?? "image/jpeg",
      fileSize: overrides?.fileSize ?? 1024,
    },
  });
}

// ─── Module 10 Helpers ─────────────────────────────────────────────────────

export async function createNotification(
  userId: number,
  overrides?: {
    postId?: number;
    type?: "NEW_POST" | "ROLE_ASSIGNED";
    title?: string;
    message?: string;
    readAt?: Date | null;
    createdAt?: Date;
  }
) {
  return prisma.notification.create({
    data: {
      userId,
      postId: overrides?.postId ?? null,
      type: overrides?.type ?? "NEW_POST",
      title: overrides?.title ?? `Notification ${uniqueSuffix()}`,
      message: overrides?.message ?? "Test notification message",
      readAt: overrides?.readAt ?? null,
      createdAt: overrides?.createdAt ?? undefined,
    },
  });
}

export async function createNotificationPreference(
  userId: number,
  serverId: number,
  overrides?: {
    scopeType?: "SERVER" | "CHANNEL";
    channelId?: number;
    isSubscribed?: boolean;
  }
) {
  return prisma.notificationPreference.create({
    data: {
      userId,
      scopeType: overrides?.scopeType ?? "SERVER",
      serverId,
      channelId: overrides?.channelId ?? null,
      isSubscribed: overrides?.isSubscribed ?? true,
    },
  });
}

// ─── Module 11 Helpers ─────────────────────────────────────────────────────

export async function createTeachesRecord(
  teacherId: number,
  courseId: number,
  classId: number
) {
  return prisma.teaches.create({
    data: { teacherId, courseId, classId },
  });
}

export async function createCurriculum(
  programId: number,
  courseId: number,
  semesterNumber: number,
  batchYear: number
) {
  return prisma.programCurriculum.create({
    data: { programId, courseId, semesterNumber, batchYear },
  });
}
