import type { TeachingAssignmentEndReason } from "@prisma/client";
import type { PrismaTransaction } from "../lifecycle/society.js";

export async function archiveTeachingAssignments(
  client: PrismaTransaction,
  where: { classId: number; courseId?: number },
  semesterNumber: number,
  endedBy: number,
  endReason: TeachingAssignmentEndReason,
) {
  const assignments = await client.teaches.findMany({
    where,
    select: {
      teacherId: true,
      courseId: true,
      classId: true,
      channelId: true,
      assignedBy: true,
      assignedAt: true,
    },
  });

  if (assignments.length === 0) return [];

  await client.teachingAssignmentHistory.createMany({
    data: assignments.map((assignment) => ({
      ...assignment,
      semesterNumber,
      endedBy,
      endReason,
    })),
  });

  return assignments;
}
