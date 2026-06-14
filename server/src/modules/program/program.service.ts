import { prisma } from "../../config/prisma.js";
import { ApiErrorCode, ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../../shared/errors/index.js";
import { buildPaginationResponse, parsePagination } from "../../shared/utils/pagination.js";
import type { Prisma } from "@prisma/client";
import { lockProgramForHodPdOrAdmin } from "../../shared/lifecycle/academic.js";
import { buildImpactGroup, IMPACT_PREVIEW_LIMIT } from "../../shared/lifecycle/impact.js";
import {
  assertCurriculumSemesterEditable,
  assertFullCurriculumExists,
} from "../../shared/curriculum/policy.js";

// ─── Types ─────────────────────────────────────────────────────────────────

type UpdateProgramInput = {
  semesters?: number;
  code?: string;
  confirmSemesterReduction?: boolean;
};

type ListProgramsQuery = {
  page?: unknown;
  limit?: unknown;
  departmentId?: number;
  departmentIds?: number[];
  disciplineId?: number;
  degreeLevelId?: number;
  programIds?: number[];
  search?: string;
};

type AddCurriculumInput = {
  courseId: number;
  semesterNumber: number;
  batchYear: number;
};

type BulkAddCurriculumInput = {
  courseIds: number[];
  semesterNumber: number;
  batchYear: number;
};

type CopyCurriculumBatchInput = {
  sourceBatchYear: number;
  targetBatchYear: number;
};

type GetCurriculumFilters = {
  semesterNumber?: number;
  batchYear?: number;
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const programSelect = {
  id: true,
  code: true,
  semesters: true,
  departmentId: true,
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
} as const;

const programDetailSelect = {
  ...programSelect,
  department: {
    select: {
      id: true,
      name: true,
      code: true,
      serverId: true,
      server: { select: { publicId: true } },
    },
  },
  programDirector: {
    select: {
      designation: true,
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
      classes: true,
      curriculum: true,
    },
  },
} as const;

const curriculumSelect = {
  id: true,
  semesterNumber: true,
  batchYear: true,
  course: {
    select: {
      id: true,
      code: true,
      title: true,
      creditHours: true,
    },
  },
} as const;

function toPublicProgramDetail<T extends {
  department: {
    serverId: number;
    server: { publicId: string };
  };
}>(program: T) {
  const { department, ...programData } = program;
  const {
    serverId: _serverId,
    server,
    ...departmentData
  } = department;
  return {
    ...programData,
    department: {
      ...departmentData,
      serverPublicId: server.publicId,
    },
  };
}

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

async function assertCoursesBelongToProgramDepartment(
  tx: Prisma.TransactionClient,
  courseIds: number[],
  departmentId: number,
) {
  const uniqueCourseIds = [...new Set(courseIds)];
  const courses = await tx.course.findMany({
    where: { id: { in: uniqueCourseIds } },
    select: { id: true, departmentId: true },
  });
  const foundIds = new Set(courses.map((course) => course.id));
  const missingIds = uniqueCourseIds.filter((courseId) => !foundIds.has(courseId));
  if (missingIds.length > 0) {
    throw new NotFoundError(`Course(s) not found: ${missingIds.join(", ")}`);
  }
  const foreignIds = courses
    .filter((course) => course.departmentId !== departmentId)
    .map((course) => course.id);
  if (foreignIds.length > 0) {
    throw new ForbiddenError("All courses must belong to the same department as the program");
  }
}

async function assertRemovalKeepsLiveBatchComplete(
  tx: Prisma.TransactionClient,
  entry: { id: number; programId: number; semesterNumber: number; batchYear: number },
) {
  const classCount = await tx.class.count({
    where: { programId: entry.programId, admissionYear: entry.batchYear },
  });
  if (classCount === 0) return;

  const remainingInSemester = await tx.programCurriculum.count({
    where: {
      programId: entry.programId,
      batchYear: entry.batchYear,
      semesterNumber: entry.semesterNumber,
      id: { not: entry.id },
    },
  });
  if (remainingInSemester === 0) {
    throw new ConflictError(
      `Semester ${entry.semesterNumber} must keep at least one curriculum course for existing batch ${entry.batchYear} classes`,
    );
  }
}

// ─── Service Functions ─────────────────────────────────────────────────────

export async function listPrograms(query: ListProgramsQuery) {
  const { page, limit, skip, take } = parsePagination(query);

  const andFilters: Prisma.ProgramWhereInput[] = [];
  if (query.departmentId !== undefined) {
    andFilters.push({ departmentId: query.departmentId });
  } else {
    const scopeFilters: Prisma.ProgramWhereInput[] = [];
    if (query.departmentIds !== undefined) {
      scopeFilters.push({ departmentId: { in: query.departmentIds } });
    }
    if (query.programIds !== undefined) {
      scopeFilters.push({ id: { in: query.programIds } });
    }
    if (scopeFilters.length === 1) {
      andFilters.push(scopeFilters[0]!);
    } else if (scopeFilters.length > 1) {
      andFilters.push({ OR: scopeFilters });
    }
  }
  if (query.disciplineId !== undefined) andFilters.push({ disciplineId: query.disciplineId });
  if (query.degreeLevelId !== undefined) andFilters.push({ degreeLevelId: query.degreeLevelId });
  if (query.search) {
    andFilters.push({ OR: [
      { code: { contains: query.search, mode: "insensitive" } },
      { department: { name: { contains: query.search, mode: "insensitive" } } },
      { department: { code: { contains: query.search, mode: "insensitive" } } },
      { discipline: { name: { contains: query.search, mode: "insensitive" } } },
      { degreeLevel: { level: { contains: query.search, mode: "insensitive" } } },
    ] });
  }
  const where: Prisma.ProgramWhereInput = andFilters.length > 0 ? { AND: andFilters } : {};

  const [programs, total] = await prisma.$transaction([
    prisma.program.findMany({
      where,
      select: programDetailSelect,
      orderBy: [{ department: { name: "asc" } }, { code: "asc" }],
      skip,
      take,
    }),
    prisma.program.count({ where }),
  ]);

  return {
    data: programs.map(toPublicProgramDetail),
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function getProgramById(id: number) {
  const program = await prisma.program.findUnique({
    where: { id },
    select: programDetailSelect,
  });

  if (!program) {
    throw new NotFoundError("Program not found");
  }

  return toPublicProgramDetail(program);
}

export async function getProgramDeletionImpact(programId: number) {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: {
      id: true,
      code: true,
      semesters: true,
      department: { select: { id: true, name: true, code: true } },
      discipline: { select: { id: true, name: true } },
      degreeLevel: { select: { id: true, level: true } },
    },
  });

  if (!program) {
    throw new NotFoundError("Program not found");
  }

  const [
    classCount,
    classPreview,
    curriculumCount,
    curriculumPreview,
    channelCount,
    channelPreview,
    postCount,
    preferenceCount,
    roleCount,
  ] = await Promise.all([
    prisma.class.count({ where: { programId } }),
    prisma.class.findMany({
      where: { programId },
      select: {
        publicId: true,
        currentSemester: true,
        academicYear: true,
        admissionYear: true,
        section: true,
        status: true,
      },
      orderBy: [{ admissionYear: "desc" }, { section: "asc" }],
      take: IMPACT_PREVIEW_LIMIT,
    }),
    prisma.programCurriculum.count({ where: { programId } }),
    prisma.programCurriculum.findMany({
      where: { programId },
      select: {
        id: true,
        semesterNumber: true,
        batchYear: true,
        course: { select: { id: true, code: true, title: true } },
      },
      orderBy: [{ semesterNumber: "asc" }, { course: { code: "asc" } }],
      take: IMPACT_PREVIEW_LIMIT,
    }),
    prisma.channel.count({ where: { programId } }),
    prisma.channel.findMany({
      where: { programId },
      select: {
        publicId: true,
        name: true,
        type: true,
        isDeleted: true,
        isArchived: true,
      },
      orderBy: { createdAt: "asc" },
      take: IMPACT_PREVIEW_LIMIT,
    }),
    prisma.post.count({ where: { channel: { programId } } }),
    prisma.notificationPreference.count({ where: { channel: { programId } } }),
    prisma.userRoleAssignment.count({ where: { channel: { programId } } }),
  ]);

  return {
    program,
    canDelete: classCount === 0,
    checksComplete: true,
    pendingChecks: [] as string[],
    blockers: {
      enrolledClasses: buildImpactGroup(classCount, classPreview),
    },
    cleanupImpact: {
      curriculumEntries: buildImpactGroup(curriculumCount, curriculumPreview),
    },
    communicationImpact: {
      channels: buildImpactGroup(channelCount, channelPreview),
      posts: { count: postCount },
      notificationPreferences: { count: preferenceCount },
      platformRoleAssignments: { count: roleCount },
    },
  };
}

export async function updateProgram(id: number, data: UpdateProgramInput) {
  const { confirmSemesterReduction = false, ...programData } = data;
  const program = await prisma.program.findUnique({
    where: { id },
    select: { id: true, code: true, semesters: true, departmentId: true },
  });

  if (!program) {
    throw new NotFoundError("Program not found");
  }

  if (programData.code && programData.code !== program.code) {
    const existing = await prisma.program.findUnique({
      where: { code: programData.code },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictError("A program with this code already exists", ApiErrorCode.DUPLICATE_PROGRAM_CODE);
    }
  }

  return prisma.$transaction(async (tx) => {
    const [classCount, curriculumAboveNewSemesterCount] = await Promise.all([
      tx.class.count({ where: { programId: id } }),
      programData.semesters !== undefined && programData.semesters < program.semesters
        ? tx.programCurriculum.count({
            where: {
              programId: id,
              semesterNumber: { gt: programData.semesters },
            },
          })
        : Promise.resolve(0),
    ]);

    const codeChanged = programData.code !== undefined && programData.code !== program.code;
    const semestersChanged = programData.semesters !== undefined && programData.semesters !== program.semesters;

    if (classCount > 0 && (codeChanged || semestersChanged)) {
      throw new ConflictError(
        "Program code and semester count are locked after classes have been enrolled",
        ApiErrorCode.RESOURCE_IN_USE,
      );
    }

    if (curriculumAboveNewSemesterCount > 0 && !confirmSemesterReduction) {
      throw new ConflictError(
        `Reducing semesters will delete ${curriculumAboveNewSemesterCount} curriculum entr${curriculumAboveNewSemesterCount === 1 ? "y" : "ies"} above semester ${programData.semesters}. Resubmit with confirmation to continue.`,
        ApiErrorCode.RESOURCE_IN_USE,
      );
    }

    if (curriculumAboveNewSemesterCount > 0 && programData.semesters !== undefined) {
      await tx.programCurriculum.deleteMany({
        where: {
          programId: id,
          semesterNumber: { gt: programData.semesters },
        },
      });
    }

    const updated = await tx.program.update({
      where: { id },
      data: programData,
      select: programSelect,
    });

    if (programData.code && programData.code !== program.code) {
      const department = await tx.department.findUnique({
        where: { id: program.departmentId },
        select: { serverId: true },
      });

      if (department) {
        await tx.channel.updateMany({
          where: {
            serverId: department.serverId,
            programId: program.id,
            isAutoCreated: true,
          },
          data: { name: programData.code },
        });
      }
    }

    return updated;
  });
}

// ─── Curriculum Service Functions ──────────────────────────────────────────

export async function getCurriculum(programId: number, filters: GetCurriculumFilters = {}) {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { id: true },
  });

  if (!program) {
    throw new NotFoundError("Program not found");
  }

  const where: Record<string, unknown> = { programId };
  if (filters.semesterNumber) where.semesterNumber = filters.semesterNumber;
  if (filters.batchYear) where.batchYear = filters.batchYear;

  const entries = await prisma.programCurriculum.findMany({
    where,
    select: curriculumSelect,
    orderBy: [{ semesterNumber: "asc" }, { course: { code: "asc" } }],
  });
  const batchYears = [...new Set(entries.map((entry) => entry.batchYear))];
  const classes = await prisma.class.findMany({
    where: { programId, admissionYear: { in: batchYears } },
    select: { admissionYear: true, currentSemester: true },
  });
  const lockedByBatchYear = new Map<number, number>();
  for (const classRecord of classes) {
    lockedByBatchYear.set(
      classRecord.admissionYear,
      Math.max(lockedByBatchYear.get(classRecord.admissionYear) ?? 0, classRecord.currentSemester),
    );
  }

  return entries.map((entry) => {
    const lockedThroughSemester = lockedByBatchYear.get(entry.batchYear) ?? 0;
    return {
      ...entry,
      isLocked: entry.semesterNumber <= lockedThroughSemester,
      lockedThroughSemester,
    };
  });
}

export async function addCurriculum(
  userId: number,
  userType: string,
  programId: number,
  data: AddCurriculumInput
) {
  const result = await bulkAddCurriculum(userId, userType, programId, {
    courseIds: [data.courseId],
    semesterNumber: data.semesterNumber,
    batchYear: data.batchYear,
  });
  if (result.skippedCourseIds.includes(data.courseId)) {
    throw new ConflictError("This course is already in the curriculum for this program and batch year");
  }
  const entry = result.entries.find((item) => item.course.id === data.courseId);
  if (!entry) {
    throw new ConflictError("Curriculum entry could not be created");
  }
  return entry;
}

export async function bulkAddCurriculum(
  userId: number,
  userType: string,
  programId: number,
  data: BulkAddCurriculumInput,
) {
  return prisma.$transaction(async (tx) => {
    const program = await lockProgramForHodPdOrAdmin(programId, userId, userType, tx);
    if (data.semesterNumber > program.semesters) {
      throw new ValidationError(
        `Semester number (${data.semesterNumber}) exceeds program's total semesters (${program.semesters})`
      );
    }
    await assertCurriculumSemesterEditable(tx, {
      programId,
      batchYear: data.batchYear,
      semesterNumber: data.semesterNumber,
    });
    const uniqueCourseIds = [...new Set(data.courseIds)];
    await assertCoursesBelongToProgramDepartment(tx, uniqueCourseIds, program.department_id);
    const existing = await tx.programCurriculum.findMany({
      where: { programId, batchYear: data.batchYear, courseId: { in: uniqueCourseIds } },
      select: { courseId: true },
    });
    const existingCourseIds = new Set(existing.map((entry) => entry.courseId));
    const newCourseIds = uniqueCourseIds.filter((courseId) => !existingCourseIds.has(courseId));
    if (newCourseIds.length > 0) {
      await tx.programCurriculum.createMany({
        data: newCourseIds.map((courseId) => ({
          programId,
          courseId,
          semesterNumber: data.semesterNumber,
          batchYear: data.batchYear,
        })),
        skipDuplicates: true,
      });
    }
    const entries = await tx.programCurriculum.findMany({
      where: {
        programId,
        batchYear: data.batchYear,
        courseId: { in: newCourseIds },
      },
      select: curriculumSelect,
      orderBy: { course: { code: "asc" } },
    });
    return {
      entries,
      addedCount: entries.length,
      skippedCourseIds: uniqueCourseIds.filter((courseId) => existingCourseIds.has(courseId)),
    };
  });
}

export async function copyCurriculumBatch(
  userId: number,
  userType: string,
  programId: number,
  data: CopyCurriculumBatchInput,
) {
  return prisma.$transaction(async (tx) => {
    const program = await lockProgramForHodPdOrAdmin(programId, userId, userType, tx);
    const sourceEntries = await tx.programCurriculum.findMany({
      where: { programId, batchYear: data.sourceBatchYear },
      select: {
        courseId: true,
        semesterNumber: true,
      },
      orderBy: [{ semesterNumber: "asc" }, { course: { code: "asc" } }],
    });
    await assertFullCurriculumExists(tx, {
      programId,
      programSemesters: program.semesters,
      batchYear: data.sourceBatchYear,
    });
    const targetExisting = await tx.programCurriculum.findMany({
      where: {
        programId,
        batchYear: data.targetBatchYear,
        courseId: { in: sourceEntries.map((entry) => entry.courseId) },
      },
      select: { courseId: true },
    });
    const existingCourseIds = new Set(targetExisting.map((entry) => entry.courseId));
    const entriesToCreate = sourceEntries.filter((entry) => !existingCourseIds.has(entry.courseId));
    for (const entry of entriesToCreate) {
      await assertCurriculumSemesterEditable(tx, {
        programId,
        batchYear: data.targetBatchYear,
        semesterNumber: entry.semesterNumber,
      });
    }
    if (entriesToCreate.length > 0) {
      await tx.programCurriculum.createMany({
        data: entriesToCreate.map((entry) => ({
          programId,
          courseId: entry.courseId,
          semesterNumber: entry.semesterNumber,
          batchYear: data.targetBatchYear,
        })),
        skipDuplicates: true,
      });
    }
    const entries = await tx.programCurriculum.findMany({
      where: {
        programId,
        batchYear: data.targetBatchYear,
        courseId: { in: entriesToCreate.map((entry) => entry.courseId) },
      },
      select: curriculumSelect,
      orderBy: [{ semesterNumber: "asc" }, { course: { code: "asc" } }],
    });
    return {
      entries,
      addedCount: entries.length,
      skippedCourseIds: sourceEntries
        .filter((entry) => existingCourseIds.has(entry.courseId))
        .map((entry) => entry.courseId),
    };
  });
}

export async function removeCurriculum(
  userId: number,
  userType: string,
  programId: number,
  curriculumId: number
) {
  await prisma.$transaction(async (tx) => {
    await lockProgramForHodPdOrAdmin(programId, userId, userType, tx);
    const entry = await tx.programCurriculum.findUnique({
      where: { id: curriculumId },
      select: { id: true, programId: true, semesterNumber: true, batchYear: true },
    });
    if (!entry || entry.programId !== programId) {
      throw new NotFoundError("Curriculum entry not found");
    }
    await assertCurriculumSemesterEditable(tx, entry);
    await assertRemovalKeepsLiveBatchComplete(tx, entry);
    await tx.programCurriculum.delete({ where: { id: curriculumId } });
  });
}
