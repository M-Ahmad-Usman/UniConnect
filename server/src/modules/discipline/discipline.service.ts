import { prisma } from "../../config/prisma.js";

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
