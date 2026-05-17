import { prisma } from "../../config/prisma.js";
import { ConflictError, NotFoundError } from "../../shared/errors/index.js";

// ─── Types ─────────────────────────────────────────────────────────────────

const disciplineSelect = {
  id: true,
  name: true,
} as const;

// ─── Service Functions ─────────────────────────────────────────────────────

export async function createDiscipline(name: string) {
  return prisma.discipline.create({
    data: { name },
    select: disciplineSelect,
  });
}

export async function listDisciplines() {
  return prisma.discipline.findMany({
    select: disciplineSelect,
    orderBy: { name: "asc" },
  });
}

export async function updateDiscipline(id: number, name: string) {
  const discipline = await prisma.discipline.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!discipline) {
    throw new NotFoundError("Discipline not found");
  }

  if (name !== discipline.name) {
    const existing = await prisma.discipline.findUnique({
      where: { name },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictError("A discipline with this name already exists");
    }
  }

  return prisma.discipline.update({
    where: { id },
    data: { name },
    select: disciplineSelect,
  });
}
