import { prisma } from "../../config/prisma.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors/index.js";
import { buildPaginationResponse, parsePagination } from "../../shared/utils/pagination.js";
import { buildClassPermissions, getPermissionContext } from "../../shared/permissions/index.js";
import { invalidateSystemStatsCache } from "../admin/admin.service.js";
import type { Prisma } from "../../generated/prisma/client.js";

// ─── Types ─────────────────────────────────────────────────────────────────

type ClassStatusFilter = "ACTIVE" | "GRADUATED" | "ALL";

type CreateClassInput = {
  programId: number;
  currentSemester: number;
  academicYear: number;
  admissionYear: number;
  section: "A" | "B";
};

type AssignCourseInput = {
  courseId: number;
  teacherId: number;
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
  teacherId: number;
};

type SemesterProgressionInput = {
  teacherAssignments: TeacherAssignment[];
};

// ─── Selects ───────────────────────────────────────────────────────────────

const classListSelect = {
  id: true,
  currentSemester: true,
  academicYear: true,
  admissionYear: true,
  section: true,
  serverId: true,
  status: true,
  graduatedAt: true,
  graduatedBy: true,
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
          fullName: true,
          email: true,
        },
      },
    },
  },
} as const;

const classDetailSelect = {
  id: true,
  currentSemester: true,
  academicYear: true,
  admissionYear: true,
  section: true,
  serverId: true,
  status: true,
  graduatedAt: true,
  graduatedBy: true,
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
        },
      },
    },
  },
} as const;

const classStudentSelect = {
  studentId: true,
  rollNumber: true,
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      departmentId: true,
      isActive: true,
    },
  },
  class: {
    select: {
      id: true,
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
      fullName: true,
      email: true,
      departmentId: true,
      isActive: true,
    },
  },
} as const;

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
    throw new ConflictError("Graduated classes are read-only");
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
      user: { select: { isActive: true, userType: true } },
    },
  });

  if (!teacher) {
    throw new NotFoundError("Teacher not found");
  }

  if (!teacher.user.isActive || teacher.user.userType !== "TEACHER") {
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

async function cleanupAutoClassMembershipIfUnused(
  tx: Prisma.TransactionClient,
  userId: number,
  classId: number,
  serverId: number
): Promise<void> {
  const [membership, teachesCount, moderatorCount] = await Promise.all([
    tx.serverMembership.findUnique({
      where: { userId_serverId: { userId, serverId } },
      select: { isAutoJoined: true },
    }),
    tx.teaches.count({ where: { classId, teacherId: userId } }),
    tx.moderatorAssignment.count({ where: { userId, serverId } }),
  ]);

  if (membership?.isAutoJoined && teachesCount === 0 && moderatorCount === 0) {
    await tx.serverMembership.delete({
      where: { userId_serverId: { userId, serverId } },
    });
  }
}

function buildScopedClassWhere(
  query: ListClassesQuery,
  context: Awaited<ReturnType<typeof getPermissionContext>>
): Prisma.ClassWhereInput {
  if (!context.user?.isActive) {
    throw new ForbiddenError("Insufficient permissions");
  }

  const where: Prisma.ClassWhereInput = {};
  if (query.programId) where.programId = query.programId;
  if (query.departmentId) where.program = { departmentId: query.departmentId };
  if (query.semester) where.currentSemester = query.semester;
  if (query.section) where.section = query.section;
  if (!query.status || query.status === "ACTIVE") where.status = "ACTIVE";
  else if (query.status === "GRADUATED") where.status = "GRADUATED";

  if (context.user.userType === "ADMIN") {
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
    throw new ForbiddenError("Insufficient permissions");
  }

  where.AND = [...(Array.isArray(where.AND) ? where.AND : []), { OR: scopedConditions }];
  return where;
}

// ─── Service Functions ─────────────────────────────────────────────────────

export async function createClass(data: CreateClassInput, userId: number, userType: string) {
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

  await assertHodOrAdmin(userId, userType, program.departmentId);

  const classRecord = await prisma.$transaction(async (tx) => {
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
      ],
    });

    return createdClass;
  });

  invalidateSystemStatsCache();
  return classRecord;
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
    data: classes,
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
  const permissions = buildClassPermissions(context, buildClassPermissionTarget(classRecord));

  return {
    ...classRecord,
    permissions,
  };
}

export async function assignCourseToClass(
  classId: number,
  data: AssignCourseInput,
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
  await assertActiveTeacher(data.teacherId);

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
    if (existingAssignment.teacherId === data.teacherId) {
      throw new ConflictError("This course is already assigned to this teacher for this class");
    }

    throw new ConflictError("Use teacher replacement for an already assigned class course");
  }

  return prisma.$transaction(async (tx) => {
    const assignment = await tx.teaches.create({
      data: {
        teacherId: data.teacherId,
        courseId: data.courseId,
        classId,
      },
      select: courseAssignmentSelect,
    });

    const existingChannel = await tx.channel.findFirst({
      where: {
        serverId: classRecord.serverId,
        courseId: data.courseId,
      },
      select: { id: true, isArchived: true, isLocked: true },
    });

    if (!existingChannel) {
      await tx.channel.create({
        data: {
          serverId: classRecord.serverId,
          name: course.code,
          type: "COURSE",
          courseId: data.courseId,
          isAutoCreated: true,
          createdBy: userId,
        },
      });
    } else if (existingChannel.isArchived || existingChannel.isLocked) {
      await tx.channel.update({
        where: { id: existingChannel.id },
        data: {
          isArchived: false,
          archivedAt: null,
          archivedBy: null,
          isLocked: false,
          lockedAt: null,
          lockedBy: null,
        },
      });
    }

    await tx.serverMembership.upsert({
      where: {
        userId_serverId: {
          userId: data.teacherId,
          serverId: classRecord.serverId,
        },
      },
      create: {
        userId: data.teacherId,
        serverId: classRecord.serverId,
        isAutoJoined: true,
      },
      update: {},
    });

    return assignment;
  });
}

export async function listClassCourses(classId: number, callerUserId: number) {
  await getClassById(classId, callerUserId);

  return prisma.teaches.findMany({
    where: { classId },
    select: courseAssignmentSelect,
    orderBy: { course: { code: "asc" } },
  });
}

export async function replaceClassCourseTeacher(
  classId: number,
  courseId: number,
  data: { teacherId: number },
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
  await assertCourseInCurrentCurriculum(classRecord, courseId);
  await assertActiveTeacher(data.teacherId);

  const existingAssignment = await prisma.teaches.findUnique({
    where: { classId_courseId: { classId, courseId } },
    select: { teacherId: true },
  });

  if (!existingAssignment) {
    throw new NotFoundError("Course is not assigned to this class");
  }

  if (existingAssignment.teacherId === data.teacherId) {
    throw new ConflictError("This course is already assigned to this teacher");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.teaches.update({
      where: { classId_courseId: { classId, courseId } },
      data: { teacherId: data.teacherId },
      select: courseAssignmentSelect,
    });

    await tx.serverMembership.upsert({
      where: { userId_serverId: { userId: data.teacherId, serverId: classRecord.serverId } },
      create: {
        userId: data.teacherId,
        serverId: classRecord.serverId,
        isAutoJoined: true,
      },
      update: {},
    });

    await cleanupAutoClassMembershipIfUnused(
      tx,
      existingAssignment.teacherId,
      classId,
      classRecord.serverId
    );

    return updated;
  });
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

  await prisma.$transaction(async (tx) => {
    await tx.teaches.deleteMany({ where: { classId, courseId } });

    await tx.channel.updateMany({
      where: {
        serverId: classRecord.serverId,
        courseId,
        isAutoCreated: true,
        isArchived: false,
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: userId,
      },
    });

    for (const assignment of assignments) {
      await cleanupAutoClassMembershipIfUnused(
        tx,
        assignment.teacherId,
        classId,
        classRecord.serverId
      );
    }
  });
}

export async function listClassStudents(
  classId: number,
  query: CandidateQuery,
  userId: number,
  userType: string
) {
  const classRecord = await getManagedClassOrThrow(classId);
  await assertHodOrAdmin(userId, userType, classRecord.program.departmentId);

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
    data: students,
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function listStudentCandidates(
  classId: number,
  query: CandidateQuery,
  userId: number,
  userType: string
) {
  const classRecord = await getManagedClassOrThrow(classId);
  assertClassIsActive(classRecord);
  await assertHodOrAdmin(userId, userType, classRecord.program.departmentId);

  const { page, limit, skip, take } = parsePagination(query);
  const where: Prisma.StudentInfoWhereInput = {
    classId: { not: classId },
    user: {
      isActive: true,
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
    data: students,
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function transferStudentToClass(
  classId: number,
  data: { studentId: number },
  userId: number,
  userType: string
) {
  const targetClass = await getManagedClassOrThrow(classId);
  assertClassIsActive(targetClass);
  await assertHodOrAdmin(userId, userType, targetClass.program.departmentId);

  const student = await prisma.studentInfo.findUnique({
    where: { studentId: data.studentId },
    select: {
      studentId: true,
      classId: true,
      user: {
        select: {
          id: true,
          isActive: true,
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
    },
  });

  if (!student) {
    throw new NotFoundError("Student not found");
  }

  if (!student.user.isActive || student.user.userType !== "STUDENT") {
    throw new ValidationError("Student must be an active student user");
  }

  if (student.classId === classId) {
    throw new ConflictError("Student is already assigned to this class");
  }

  if (
    student.user.departmentId !== targetClass.program.departmentId ||
    student.class.program.departmentId !== targetClass.program.departmentId
  ) {
    throw new ForbiddenError("Student transfer is limited to the same department");
  }

  if (student.class.crId === student.studentId) {
    throw new ConflictError("Reassign or remove the class representative role before transfer");
  }

  const updatedStudent = await prisma.$transaction(async (tx) => {
    const updated = await tx.studentInfo.update({
      where: { studentId: data.studentId },
      data: { classId },
      select: classStudentSelect,
    });

    await tx.serverMembership.upsert({
      where: { userId_serverId: { userId: data.studentId, serverId: targetClass.serverId } },
      create: {
        userId: data.studentId,
        serverId: targetClass.serverId,
        isAutoJoined: true,
      },
      update: {},
    });

    await cleanupAutoClassMembershipIfUnused(
      tx,
      data.studentId,
      student.classId,
      student.class.serverId
    );

    return updated;
  });

  return updatedStudent;
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
      isActive: true,
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
    data: teachers,
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
    const assignedCourseIds = data.teacherAssignments.map((a) => a.courseId);

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

    const missingCourses = curriculumCourseIds.filter((id) => !assignedCourseIds.includes(id));
    if (missingCourses.length > 0) {
      throw new ValidationError(
        `Teacher assignments are required for all curriculum courses. Missing assignments for course IDs: ${missingCourses.join(", ")}`
      );
    }

    for (const teacherId of [...new Set(data.teacherAssignments.map((a) => a.teacherId))]) {
      await assertActiveTeacher(teacherId);
    }
  } else if (data.teacherAssignments.length > 0) {
    throw new ValidationError(
      "Teacher assignments were provided but no curriculum exists for the next semester"
    );
  }

  const previousTeacherIds = await prisma.teaches.findMany({
    where: { classId },
    select: { teacherId: true },
    distinct: ["teacherId"],
  });

  const advancedClass = await prisma.$transaction(async (tx) => {
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
        const existingChannel = await tx.channel.findFirst({
          where: {
            serverId: classRecord.serverId,
            courseId: entry.courseId,
          },
          select: { id: true },
        });

        if (existingChannel) {
          await tx.channel.update({
            where: { id: existingChannel.id },
            data: {
              isArchived: false,
              archivedAt: null,
              archivedBy: null,
              isLocked: false,
              lockedBy: null,
              lockedAt: null,
            },
          });
        } else {
          await tx.channel.create({
            data: {
              serverId: classRecord.serverId,
              name: entry.course.code,
              type: "COURSE",
              courseId: entry.courseId,
              isAutoCreated: true,
              createdBy: userId,
            },
          });
        }

        const assignment = data.teacherAssignments.find((a) => a.courseId === entry.courseId);
        if (assignment) {
          await tx.teaches.create({
            data: {
              teacherId: assignment.teacherId,
              courseId: entry.courseId,
              classId,
            },
          });

          await tx.serverMembership.upsert({
            where: {
              userId_serverId: {
                userId: assignment.teacherId,
                serverId: classRecord.serverId,
              },
            },
            create: {
              userId: assignment.teacherId,
              serverId: classRecord.serverId,
              isAutoJoined: true,
            },
            update: {},
          });
        }
      }
    }

    for (const previousTeacher of previousTeacherIds) {
      await cleanupAutoClassMembershipIfUnused(
        tx,
        previousTeacher.teacherId,
        classId,
        classRecord.serverId
      );
    }

    return updatedClass;
  });

  return {
    ...advancedClass,
    permissions: buildClassPermissions(
      await getPermissionContext(userId),
      buildClassPermissionTarget(advancedClass)
    ),
  };
}

export async function graduateClass(classId: number, userId: number, userType: string) {
  const classRecord = await getManagedClassOrThrow(classId);
  assertClassIsActive(classRecord);
  await assertHodOrAdmin(userId, userType, classRecord.program.departmentId);

  if (classRecord.currentSemester !== classRecord.program.semesters) {
    throw new ValidationError("Only final-semester classes can be graduated");
  }

  const graduatedClass = await prisma.$transaction(async (tx) => {
    const now = new Date();
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

    return updatedClass;
  });

  return {
    ...graduatedClass,
    permissions: buildClassPermissions(
      await getPermissionContext(userId),
      buildClassPermissionTarget(graduatedClass)
    ),
  };
}
