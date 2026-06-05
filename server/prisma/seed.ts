import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { TEMP_PASSWORD_PREFIX } from "../src/shared/constants.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "Demo@1234";
const ADMIN_PASSWORD = `${TEMP_PASSWORD_PREFIX}Admin@123`;

const ROLES = [
  { name: "server_moderator", scopeType: "SERVER" },
  { name: "channel_moderator", scopeType: "CHANNEL" },
] as const;

const PERMISSIONS = [
  "post:channel",
  "create:channel",
  "delete:channel",
  "lock:channel",
  "create:society",
  "create:department",
  "create:class",
  "assign:hod",
  "assign:program_director",
  "assign:cr",
  "assign:society_president",
  "assign:society_convenor",
  "assign:server_moderator",
  "assign:channel_moderator",
] as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  server_moderator: ["post:channel"],
  channel_moderator: ["post:channel"],
};

const DEGREE_LEVELS = ["Bachelors", "Masters", "PHD"] as const;

const DESIGNATIONS = [
  { value: "Professor", label: "Professor" },
  { value: "Associate Professor", label: "Associate Professor" },
  { value: "Assistant Professor", label: "Assistant Professor" },
  { value: "Lecturer", label: "Lecturer" },
] as const;

interface SeedUserInput {
  email: string;
  fullName: string;
  phone: string;
  gender: "MALE" | "FEMALE";
  userType: "ADMIN" | "TEACHER" | "STUDENT";
  password: string;
  departmentId?: number | null;
  mustChangePassword?: boolean;
}

async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

async function seedRolesAndPermissions() {
  for (const level of DEGREE_LEVELS) {
    await prisma.degreeLevel.upsert({
      where: { level },
      update: {},
      create: { level },
    });
  }

  await prisma.designation.createMany({
    data: DESIGNATIONS,
    skipDuplicates: true,
  });

  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { scopeType: role.scopeType },
      create: role,
    });
  }

  for (const permissionName of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: permissionName },
      update: {},
      create: { name: permissionName },
    });
  }

  for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) continue;

    for (const permissionName of permissionNames) {
      const permission = await prisma.permission.findUnique({
        where: { name: permissionName },
      });
      if (!permission) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }
}

async function upsertUser(input: SeedUserInput) {
  const passwordHash = await hashPassword(input.password);
  const userData = {
    fullName: input.fullName,
    phone: input.phone,
    gender: input.gender,
    userType: input.userType,
    departmentId: input.departmentId ?? null,
    passwordHash,
    status: "ACTIVE" as const,
    isDeleted: false,
    mustChangePassword: input.mustChangePassword ?? false,
  };

  const existing = await prisma.user.findFirst({
    where: { email: input.email, isDeleted: false },
    select: { id: true },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: userData,
    });
  }

  return prisma.user.create({
    data: {
      ...userData,
      email: input.email,
    },
  });
}

async function ensureTeacherInfo(teacherId: number, designation: string) {
  await prisma.designation.upsert({
    where: { value: designation },
    update: { label: designation },
    create: { value: designation, label: designation },
  });

  await prisma.teacherInfo.upsert({
    where: { teacherId },
    update: { designation },
    create: { teacherId, designation },
  });
}

async function ensureStudentInfo(studentId: number, classId: number, rollNumber: string) {
  await prisma.studentInfo.upsert({
    where: { studentId },
    update: { classId, rollNumber },
    create: { studentId, classId, rollNumber },
  });
}

async function ensureServer(
  name: string,
  type: "DEPARTMENT" | "CLASS" | "SOCIETY",
  createdBy: number,
  description: string,
) {
  const existing = await prisma.server.findFirst({
    where: { name, type, isDeleted: false },
  });

  if (existing) {
    return prisma.server.update({
      where: { id: existing.id },
      data: {
        description,
        createdBy,
        isDeleted: false,
      },
    });
  }

  return prisma.server.create({
    data: {
      name,
      type,
      description,
      createdBy,
      isDeleted: false,
    },
  });
}

async function ensureChannel(input: {
  serverId: number;
  name: string;
  type: "ANNOUNCEMENT" | "GENERAL" | "PROGRAM" | "COURSE";
  createdBy: number;
  description: string;
  isAutoCreated?: boolean;
  programId?: number | null;
  courseId?: number | null;
}) {
  const existing = await prisma.channel.findFirst({
    where: { serverId: input.serverId, name: input.name, isDeleted: false },
  });

  const data = {
    description: input.description,
    type: input.type,
    createdBy: input.createdBy,
    isAutoCreated: input.isAutoCreated ?? false,
    isDeleted: false,
    isArchived: false,
    programId: input.programId ?? null,
    courseId: input.courseId ?? null,
  };

  if (existing) {
    return prisma.channel.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.channel.create({
    data: {
      serverId: input.serverId,
      name: input.name,
      ...data,
    },
  });
}

async function ensurePost(input: {
  channelId: number;
  authorId: number;
  title: string;
  content: string;
  priority?: "NORMAL" | "IMPORTANT" | "URGENT";
}) {
  const existing = await prisma.post.findFirst({
    where: {
      channelId: input.channelId,
      title: input.title,
      authorId: input.authorId,
    },
  });

  if (existing) {
    return prisma.post.update({
      where: { id: existing.id },
      data: {
        content: input.content,
        priority: input.priority ?? "NORMAL",
        isDeleted: false,
      },
    });
  }

  return prisma.post.create({
    data: {
      channelId: input.channelId,
      authorId: input.authorId,
      title: input.title,
      content: input.content,
      priority: input.priority ?? "NORMAL",
    },
  });
}

async function ensureModeratorAssignment(input: {
  userId: number;
  serverId: number;
  assignedBy: number;
  scopeType: "SERVER" | "CHANNEL";
  channelId?: number | null;
}) {
  const roleName = input.scopeType === "SERVER" ? "server_moderator" : "channel_moderator";
  const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
  const existing = await prisma.userRoleAssignment.findFirst({
    where: {
      userId: input.userId,
      roleId: role.id,
      serverId: input.serverId,
      channelId: input.channelId ?? null,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  if (existing) {
    return prisma.userRoleAssignment.update({
      where: { id: existing.id },
      data: {
        assignedBy: input.assignedBy,
        scopeType: input.scopeType,
        channelId: input.channelId ?? null,
      },
    });
  }

  return prisma.userRoleAssignment.create({
    data: {
      userId: input.userId,
      roleId: role.id,
      serverId: input.serverId,
      assignedBy: input.assignedBy,
      scopeType: input.scopeType,
      channelId: input.channelId ?? null,
    },
  });
}

async function seedDemoWorkspace() {
  const admin = await upsertUser({
    email: "admin@uniconnect.com",
    fullName: "Super Admin",
    phone: "03000000000",
    gender: "MALE",
    userType: "ADMIN",
    password: ADMIN_PASSWORD,
    mustChangePassword: true,
  });

  const hod = await upsertUser({
    email: "hod.demo@uniconnect.com",
    fullName: "Dr. Fatima Noor",
    phone: "03010000001",
    gender: "FEMALE",
    userType: "TEACHER",
    password: DEMO_PASSWORD,
  });
  const programDirector = await upsertUser({
    email: "pd.demo@uniconnect.com",
    fullName: "Dr. Bilal Ahmed",
    phone: "03010000002",
    gender: "MALE",
    userType: "TEACHER",
    password: DEMO_PASSWORD,
  });
  const lecturer = await upsertUser({
    email: "lecturer.demo@uniconnect.com",
    fullName: "Ms. Ayesha Khan",
    phone: "03010000003",
    gender: "FEMALE",
    userType: "TEACHER",
    password: DEMO_PASSWORD,
  });
  const convenor = await upsertUser({
    email: "convenor.demo@uniconnect.com",
    fullName: "Mr. Hamza Tariq",
    phone: "03010000004",
    gender: "MALE",
    userType: "TEACHER",
    password: DEMO_PASSWORD,
  });
  const serverModerator = await upsertUser({
    email: "server.mod.demo@uniconnect.com",
    fullName: "Mr. Kamran Ali",
    phone: "03010000005",
    gender: "MALE",
    userType: "TEACHER",
    password: DEMO_PASSWORD,
  });

  await Promise.all([
    ensureTeacherInfo(hod.id, "Professor"),
    ensureTeacherInfo(programDirector.id, "Associate Professor"),
    ensureTeacherInfo(lecturer.id, "Lecturer"),
    ensureTeacherInfo(convenor.id, "Assistant Professor"),
    ensureTeacherInfo(serverModerator.id, "Lecturer"),
  ]);

  const departmentServer = await ensureServer(
    "Computer Science Hub",
    "DEPARTMENT",
    admin.id,
    "Department-wide communication, policies, and official academic announcements.",
  );

  const department = await prisma.department.upsert({
    where: { code: "CS-DEMO" },
    update: {
      name: "Computer Science",
      serverId: departmentServer.id,
      hodId: hod.id,
    },
    create: {
      name: "Computer Science",
      code: "CS-DEMO",
      serverId: departmentServer.id,
      hodId: hod.id,
    },
  });

  await prisma.user.updateMany({
    where: {
      id: {
        in: [hod.id, programDirector.id, lecturer.id, convenor.id, serverModerator.id],
      },
    },
    data: {
      departmentId: department.id,
    },
  });

  const discipline = await prisma.discipline.upsert({
    where: { name: "Computer Science" },
    update: {},
    create: { name: "Computer Science" },
  });
  const bachelors = await prisma.degreeLevel.findUnique({
    where: { level: "Bachelors" },
  });

  const program = await prisma.program.upsert({
    where: { code: "BSCS-DEMO" },
    update: {
      departmentId: department.id,
      disciplineId: discipline.id,
      degreeLevelId: bachelors!.id,
      semesters: 8,
      programDirectorId: programDirector.id,
    },
    create: {
      departmentId: department.id,
      disciplineId: discipline.id,
      degreeLevelId: bachelors!.id,
      semesters: 8,
      code: "BSCS-DEMO",
      programDirectorId: programDirector.id,
    },
  });

  const classServer = await ensureServer(
    "BSCS 6-A Hub",
    "CLASS",
    hod.id,
    "Semester-specific updates, discussions, and course communication for BSCS 6-A.",
  );

  let classRecord = await prisma.class.findFirst({
    where: {
      programId: program.id,
      currentSemester: 6,
      admissionYear: 2023,
      section: "A",
    },
  });

  if (!classRecord) {
    classRecord = await prisma.class.create({
      data: {
        programId: program.id,
        currentSemester: 6,
        academicYear: 2026,
        admissionYear: 2023,
        section: "A",
        serverId: classServer.id,
      },
    });
  } else if (classRecord.serverId !== classServer.id) {
    classRecord = await prisma.class.update({
      where: { id: classRecord.id },
      data: { serverId: classServer.id },
    });
  }

  const cr = await upsertUser({
    email: "cr.demo@uniconnect.com",
    fullName: "Ali Raza",
    phone: "03020000001",
    gender: "MALE",
    userType: "STUDENT",
    password: DEMO_PASSWORD,
    departmentId: department.id,
  });
  const president = await upsertUser({
    email: "president.demo@uniconnect.com",
    fullName: "Sara Ahmed",
    phone: "03020000002",
    gender: "FEMALE",
    userType: "STUDENT",
    password: DEMO_PASSWORD,
    departmentId: department.id,
  });
  const student = await upsertUser({
    email: "student.demo@uniconnect.com",
    fullName: "Usman Khalid",
    phone: "03020000003",
    gender: "MALE",
    userType: "STUDENT",
    password: DEMO_PASSWORD,
    departmentId: department.id,
  });
  const channelModerator = await upsertUser({
    email: "channel.mod.demo@uniconnect.com",
    fullName: "Hina Aslam",
    phone: "03020000004",
    gender: "FEMALE",
    userType: "STUDENT",
    password: DEMO_PASSWORD,
    departmentId: department.id,
  });

  await Promise.all([
    ensureStudentInfo(cr.id, classRecord.id, "23-NTU-CS-0001"),
    ensureStudentInfo(president.id, classRecord.id, "23-NTU-CS-0002"),
    ensureStudentInfo(student.id, classRecord.id, "23-NTU-CS-0003"),
    ensureStudentInfo(channelModerator.id, classRecord.id, "23-NTU-CS-0004"),
  ]);

  classRecord = await prisma.class.update({
    where: { id: classRecord.id },
    data: { crId: cr.id },
  });

  const societyServer = await ensureServer(
    "IEEE Student Society",
    "SOCIETY",
    hod.id,
    "Community updates, event planning, and member announcements for IEEE student activities.",
  );

  const societyData = {
    description: "Technical society for workshops, events, and student-led initiatives.",
    departmentId: department.id,
    presidentId: president.id,
    convenorId: convenor.id,
    serverId: societyServer.id,
    status: "ACTIVE" as const,
    isDeleted: false,
  };

  const existingSociety = await prisma.society.findFirst({
    where: { name: "IEEE Student Society", isDeleted: false },
    select: { id: true },
  });

  const society = existingSociety
    ? await prisma.society.update({
        where: { id: existingSociety.id },
        data: societyData,
      })
    : await prisma.society.create({
        data: {
          ...societyData,
          name: "IEEE Student Society",
        },
      });

  const course = await prisma.course.upsert({
    where: { code: "CS301-DEMO" },
    update: {
      title: "Database Systems",
      creditHours: 3,
      departmentId: department.id,
    },
    create: {
      title: "Database Systems",
      code: "CS301-DEMO",
      creditHours: 3,
      departmentId: department.id,
    },
  });

  await prisma.teaches.upsert({
    where: {
      teacherId_courseId_classId: {
        teacherId: lecturer.id,
        courseId: course.id,
        classId: classRecord.id,
      },
    },
    update: {},
    create: {
      teacherId: lecturer.id,
      courseId: course.id,
      classId: classRecord.id,
    },
  });

  await prisma.serverMembership.createMany({
    data: [
      { userId: hod.id, serverId: departmentServer.id, isAutoJoined: true },
      { userId: programDirector.id, serverId: departmentServer.id, isAutoJoined: true },
      { userId: lecturer.id, serverId: departmentServer.id, isAutoJoined: true },
      { userId: convenor.id, serverId: departmentServer.id, isAutoJoined: true },
      { userId: serverModerator.id, serverId: departmentServer.id, isAutoJoined: true },
      { userId: cr.id, serverId: departmentServer.id, isAutoJoined: true },
      { userId: president.id, serverId: departmentServer.id, isAutoJoined: true },
      { userId: student.id, serverId: departmentServer.id, isAutoJoined: true },
      { userId: channelModerator.id, serverId: departmentServer.id, isAutoJoined: true },
      { userId: cr.id, serverId: classServer.id, isAutoJoined: true },
      { userId: president.id, serverId: classServer.id, isAutoJoined: true },
      { userId: student.id, serverId: classServer.id, isAutoJoined: true },
      { userId: channelModerator.id, serverId: classServer.id, isAutoJoined: true },
      { userId: convenor.id, serverId: societyServer.id, isAutoJoined: true },
      { userId: president.id, serverId: societyServer.id, isAutoJoined: true },
      { userId: student.id, serverId: societyServer.id, isAutoJoined: false },
      { userId: channelModerator.id, serverId: societyServer.id, isAutoJoined: false },
    ],
    skipDuplicates: true,
  });

  const departmentAnnouncements = await ensureChannel({
    serverId: departmentServer.id,
    name: "announcements",
    type: "ANNOUNCEMENT",
    createdBy: hod.id,
    description: "Official department announcements for all faculty and students.",
    isAutoCreated: true,
  });
  const departmentGeneral = await ensureChannel({
    serverId: departmentServer.id,
    name: "general",
    type: "GENERAL",
    createdBy: hod.id,
    description: "General department-wide discussion and quick updates.",
    isAutoCreated: true,
  });
  const programChannel = await ensureChannel({
    serverId: departmentServer.id,
    name: "bscs-updates",
    type: "PROGRAM",
    createdBy: programDirector.id,
    description: "Program-specific updates for BSCS students and faculty.",
    isAutoCreated: true,
    programId: program.id,
  });

  const classAnnouncements = await ensureChannel({
    serverId: classServer.id,
    name: "announcements",
    type: "ANNOUNCEMENT",
    createdBy: cr.id,
    description: "Official class-level announcements for BSCS 6-A.",
    isAutoCreated: true,
  });
  const classGeneral = await ensureChannel({
    serverId: classServer.id,
    name: "general",
    type: "GENERAL",
    createdBy: cr.id,
    description: "Class discussion and routine coordination for BSCS 6-A.",
    isAutoCreated: true,
  });
  const courseChannel = await ensureChannel({
    serverId: classServer.id,
    name: "cs-301-database-systems",
    type: "COURSE",
    createdBy: lecturer.id,
    description: "Course-specific updates and resources for Database Systems.",
    isAutoCreated: true,
    courseId: course.id,
  });

  const societyAnnouncements = await ensureChannel({
    serverId: societyServer.id,
    name: "announcements",
    type: "ANNOUNCEMENT",
    createdBy: convenor.id,
    description: "Official IEEE announcements and event notices.",
    isAutoCreated: true,
  });
  const societyGeneral = await ensureChannel({
    serverId: societyServer.id,
    name: "general",
    type: "GENERAL",
    createdBy: president.id,
    description: "General society discussion and volunteer coordination.",
    isAutoCreated: true,
  });

  await ensureModeratorAssignment({
    userId: serverModerator.id,
    serverId: departmentServer.id,
    scopeType: "SERVER",
    assignedBy: hod.id,
  });
  await ensureModeratorAssignment({
    userId: channelModerator.id,
    serverId: departmentServer.id,
    channelId: departmentGeneral.id,
    scopeType: "CHANNEL",
    assignedBy: hod.id,
  });

  await Promise.all([
    ensurePost({
      channelId: departmentAnnouncements.id,
      authorId: hod.id,
      title: "Midterm timetable released",
      content: "The midterm timetable has been finalized. Please check the updated examination schedule by this evening.",
      priority: "IMPORTANT",
    }),
    ensurePost({
      channelId: programChannel.id,
      authorId: programDirector.id,
      title: "BSCS roadmap for semester 6",
      content: "This week we are sharing the academic roadmap, advisory slots, and internship guidance for BSCS semester 6.",
    }),
    ensurePost({
      channelId: classAnnouncements.id,
      authorId: cr.id,
      title: "Class representative update",
      content: "Attendance sheets and lab grouping updates will be posted here before the next class meeting.",
    }),
    ensurePost({
      channelId: courseChannel.id,
      authorId: lecturer.id,
      title: "Database Systems lab plan",
      content: "Lab submissions open on Monday. Please review the normalization exercises before coming to the session.",
    }),
    ensurePost({
      channelId: societyAnnouncements.id,
      authorId: convenor.id,
      title: "IEEE workshop registration open",
      content: "Registrations are now open for the upcoming IEEE technical workshop. The first 50 students will receive priority seats.",
      priority: "IMPORTANT",
    }),
    ensurePost({
      channelId: societyGeneral.id,
      authorId: president.id,
      title: "Volunteer call for event logistics",
      content: "We need volunteers for stage, registration, and social media coverage. Reply in this channel if you want to help.",
    }),
  ]);

  console.warn("[SEED] Demo workspace seeded");
  console.warn("[SEED] Admin: admin@uniconnect.com /", ADMIN_PASSWORD);
  console.warn("[SEED] HOD: hod.demo@uniconnect.com /", DEMO_PASSWORD);
  console.warn("[SEED] Program Director: pd.demo@uniconnect.com /", DEMO_PASSWORD);
  console.warn("[SEED] Lecturer: lecturer.demo@uniconnect.com /", DEMO_PASSWORD);
  console.warn("[SEED] Convenor: convenor.demo@uniconnect.com /", DEMO_PASSWORD);
  console.warn("[SEED] CR: cr.demo@uniconnect.com /", DEMO_PASSWORD);
  console.warn("[SEED] President: president.demo@uniconnect.com /", DEMO_PASSWORD);
  console.warn("[SEED] Student: student.demo@uniconnect.com /", DEMO_PASSWORD);
  console.warn("[SEED] Server Moderator: server.mod.demo@uniconnect.com /", DEMO_PASSWORD);
  console.warn("[SEED] Channel Moderator: channel.mod.demo@uniconnect.com /", DEMO_PASSWORD);

  return {
    admin,
    hod,
    programDirector,
    lecturer,
    convenor,
    serverModerator,
    cr,
    president,
    student,
    channelModerator,
    departmentServer,
    classServer,
    societyServer,
    departmentAnnouncements,
    departmentGeneral,
    courseChannel,
    societyAnnouncements,
  };
}

async function seed() {
  console.warn("[SEED] Seeding database...");

  await seedRolesAndPermissions();
  console.warn("[SEED] Roles and permissions seeded");

  await seedDemoWorkspace();

  console.warn("[SEED] Seeding complete");
}

seed()
  .catch((error) => {
    console.error("[SEED] Seed failed", { error });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
