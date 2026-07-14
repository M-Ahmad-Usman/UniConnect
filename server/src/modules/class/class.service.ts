import { prisma } from "../../config/prisma.js";
import {
  ApiErrorCode,
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors/index.js";
import { buildPaginationResponse, parsePagination } from "../../shared/utils/pagination.js";
import { buildClassPermissions, getPermissionContext } from "../../shared/permissions/index.js";
import { activePlatformRoleAssignmentWhere } from "../../shared/roles/index.js";
import { resolveUserPublicId } from "../../shared/ids/index.js";
import {
  lockClassForAcademicWrite,
  lockClassForEnrollmentWrite,
  lockProgramForEnrollmentWrite,
  lockProgramForHodOrAdmin,
  lockStudentProfileForTransfer,
} from "../../shared/lifecycle/academic.js";
import { assertFullCurriculumExists } from "../../shared/curriculum/policy.js";
import { getServerCommunicationImpact } from "../../shared/lifecycle/communication-impact.js";
import { buildImpactGroup, IMPACT_PREVIEW_LIMIT } from "../../shared/lifecycle/impact.js";
import { invalidateSystemStatsCache } from "../admin/admin.service.js";
import { disconnectUserSockets } from "../../socket/index.js";
import { archiveTeachingAssignments } from "../../shared/teaching/history.js";
import type { Prisma } from "@prisma/client";

// ─── Types ─────────────────────────────────────────────────────────────────

type ClassStatusFilter = "ACTIVE" | "GRADUATED" | "ALL";

type CreateClassInput = {
  programId: number;
  currentSemester: number;
  academicYear: number;
  admissionYear: number;
  section: "A" | "B";
};

type ClassWriteAccess =
  | { kind: "academic"; userType: string }
  | { kind: "enrollment"; allowedDepartmentIds: number[] | null };

type AssignCourseInput = {
  courseId: number;
  teacherPublicId: string;
};

type ListClassesQuery = {
  programId?: number;
  departmentId?: number;
  semester?: number;
  section?: "A" | "B";
  status?: ClassStatusFilter;
  page?: number;
  limit?: number;
};

type CandidateQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

type TeacherAssignment = {
  courseId: number;
  teacherPublicId: string;
};

type InternalTeacherAssignment = {
  courseId: number;
  teacherId: number;
};

type SemesterProgressionInput = {
  teacherAssignments: TeacherAssignment[];
};

type BulkSemesterProgressionInput = {
  classes: Array<{ classPublicId: string; teacherAssignments: TeacherAssignment[] }>;
};

// ─── Selects ───────────────────────────────────────────────────────────────

const classListSelect = {
  id: true,
  publicId: true,
  currentSemester: true,
  academicYear: true,
  admissionYear: true,
  section: true,
  serverId: true,
  server: { select: { publicId: true } },
  status: true,
  graduatedAt: true,
  graduator: { select: { publicId: true } },
  program: {
    select: {
      id: true,
      code: true,
      department: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      discipline: {
        select: {
          id: true,
          name: true,
        },
      },
      degreeLevel: {
        select: {
          id: true,
          level: true,
        },
      },
    },
  },
  cr: {
    select: {
      studentId: true,
      user: {
        select: {
          publicId: true,
          fullName: true,
          email: true,
        },
      },
    },
  },
} as const;

const classDetailSelect = {
  id: true,
  publicId: true,
  currentSemester: true,
  academicYear: true,
  admissionYear: true,
  section: true,
  serverId: true,
  server: { select: { publicId: true } },
  status: true,
  graduatedAt: true,
  graduator: { select: { publicId: true } },
  program: {
    select: {
      id: true,
      code: true,
      semesters: true,
      department: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  },
  cr: {
    select: {
      studentId: true,
      user: {
        select: {
          publicId: true,
          fullName: true,
          email: true,
        },
      },
    },
  },
  _count: {
    select: {
      students: true,
      teaches: true,
    },
  },
} as const;

const courseAssignmentSelect = {
  courseId: true,
  teacherId: true,
  classId: true,
  channelId: true,
  assignedAt: true,
  assigner: { select: { publicId: true } },
  class: { select: { publicId: true } },
  channel: { select: { publicId: true } },
  course: {
    select: {
      id: true,
      title: true,
      code: true,
      creditHours: true,
    },
  },
  teacher: {
    select: {
      teacherId: true,
      designation: true,
      user: {
        select: {
          fullName: true,
          email: true,
          publicId: true,
        },
      },
    },
  },
} as const;

const studentTransferSelect = {
  studentId: true,
  classId: true,
  user: {
    select: {
      id: true,
      status: true,
      isDeleted: true,
      userType: true,
      departmentId: true,
    },
  },
  class: {
    select: {
      id: true,
      serverId: true,
      crId: true,
      program: { select: { departmentId: true } },
    },
  },
} as const;

type TransferStudent = Prisma.StudentInfoGetPayload<{ select: typeof studentTransferSelect }>;

const classStudentSelect = {
  studentId: true,
  rollNumber: true,
  user: {
    select: {
      id: true,
      publicId: true,
      fullName: true,
      email: true,
      departmentId: true,
    },
  },
  class: {
    select: {
      id: true,
      publicId: true,
      currentSemester: true,
      section: true,
      program: { select: { id: true, code: true } },
    },
  },
} as const;

const teacherCandidateSelect = {
  teacherId: true,
  designation: true,
  user: {
    select: {
      id: true,
      publicId: true,
      fullName: true,
      email: true,
      departmentId: true,
    },
  },
} as const;

function omitStudentInternalId<T extends { studentId: number }>(student: T): Omit<T, "studentId"> {
  const { studentId: _studentId, ...data } = student;
  return data;
}

function toPublicClass<T extends {
  id: number;
  serverId: number;
  server: { publicId: string };
  graduatedBy?: number | null;
  graduator: { publicId: string } | null;
  cr: ({ studentId: number; user: { publicId: string } } & Record<string, unknown>) | null;
}>(
  classRecord: T,
): Omit<T, "id" | "serverId" | "server" | "graduatedBy" | "graduator" | "cr"> & {
  serverPublicId: string;
  graduatedByPublicId: string | null;
  cr: Omit<NonNullable<T["cr"]>, "studentId"> | null;
} {
  const {
    id: _id,
    serverId: _serverId,
    server,
    graduatedBy: _graduatedBy,
    graduator,
    cr,
    ...classData
  } = classRecord;
  const publicCr = cr ? omitStudentInternalId(cr) : null;
  return {
    ...classData,
    serverPublicId: server.publicId,
    graduatedByPublicId: graduator?.publicId ?? null,
    cr: publicCr,
  };
}

function toPublicCourseAssignment<T extends {
  teacherId: number;
  classId: number;
  channelId: number;
  class: { publicId: string };
  channel: { publicId: string };
  assigner?: { publicId: string } | null;
  teacher: { teacherId: number; user: { publicId: string } };
}>(assignment: T) {
  const {
    teacherId: _teacherId,
    classId: _classId,
    channelId: _channelId,
    class: classRecord,
    channel,
    assigner,
    teacher,
    ...data
  } = assignment;
  const { teacherId: _nestedTeacherId, user, ...teacherData } = teacher;
  return {
    ...data,
    classPublicId: classRecord.publicId,
    channelPublicId: channel.publicId,
    assignedByPublicId: assigner?.publicId ?? null,
    teacherPublicId: user.publicId,
    teacher: { ...teacherData, user },
  };
}

function toPublicClassStudent<T extends {
  studentId: number;
  user: { id: number; publicId: string };
  class: { id: number; publicId: string };
}>(student: T) {
  const { studentId: _studentId, user, class: classRecord, ...data } = student;
  const { id: _userId, publicId: studentPublicId, ...userData } = user;
  const { id: _classId, publicId: classPublicId, ...classData } = classRecord;
  return {
    ...data,
    studentPublicId,
    user: userData,
    class: { ...classData, publicId: classPublicId },
  };
}

function toPublicTeacherCandidate<T extends {
  teacherId: number;
  user: { id: number; publicId: string };
}>(teacher: T) {
  const { teacherId: _teacherId, user, ...data } = teacher;
  const { id: _userId, publicId: teacherPublicId, ...userData } = user;
  return { ...data, teacherPublicId, user: userData };
}

// ─── Authorization Helpers ─────────────────────────────────────────────────

async function assertHodOrAdmin(
  userId: number,
  userType: string,
  departmentId: number
): Promise<void> {
  if (userType === "ADMIN") return;

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { hodId: true },
  });

  if (!department || department.hodId !== userId) {
    throw new ForbiddenError("Only the HOD of this department can perform this action");
  }
}

async function assertHodOrPdOrAdmin(
  userId: number,
  userType: string,
  departmentId: number,
  programId: number
): Promise<void> {
  if (userType === "ADMIN") return;

  const [department, program] = await Promise.all([
    prisma.department.findUnique({
      where: { id: departmentId },
      select: { hodId: true },
    }),
    prisma.program.findUnique({
      where: { id: programId },
      select: { programDirectorId: true },
    }),
  ]);

  const isHod = department?.hodId === userId;
  const isPd = program?.programDirectorId === userId;

  if (!isHod && !isPd) {
    throw new ForbiddenError("Only the HOD or Program Director can perform this action");
  }
}

function assertClassIsActive(classRecord: { status: string }): void {
  if (classRecord.status === "GRADUATED") {
    throw new ConflictError("Graduated classes are read-only", ApiErrorCode.CLASS_GRADUATED);
  }
}

function assertStudentCanTransfer(
  student: TransferStudent | null,
  targetClassId: number,
  targetDepartmentId: number
): asserts student is TransferStudent {
  if (!student) {
    throw new NotFoundError("Student not found");
  }
  if (student.user.status !== "ACTIVE" || student.user.isDeleted || student.user.userType !== "STUDENT") {
    throw new ValidationError("Student must be an active student user");
  }
  if (student.classId === targetClassId) {
    throw new ConflictError("Student is already assigned to this class");
  }
  if (
    student.user.departmentId !== targetDepartmentId ||
    student.class.program.departmentId !== targetDepartmentId
  ) {
    throw new ForbiddenError(
      "Student transfer is limited to the same department",
      ApiErrorCode.SCOPE_FORBIDDEN
    );
  }
  if (student.class.crId === student.studentId) {
    throw new ConflictError("Reassign or remove the class representative role before transfer");
  }
}

function buildClassPermissionTarget(classRecord: {
  id: number;
  serverId: number;
  status: string;
  cr: { studentId: number } | null;
  program: { id: number; department: { id: number } };
}) {
  return {
    id: classRecord.id,
    serverId: classRecord.serverId,
    crId: classRecord.cr?.studentId ?? null,
    programId: classRecord.program.id,
    departmentId: classRecord.program.department.id,
    status: classRecord.status,
  };
}

async function getManagedClassOrThrow(classId: number) {
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      currentSemester: true,
      admissionYear: true,
      section: true,
      serverId: true,
      status: true,
      programId: true,
      program: {
        select: {
          id: true,
          code: true,
          semesters: true,
          departmentId: true,
        },
      },
    },
  });

  if (!classRecord) {
    throw new NotFoundError("Class not found");
  }

  return classRecord;
}

async function assertActiveTeacher(teacherId: number): Promise<void> {
  const teacher = await prisma.teacherInfo.findUnique({
    where: { teacherId },
    select: {
      teacherId: true,
      user: { select: { status: true, isDeleted: true, userType: true } },
    },
  });

  if (!teacher) {
    throw new NotFoundError("Teacher not found");
  }

  if (teacher.user.status !== "ACTIVE" || teacher.user.isDeleted || teacher.user.userType !== "TEACHER") {
    throw new ValidationError("Teacher must be an active teacher user");
  }
}

async function assertCourseInCurrentCurriculum(classRecord: {
  programId: number;
  currentSemester: number;
  admissionYear: number;
}, courseId: number): Promise<void> {
  const curriculumEntry = await prisma.programCurriculum.findFirst({
    where: {
      programId: classRecord.programId,
      courseId,
      semesterNumber: classRecord.currentSemester,
      batchYear: classRecord.admissionYear,
    },
    select: { id: true },
  });

  if (!curriculumEntry) {
    throw new ValidationError("Course must belong to the class current-semester curriculum");
  }
}

function assertCanReadManagedClass(
  context: Awaited<ReturnType<typeof getPermissionContext>>,
  classRecord: { program: { id: number; department: { id: number } } },
): void {
  const canRead =
    context.user?.status === "ACTIVE" &&
    (context.isAdmin ||
      context.scopes.hodDepartmentIds.includes(classRecord.program.department.id) ||
      context.scopes.directedProgramIds.includes(classRecord.program.id));

  if (!canRead) {
    throw new ForbiddenError(
      "You do not have permission to manage this class",
      ApiErrorCode.SCOPE_FORBIDDEN,
    );
  }
}

async function cleanupAutoClassMembershipIfUnused(
  tx: Prisma.TransactionClient,
  userId: number,
  classId: number,
  serverId: number
): Promise<boolean> {
  const [membership, teachesCount, moderatorCount] = await Promise.all([
    tx.serverMembership.findUnique({
      where: { userId_serverId: { userId, serverId } },
      select: { isAutoJoined: true },
    }),
    tx.teaches.count({ where: { classId, teacherId: userId } }),
    tx.userRoleAssignment.count({
      where: { AND: [activePlatformRoleAssignmentWhere(), { userId, serverId }] },
    }),
  ]);

  if (membership?.isAutoJoined && teachesCount === 0 && moderatorCount === 0) {
    await tx.serverMembership.delete({
      where: { userId_serverId: { userId, serverId } },
    });
    return true;
  }

  return false;
}

async function ensureCourseChannelForTeaching(
  tx: Prisma.TransactionClient,
  input: {
    serverId: number;
    courseId: number;
    courseCode: string;
    actorUserId: number;
    unlockForAssignment: boolean;
  },
): Promise<number> {
  const existingChannel = await tx.channel.findFirst({
    where: {
      serverId: input.serverId,
      courseId: input.courseId,
      type: "COURSE",
      isDeleted: false,
    },
    select: { id: true },
    orderBy: [{ isArchived: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  const channelData = input.unlockForAssignment
    ? {
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        isLocked: false,
        lockedAt: null,
        lockedBy: null,
      }
    : {
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: input.actorUserId,
      };

  if (existingChannel) {
    const updated = await tx.channel.update({
      where: { id: existingChannel.id },
      data: channelData,
      select: { id: true },
    });
    return updated.id;
  }

  const created = await tx.channel.create({
    data: {
      serverId: input.serverId,
      name: input.courseCode,
      type: "COURSE",
      courseId: input.courseId,
      isAutoCreated: true,
      createdBy: input.actorUserId,
      ...channelData,
    },
    select: { id: true },
  });
  return created.id;
}

function buildScopedClassWhere(
  query: ListClassesQuery,
  context: Awaited<ReturnType<typeof getPermissionContext>>
): Prisma.ClassWhereInput {
  if (context.user?.status !== "ACTIVE") {
    throw new ForbiddenError(
      "You do not have permission to manage this class",
      ApiErrorCode.SCOPE_FORBIDDEN
    );
  }

  const where: Prisma.ClassWhereInput = {};
  if (query.programId) where.programId = query.programId;
  if (query.departmentId) where.program = { departmentId: query.departmentId };
  if (query.semester) where.currentSemester = query.semester;
  if (query.section) where.section = query.section;
  if (!query.status || query.status === "ACTIVE") where.status = "ACTIVE";
  else if (query.status === "GRADUATED") where.status = "GRADUATED";

  if (context.isAdmin) {
    return where;
  }

  const scopedConditions: Prisma.ClassWhereInput[] = [];
  if (context.scopes.hodDepartmentIds.length > 0) {
    scopedConditions.push({
      program: { departmentId: { in: context.scopes.hodDepartmentIds } },
    });
  }
  if (context.scopes.directedProgramIds.length > 0) {
    scopedConditions.push({ programId: { in: context.scopes.directedProgramIds } });
  }

  if (scopedConditions.length === 0) {
    throw new ForbiddenError(
      "You do not have permission to manage this class",
      ApiErrorCode.SCOPE_FORBIDDEN
    );
  }

  where.AND = [...(Array.isArray(where.AND) ? where.AND : []), { OR: scopedConditions }];
  return where;
}

function buildEnrollmentClassWhere(
  query: ListClassesQuery,
  allowedDepartmentIds: number[] | null
): Prisma.ClassWhereInput {
  const where: Prisma.ClassWhereInput = {};
  if (query.programId) where.programId = query.programId;
  if (query.departmentId) where.program = { departmentId: query.departmentId };
  if (query.semester) where.currentSemester = query.semester;
  if (query.section) where.section = query.section;
  if (!query.status || query.status === "ACTIVE") where.status = "ACTIVE";
  else if (query.status === "GRADUATED") where.status = "GRADUATED";

  if (allowedDepartmentIds !== null) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      { program: { departmentId: { in: allowedDepartmentIds } } },
    ];
  }

  return where;
}

function assertEnrollmentClassAccess(
  classRecord: { program: { department: { id: number } } },
  allowedDepartmentIds: number[] | null
): void {
  if (
    allowedDepartmentIds !== null &&
    !allowedDepartmentIds.includes(classRecord.program.department.id)
  ) {
    throw new ForbiddenError(
      "You do not have enrollment access to this class",
      ApiErrorCode.SCOPE_FORBIDDEN
    );
  }
}

function enrollmentClassPermissions(status?: string) {
  const isActive = status !== "GRADUATED";
  return {
    canViewStudents: true,
    canManageStudents: isActive,
    canAssignCourses: false,
    canRemoveCourses: false,
    canReplaceCourseTeacher: false,
    canAdvanceSemester: false,
    canGraduate: false,
    canManageChannels: false,
    canAssignModerators: false,
  };
}

// ─── Service Functions ─────────────────────────────────────────────────────

async function createClassWithAccess(
  data: CreateClassInput,
  userId: number,
  access: ClassWriteAccess
) {
  const program = await prisma.program.findUnique({
    where: { id: data.programId },
    select: {
      id: true,
      code: true,
      semesters: true,
      departmentId: true,
    },
  });

  if (!program) {
    throw new NotFoundError("Program not found");
  }

  if (data.currentSemester > program.semesters) {
    throw new ConflictError(
      `Current semester (${data.currentSemester}) exceeds program's total semesters (${program.semesters})`
    );
  }

  if (access.kind === "academic") {
    if (access.userType !== "ADMIN") {
      throw new ForbiddenError(
        "Class creation is managed through enrollment",
        ApiErrorCode.SCOPE_FORBIDDEN
      );
    }
  } else if (
    access.allowedDepartmentIds !== null &&
    !access.allowedDepartmentIds.includes(program.departmentId)
  ) {
    throw new ForbiddenError(
      "You do not have enrollment access to this department",
      ApiErrorCode.SCOPE_FORBIDDEN
    );
  }
  await assertFullCurriculumExists(prisma, {
    programId: data.programId,
    programSemesters: program.semesters,
    batchYear: data.admissionYear,
  });

  const classRecord = await prisma.$transaction(async (tx) => {
    if (access.kind === "academic") {
      await lockProgramForHodOrAdmin(data.programId, userId, access.userType, tx);
    } else {
      await lockProgramForEnrollmentWrite(data.programId, userId, access.allowedDepartmentIds, tx);
    }
    await assertFullCurriculumExists(tx, {
      programId: data.programId,
      programSemesters: program.semesters,
      batchYear: data.admissionYear,
    });
    const currentCurriculum = await tx.programCurriculum.findMany({
      where: {
        programId: data.programId,
        semesterNumber: data.currentSemester,
        batchYear: data.admissionYear,
      },
      select: {
        courseId: true,
        course: { select: { code: true } },
      },
      orderBy: { course: { code: "asc" } },
    });
    const serverName = `${program.code} - S${data.currentSemester} - Section ${data.section}`;

    const server = await tx.server.create({
      data: {
        name: serverName,
        type: "CLASS",
        createdBy: userId,
      },
    });

    const createdClass = await tx.class.create({
      data: {
        programId: data.programId,
        currentSemester: data.currentSemester,
        academicYear: data.academicYear,
        admissionYear: data.admissionYear,
        section: data.section,
        serverId: server.id,
      },
      select: classListSelect,
    });

    await tx.channel.createMany({
      data: [
        {
          serverId: server.id,
          name: "announcements",
          type: "ANNOUNCEMENT",
          isAutoCreated: true,
          createdBy: userId,
        },
        {
          serverId: server.id,
          name: "general",
          type: "GENERAL",
          isAutoCreated: true,
          createdBy: userId,
        },
        ...currentCurriculum.map((entry) => ({
          serverId: server.id,
          name: entry.course.code,
          type: "COURSE" as const,
          courseId: entry.courseId,
          isAutoCreated: true,
          isLocked: true,
          lockedBy: userId,
          lockedAt: new Date(),
          createdBy: userId,
        })),
      ],
    });

    return createdClass;
  });

  invalidateSystemStatsCache();
  return toPublicClass(classRecord);
}

export async function createClass(data: CreateClassInput, userId: number, userType: string) {
  return createClassWithAccess(data, userId, { kind: "academic", userType });
}

export async function createClassForEnrollment(
  data: CreateClassInput,
  userId: number,
  allowedDepartmentIds: number[] | null
) {
  return createClassWithAccess(data, userId, { kind: "enrollment", allowedDepartmentIds });
}

export async function listClasses(query: ListClassesQuery, callerUserId: number) {
  const { page, limit, skip, take } = parsePagination(query);
  const context = await getPermissionContext(callerUserId);
  const where = buildScopedClassWhere(query, context);

  const [classes, total] = await Promise.all([
    prisma.class.findMany({
      where,
      select: classListSelect,
      orderBy: [{ academicYear: "desc" }, { currentSemester: "asc" }, { section: "asc" }],
      skip,
      take,
    }),
    prisma.class.count({ where }),
  ]);

  return {
    data: classes.map(toPublicClass),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function listClassesForEnrollment(
  query: ListClassesQuery,
  allowedDepartmentIds: number[] | null
) {
  const { page, limit, skip, take } = parsePagination(query);
  const where = buildEnrollmentClassWhere(query, allowedDepartmentIds);

  const [classes, total] = await Promise.all([
    prisma.class.findMany({
      where,
      select: classListSelect,
      orderBy: [{ academicYear: "desc" }, { currentSemester: "asc" }, { section: "asc" }],
      skip,
      take,
    }),
    prisma.class.count({ where }),
  ]);

  return {
    data: classes.map(toPublicClass),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function getClassById(id: number, callerUserId: number) {
  const classRecord = await prisma.class.findUnique({
    where: { id },
    select: classDetailSelect,
  });

  if (!classRecord) {
    throw new NotFoundError("Class not found");
  }

  const context = await getPermissionContext(callerUserId);
  assertCanReadManagedClass(context, classRecord);
  const permissions = buildClassPermissions(context, buildClassPermissionTarget(classRecord));

  return {
    ...toPublicClass(classRecord),
    permissions,
  };
}

export async function getClassByPublicIdForEnrollment(
  publicId: string,
  allowedDepartmentIds: number[] | null
) {
  const classRecord = await prisma.class.findUnique({
    where: { publicId },
    select: classDetailSelect,
  });

  if (!classRecord) {
    throw new NotFoundError("Class not found");
  }

  assertEnrollmentClassAccess(classRecord, allowedDepartmentIds);

  return {
    ...toPublicClass(classRecord),
    permissions: enrollmentClassPermissions(classRecord.status),
  };
}

export async function assignCourseToClass(
  classId: number,
  data: AssignCourseInput,
  userId: number,
  userType: string
) {
  const teacher = await resolveUserPublicId(data.teacherPublicId, { field: "teacherPublicId" });
  const classRecord = await getManagedClassOrThrow(classId);
  assertClassIsActive(classRecord);

  await assertHodOrPdOrAdmin(
    userId,
    userType,
    classRecord.program.departmentId,
    classRecord.programId
  );

  const course = await prisma.course.findUnique({
    where: { id: data.courseId },
    select: { id: true, code: true, title: true, departmentId: true },
  });

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  if (course.departmentId !== classRecord.program.departmentId) {
    throw new ForbiddenError("Course must belong to the same department as the class");
  }

  await assertCourseInCurrentCurriculum(classRecord, data.courseId);
  await assertActiveTeacher(teacher.id);

  const existingAssignment = await prisma.teaches.findUnique({
    where: {
      classId_courseId: {
        classId,
        courseId: data.courseId,
      },
    },
    select: { teacherId: true },
  });

  if (existingAssignment) {
    if (existingAssignment.teacherId === teacher.id) {
      throw new ConflictError("This course is already assigned to this teacher for this class");
    }

    throw new ConflictError("Use teacher replacement for an already assigned class course");
  }

  return prisma.$transaction(async (tx) => {
    await lockClassForAcademicWrite(classId, userId, userType, "HOD_OR_PD", tx);
    const lockedAssignment = await tx.teaches.findUnique({
      where: { classId_courseId: { classId, courseId: data.courseId } },
      select: { teacherId: true },
    });
    if (lockedAssignment) {
      if (lockedAssignment.teacherId === teacher.id) {
        throw new ConflictError("This course is already assigned to this teacher for this class");
      }
      throw new ConflictError("Use teacher replacement for an already assigned class course");
    }
    const channelId = await ensureCourseChannelForTeaching(tx, {
      serverId: classRecord.serverId,
      courseId: data.courseId,
      courseCode: course.code,
      actorUserId: userId,
      unlockForAssignment: true,
    });
    const assignment = await tx.teaches.create({
      data: {
        teacherId: teacher.id,
        courseId: data.courseId,
        classId,
        channelId,
        assignedBy: userId,
      },
      select: courseAssignmentSelect,
    });

    return toPublicCourseAssignment(assignment);
  });
}

export async function listClassCourses(classId: number, callerUserId: number) {
  const classRecord = await getClassById(classId, callerUserId);

  if (classRecord.status === "GRADUATED") {
    const historicalAssignments = await prisma.teachingAssignmentHistory.findMany({
      where: { classId, endReason: "GRADUATION" },
      select: courseAssignmentSelect,
      orderBy: { course: { code: "asc" } },
    });
    return historicalAssignments.map(toPublicCourseAssignment);
  }

  const assignments = await prisma.teaches.findMany({
    where: { classId },
    select: courseAssignmentSelect,
    orderBy: { course: { code: "asc" } },
  });
  return assignments.map(toPublicCourseAssignment);
}

export async function replaceClassCourseTeacher(
  classId: number,
  courseId: number,
  data: { teacherPublicId: string },
  userId: number,
  userType: string
) {
  const teacher = await resolveUserPublicId(data.teacherPublicId, { field: "teacherPublicId" });
  const classRecord = await getManagedClassOrThrow(classId);
  assertClassIsActive(classRecord);

  await assertHodOrPdOrAdmin(
    userId,
    userType,
    classRecord.program.departmentId,
    classRecord.programId
  );
  await assertCourseInCurrentCurriculum(classRecord, courseId);
  await assertActiveTeacher(teacher.id);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, code: true },
  });
  if (!course) {
    throw new NotFoundError("Course not found");
  }

  const existingAssignment = await prisma.teaches.findUnique({
    where: { classId_courseId: { classId, courseId } },
    select: { teacherId: true },
  });

  if (!existingAssignment) {
    throw new NotFoundError("Course is not assigned to this class");
  }

  if (existingAssignment.teacherId === teacher.id) {
    throw new ConflictError("This course is already assigned to this teacher");
  }

  const { updated, removedUserIds } = await prisma.$transaction(async (tx) => {
    await lockClassForAcademicWrite(classId, userId, userType, "HOD_OR_PD", tx);
    const lockedAssignment = await tx.teaches.findUnique({
      where: { classId_courseId: { classId, courseId } },
      select: { teacherId: true },
    });
    if (!lockedAssignment) {
      throw new NotFoundError("Course is not assigned to this class");
    }
    if (lockedAssignment.teacherId === teacher.id) {
      throw new ConflictError("This course is already assigned to this teacher");
    }
    const removedUserIds = new Set<number>();
    const channelId = await ensureCourseChannelForTeaching(tx, {
      serverId: classRecord.serverId,
      courseId,
      courseCode: course.code,
      actorUserId: userId,
      unlockForAssignment: true,
    });
    await archiveTeachingAssignments(
      tx,
      { classId, courseId },
      classRecord.currentSemester,
      userId,
      "REPLACED",
    );
    const updated = await tx.teaches.update({
      where: { classId_courseId: { classId, courseId } },
      data: {
        teacherId: teacher.id,
        channelId,
        assignedBy: userId,
        assignedAt: new Date(),
      },
      select: courseAssignmentSelect,
    });
    removedUserIds.add(lockedAssignment.teacherId);

    return { updated, removedUserIds: Array.from(removedUserIds) };
  });

  removedUserIds.forEach(disconnectUserSockets);
  return toPublicCourseAssignment(updated);
}

export async function removeCourseFromClass(
  classId: number,
  courseId: number,
  userId: number,
  userType: string
) {
  const classRecord = await getManagedClassOrThrow(classId);
  assertClassIsActive(classRecord);

  await assertHodOrPdOrAdmin(
    userId,
    userType,
    classRecord.program.departmentId,
    classRecord.programId
  );

  const assignments = await prisma.teaches.findMany({
    where: { classId, courseId },
    select: { teacherId: true },
  });

  if (assignments.length === 0) {
    throw new NotFoundError("Course is not assigned to this class");
  }

  const removedUserIds = await prisma.$transaction(async (tx) => {
    await lockClassForAcademicWrite(classId, userId, userType, "HOD_OR_PD", tx);
    const lockedAssignments = await archiveTeachingAssignments(
      tx,
      { classId, courseId },
      classRecord.currentSemester,
      userId,
      "REMOVED",
    );
    if (lockedAssignments.length === 0) {
      throw new NotFoundError("Course is not assigned to this class");
    }
    const removedUserIds = new Set<number>();
    await tx.teaches.deleteMany({ where: { classId, courseId } });

    await tx.channel.updateMany({
      where: {
        serverId: classRecord.serverId,
        courseId,
        isAutoCreated: true,
      },
      data: {
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: userId,
      },
    });

    for (const assignment of lockedAssignments) {
      removedUserIds.add(assignment.teacherId);
    }

    return Array.from(removedUserIds);
  });

  removedUserIds.forEach(disconnectUserSockets);
}

export async function listClassStudents(
  classId: number,
  query: CandidateQuery,
  userId: number,
  userType: string
) {
  return listClassStudentsWithAccess(classId, query, userId, {
    kind: "academic",
    userType,
  });
}

export async function listClassStudentsForEnrollment(
  classId: number,
  query: CandidateQuery,
  userId: number,
  allowedDepartmentIds: number[] | null
) {
  return listClassStudentsWithAccess(classId, query, userId, {
    kind: "enrollment",
    allowedDepartmentIds,
  });
}

async function listClassStudentsWithAccess(
  classId: number,
  query: CandidateQuery,
  userId: number,
  access: ClassWriteAccess
) {
  const classRecord = await getManagedClassOrThrow(classId);
  if (access.kind === "academic") {
    await assertHodOrAdmin(userId, access.userType, classRecord.program.departmentId);
  } else if (
    access.allowedDepartmentIds !== null &&
    !access.allowedDepartmentIds.includes(classRecord.program.departmentId)
  ) {
    throw new ForbiddenError(
      "You do not have enrollment access to this department",
      ApiErrorCode.SCOPE_FORBIDDEN
    );
  }

  const { page, limit, skip, take } = parsePagination(query);
  const where: Prisma.StudentInfoWhereInput = {
    classId,
    ...(query.search
      ? {
          user: {
            OR: [
              { fullName: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const [students, total] = await prisma.$transaction([
    prisma.studentInfo.findMany({
      where,
      select: classStudentSelect,
      orderBy: { user: { fullName: "asc" } },
      skip,
      take,
    }),
    prisma.studentInfo.count({ where }),
  ]);

  return {
    data: students.map(toPublicClassStudent),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function listStudentCandidates(
  classId: number,
  query: CandidateQuery,
  userId: number,
  userType: string
) {
  if (userType !== "ADMIN") {
    throw new ForbiddenError(
      "Student transfer is managed through enrollment",
      ApiErrorCode.SCOPE_FORBIDDEN
    );
  }
  return listStudentCandidatesWithAccess(classId, query, userId, {
    kind: "academic",
    userType,
  });
}

export async function listStudentCandidatesForEnrollment(
  classId: number,
  query: CandidateQuery,
  userId: number,
  allowedDepartmentIds: number[] | null
) {
  return listStudentCandidatesWithAccess(classId, query, userId, {
    kind: "enrollment",
    allowedDepartmentIds,
  });
}

async function listStudentCandidatesWithAccess(
  classId: number,
  query: CandidateQuery,
  userId: number,
  access: ClassWriteAccess
) {
  const classRecord = await getManagedClassOrThrow(classId);
  assertClassIsActive(classRecord);
  if (access.kind === "academic") {
    await assertHodOrAdmin(userId, access.userType, classRecord.program.departmentId);
  } else if (
    access.allowedDepartmentIds !== null &&
    !access.allowedDepartmentIds.includes(classRecord.program.departmentId)
  ) {
    throw new ForbiddenError(
      "You do not have enrollment access to this department",
      ApiErrorCode.SCOPE_FORBIDDEN
    );
  }

  const { page, limit, skip, take } = parsePagination(query);
  const where: Prisma.StudentInfoWhereInput = {
    classId: { not: classId },
    user: {
      status: "ACTIVE",
      isDeleted: false,
      userType: "STUDENT",
      departmentId: classRecord.program.departmentId,
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
  };

  const [students, total] = await prisma.$transaction([
    prisma.studentInfo.findMany({
      where,
      select: classStudentSelect,
      orderBy: { user: { fullName: "asc" } },
      skip,
      take,
    }),
    prisma.studentInfo.count({ where }),
  ]);

  return {
    data: students.map(toPublicClassStudent),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function transferStudentToClass(
  classId: number,
  data: { studentPublicId: string },
  userId: number,
  userType: string
) {
  if (userType !== "ADMIN") {
    throw new ForbiddenError(
      "Student transfer is managed through enrollment",
      ApiErrorCode.SCOPE_FORBIDDEN
    );
  }
  return transferStudentToClassWithAccess(classId, data, userId, {
    kind: "academic",
    userType,
  });
}

export async function transferStudentToClassForEnrollment(
  classId: number,
  data: { studentPublicId: string },
  userId: number,
  allowedDepartmentIds: number[] | null
) {
  return transferStudentToClassWithAccess(classId, data, userId, {
    kind: "enrollment",
    allowedDepartmentIds,
  });
}

async function transferStudentToClassWithAccess(
  classId: number,
  data: { studentPublicId: string },
  userId: number,
  access: ClassWriteAccess
) {
  const resolvedStudent = await resolveUserPublicId(data.studentPublicId, {
    field: "studentPublicId",
  });
  const targetClass = await getManagedClassOrThrow(classId);
  assertClassIsActive(targetClass);
  if (access.kind === "academic") {
    await assertHodOrAdmin(userId, access.userType, targetClass.program.departmentId);
  } else if (
    access.allowedDepartmentIds !== null &&
    !access.allowedDepartmentIds.includes(targetClass.program.departmentId)
  ) {
    throw new ForbiddenError(
      "You do not have enrollment access to this department",
      ApiErrorCode.SCOPE_FORBIDDEN
    );
  }

  const student = await prisma.studentInfo.findUnique({
    where: { studentId: resolvedStudent.id },
    select: studentTransferSelect,
  });

  assertStudentCanTransfer(student, classId, targetClass.program.departmentId);

  const { updatedStudent, removedUserIds } = await prisma.$transaction(async (tx) => {
    await lockStudentProfileForTransfer(resolvedStudent.id, tx);
    const lockedStudent = await tx.studentInfo.findUnique({
      where: { studentId: resolvedStudent.id },
      select: studentTransferSelect,
    });
    assertStudentCanTransfer(lockedStudent, classId, targetClass.program.departmentId);

    for (const lockedClassId of [...new Set([lockedStudent.classId, classId])].sort(
      (left, right) => left - right
    )) {
      if (access.kind === "academic") {
        await lockClassForAcademicWrite(lockedClassId, userId, access.userType, "HOD", tx);
      } else {
        await lockClassForEnrollmentWrite(lockedClassId, userId, access.allowedDepartmentIds, tx);
      }
    }
    const currentStudent = await tx.studentInfo.findUnique({
      where: { studentId: resolvedStudent.id },
      select: studentTransferSelect,
    });
    assertStudentCanTransfer(currentStudent, classId, targetClass.program.departmentId);

    const removedUserIds = new Set<number>();
    const updated = await tx.studentInfo.update({
      where: { studentId: resolvedStudent.id },
      data: { classId },
      select: classStudentSelect,
    });

    await tx.serverMembership.upsert({
      where: { userId_serverId: { userId: resolvedStudent.id, serverId: targetClass.serverId } },
      create: {
        userId: resolvedStudent.id,
        serverId: targetClass.serverId,
        isAutoJoined: true,
      },
      update: {},
    });

    if (
      await cleanupAutoClassMembershipIfUnused(
        tx,
        resolvedStudent.id,
        currentStudent.classId,
        currentStudent.class.serverId
      )
    ) {
      removedUserIds.add(resolvedStudent.id);
    }

    return { updatedStudent: updated, removedUserIds: Array.from(removedUserIds) };
  });

  removedUserIds.forEach(disconnectUserSockets);
  return toPublicClassStudent(updatedStudent);
}

export async function listTeacherCandidates(
  classId: number,
  query: CandidateQuery,
  userId: number,
  userType: string
) {
  const classRecord = await getManagedClassOrThrow(classId);
  assertClassIsActive(classRecord);
  await assertHodOrPdOrAdmin(
    userId,
    userType,
    classRecord.program.departmentId,
    classRecord.programId
  );

  const { page, limit, skip, take } = parsePagination(query);
  const where: Prisma.TeacherInfoWhereInput = {
    user: {
      status: "ACTIVE",
      isDeleted: false,
      userType: "TEACHER",
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
  };

  const [teachers, total] = await prisma.$transaction([
    prisma.teacherInfo.findMany({
      where,
      select: teacherCandidateSelect,
      orderBy: { user: { fullName: "asc" } },
      skip,
      take,
    }),
    prisma.teacherInfo.count({ where }),
  ]);

  return {
    data: teachers.map(toPublicTeacherCandidate),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

// ─── Semester Progression ──────────────────────────────────────────────────

export async function advanceSemester(
  classId: number,
  data: SemesterProgressionInput,
  userId: number,
  userType: string
) {
  const teacherAssignments: InternalTeacherAssignment[] = await Promise.all(
    data.teacherAssignments.map(async (assignment) => ({
      courseId: assignment.courseId,
      teacherId: (
        await resolveUserPublicId(assignment.teacherPublicId, { field: "teacherPublicId" })
      ).id,
    })),
  );
  const classRecord = await getManagedClassOrThrow(classId);
  assertClassIsActive(classRecord);

  if (classRecord.currentSemester >= classRecord.program.semesters) {
    throw new ValidationError(
      `Class is already at the maximum semester (${classRecord.program.semesters})`
    );
  }

  await assertHodOrAdmin(userId, userType, classRecord.program.departmentId);

  const newSemester = classRecord.currentSemester + 1;

  const curriculum = await prisma.programCurriculum.findMany({
    where: {
      programId: classRecord.programId,
      semesterNumber: newSemester,
      batchYear: classRecord.admissionYear,
    },
    select: {
      courseId: true,
      course: {
        select: { id: true, code: true },
      },
    },
  });

  if (curriculum.length > 0) {
    const curriculumCourseIds = curriculum.map((c) => c.courseId);
    const assignedCourseIds = teacherAssignments.map((a) => a.courseId);

    const assignmentSet = new Set<number>();
    const duplicateAssignments: number[] = [];
    for (const courseId of assignedCourseIds) {
      if (assignmentSet.has(courseId)) {
        duplicateAssignments.push(courseId);
      } else {
        assignmentSet.add(courseId);
      }
    }
    if (duplicateAssignments.length > 0) {
      throw new ValidationError(
        `Duplicate teacher assignments found for course IDs: ${[
          ...new Set(duplicateAssignments),
        ].join(", ")}`
      );
    }

    const extraAssignments = assignedCourseIds.filter((id) => !curriculumCourseIds.includes(id));
    if (extraAssignments.length > 0) {
      throw new ValidationError(
        `Teacher assignments contain courses not in the target semester curriculum: ${[
          ...new Set(extraAssignments),
        ].join(", ")}`
      );
    }

    for (const teacherId of [...new Set(teacherAssignments.map((a) => a.teacherId))]) {
      await assertActiveTeacher(teacherId);
    }
  } else {
    throw new ValidationError(
      `Curriculum is required for semester ${newSemester} before this class can advance`
    );
  }

  const previousTeacherIds = await prisma.teaches.findMany({
    where: { classId },
    select: { teacherId: true },
    distinct: ["teacherId"],
  });

  const { advancedClass, removedUserIds } = await prisma.$transaction(async (tx) => {
    const lockedClass = await lockClassForAcademicWrite(classId, userId, userType, "HOD", tx);
    if (lockedClass.currentSemester !== classRecord.currentSemester) {
      throw new ConflictError("Class semester changed; reload and try again");
    }
    const removedUserIds = new Set<number>();
    await tx.channel.updateMany({
      where: {
        serverId: classRecord.serverId,
        type: "COURSE",
        isDeleted: false,
        isArchived: false,
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: userId,
        isLocked: true,
        lockedBy: userId,
        lockedAt: new Date(),
      },
    });

    await archiveTeachingAssignments(
      tx,
      { classId },
      classRecord.currentSemester,
      userId,
      "SEMESTER_PROGRESSION",
    );
    await tx.teaches.deleteMany({ where: { classId } });

    const updatedClass = await tx.class.update({
      where: { id: classId },
      data: { currentSemester: newSemester },
      select: classDetailSelect,
    });

    await tx.server.update({
      where: { id: classRecord.serverId },
      data: {
        name: `${classRecord.program.code} - S${newSemester} - Section ${classRecord.section}`,
      },
    });

    if (curriculum.length > 0) {
      for (const entry of curriculum) {
        const assignment = teacherAssignments.find((a) => a.courseId === entry.courseId);
        const channelId = await ensureCourseChannelForTeaching(tx, {
          serverId: classRecord.serverId,
          courseId: entry.courseId,
          courseCode: entry.course.code,
          actorUserId: userId,
          unlockForAssignment: assignment !== undefined,
        });

        if (assignment) {
          await tx.teaches.create({
            data: {
              teacherId: assignment.teacherId,
              courseId: entry.courseId,
              classId,
              channelId,
              assignedBy: userId,
            },
          });
        }
      }
    }

    for (const previousTeacher of previousTeacherIds) {
      removedUserIds.add(previousTeacher.teacherId);
    }

    return { advancedClass: updatedClass, removedUserIds: Array.from(removedUserIds) };
  });

  removedUserIds.forEach(disconnectUserSockets);

  return {
    ...toPublicClass(advancedClass),
    permissions: buildClassPermissions(
      await getPermissionContext(userId),
      buildClassPermissionTarget(advancedClass)
    ),
  };
}

export async function bulkAdvanceSemester(
  input: BulkSemesterProgressionInput,
  userId: number,
  userType: string,
) {
  const results: Array<
    | { classPublicId: string; status: "SUCCESS"; data: Awaited<ReturnType<typeof advanceSemester>> }
    | {
        classPublicId: string;
        status: "FAILED";
        error: { code: string; message: string; details?: Record<string, unknown>[] };
      }
  > = [];

  for (const item of input.classes) {
    try {
      const classRecord = await prisma.class.findUnique({
        where: { publicId: item.classPublicId },
        select: { id: true },
      });
      if (!classRecord) throw new NotFoundError("Class not found");

      const data = await advanceSemester(
        classRecord.id,
        { teacherAssignments: item.teacherAssignments },
        userId,
        userType,
      );
      results.push({ classPublicId: item.classPublicId, status: "SUCCESS", data });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        results.push({
          classPublicId: item.classPublicId,
          status: "FAILED",
          error: { code: error.code, message: error.message, details: error.details },
        });
      } else {
        throw error;
      }
    }
  }

  const succeeded = results.filter((result) => result.status === "SUCCESS").length;
  return { total: results.length, succeeded, failed: results.length - succeeded, results };
}

export async function graduateClass(classId: number, userId: number, userType: string) {
  const classRecord = await getManagedClassOrThrow(classId);
  assertClassIsActive(classRecord);
  await assertHodOrAdmin(userId, userType, classRecord.program.departmentId);

  if (classRecord.currentSemester !== classRecord.program.semesters) {
    throw new ValidationError(
      "Only final-semester classes can be graduated",
      undefined,
      ApiErrorCode.CLASS_FINAL_SEMESTER_REQUIRED
    );
  }

  const graduatedClass = await prisma.$transaction(async (tx) => {
    const lockedClass = await lockClassForAcademicWrite(classId, userId, userType, "HOD", tx);
    if (lockedClass.currentSemester !== classRecord.currentSemester) {
      throw new ConflictError("Class semester changed; reload and try again");
    }
    const now = new Date();
    const endedAssignments = await archiveTeachingAssignments(
      tx,
      { classId },
      classRecord.currentSemester,
      userId,
      "GRADUATION",
    );
    await tx.teaches.deleteMany({ where: { classId } });
    const updatedClass = await tx.class.update({
      where: { id: classId },
      data: {
        status: "GRADUATED",
        graduatedAt: now,
        graduatedBy: userId,
      },
      select: classDetailSelect,
    });

    await tx.channel.updateMany({
      where: {
        serverId: classRecord.serverId,
        type: "COURSE",
        isDeleted: false,
        isArchived: false,
      },
      data: {
        isArchived: true,
        archivedBy: userId,
        archivedAt: now,
      },
    });

    await tx.channel.updateMany({
      where: {
        serverId: classRecord.serverId,
        type: "COURSE",
        isDeleted: false,
        isLocked: false,
      },
      data: {
        isLocked: true,
        lockedBy: userId,
        lockedAt: now,
      },
    });

    return { updatedClass, removedUserIds: [...new Set(endedAssignments.map((a) => a.teacherId))] };
  });

  graduatedClass.removedUserIds.forEach(disconnectUserSockets);

  return {
    ...toPublicClass(graduatedClass.updatedClass),
    permissions: buildClassPermissions(
      await getPermissionContext(userId),
      buildClassPermissionTarget(graduatedClass.updatedClass)
    ),
  };
}

export async function getClassDeletionImpact(classId: number) {
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      publicId: true,
      currentSemester: true,
      admissionYear: true,
      academicYear: true,
      section: true,
      status: true,
      serverId: true,
      server: { select: { publicId: true } },
      program: {
        select: {
          id: true,
          code: true,
          department: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });

  if (!classRecord) {
    throw new NotFoundError("Class not found");
  }

  const [
    studentCount,
    studentPreview,
    teachingCount,
    teachingPreview,
    teachingHistoryCount,
    communicationImpact,
  ] =
    await Promise.all([
      prisma.studentInfo.count({ where: { classId } }),
      prisma.studentInfo.findMany({
        where: { classId },
        select: {
          rollNumber: true,
          user: {
            select: {
              publicId: true,
              fullName: true,
              email: true,
              status: true,
              isDeleted: true,
            },
          },
        },
        orderBy: { rollNumber: "asc" },
        take: IMPACT_PREVIEW_LIMIT,
      }),
      prisma.teaches.count({ where: { classId } }),
      prisma.teaches.findMany({
        where: { classId },
        select: {
          course: { select: { id: true, code: true, title: true } },
          teacher: {
            select: {
              designation: true,
              user: { select: { publicId: true, fullName: true, email: true } },
            },
          },
        },
        orderBy: { course: { code: "asc" } },
        take: IMPACT_PREVIEW_LIMIT,
      }),
      prisma.teachingAssignmentHistory.count({ where: { classId } }),
      getServerCommunicationImpact(classRecord.serverId),
    ]);

  const canDelete = studentCount === 0 && teachingCount === 0 && teachingHistoryCount === 0;

  return {
    class: {
      publicId: classRecord.publicId,
      programId: classRecord.program.id,
      programCode: classRecord.program.code,
      department: classRecord.program.department,
      section: classRecord.section,
      currentSemester: classRecord.currentSemester,
      academicYear: classRecord.academicYear,
      admissionYear: classRecord.admissionYear,
      status: classRecord.status,
      serverPublicId: classRecord.server.publicId,
    },
    canDelete,
    checksComplete: true,
    pendingChecks: [] as string[],
    blockers: {
      enrolledStudents: buildImpactGroup(studentCount, studentPreview),
      activeTeachingAssignments: buildImpactGroup(teachingCount, teachingPreview),
      teachingHistory: buildImpactGroup(teachingHistoryCount, []),
    },
    communicationImpact,
  };
}
