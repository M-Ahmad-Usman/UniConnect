import { prisma } from "../../config/prisma.js";
import { buildPaginationResponse, parsePagination } from "../../shared/utils/pagination.js";

type MyTeachingQuery = {
  includeHistory?: boolean;
  historyPage?: number;
  historyLimit?: number;
};

const teachingSelect = {
  assignedAt: true,
  course: { select: { id: true, code: true, title: true, creditHours: true } },
  class: {
    select: {
      publicId: true,
      currentSemester: true,
      admissionYear: true,
      academicYear: true,
      section: true,
      status: true,
      program: { select: { id: true, code: true } },
      server: { select: { publicId: true, name: true } },
    },
  },
  channel: { select: { publicId: true, name: true, isArchived: true, isLocked: true } },
} as const;

export async function getMyTeaching(teacherId: number, query: MyTeachingQuery) {
  const includeHistory = query.includeHistory ?? true;
  const { page, limit, skip } = parsePagination({
    page: query.historyPage,
    limit: query.historyLimit,
  });

  const activeQuery = prisma.teaches.findMany({
    where: { teacherId, class: { status: "ACTIVE" } },
    select: teachingSelect,
    orderBy: [{ course: { code: "asc" } }, { class: { admissionYear: "desc" } }],
  });

  if (!includeHistory) {
    return {
      active: await activeQuery,
      history: [],
      historyPagination: buildPaginationResponse(page, limit, 0),
    };
  }

  const [active, history, historyTotal] = await prisma.$transaction([
    activeQuery,
    prisma.teachingAssignmentHistory.findMany({
      where: { teacherId },
      select: {
        publicId: true,
        semesterNumber: true,
        assignedAt: true,
        endedAt: true,
        endReason: true,
        course: teachingSelect.course,
        class: teachingSelect.class,
        channel: teachingSelect.channel,
      },
      orderBy: [{ endedAt: "desc" }, { id: "desc" }],
      skip,
      take: limit,
    }),
    prisma.teachingAssignmentHistory.count({ where: { teacherId } }),
  ]);

  return {
    active,
    history,
    historyPagination: buildPaginationResponse(page, limit, historyTotal),
  };
}
