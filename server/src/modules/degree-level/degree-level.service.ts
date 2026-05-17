import { prisma } from "../../config/prisma.js";

const degreeLevelSelect = {
  id: true,
  level: true,
} as const;

export async function listDegreeLevels() {
  return prisma.degreeLevel.findMany({
    select: degreeLevelSelect,
    orderBy: { level: "asc" },
  });
}
