import { prisma } from "../../config/prisma.js";
import { ConflictError, NotFoundError } from "../../shared/errors/index.js";
import { parsePagination, buildPaginationResponse } from "../../shared/utils/pagination.js";
import type { Prisma } from "../../generated/prisma/client.js";

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

export async function createCourse(data: CreateCourseInput) {
  const department = await prisma.department.findUnique({
    where: { id: data.departmentId },
    select: { id: true },
  });

  if (!department) {
    throw new NotFoundError("Department not found");
  }

  const existing = await prisma.course.findUnique({
    where: { code: data.code },
    select: { id: true },
  });

  if (existing) {
    throw new ConflictError("A course with this code already exists");
  }

  return prisma.course.create({
    data: {
      title: data.title,
      code: data.code,
      creditHours: data.creditHours,
      departmentId: data.departmentId,
    },
    select: courseListSelect,
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

export async function updateCourse(id: number, data: UpdateCourseInput) {
  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, code: true },
  });

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  if (data.code && data.code !== course.code) {
    const existing = await prisma.course.findUnique({
      where: { code: data.code },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictError("A course with this code already exists");
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
