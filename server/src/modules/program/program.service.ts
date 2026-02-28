import { prisma } from "../../config/prisma.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../../shared/errors/index.js";

// ─── Types ─────────────────────────────────────────────────────────────────

type UpdateProgramInput = {
  semesters?: number;
  code?: string;
};

type AddCurriculumInput = {
  courseId: number;
  semesterNumber: number;
  batchYear: number;
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

// ─── Service Functions ─────────────────────────────────────────────────────

export async function updateProgram(id: number, data: UpdateProgramInput) {
  const program = await prisma.program.findUnique({
    where: { id },
    select: { id: true, code: true, departmentId: true },
  });

  if (!program) {
    throw new NotFoundError("Program not found");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.program.update({
      where: { id },
      data,
      select: programSelect,
    });

    if (data.code && data.code !== program.code) {
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
          data: { name: data.code },
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

  return prisma.programCurriculum.findMany({
    where,
    select: curriculumSelect,
    orderBy: [{ semesterNumber: "asc" }, { course: { code: "asc" } }],
  });
}

export async function addCurriculum(
  userId: number,
  userType: string,
  programId: number,
  data: AddCurriculumInput
) {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { id: true, semesters: true, departmentId: true },
  });

  if (!program) {
    throw new NotFoundError("Program not found");
  }

  await assertHodOrAdmin(userId, userType, program.departmentId);

  if (data.semesterNumber > program.semesters) {
    throw new ValidationError(
      `Semester number (${data.semesterNumber}) exceeds program's total semesters (${program.semesters})`
    );
  }

  const course = await prisma.course.findUnique({
    where: { id: data.courseId },
    select: { id: true, departmentId: true },
  });

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  if (course.departmentId !== program.departmentId) {
    throw new ForbiddenError("Course must belong to the same department as the program");
  }

  const existing = await prisma.programCurriculum.findUnique({
    where: {
      programId_courseId_batchYear: {
        programId,
        courseId: data.courseId,
        batchYear: data.batchYear,
      },
    },
  });

  if (existing) {
    throw new ConflictError("This course is already in the curriculum for this program and batch year");
  }

  return prisma.programCurriculum.create({
    data: {
      programId,
      courseId: data.courseId,
      semesterNumber: data.semesterNumber,
      batchYear: data.batchYear,
    },
    select: curriculumSelect,
  });
}

export async function removeCurriculum(
  userId: number,
  userType: string,
  programId: number,
  curriculumId: number
) {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { id: true, departmentId: true },
  });

  if (!program) {
    throw new NotFoundError("Program not found");
  }

  await assertHodOrAdmin(userId, userType, program.departmentId);

  const entry = await prisma.programCurriculum.findUnique({
    where: { id: curriculumId },
    select: { id: true, programId: true },
  });

  if (!entry || entry.programId !== programId) {
    throw new NotFoundError("Curriculum entry not found");
  }

  await prisma.programCurriculum.delete({
    where: { id: curriculumId },
  });
}
