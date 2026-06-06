import { prisma } from "../../config/prisma.js";
import { ForbiddenError, NotFoundError } from "../../shared/errors/index.js";
import { invalidateSystemStatsCache } from "../admin/admin.service.js";
import type { AuthUser } from "../../shared/types/index.js";
import { getServerCommunicationImpact } from "../../shared/lifecycle/communication-impact.js";
import { buildImpactGroup, IMPACT_PREVIEW_LIMIT } from "../../shared/lifecycle/impact.js";

// ─── Types ─────────────────────────────────────────────────────────────────

type CreateDepartmentInput = {
  name: string;
  code: string;
};

type UpdateDepartmentInput = {
  name?: string;
  code?: string;
};

type CreateProgramInput = {
  departmentId: number;
  disciplineId: number;
  degreeLevelId: number;
  semesters: number;
  code: string;
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const departmentListSelect = {
  id: true,
  name: true,
  code: true,
  serverId: true,
  server: { select: { publicId: true } },
} as const;

const departmentDetailSelect = {
  id: true,
  name: true,
  code: true,
  serverId: true,
  server: { select: { publicId: true } },
  hod: {
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
      programs: true,
    },
  },
} as const;

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
  _count: {
    select: {
      classes: true,
      curriculum: true,
    },
  },
} as const;

function toPublicDepartment<T extends {
  serverId: number;
  server: { publicId: string };
}>(department: T): Omit<T, "serverId" | "server"> & { serverPublicId: string } {
  const { serverId: _serverId, server, ...departmentData } = department;
  return {
    ...departmentData,
    serverPublicId: server.publicId,
  };
}

// ─── Department Service Functions ──────────────────────────────────────────

export async function createDepartment(data: CreateDepartmentInput, createdById: number) {
  const department = await prisma.$transaction(async (tx) => {
    const server = await tx.server.create({
      data: {
        name: data.name,
        type: "DEPARTMENT",
        createdBy: createdById,
      },
    });

    const department = await tx.department.create({
      data: {
        name: data.name,
        code: data.code,
        serverId: server.id,
      },
      select: departmentListSelect,
    });

    await tx.channel.create({
      data: {
        serverId: server.id,
        name: "announcements",
        type: "ANNOUNCEMENT",
        isAutoCreated: true,
        createdBy: createdById,
      },
    });

    return department;
  });

  invalidateSystemStatsCache();
  return toPublicDepartment(department);
}

export async function listDepartments() {
  const departments = await prisma.department.findMany({
    select: departmentListSelect,
    orderBy: { name: "asc" },
  });
  return departments.map(toPublicDepartment);
}

export async function getDepartmentById(id: number) {
  const department = await prisma.department.findUnique({
    where: { id },
    select: departmentDetailSelect,
  });

  if (!department) {
    throw new NotFoundError("Department not found");
  }

  return toPublicDepartment(department);
}

export async function updateDepartment(id: number, data: UpdateDepartmentInput) {
  const department = await prisma.department.findUnique({
    where: { id },
    select: { id: true, serverId: true },
  });

  if (!department) {
    throw new NotFoundError("Department not found");
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (data.name) {
      await tx.server.update({
        where: { id: department.serverId },
        data: { name: data.name },
      });
    }

    return tx.department.update({
      where: { id },
      data,
      select: departmentListSelect,
    });
  });
  return toPublicDepartment(updated);
}

// ─── Program Service Functions ─────────────────────────────────────────────

export async function createProgram(data: CreateProgramInput, createdById: number) {
  const department = await prisma.department.findUnique({
    where: { id: data.departmentId },
    select: { id: true, serverId: true },
  });

  if (!department) {
    throw new NotFoundError("Department not found");
  }

  const discipline = await prisma.discipline.findUnique({
    where: { id: data.disciplineId },
  });

  if (!discipline) {
    throw new NotFoundError("Discipline not found");
  }

  const degreeLevel = await prisma.degreeLevel.findUnique({
    where: { id: data.degreeLevelId },
  });

  if (!degreeLevel) {
    throw new NotFoundError("Degree level not found");
  }

  return prisma.$transaction(async (tx) => {
    const program = await tx.program.create({
      data: {
        departmentId: data.departmentId,
        disciplineId: data.disciplineId,
        degreeLevelId: data.degreeLevelId,
        semesters: data.semesters,
        code: data.code,
      },
      select: programSelect,
    });

    await tx.channel.create({
      data: {
        serverId: department.serverId,
        name: data.code,
        type: "PROGRAM",
        programId: program.id,
        isAutoCreated: true,
        createdBy: createdById,
      },
    });

    return program;
  });
}

export async function listPrograms(departmentId: number) {
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
  });

  if (!department) {
    throw new NotFoundError("Department not found");
  }

  return prisma.program.findMany({
    where: { departmentId },
    select: programSelect,
    orderBy: { code: "asc" },
  });
}

// ─── Department Stats ──────────────────────────────────────────────────────

export async function getDepartmentStats(departmentId: number, requestingUser: AuthUser) {
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true, hodId: true },
  });

  if (!department) {
    throw new NotFoundError("Department not found");
  }

  if (requestingUser.userType !== "ADMIN") {
    if (department.hodId !== requestingUser.id) {
      throw new ForbiddenError("Only the HOD of this department can view its stats");
    }
  }

  const [students, teachers, classes, societies] = await Promise.all([
    prisma.user.count({ where: { departmentId, userType: "STUDENT", status: "ACTIVE", isDeleted: false } }),
    prisma.user.count({ where: { departmentId, userType: "TEACHER", status: "ACTIVE", isDeleted: false } }),
    prisma.class.count({ where: { program: { departmentId } } }),
    prisma.society.count({ where: { departmentId, status: "ACTIVE", isDeleted: false } }),
  ]);

  return { departmentId, students, teachers, classes, societies };
}

export async function getDepartmentDeletionImpact(departmentId: number) {
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: {
      id: true,
      name: true,
      code: true,
      serverId: true,
      server: { select: { publicId: true } },
    },
  });

  if (!department) {
    throw new NotFoundError("Department not found");
  }

  const dependentCourseWhere = {
    departmentId,
    OR: [
      { curriculum: { some: {} } },
      { teaches: { some: {} } },
      { channels: { some: {} } },
    ],
  };

  const [
    programCount,
    programPreview,
    userCount,
    userPreview,
    userTypeCounts,
    societyCount,
    societyPreview,
    dependentCourseCount,
    dependentCoursePreview,
    communicationImpact,
  ] = await Promise.all([
    prisma.program.count({ where: { departmentId } }),
    prisma.program.findMany({
      where: { departmentId },
      select: {
        id: true,
        code: true,
        semesters: true,
        discipline: { select: { id: true, name: true } },
        degreeLevel: { select: { id: true, level: true } },
      },
      orderBy: { code: "asc" },
      take: IMPACT_PREVIEW_LIMIT,
    }),
    prisma.user.count({ where: { departmentId } }),
    prisma.user.findMany({
      where: { departmentId },
      select: {
        publicId: true,
        fullName: true,
        email: true,
        userType: true,
        status: true,
        isDeleted: true,
      },
      orderBy: { fullName: "asc" },
      take: IMPACT_PREVIEW_LIMIT,
    }),
    prisma.user.groupBy({
      by: ["userType"],
      where: { departmentId },
      _count: { _all: true },
    }),
    prisma.society.count({ where: { departmentId } }),
    prisma.society.findMany({
      where: { departmentId },
      select: {
        publicId: true,
        name: true,
        status: true,
        isDeleted: true,
      },
      orderBy: { name: "asc" },
      take: IMPACT_PREVIEW_LIMIT,
    }),
    prisma.course.count({ where: dependentCourseWhere }),
    prisma.course.findMany({
      where: dependentCourseWhere,
      select: {
        id: true,
        code: true,
        title: true,
        _count: { select: { curriculum: true, teaches: true, channels: true } },
      },
      orderBy: { code: "asc" },
      take: IMPACT_PREVIEW_LIMIT,
    }),
    getServerCommunicationImpact(department.serverId),
  ]);

  const userCountsByType = userTypeCounts.reduce<Record<string, number>>((counts, row) => {
    counts[row.userType] = row._count._all;
    return counts;
  }, {});

  const blockers = {
    programs: buildImpactGroup(programCount, programPreview),
    departmentUsers: {
      ...buildImpactGroup(userCount, userPreview),
      byUserType: userCountsByType,
    },
    societies: buildImpactGroup(societyCount, societyPreview),
    dependentCourses: buildImpactGroup(dependentCourseCount, dependentCoursePreview),
  };
  const canDelete =
    programCount === 0 &&
    userCount === 0 &&
    societyCount === 0 &&
    dependentCourseCount === 0;

  return {
    department: {
      id: department.id,
      name: department.name,
      code: department.code,
      serverPublicId: department.server.publicId,
    },
    canDelete,
    checksComplete: true,
    pendingChecks: [] as string[],
    blockers,
    communicationImpact,
  };
}
