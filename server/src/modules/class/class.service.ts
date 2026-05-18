import { prisma } from "../../config/prisma.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../../shared/errors/index.js";
import { buildPaginationResponse, parsePagination } from "../../shared/utils/pagination.js";
import {
  buildClassPermissions,
  getPermissionContext,
} from "../../shared/permissions/index.js";
import { invalidateSystemStatsCache } from "../admin/admin.service.js";
import type { Prisma } from "../../generated/prisma/client.js";

// ─── Types ─────────────────────────────────────────────────────────────────

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
  page?: number;
  limit?: number;
};

type TeacherAssignment = {
  courseId: number;
  teacherId: number;
};

type SemesterProgressionInput = {
  teacherAssignments: TeacherAssignment[];
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const classListSelect = {
  id: true,
  currentSemester: true,
  academicYear: true,
  admissionYear: true,
  section: true,
  serverId: true,
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
  program: {
    select: {
      id: true,
      code: true,
      department: {
        select: {
          id: true,
          name: true,
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

// ─── Service Functions ─────────────────────────────────────────────────────

export async function createClass(
  data: CreateClassInput,
  userId: number,
  userType: string
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

    const classRecord = await tx.class.create({
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

    return classRecord;
  });

  invalidateSystemStatsCache();
  return classRecord;
}

export async function listClasses(query: ListClassesQuery) {
  const { page, limit, skip, take } = parsePagination(query);

  const where: Prisma.ClassWhereInput = {};
  if (query.programId) where.programId = query.programId;
  if (query.departmentId) where.program = { departmentId: query.departmentId };
  if (query.semester) where.currentSemester = query.semester;
  if (query.section) where.section = query.section;

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
  const permissions = buildClassPermissions(context, {
    id: classRecord.id,
    serverId: classRecord.serverId,
    crId: classRecord.cr?.studentId ?? null,
    programId: classRecord.program.id,
    departmentId: classRecord.program.department.id,
  });

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
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      serverId: true,
      programId: true,
      program: {
        select: {
          id: true,
          departmentId: true,
        },
      },
    },
  });

  if (!classRecord) {
    throw new NotFoundError("Class not found");
  }

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

  const teacher = await prisma.teacherInfo.findUnique({
    where: { teacherId: data.teacherId },
    select: { teacherId: true },
  });

  if (!teacher) {
    throw new NotFoundError("Teacher not found");
  }

  const existingAssignment = await prisma.teaches.findFirst({
    where: {
      classId,
      courseId: data.courseId,
    },
    select: {
      teacherId: true,
    },
  });

  if (existingAssignment) {
    if (existingAssignment.teacherId === data.teacherId) {
      throw new ConflictError("This course is already assigned to this teacher for this class");
    }

    throw new ConflictError("This course is already assigned to another teacher for this class");
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

    // Auto-create course channel in the class server (if not already created)
    const existingChannel = await tx.channel.findFirst({
      where: {
        serverId: classRecord.serverId,
        courseId: data.courseId,
      },
      select: {
        id: true,
        isArchived: true,
      },
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
    } else if (existingChannel.isArchived) {
      await tx.channel.update({
        where: { id: existingChannel.id },
        data: {
          isArchived: false,
          archivedAt: null,
          archivedBy: null,
        },
      });
    }

    // Auto-add teacher to the class server if not already a member
    const existingMembership = await tx.serverMembership.findUnique({
      where: {
        userId_serverId: {
          userId: data.teacherId,
          serverId: classRecord.serverId,
        },
      },
    });

    if (!existingMembership) {
      await tx.serverMembership.create({
        data: {
          userId: data.teacherId,
          serverId: classRecord.serverId,
          isAutoJoined: true,
        },
      });
    }

    return assignment;
  });
}

export async function listClassCourses(classId: number) {
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true },
  });

  if (!classRecord) {
    throw new NotFoundError("Class not found");
  }

  return prisma.teaches.findMany({
    where: { classId },
    select: courseAssignmentSelect,
    orderBy: { course: { code: "asc" } },
  });
}

export async function removeCourseFromClass(
  classId: number,
  courseId: number,
  userId: number,
  userType: string
) {
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      serverId: true,
      programId: true,
      program: {
        select: {
          id: true,
          departmentId: true,
        },
      },
    },
  });

  if (!classRecord) {
    throw new NotFoundError("Class not found");
  }

  await assertHodOrPdOrAdmin(
    userId,
    userType,
    classRecord.program.departmentId,
    classRecord.programId
  );

  const assignments = await prisma.teaches.findMany({
    where: { classId, courseId },
  });

  if (assignments.length === 0) {
    throw new NotFoundError("Course is not assigned to this class");
  }

  await prisma.$transaction(async (tx) => {
    // Delete all teaches records for this course in this class
    await tx.teaches.deleteMany({
      where: { classId, courseId },
    });

    // Archive the course channel
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
  });
}

// ─── Semester Progression ──────────────────────────────────────────────────

export async function advanceSemester(
  classId: number,
  data: SemesterProgressionInput,
  userId: number,
  userType: string
) {
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      currentSemester: true,
      admissionYear: true,
      section: true,
      serverId: true,
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

  if (classRecord.currentSemester >= classRecord.program.semesters) {
    throw new ValidationError(
      `Class is already at the maximum semester (${classRecord.program.semesters})`
    );
  }

  await assertHodOrAdmin(userId, userType, classRecord.program.departmentId);

  const newSemester = classRecord.currentSemester + 1;

  // Lookup curriculum for next semester
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

  // Validate teacher assignments if curriculum exists
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
        `Duplicate teacher assignments found for course IDs: ${[...new Set(duplicateAssignments)].join(", ")}`
      );
    }

    const extraAssignments = assignedCourseIds.filter((id) => !curriculumCourseIds.includes(id));
    if (extraAssignments.length > 0) {
      throw new ValidationError(
        `Teacher assignments contain courses not in the target semester curriculum: ${[...new Set(extraAssignments)].join(", ")}`
      );
    }

    const missingCourses = curriculumCourseIds.filter((id) => !assignedCourseIds.includes(id));
    if (missingCourses.length > 0) {
      throw new ValidationError(
        `Teacher assignments are required for all curriculum courses. Missing assignments for course IDs: ${missingCourses.join(", ")}`
      );
    }

    // Validate all referenced teachers exist
    const teacherIds = [...new Set(data.teacherAssignments.map((a) => a.teacherId))];
    const teachers = await prisma.teacherInfo.findMany({
      where: { teacherId: { in: teacherIds } },
      select: { teacherId: true },
    });
    const foundTeacherIds = teachers.map((t) => t.teacherId);
    const missingTeachers = teacherIds.filter((id) => !foundTeacherIds.includes(id));
    if (missingTeachers.length > 0) {
      throw new NotFoundError(
        `Teachers not found: ${missingTeachers.join(", ")}`
      );
    }
  } else if (data.teacherAssignments.length > 0) {
    throw new ValidationError(
      "Teacher assignments were provided but no curriculum exists for the next semester"
    );
  }

  return prisma.$transaction(async (tx) => {
    // 1. Archive + Lock all existing course channels
    await tx.channel.updateMany({
      where: {
        serverId: classRecord.serverId,
        type: "COURSE",
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

    // 2. Clear all TEACHES records for this class
    await tx.teaches.deleteMany({
      where: { classId },
    });

    // 3. Increment semester
    const updatedClass = await tx.class.update({
      where: { id: classId },
      data: { currentSemester: newSemester },
      select: classDetailSelect,
    });

    // 4. Update server name to reflect new semester
    await tx.server.update({
      where: { id: classRecord.serverId },
      data: {
        name: `${classRecord.program.code} - S${newSemester} - Section ${classRecord.section}`,
      },
    });

    // 5. Auto-create course channels from curriculum
    if (curriculum.length > 0) {
      for (const entry of curriculum) {
        // Check for existing channel (may have been archived from a previous semester)
        const existingChannel = await tx.channel.findFirst({
          where: {
            serverId: classRecord.serverId,
            courseId: entry.courseId,
          },
          select: { id: true, isArchived: true, isLocked: true },
        });

        if (existingChannel) {
          // Un-archive and unlock if it was previously archived
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

        // Create Teaches record
        const assignment = data.teacherAssignments.find((a) => a.courseId === entry.courseId);
        if (assignment) {
          await tx.teaches.create({
            data: {
              teacherId: assignment.teacherId,
              courseId: entry.courseId,
              classId,
            },
          });

          // Auto-add teacher to class server if not already a member
          const existingMembership = await tx.serverMembership.findUnique({
            where: {
              userId_serverId: {
                userId: assignment.teacherId,
                serverId: classRecord.serverId,
              },
            },
          });

          if (!existingMembership) {
            await tx.serverMembership.create({
              data: {
                userId: assignment.teacherId,
                serverId: classRecord.serverId,
                isAutoJoined: true,
              },
            });
          }
        }
      }
    }

    return updatedClass;
  });
}
