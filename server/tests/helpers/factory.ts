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

function uniqueRollNumber(): string {
  uniqueCounter += 1;
  const sequence = (uniqueCounter % 100000).toString().padStart(4, "0");
  return `22-NTU-CS-${sequence}`;
}

interface CoreFixtureRecord {
  id: number;
  publicId: string;
}

export function apiId(entity: CoreFixtureRecord): string {
  return entity.publicId;
}

export async function apiServerId(serverId: number): Promise<string> {
  const server = await prisma.server.findUniqueOrThrow({
    where: { id: serverId },
    select: { publicId: true },
  });
  return server.publicId;
}

export function entityIds(entity: CoreFixtureRecord): {
  internalId: number;
  publicId: string;
} {
  return {
    internalId: entity.id,
    publicId: entity.publicId,
  };
}

// ─── Seed Helpers ──────────────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<string, string[]> = {
  server_moderator: ["post:channel"],
  channel_moderator: ["post:channel"],
};

const TEST_DESIGNATIONS = [
  { value: "Professor", label: "Professor" },
  { value: "Associate Professor", label: "Associate Professor" },
  { value: "Assistant Professor", label: "Assistant Professor" },
  { value: "Lecturer", label: "Lecturer" },
];

/**
 * Seed roles, permissions, and role-permission mappings.
 * Required for tests that use the permission-based authorize middleware.
 */
export async function seedRolesAndPermissions() {
  const permNames = [
    "post:channel", "create:channel", "delete:channel", "lock:channel",
    "create:society", "create:department", "create:class",
    "assign:hod", "assign:program_director", "assign:cr",
    "assign:society_president", "assign:society_convenor", "assign:server_moderator", "assign:channel_moderator",
  ];
  const roleNames = Object.keys(ROLE_PERMISSIONS);

  // Batch-create roles and permissions (skipDuplicates avoids upsert overhead)
  await Promise.all([
    prisma.role.createMany({
      data: roleNames.map((name) => ({
        name,
        scopeType: name === "server_moderator" ? "SERVER" as const : "CHANNEL" as const,
      })),
      skipDuplicates: true,
    }),
    prisma.permission.createMany({
      data: permNames.map((name) => ({ name })),
      skipDuplicates: true,
    }),
  ]);

  // Fetch all roles and permissions in two queries
  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({ where: { name: { in: roleNames } } }),
    prisma.permission.findMany({ where: { name: { in: permNames } } }),
  ]);

  const roleMap = new Map(roles.map((r) => [r.name, r.id]));
  const permMap = new Map(permissions.map((p) => [p.name, p.id]));

  // Build all mappings in memory, then batch-insert
  const mappings: { roleId: number; permissionId: number }[] = [];
  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleMap.get(roleName);
    if (!roleId) continue;
    for (const permName of perms) {
      const permissionId = permMap.get(permName);
      if (!permissionId) continue;
      mappings.push({ roleId, permissionId });
    }
  }

  await prisma.rolePermission.createMany({
    data: mappings,
    skipDuplicates: true,
  });

  // Clear the cached role-permission map so it reloads from DB
  clearRolePermissionCache();
}

// ─── Internal Helpers ──────────────────────────────────────────────────────

async function ensureDesignation(value: string): Promise<void> {
  await prisma.designation.upsert({
    where: { value },
    update: { label: value },
    create: { value, label: value },
  });
}

export async function seedDesignations() {
  await prisma.designation.createMany({
    data: TEST_DESIGNATIONS,
    skipDuplicates: true,
  });
}

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
  const passwordHash = await bcrypt.hash(`${TEMP_PASSWORD_PREFIX}admin123`, 1);

  return prisma.user.create({
    data: {
      fullName: overrides?.fullName ?? "Super Admin",
      email: overrides?.email ?? "admin@uniconnect.com",
      phone: "03001234567",
      passwordHash,
      gender: "MALE",
      userType: "ADMIN",
      departmentId: null,
      status: "ACTIVE",
      isActive: true,
      isDeleted: false,
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
  const passwordHash = await bcrypt.hash(password, 1);
  const isActive = overrides.isActive ?? true;

  return prisma.user.create({
    data: {
      fullName: overrides.fullName ?? "Test User",
      email: overrides.email ?? `testuser-${uniqueSuffix()}@test.com`,
      phone: "03001234567",
      passwordHash,
      gender: "MALE",
      userType: overrides.userType ?? "STUDENT",
      departmentId: overrides.departmentId ?? null,
      status: isActive ? "ACTIVE" : "SUSPENDED",
      isActive,
      isDeleted: false,
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
      isDeleted: false,
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
  const designation = overrides?.designation ?? "Lecturer";
  await ensureDesignation(designation);

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
      designation,
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
    rollNumber?: string;
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
      rollNumber: overrides?.rollNumber ?? uniqueRollNumber(),
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
      isDeleted: false,
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
      status: "ACTIVE",
      isDeleted: false,
      isActive: true,
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

export async function createPlatformRoleAssignment(input: {
  userId: number;
  role: "server_moderator" | "channel_moderator";
  serverId: number;
  channelId?: number | null;
  assignedBy?: number;
  assignedAt?: Date;
  expiresAt?: Date | null;
}) {
  const scopeType = input.role === "server_moderator" ? "SERVER" as const : "CHANNEL" as const;
  const role = await prisma.role.upsert({
    where: { name: input.role },
    update: { scopeType },
    create: { name: input.role, scopeType },
  });
  return prisma.userRoleAssignment.create({
    data: {
      userId: input.userId,
      roleId: role.id,
      scopeType,
      serverId: input.serverId,
      channelId: input.channelId ?? null,
      assignedBy: input.assignedBy ?? null,
      assignedAt: input.assignedAt,
      expiresAt: input.expiresAt ?? null,
    },
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
    notificationType?: "NEW_POST" | "ROLE_ASSIGNED";
    scopeType?: "SERVER" | "CHANNEL";
    channelId?: number;
    isSubscribed?: boolean;
  }
) {
  return prisma.notificationPreference.create({
    data: {
      userId,
      notificationType: overrides?.notificationType ?? "NEW_POST",
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
