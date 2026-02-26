import { prisma } from "../../config/prisma.js";
import { NotFoundError } from "../../shared/errors/index.js";

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
} as const;

const departmentDetailSelect = {
  id: true,
  name: true,
  code: true,
  serverId: true,
  hod: {
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
} as const;

// ─── Department Service Functions ──────────────────────────────────────────

export async function createDepartment(data: CreateDepartmentInput, createdById: number) {
  return prisma.$transaction(async (tx) => {
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
}

export async function listDepartments() {
  return prisma.department.findMany({
    select: departmentListSelect,
    orderBy: { name: "asc" },
  });
}

export async function getDepartmentById(id: number) {
  const department = await prisma.department.findUnique({
    where: { id },
    select: departmentDetailSelect,
  });

  if (!department) {
    throw new NotFoundError("Department not found");
  }

  return department;
}

export async function updateDepartment(id: number, data: UpdateDepartmentInput) {
  const department = await prisma.department.findUnique({
    where: { id },
    select: { id: true, serverId: true },
  });

  if (!department) {
    throw new NotFoundError("Department not found");
  }

  return prisma.$transaction(async (tx) => {
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
