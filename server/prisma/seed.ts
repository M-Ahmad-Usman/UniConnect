import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
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

type DegreePlan = ReadonlyArray<
  ReadonlyArray<{
    readonly code: string;
    readonly title: string;
    readonly creditHours: number;
  }>
>;

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

async function ensureCourse(input: {
  departmentId: number;
  code: string;
  title: string;
  creditHours: number;
}) {
  return prisma.course.upsert({
    where: { code: input.code },
    update: {
      title: input.title,
      creditHours: input.creditHours,
      departmentId: input.departmentId,
    },
    create: input,
  });
}

async function ensureCurriculum(input: {
  programId: number;
  courseId: number;
  semesterNumber: number;
  batchYear: number;
}) {
  return prisma.programCurriculum.upsert({
    where: {
      programId_courseId_batchYear: {
        programId: input.programId,
        courseId: input.courseId,
        batchYear: input.batchYear,
      },
    },
    update: { semesterNumber: input.semesterNumber },
    create: input,
  });
}

async function ensureClass(input: {
  programId: number;
  currentSemester: number;
  academicYear: number;
  admissionYear: number;
  section: "A" | "B";
  serverId: number;
}) {
  const existing = await prisma.class.findFirst({
    where: {
      programId: input.programId,
      currentSemester: input.currentSemester,
      admissionYear: input.admissionYear,
      section: input.section,
    },
  });

  if (existing) {
    return prisma.class.update({
      where: { id: existing.id },
      data: {
        academicYear: input.academicYear,
        serverId: input.serverId,
        status: "ACTIVE",
        graduatedAt: null,
        graduatedBy: null,
      },
    });
  }

  return prisma.class.create({ data: input });
}

async function ensureTeachingAssignment(input: {
  teacherId: number;
  courseId: number;
  classId: number;
}) {
  const existingForClassCourse = await prisma.teaches.findUnique({
    where: {
      classId_courseId: {
        classId: input.classId,
        courseId: input.courseId,
      },
    },
    select: { teacherId: true },
  });

  if (existingForClassCourse && existingForClassCourse.teacherId !== input.teacherId) {
    await prisma.teaches.delete({
      where: {
        teacherId_courseId_classId: {
          teacherId: existingForClassCourse.teacherId,
          courseId: input.courseId,
          classId: input.classId,
        },
      },
    });
  }

  return prisma.teaches.upsert({
    where: {
      teacherId_courseId_classId: {
        teacherId: input.teacherId,
        courseId: input.courseId,
        classId: input.classId,
      },
    },
    update: {},
    create: input,
  });
}

async function ensureSocietyMembershipRequest(input: {
  societyId: number;
  userId: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy?: number | null;
}) {
  return prisma.societyMembershipRequest.upsert({
    where: {
      societyId_userId: {
        societyId: input.societyId,
        userId: input.userId,
      },
    },
    update: {
      status: input.status,
      reviewedBy: input.reviewedBy ?? null,
      reviewedAt: input.reviewedBy ? new Date() : null,
    },
    create: {
      societyId: input.societyId,
      userId: input.userId,
      status: input.status,
      reviewedBy: input.reviewedBy ?? null,
      reviewedAt: input.reviewedBy ? new Date() : null,
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

  const teachers = {
    hod: await upsertUser({
      email: "hod.demo@uniconnect.com",
      fullName: "Dr. Fatima Noor",
      phone: "03010000001",
      gender: "FEMALE",
      userType: "TEACHER",
      password: DEMO_PASSWORD,
    }),
    bscsDirector: await upsertUser({
      email: "pd.demo@uniconnect.com",
      fullName: "Dr. Bilal Ahmed",
      phone: "03010000002",
      gender: "MALE",
      userType: "TEACHER",
      password: DEMO_PASSWORD,
    }),
    bsseDirector: await upsertUser({
      email: "pd.se.demo@uniconnect.com",
      fullName: "Dr. Sana Iqbal",
      phone: "03010000006",
      gender: "FEMALE",
      userType: "TEACHER",
      password: DEMO_PASSWORD,
    }),
    databaseLecturer: await upsertUser({
      email: "lecturer.demo@uniconnect.com",
      fullName: "Ms. Ayesha Khan",
      phone: "03010000003",
      gender: "FEMALE",
      userType: "TEACHER",
      password: DEMO_PASSWORD,
    }),
    webLecturer: await upsertUser({
      email: "web.lecturer.demo@uniconnect.com",
      fullName: "Mr. Omar Farooq",
      phone: "03010000007",
      gender: "MALE",
      userType: "TEACHER",
      password: DEMO_PASSWORD,
    }),
    systemsLecturer: await upsertUser({
      email: "systems.lecturer.demo@uniconnect.com",
      fullName: "Dr. Nadia Hassan",
      phone: "03010000008",
      gender: "FEMALE",
      userType: "TEACHER",
      password: DEMO_PASSWORD,
    }),
    seLecturer: await upsertUser({
      email: "se.lecturer.demo@uniconnect.com",
      fullName: "Mr. Sameer Malik",
      phone: "03010000009",
      gender: "MALE",
      userType: "TEACHER",
      password: DEMO_PASSWORD,
    }),
    convenor: await upsertUser({
      email: "convenor.demo@uniconnect.com",
      fullName: "Mr. Hamza Tariq",
      phone: "03010000004",
      gender: "MALE",
      userType: "TEACHER",
      password: DEMO_PASSWORD,
    }),
    serverModerator: await upsertUser({
      email: "server.mod.demo@uniconnect.com",
      fullName: "Mr. Kamran Ali",
      phone: "03010000005",
      gender: "MALE",
      userType: "TEACHER",
      password: DEMO_PASSWORD,
    }),
  };

  await Promise.all([
    ensureTeacherInfo(teachers.hod.id, "Professor"),
    ensureTeacherInfo(teachers.bscsDirector.id, "Associate Professor"),
    ensureTeacherInfo(teachers.bsseDirector.id, "Associate Professor"),
    ensureTeacherInfo(teachers.databaseLecturer.id, "Lecturer"),
    ensureTeacherInfo(teachers.webLecturer.id, "Lecturer"),
    ensureTeacherInfo(teachers.systemsLecturer.id, "Assistant Professor"),
    ensureTeacherInfo(teachers.seLecturer.id, "Lecturer"),
    ensureTeacherInfo(teachers.convenor.id, "Assistant Professor"),
    ensureTeacherInfo(teachers.serverModerator.id, "Lecturer"),
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
      hodId: teachers.hod.id,
    },
    create: {
      name: "Computer Science",
      code: "CS-DEMO",
      serverId: departmentServer.id,
      hodId: teachers.hod.id,
    },
  });

  await prisma.user.updateMany({
    where: {
      id: {
        in: Object.values(teachers).map((teacher) => teacher.id),
      },
    },
    data: {
      departmentId: department.id,
    },
  });

  const computerScience = await prisma.discipline.upsert({
    where: { name: "Computer Science" },
    update: {},
    create: { name: "Computer Science" },
  });
  const softwareEngineering = await prisma.discipline.upsert({
    where: { name: "Software Engineering" },
    update: {},
    create: { name: "Software Engineering" },
  });
  const bachelors = await prisma.degreeLevel.findUniqueOrThrow({
    where: { level: "Bachelors" },
  });

  const bscsProgram = await prisma.program.upsert({
    where: { code: "BSCS-DEMO" },
    update: {
      departmentId: department.id,
      disciplineId: computerScience.id,
      degreeLevelId: bachelors.id,
      semesters: 8,
      programDirectorId: teachers.bscsDirector.id,
    },
    create: {
      departmentId: department.id,
      disciplineId: computerScience.id,
      degreeLevelId: bachelors.id,
      semesters: 8,
      code: "BSCS-DEMO",
      programDirectorId: teachers.bscsDirector.id,
    },
  });

  const bsseProgram = await prisma.program.upsert({
    where: { code: "BSSE-DEMO" },
    update: {
      departmentId: department.id,
      disciplineId: softwareEngineering.id,
      degreeLevelId: bachelors.id,
      semesters: 8,
      programDirectorId: teachers.bsseDirector.id,
    },
    create: {
      departmentId: department.id,
      disciplineId: softwareEngineering.id,
      degreeLevelId: bachelors.id,
      semesters: 8,
      code: "BSSE-DEMO",
      programDirectorId: teachers.bsseDirector.id,
    },
  });

  const bscsDegreePlan = [
    [
      { code: "CS101-DEMO", title: "Programming Fundamentals", creditHours: 3 },
      { code: "MTH101-DEMO", title: "Applied Calculus", creditHours: 3 },
    ],
    [
      { code: "CS102-DEMO", title: "Object Oriented Programming", creditHours: 3 },
      { code: "CS103-DEMO", title: "Discrete Structures", creditHours: 3 },
    ],
    [
      { code: "CS201-DEMO", title: "Data Structures", creditHours: 3 },
      { code: "CS202-DEMO", title: "Digital Logic", creditHours: 3 },
    ],
    [
      { code: "CS203-DEMO", title: "Algorithms", creditHours: 3 },
      { code: "CS204-DEMO", title: "Computer Networks", creditHours: 3 },
    ],
    [
      { code: "CS301-DEMO", title: "Operating Systems", creditHours: 3 },
      { code: "SE301-DEMO", title: "Software Engineering", creditHours: 3 },
    ],
    [
      { code: "CS302-DEMO", title: "Database Systems", creditHours: 3 },
      { code: "CS303-DEMO", title: "Web Engineering", creditHours: 3 },
    ],
    [
      { code: "CS401-DEMO", title: "Artificial Intelligence", creditHours: 3 },
      { code: "CS402-DEMO", title: "Information Security", creditHours: 3 },
    ],
    [
      { code: "CS499-DEMO", title: "Final Year Project", creditHours: 6 },
      { code: "CS403-DEMO", title: "Cloud Computing", creditHours: 3 },
    ],
  ] as const;

  const bsseDegreePlan = [
    [
      { code: "SE101-DEMO", title: "Software Fundamentals", creditHours: 3 },
      { code: "MTH111-DEMO", title: "Linear Algebra", creditHours: 3 },
    ],
    [
      { code: "SE102-DEMO", title: "Requirements Engineering", creditHours: 3 },
      { code: "CS102-DEMO", title: "Object Oriented Programming", creditHours: 3 },
    ],
    [
      { code: "SE201-DEMO", title: "Software Design", creditHours: 3 },
      { code: "CS201-DEMO", title: "Data Structures", creditHours: 3 },
    ],
    [
      { code: "SE202-DEMO", title: "Software Architecture", creditHours: 3 },
      { code: "CS204-DEMO", title: "Computer Networks", creditHours: 3 },
    ],
    [
      { code: "SE301-DEMO", title: "Software Engineering", creditHours: 3 },
      { code: "SE302-DEMO", title: "Software Quality", creditHours: 3 },
    ],
    [
      { code: "CS302-DEMO", title: "Database Systems", creditHours: 3 },
      { code: "SE303-DEMO", title: "DevOps Practices", creditHours: 3 },
    ],
    [
      { code: "SE401-DEMO", title: "Project Management", creditHours: 3 },
      { code: "CS402-DEMO", title: "Information Security", creditHours: 3 },
    ],
    [
      { code: "SE499-DEMO", title: "Capstone Project", creditHours: 6 },
      { code: "CS403-DEMO", title: "Cloud Computing", creditHours: 3 },
    ],
  ] as const;

  async function seedCurriculum(
    programId: number,
    degreePlan: DegreePlan,
    batchYears: number[],
  ) {
    const coursesByCode = new Map<string, Awaited<ReturnType<typeof ensureCourse>>>();
    for (const semester of degreePlan) {
      for (const courseSeed of semester) {
        if (!coursesByCode.has(courseSeed.code)) {
          coursesByCode.set(
            courseSeed.code,
            await ensureCourse({ ...courseSeed, departmentId: department.id }),
          );
        }
      }
    }

    for (const batchYear of batchYears) {
      for (const [semesterIndex, semester] of degreePlan.entries()) {
        for (const courseSeed of semester) {
          const course = coursesByCode.get(courseSeed.code)!;
          await ensureCurriculum({
            programId,
            courseId: course.id,
            semesterNumber: semesterIndex + 1,
            batchYear,
          });
        }
      }
    }

    return coursesByCode;
  }

  await seedCurriculum(bscsProgram.id, bscsDegreePlan, [
    2023,
    2024,
    2025,
    2026,
  ]);
  await seedCurriculum(bsseProgram.id, bsseDegreePlan, [2025, 2026]);

  const classServer = await ensureServer(
    "BSCS 6-A Hub",
    "CLASS",
    teachers.hod.id,
    "Semester-specific updates, discussions, and course communication for BSCS 6-A.",
  );
  const juniorClassServer = await ensureServer(
    "BSCS 1-B Hub",
    "CLASS",
    teachers.hod.id,
    "Freshman onboarding, class coordination, and first-semester course updates.",
  );
  const seClassServer = await ensureServer(
    "BSSE 3-A Hub",
    "CLASS",
    teachers.hod.id,
    "Software Engineering cohort updates and current-semester course communication.",
  );

  let classRecord = await ensureClass({
    programId: bscsProgram.id,
    currentSemester: 6,
    academicYear: 2026,
    admissionYear: 2023,
    section: "A",
    serverId: classServer.id,
  });
  let juniorClass = await ensureClass({
    programId: bscsProgram.id,
    currentSemester: 1,
    academicYear: 2026,
    admissionYear: 2026,
    section: "B",
    serverId: juniorClassServer.id,
  });
  let seClass = await ensureClass({
    programId: bsseProgram.id,
    currentSemester: 3,
    academicYear: 2026,
    admissionYear: 2025,
    section: "A",
    serverId: seClassServer.id,
  });

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
  const juniorCr = await upsertUser({
    email: "cr.junior.demo@uniconnect.com",
    fullName: "Maham Javed",
    phone: "03020000005",
    gender: "FEMALE",
    userType: "STUDENT",
    password: DEMO_PASSWORD,
    departmentId: department.id,
  });
  const juniorStudent = await upsertUser({
    email: "student.junior.demo@uniconnect.com",
    fullName: "Zain Ul Abidin",
    phone: "03020000006",
    gender: "MALE",
    userType: "STUDENT",
    password: DEMO_PASSWORD,
    departmentId: department.id,
  });
  const juniorApplicant = await upsertUser({
    email: "society.pending.demo@uniconnect.com",
    fullName: "Nimra Shah",
    phone: "03020000007",
    gender: "FEMALE",
    userType: "STUDENT",
    password: DEMO_PASSWORD,
    departmentId: department.id,
  });
  const seCr = await upsertUser({
    email: "cr.se.demo@uniconnect.com",
    fullName: "Danish Iqbal",
    phone: "03020000008",
    gender: "MALE",
    userType: "STUDENT",
    password: DEMO_PASSWORD,
    departmentId: department.id,
  });
  const seStudent = await upsertUser({
    email: "student.se.demo@uniconnect.com",
    fullName: "Eman Zahra",
    phone: "03020000009",
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
    ensureStudentInfo(juniorCr.id, juniorClass.id, "26-NTU-CS-0001"),
    ensureStudentInfo(juniorStudent.id, juniorClass.id, "26-NTU-CS-0002"),
    ensureStudentInfo(juniorApplicant.id, juniorClass.id, "26-NTU-CS-0003"),
    ensureStudentInfo(seCr.id, seClass.id, "25-NTU-SE-0001"),
    ensureStudentInfo(seStudent.id, seClass.id, "25-NTU-SE-0002"),
  ]);

  classRecord = await prisma.class.update({
    where: { id: classRecord.id },
    data: { crId: cr.id },
  });
  juniorClass = await prisma.class.update({
    where: { id: juniorClass.id },
    data: { crId: juniorCr.id },
  });
  seClass = await prisma.class.update({
    where: { id: seClass.id },
    data: { crId: seCr.id },
  });

  const societyServer = await ensureServer(
    "IEEE Student Society",
    "SOCIETY",
    teachers.hod.id,
    "Community updates, event planning, and member announcements for IEEE student activities.",
  );

  const societyData = {
    description: "Technical society for workshops, events, and student-led initiatives.",
    departmentId: department.id,
    presidentId: president.id,
    convenorId: teachers.convenor.id,
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

  await prisma.serverMembership.createMany({
    data: [
      ...Object.values(teachers).map((teacher) => ({
        userId: teacher.id,
        serverId: departmentServer.id,
        isAutoJoined: true,
      })),
      { userId: cr.id, serverId: departmentServer.id, isAutoJoined: true },
      { userId: president.id, serverId: departmentServer.id, isAutoJoined: true },
      { userId: student.id, serverId: departmentServer.id, isAutoJoined: true },
      { userId: channelModerator.id, serverId: departmentServer.id, isAutoJoined: true },
      { userId: juniorCr.id, serverId: departmentServer.id, isAutoJoined: true },
      { userId: juniorStudent.id, serverId: departmentServer.id, isAutoJoined: true },
      { userId: juniorApplicant.id, serverId: departmentServer.id, isAutoJoined: true },
      { userId: seCr.id, serverId: departmentServer.id, isAutoJoined: true },
      { userId: seStudent.id, serverId: departmentServer.id, isAutoJoined: true },
      { userId: cr.id, serverId: classServer.id, isAutoJoined: true },
      { userId: president.id, serverId: classServer.id, isAutoJoined: true },
      { userId: student.id, serverId: classServer.id, isAutoJoined: true },
      { userId: channelModerator.id, serverId: classServer.id, isAutoJoined: true },
      { userId: teachers.databaseLecturer.id, serverId: classServer.id, isAutoJoined: true },
      { userId: teachers.webLecturer.id, serverId: classServer.id, isAutoJoined: true },
      { userId: juniorCr.id, serverId: juniorClassServer.id, isAutoJoined: true },
      { userId: juniorStudent.id, serverId: juniorClassServer.id, isAutoJoined: true },
      { userId: juniorApplicant.id, serverId: juniorClassServer.id, isAutoJoined: true },
      { userId: teachers.databaseLecturer.id, serverId: juniorClassServer.id, isAutoJoined: true },
      { userId: teachers.systemsLecturer.id, serverId: juniorClassServer.id, isAutoJoined: true },
      { userId: seCr.id, serverId: seClassServer.id, isAutoJoined: true },
      { userId: seStudent.id, serverId: seClassServer.id, isAutoJoined: true },
      { userId: teachers.seLecturer.id, serverId: seClassServer.id, isAutoJoined: true },
      { userId: teachers.databaseLecturer.id, serverId: seClassServer.id, isAutoJoined: true },
      { userId: teachers.convenor.id, serverId: societyServer.id, isAutoJoined: true },
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
    createdBy: teachers.hod.id,
    description: "Official department announcements for all faculty and students.",
    isAutoCreated: true,
  });
  const departmentGeneral = await ensureChannel({
    serverId: departmentServer.id,
    name: "general",
    type: "GENERAL",
    createdBy: teachers.hod.id,
    description: "General department-wide discussion and quick updates.",
    isAutoCreated: true,
  });
  const programChannel = await ensureChannel({
    serverId: departmentServer.id,
    name: "bscs-updates",
    type: "PROGRAM",
    createdBy: teachers.bscsDirector.id,
    description: "Program-specific updates for BSCS students and faculty.",
    isAutoCreated: true,
    programId: bscsProgram.id,
  });
  const seProgramChannel = await ensureChannel({
    serverId: departmentServer.id,
    name: "bsse-updates",
    type: "PROGRAM",
    createdBy: teachers.bsseDirector.id,
    description: "Program-specific updates for BSSE students and faculty.",
    isAutoCreated: true,
    programId: bsseProgram.id,
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
  const juniorClassAnnouncements = await ensureChannel({
    serverId: juniorClassServer.id,
    name: "announcements",
    type: "ANNOUNCEMENT",
    createdBy: juniorCr.id,
    description: "Official class-level announcements for BSCS 1-B.",
    isAutoCreated: true,
  });
  await ensureChannel({
    serverId: juniorClassServer.id,
    name: "general",
    type: "GENERAL",
    createdBy: juniorCr.id,
    description: "Freshman class discussion and routine coordination.",
    isAutoCreated: true,
  });
  const seClassAnnouncements = await ensureChannel({
    serverId: seClassServer.id,
    name: "announcements",
    type: "ANNOUNCEMENT",
    createdBy: seCr.id,
    description: "Official class-level announcements for BSSE 3-A.",
    isAutoCreated: true,
  });
  await ensureChannel({
    serverId: seClassServer.id,
    name: "general",
    type: "GENERAL",
    createdBy: seCr.id,
    description: "BSSE class discussion and sprint coordination.",
    isAutoCreated: true,
  });

  async function seedCurrentClassCourses(input: {
    classId: number;
    serverId: number;
    programId: number;
    semesterNumber: number;
    batchYear: number;
    assignments: Record<string, number>;
  }) {
    const currentCurriculum = await prisma.programCurriculum.findMany({
      where: {
        programId: input.programId,
        semesterNumber: input.semesterNumber,
        batchYear: input.batchYear,
      },
      select: {
        courseId: true,
        course: { select: { code: true, title: true } },
      },
      orderBy: { course: { code: "asc" } },
    });
    const currentCourseIds = currentCurriculum.map((entry) => entry.courseId);

    await prisma.channel.updateMany({
      where: {
        serverId: input.serverId,
        type: "COURSE",
        isAutoCreated: true,
        isDeleted: false,
        courseId: { notIn: currentCourseIds },
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: teachers.hod.id,
        isLocked: true,
        lockedBy: teachers.hod.id,
        lockedAt: new Date(),
      },
    });

    const channels: Record<string, Awaited<ReturnType<typeof ensureChannel>>> = {};
    for (const entry of currentCurriculum) {
      channels[entry.course.code] = await ensureChannel({
        serverId: input.serverId,
        name: entry.course.code.toLowerCase(),
        type: "COURSE",
        createdBy: input.assignments[entry.course.code] ?? teachers.hod.id,
        description: `Course-specific updates and resources for ${entry.course.title}.`,
        isAutoCreated: true,
        courseId: entry.courseId,
      });
      const teacherId = input.assignments[entry.course.code];
      if (teacherId) {
        await ensureTeachingAssignment({
          teacherId,
          courseId: entry.courseId,
          classId: input.classId,
        });
      }
    }

    return channels;
  }

  const bscsClassCourseChannels = await seedCurrentClassCourses({
    classId: classRecord.id,
    serverId: classServer.id,
    programId: bscsProgram.id,
    semesterNumber: classRecord.currentSemester,
    batchYear: classRecord.admissionYear,
    assignments: {
      "CS302-DEMO": teachers.databaseLecturer.id,
      "CS303-DEMO": teachers.webLecturer.id,
    },
  });
  const juniorCourseChannels = await seedCurrentClassCourses({
    classId: juniorClass.id,
    serverId: juniorClassServer.id,
    programId: bscsProgram.id,
    semesterNumber: juniorClass.currentSemester,
    batchYear: juniorClass.admissionYear,
    assignments: {
      "CS101-DEMO": teachers.databaseLecturer.id,
      "MTH101-DEMO": teachers.systemsLecturer.id,
    },
  });
  const seCourseChannels = await seedCurrentClassCourses({
    classId: seClass.id,
    serverId: seClassServer.id,
    programId: bsseProgram.id,
    semesterNumber: seClass.currentSemester,
    batchYear: seClass.admissionYear,
    assignments: {
      "CS201-DEMO": teachers.databaseLecturer.id,
      "SE201-DEMO": teachers.seLecturer.id,
    },
  });

  const societyAnnouncements = await ensureChannel({
    serverId: societyServer.id,
    name: "announcements",
    type: "ANNOUNCEMENT",
    createdBy: teachers.convenor.id,
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
    userId: teachers.serverModerator.id,
    serverId: departmentServer.id,
    scopeType: "SERVER",
    assignedBy: teachers.hod.id,
  });
  await ensureModeratorAssignment({
    userId: channelModerator.id,
    serverId: departmentServer.id,
    channelId: departmentGeneral.id,
    scopeType: "CHANNEL",
    assignedBy: teachers.hod.id,
  });

  await Promise.all([
    ensureSocietyMembershipRequest({
      societyId: society.id,
      userId: juniorApplicant.id,
      status: "PENDING",
    }),
    ensureSocietyMembershipRequest({
      societyId: society.id,
      userId: seStudent.id,
      status: "APPROVED",
      reviewedBy: president.id,
    }),
  ]);

  await Promise.all([
    ensurePost({
      channelId: departmentAnnouncements.id,
      authorId: teachers.hod.id,
      title: "Midterm timetable released",
      content: "The midterm timetable has been finalized. Please check the updated examination schedule by this evening.",
      priority: "IMPORTANT",
    }),
    ensurePost({
      channelId: programChannel.id,
      authorId: teachers.bscsDirector.id,
      title: "BSCS roadmap for semester 6",
      content: "This week we are sharing the academic roadmap, advisory slots, and internship guidance for BSCS semester 6.",
    }),
    ensurePost({
      channelId: seProgramChannel.id,
      authorId: teachers.bsseDirector.id,
      title: "BSSE design review calendar",
      content: "The design review calendar for BSSE project teams is now available. Teams should confirm mentor slots by Friday.",
      priority: "IMPORTANT",
    }),
    ensurePost({
      channelId: classAnnouncements.id,
      authorId: cr.id,
      title: "Class representative update",
      content: "Attendance sheets and lab grouping updates will be posted here before the next class meeting.",
    }),
    ensurePost({
      channelId: bscsClassCourseChannels["CS302-DEMO"].id,
      authorId: teachers.databaseLecturer.id,
      title: "Database Systems lab plan",
      content: "Lab submissions open on Monday. Please review the normalization exercises before coming to the session.",
    }),
    ensurePost({
      channelId: bscsClassCourseChannels["CS303-DEMO"].id,
      authorId: teachers.webLecturer.id,
      title: "Web Engineering sprint brief",
      content: "Sprint one starts this week. Bring a user-story draft and a wireframe for review in the next lab.",
    }),
    ensurePost({
      channelId: juniorClassAnnouncements.id,
      authorId: juniorCr.id,
      title: "Orientation checklist",
      content: "Please complete your profile, join your course channels, and review the first-week lab safety briefing.",
    }),
    ensurePost({
      channelId: juniorCourseChannels["CS101-DEMO"].id,
      authorId: teachers.databaseLecturer.id,
      title: "Programming lab setup",
      content: "Install the required compiler and IDE before the first programming lab. Setup help will be available after class.",
    }),
    ensurePost({
      channelId: seClassAnnouncements.id,
      authorId: seCr.id,
      title: "Design studio grouping",
      content: "Design studio teams have been drafted. Check your group and report any conflicts before tomorrow afternoon.",
    }),
    ensurePost({
      channelId: seCourseChannels["SE201-DEMO"].id,
      authorId: teachers.seLecturer.id,
      title: "Software Design case study",
      content: "Read the case study before the next session. We will compare class diagrams and boundary decisions in groups.",
    }),
    ensurePost({
      channelId: societyAnnouncements.id,
      authorId: teachers.convenor.id,
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
  console.warn("[SEED] BSSE Program Director: pd.se.demo@uniconnect.com /", DEMO_PASSWORD);
  console.warn("[SEED] Lecturer: lecturer.demo@uniconnect.com /", DEMO_PASSWORD);
  console.warn("[SEED] Convenor: convenor.demo@uniconnect.com /", DEMO_PASSWORD);
  console.warn("[SEED] CR: cr.demo@uniconnect.com /", DEMO_PASSWORD);
  console.warn("[SEED] Junior CR: cr.junior.demo@uniconnect.com /", DEMO_PASSWORD);
  console.warn("[SEED] BSSE CR: cr.se.demo@uniconnect.com /", DEMO_PASSWORD);
  console.warn("[SEED] President: president.demo@uniconnect.com /", DEMO_PASSWORD);
  console.warn("[SEED] Student: student.demo@uniconnect.com /", DEMO_PASSWORD);
  console.warn("[SEED] Server Moderator: server.mod.demo@uniconnect.com /", DEMO_PASSWORD);
  console.warn("[SEED] Channel Moderator: channel.mod.demo@uniconnect.com /", DEMO_PASSWORD);

  return {
    admin,
    ...teachers,
    cr,
    juniorCr,
    seCr,
    president,
    student,
    channelModerator,
    departmentServer,
    classServer,
    juniorClassServer,
    seClassServer,
    societyServer,
    departmentAnnouncements,
    departmentGeneral,
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
