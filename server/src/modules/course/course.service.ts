import { prisma } from "../../config/prisma.js";
import { ApiErrorCode, ConflictError, ForbiddenError, NotFoundError } from "../../shared/errors/index.js";
import { parsePagination, buildPaginationResponse } from "../../shared/utils/pagination.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { lockDepartmentForHodOrAdmin } from "../../shared/lifecycle/academic.js";
import { buildImpactGroup, IMPACT_PREVIEW_LIMIT } from "../../shared/lifecycle/impact.js";

// ─── Types ─────────────────────────────────────────────────────────────────

type CreateCourseInput = {
  title: string;
  code: string;
  creditHours: number;
  departmentId: number;
};

type UpdateCourseInput = {
  title?: string;
  code?: string;
  creditHours?: number;
};

type ListCoursesQuery = {
  departmentId?: number;
  search?: string;
  page?: number;
  limit?: number;
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const courseListSelect = {
  id: true,
  title: true,
  code: true,
  creditHours: true,
  departmentId: true,
} as const;

const courseDetailSelect = {
  id: true,
  title: true,
  code: true,
  creditHours: true,
  departmentId: true,
  department: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

// ─── Service Functions ─────────────────────────────────────────────────────

export async function createCourse(data: CreateCourseInput, userId: number, userType: string) {
  const existing = await prisma.course.findUnique({
    where: { code: data.code },
    select: { id: true },
  });

  if (existing) {
    throw new ConflictError("A course with this code already exists", ApiErrorCode.DUPLICATE_COURSE_CODE);
  }

  return prisma.$transaction(async (tx) => {
    await lockDepartmentForHodOrAdmin(data.departmentId, userId, userType, tx);

    return tx.course.create({
      data: {
        title: data.title,
        code: data.code,
        creditHours: data.creditHours,
        departmentId: data.departmentId,
      },
      select: courseListSelect,
    });
  });
}

export async function listCourses(query: ListCoursesQuery) {
  const { page, limit, skip, take } = parsePagination(query);

  const where: Prisma.CourseWhereInput = {};
  if (query.departmentId) where.departmentId = query.departmentId;
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { code: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      select: courseListSelect,
      orderBy: { title: "asc" },
      skip,
      take,
    }),
    prisma.course.count({ where }),
  ]);

  return {
    data: courses,
    pagination: buildPaginationResponse(page, limit, total),
  };
}

export async function getCourseById(id: number) {
  const course = await prisma.course.findUnique({
    where: { id },
    select: courseDetailSelect,
  });

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  return course;
}

export async function getCourseDeletionImpact(courseId: number) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: courseDetailSelect,
  });

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  const [
    curriculumCount,
    curriculumPreview,
    teachingCount,
    teachingPreview,
    channelCount,
    channelPreview,
    postCount,
    preferenceCount,
    roleCount,
  ] = await Promise.all([
    prisma.programCurriculum.count({ where: { courseId } }),
    prisma.programCurriculum.findMany({
      where: { courseId },
      select: {
        id: true,
        semesterNumber: true,
        batchYear: true,
        program: {
          select: {
            id: true,
            code: true,
            department: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: [{ program: { code: "asc" } }, { batchYear: "desc" }],
      take: IMPACT_PREVIEW_LIMIT,
    }),
    prisma.teaches.count({ where: { courseId } }),
    prisma.teaches.findMany({
      where: { courseId },
      select: {
        class: {
          select: {
            publicId: true,
            currentSemester: true,
            admissionYear: true,
            section: true,
            status: true,
            program: { select: { id: true, code: true } },
          },
        },
        teacher: {
          select: {
            designation: true,
            user: { select: { publicId: true, fullName: true, email: true } },
          },
        },
      },
      orderBy: [{ class: { admissionYear: "desc" } }, { class: { section: "asc" } }],
      take: IMPACT_PREVIEW_LIMIT,
    }),
    prisma.channel.count({ where: { courseId } }),
    prisma.channel.findMany({
      where: { courseId },
      select: {
        publicId: true,
        name: true,
        type: true,
        isDeleted: true,
        isArchived: true,
        server: { select: { publicId: true, name: true, type: true } },
      },
      orderBy: { createdAt: "asc" },
      take: IMPACT_PREVIEW_LIMIT,
    }),
    prisma.post.count({ where: { channel: { courseId } } }),
    prisma.notificationPreference.count({ where: { channel: { courseId } } }),
    prisma.userRoleAssignment.count({ where: { channel: { courseId } } }),
  ]);

  const canDelete = curriculumCount === 0 && teachingCount === 0 && channelCount === 0;

  return {
    course,
    canDelete,
    checksComplete: true,
    pendingChecks: [] as string[],
    blockers: {
      curriculumEntries: buildImpactGroup(curriculumCount, curriculumPreview),
      activeTeachingAssignments: buildImpactGroup(teachingCount, teachingPreview),
      courseChannels: buildImpactGroup(channelCount, channelPreview),
    },
    communicationImpact: {
      posts: { count: postCount },
      notificationPreferences: { count: preferenceCount },
      platformRoleAssignments: { count: roleCount },
    },
  };
}

export async function updateCourse(id: number, data: UpdateCourseInput) {
  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, title: true, code: true, creditHours: true },
  });

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  const changed =
    (data.title !== undefined && data.title !== course.title) ||
    (data.code !== undefined && data.code !== course.code) ||
    (data.creditHours !== undefined && data.creditHours !== course.creditHours);

  if (changed) {
    const [curriculumCount, teachingCount, channelCount] = await Promise.all([
      prisma.programCurriculum.count({ where: { courseId: id } }),
      prisma.teaches.count({ where: { courseId: id } }),
      prisma.channel.count({ where: { courseId: id } }),
    ]);

    if (curriculumCount > 0 || teachingCount > 0 || channelCount > 0) {
      throw new ConflictError(
        "Course details are locked after the course is used in curriculum, class assignments, or course channels",
        ApiErrorCode.RESOURCE_IN_USE,
      );
    }
  }

  if (data.code && data.code !== course.code) {
    const existing = await prisma.course.findUnique({
      where: { code: data.code },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictError("A course with this code already exists", ApiErrorCode.DUPLICATE_COURSE_CODE);
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.course.update({
      where: { id },
      data,
      select: courseListSelect,
    });

    if (data.code && data.code !== course.code) {
      await tx.channel.updateMany({
        where: {
          courseId: id,
          type: "COURSE",
          isAutoCreated: true,
        },
        data: { name: data.code },
      });
    }

    return updated;
  });
}
