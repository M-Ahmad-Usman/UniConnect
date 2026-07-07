import csvParser from "csv-parser";
import { Readable } from "stream";
import { prisma } from "../../config/prisma.js";
import { ApiErrorCode, ForbiddenError, NotFoundError, ValidationError } from "../../shared/errors/index.js";
import { getPermissionContext } from "../../shared/permissions/index.js";
import type { AuditContext } from "../audit/audit.service.js";
import { recordAuditLog } from "../audit/audit.service.js";
import * as classService from "../class/class.service.js";
import * as programService from "../program/program.service.js";
import * as userService from "../user/user.service.js";
import { enrollmentCreateStudentSchema, type EnrollmentCreateStudentInput } from "./enrollment.schema.js";

type Section = "A" | "B";
type ClassStatusFilter = "ACTIVE" | "GRADUATED" | "ALL";

interface EnrollmentListQuery {
  page?: number;
  limit?: number;
  departmentId?: number;
  programId?: number;
  semester?: number;
  section?: Section;
  status?: ClassStatusFilter;
  search?: string;
}

interface EnrollmentCandidateQuery {
  page?: number;
  limit?: number;
  search?: string;
}

interface EnrollmentAccess {
  isAdmin: boolean;
  allowedDepartmentIds: number[] | null;
}

interface ImportError {
  row: number;
  message: string;
}

interface ImportResult {
  successful: number;
  failed: number;
  errors: ImportError[];
}

function ensureDepartmentAccess(access: EnrollmentAccess, departmentId: number): void {
  if (access.allowedDepartmentIds !== null && !access.allowedDepartmentIds.includes(departmentId)) {
    throw new ForbiddenError(
      "You do not have enrollment access to this department",
      ApiErrorCode.SCOPE_FORBIDDEN
    );
  }
}

async function getEnrollmentAccess(userId: number): Promise<EnrollmentAccess> {
  const context = await getPermissionContext(userId);

  if (context.isAdmin) {
    return { isAdmin: true, allowedDepartmentIds: null };
  }

  if (context.scopes.enrollmentOfficerDepartmentIds.length > 0) {
    return {
      isAdmin: false,
      allowedDepartmentIds: context.scopes.enrollmentOfficerDepartmentIds,
    };
  }

  throw new ForbiddenError(
    "You do not have enrollment access",
    ApiErrorCode.SCOPE_FORBIDDEN
  );
}

async function resolveClassForEnrollment(
  classPublicId: string,
  access: EnrollmentAccess
): Promise<{ id: number; publicId: string; departmentId: number }> {
  const classRecord = await prisma.class.findUnique({
    where: { publicId: classPublicId },
    select: {
      id: true,
      publicId: true,
      program: { select: { departmentId: true } },
    },
  });

  if (!classRecord) {
    throw new NotFoundError("Class not found");
  }

  ensureDepartmentAccess(access, classRecord.program.departmentId);
  return {
    id: classRecord.id,
    publicId: classRecord.publicId,
    departmentId: classRecord.program.departmentId,
  };
}

async function resolveProgramDepartment(programId: number): Promise<number> {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { departmentId: true },
  });

  if (!program) {
    throw new NotFoundError("Program not found");
  }

  return program.departmentId;
}

function normalizeCsvRow(
  row: Record<string, string>
): Omit<EnrollmentCreateStudentInput, "classPublicId"> & { classPublicId: string } {
  const gender = (row.gender ?? "").trim().toUpperCase();

  return {
    fullName: (row.fullName ?? "").trim(),
    email: (row.email ?? "").trim(),
    phone: (row.phone ?? "").trim(),
    gender: gender as "MALE" | "FEMALE",
    classPublicId: row.classPublicId?.trim() ?? "",
    rollNumber: row.rollNumber?.trim() ? row.rollNumber.trim().toUpperCase() : "",
  };
}

async function parseCsvBuffer(fileBuffer: Buffer): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];

    Readable.from([fileBuffer])
      .pipe(
        csvParser({
          mapHeaders: ({ header }) => header.replace(/^\uFEFF/, "").trim(),
        })
      )
      .on("data", (row) => rows.push(row as Record<string, string>))
      .on("error", (error) => reject(error))
      .on("end", () => resolve(rows));
  });
}

export async function getBootstrap(userId: number) {
  const access = await getEnrollmentAccess(userId);
  const where =
    access.allowedDepartmentIds === null ? {} : { id: { in: access.allowedDepartmentIds } };
  const departments = await prisma.department.findMany({
    where,
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  return {
    isAdmin: access.isAdmin,
    departments,
    defaultDepartmentId: departments[0]?.id ?? null,
    capabilities: {
      canCreateClass: true,
      canCreateStudent: true,
      canImportStudents: true,
      canTransferStudents: true,
      canViewRosters: true,
    },
  };
}

export async function listPrograms(userId: number, query: EnrollmentListQuery) {
  const access = await getEnrollmentAccess(userId);
  if (query.departmentId !== undefined) {
    ensureDepartmentAccess(access, query.departmentId);
  }

  return programService.listPrograms({
    page: query.page,
    limit: query.limit,
    departmentId: query.departmentId,
    departmentIds: query.departmentId === undefined ? access.allowedDepartmentIds ?? undefined : undefined,
    search: query.search,
  });
}

export async function getCurriculum(
  userId: number,
  programId: number,
  filters: { semesterNumber?: number; batchYear?: number }
) {
  const access = await getEnrollmentAccess(userId);
  const departmentId = await resolveProgramDepartment(programId);
  ensureDepartmentAccess(access, departmentId);
  return programService.getCurriculum(programId, filters);
}

export async function listClasses(userId: number, query: EnrollmentListQuery) {
  const access = await getEnrollmentAccess(userId);
  if (query.departmentId !== undefined) {
    ensureDepartmentAccess(access, query.departmentId);
  }

  return classService.listClassesForEnrollment(
    {
      page: query.page,
      limit: query.limit,
      departmentId: query.departmentId,
      programId: query.programId,
      semester: query.semester,
      section: query.section,
      status: query.status,
    },
    access.allowedDepartmentIds
  );
}

export async function createClass(
  userId: number,
  input: {
    programId: number;
    currentSemester: number;
    academicYear: number;
    admissionYear: number;
    section: Section;
  }
) {
  const access = await getEnrollmentAccess(userId);
  return classService.createClassForEnrollment(input, userId, access.allowedDepartmentIds);
}

export async function getClass(userId: number, classPublicId: string) {
  const access = await getEnrollmentAccess(userId);
  return classService.getClassByPublicIdForEnrollment(classPublicId, access.allowedDepartmentIds);
}

export async function listClassStudents(
  userId: number,
  classPublicId: string,
  query: EnrollmentCandidateQuery
) {
  const access = await getEnrollmentAccess(userId);
  const classRecord = await resolveClassForEnrollment(classPublicId, access);
  return classService.listClassStudentsForEnrollment(
    classRecord.id,
    query,
    userId,
    access.allowedDepartmentIds
  );
}

export async function listTransferCandidates(
  userId: number,
  classPublicId: string,
  query: EnrollmentCandidateQuery
) {
  const access = await getEnrollmentAccess(userId);
  const classRecord = await resolveClassForEnrollment(classPublicId, access);
  return classService.listStudentCandidatesForEnrollment(
    classRecord.id,
    query,
    userId,
    access.allowedDepartmentIds
  );
}

export async function transferStudent(
  userId: number,
  classPublicId: string,
  input: { studentPublicId: string }
) {
  const access = await getEnrollmentAccess(userId);
  const classRecord = await resolveClassForEnrollment(classPublicId, access);
  return classService.transferStudentToClassForEnrollment(
    classRecord.id,
    input,
    userId,
    access.allowedDepartmentIds
  );
}

export async function createStudent(
  userId: number,
  input: EnrollmentCreateStudentInput,
  auditContext?: AuditContext
) {
  const access = await getEnrollmentAccess(userId);
  const classRecord = await resolveClassForEnrollment(input.classPublicId, access);
  const student = await userService.createUser(
    {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      gender: input.gender,
      userType: "STUDENT",
      departmentId: classRecord.departmentId,
      classPublicId: classRecord.publicId,
      rollNumber: input.rollNumber,
    },
    auditContext
  );

  if (auditContext) {
    await recordAuditLog(
      {
        action: "enrollment.student.create",
        targetType: "user",
        targetId: student.publicId,
        summary: { classPublicId: classRecord.publicId, departmentId: classRecord.departmentId },
      },
      auditContext
    );
  }

  return student;
}

export async function importStudents(
  userId: number,
  fileBuffer: Buffer,
  auditContext?: AuditContext
): Promise<ImportResult> {
  const rows = await parseCsvBuffer(fileBuffer);
  const errors: ImportError[] = [];
  const validRows: Array<{ rowNumber: number; data: EnrollmentCreateStudentInput }> = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    if ((row.userType ?? "").trim() && (row.userType ?? "").trim().toUpperCase() !== "STUDENT") {
      errors.push({ row: rowNumber, message: "Enrollment import accepts STUDENT rows only" });
      return;
    }

    const normalized = normalizeCsvRow(row);
    const result = enrollmentCreateStudentSchema.body.safeParse(normalized);
    if (!result.success) {
      errors.push({
        row: rowNumber,
        message: result.error.issues.map((issue) => issue.message).join("; "),
      });
      return;
    }
    validRows.push({ rowNumber, data: result.data });
  });

  let successful = 0;
  const BATCH_SIZE = 5;

  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((row) =>
        createStudent(userId, row.data, auditContext).then(
          () => ({ rowNumber: row.rowNumber, ok: true as const }),
          (error: unknown) => ({ rowNumber: row.rowNumber, ok: false as const, error }),
        ),
      ),
    );

    for (const result of results) {
      const value =
        result.status === "fulfilled"
          ? result.value
          : { rowNumber: 0, ok: false as const, error: result.reason };
      if (value.ok) {
        successful += 1;
      } else {
        errors.push({
          row: value.rowNumber,
          message: value.error instanceof Error ? value.error.message : "Failed to import student",
        });
      }
    }
  }

  return {
    successful,
    failed: errors.length,
    errors,
  };
}
