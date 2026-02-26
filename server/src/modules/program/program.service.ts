import { prisma } from "../../config/prisma.js";
import { NotFoundError } from "../../shared/errors/index.js";

// ─── Types ─────────────────────────────────────────────────────────────────

type UpdateProgramInput = {
  semesters?: number;
  code?: string;
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
