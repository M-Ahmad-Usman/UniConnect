import type { PrismaTransaction } from "./society.js";
import { prisma } from "../../config/prisma.js";
import {
  ApiErrorCode,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../errors/index.js";

type DepartmentAuthorityRow = {
  id: number;
  hod_id: number | null;
};

type ProgramAuthorityRow = {
  id: number;
  department_id: number;
  semesters: number;
  hod_id: number | null;
};

export type AcademicClassWriteRow = {
  id: number;
  status: "ACTIVE" | "GRADUATED";
  currentSemester: number;
  admissionYear: number;
  serverId: number;
  programId: number;
  programSemesters: number;
  departmentId: number;
  hodId: number | null;
  programDirectorId: number | null;
};

type AcademicClassSqlRow = {
  id: number;
  status: "active" | "graduated";
  current_semester: number;
  admission_year: number;
  server_id: number;
  program_id: number;
  program_semesters: number;
  department_id: number;
  hod_id: number | null;
  program_director_id: number | null;
};

async function lockActiveActor(userId: number, client: PrismaTransaction): Promise<void> {
  const actors = await client.$queryRaw<Array<{ id: number }>>`
    SELECT "id"
    FROM "users"
    WHERE "id" = ${userId}
      AND "is_deleted" = FALSE
      AND "status" = 'active'
    FOR UPDATE
  `;
  if (!actors[0]) {
    throw new ForbiddenError("Your account cannot perform academic writes");
  }
}

export async function lockDepartmentForHodOrAdmin(
  departmentId: number,
  userId: number,
  userType: string,
  client: PrismaTransaction = prisma,
): Promise<void> {
  await lockActiveActor(userId, client);
  const rows = await client.$queryRaw<DepartmentAuthorityRow[]>`
    SELECT "id", "hod_id"
    FROM "departments"
    WHERE "id" = ${departmentId}
    FOR UPDATE
  `;
  const department = rows[0];
  if (!department) throw new NotFoundError("Department not found");
  if (userType !== "ADMIN" && department.hod_id !== userId) {
    throw new ForbiddenError(
      "Only the HOD of this department can perform this action",
      ApiErrorCode.SCOPE_FORBIDDEN,
    );
  }
}

export async function lockProgramForHodOrAdmin(
  programId: number,
  userId: number,
  userType: string,
  client: PrismaTransaction = prisma,
): Promise<ProgramAuthorityRow> {
  await lockActiveActor(userId, client);
  const rows = await client.$queryRaw<ProgramAuthorityRow[]>`
    SELECT program."id", program."department_id", program."semesters", department."hod_id"
    FROM "programs" AS program
    INNER JOIN "departments" AS department ON department."id" = program."department_id"
    WHERE program."id" = ${programId}
    FOR UPDATE OF department, program
  `;
  const program = rows[0];
  if (!program) throw new NotFoundError("Program not found");
  if (userType !== "ADMIN" && program.hod_id !== userId) {
    throw new ForbiddenError(
      "Only the HOD of this department can perform this action",
      ApiErrorCode.SCOPE_FORBIDDEN,
    );
  }
  return program;
}

export async function lockStudentProfileForTransfer(
  studentId: number,
  client: PrismaTransaction = prisma,
): Promise<void> {
  const rows = await client.$queryRaw<Array<{ student_id: number }>>`
    SELECT "student_id"
    FROM "student_info"
    WHERE "student_id" = ${studentId}
    FOR UPDATE
  `;
  if (!rows[0]) throw new NotFoundError("Student not found");
}

export async function lockClassForAcademicWrite(
  classId: number,
  userId: number,
  userType: string,
  authority: "HOD" | "HOD_OR_PD",
  client: PrismaTransaction = prisma,
): Promise<AcademicClassWriteRow> {
  await lockActiveActor(userId, client);
  const rows = await client.$queryRaw<AcademicClassSqlRow[]>`
    SELECT
      academic_class."id",
      academic_class."status",
      academic_class."current_semester",
      academic_class."admission_year",
      academic_class."server_id",
      program."id" AS "program_id",
      program."semesters" AS "program_semesters",
      department."id" AS "department_id",
      department."hod_id",
      program."program_director_id"
    FROM "classes" AS academic_class
    INNER JOIN "programs" AS program ON program."id" = academic_class."program_id"
    INNER JOIN "departments" AS department ON department."id" = program."department_id"
    WHERE academic_class."id" = ${classId}
    FOR UPDATE OF department, program, academic_class
  `;
  const row = rows[0];
  if (!row) throw new NotFoundError("Class not found");
  const classRecord: AcademicClassWriteRow = {
    id: row.id,
    status: row.status === "active" ? "ACTIVE" : "GRADUATED",
    currentSemester: row.current_semester,
    admissionYear: row.admission_year,
    serverId: row.server_id,
    programId: row.program_id,
    programSemesters: row.program_semesters,
    departmentId: row.department_id,
    hodId: row.hod_id,
    programDirectorId: row.program_director_id,
  };
  const allowed =
    userType === "ADMIN" ||
    classRecord.hodId === userId ||
    (authority === "HOD_OR_PD" && classRecord.programDirectorId === userId);
  if (!allowed) {
    throw new ForbiddenError(
      "You do not have permission to manage this class",
      ApiErrorCode.SCOPE_FORBIDDEN,
    );
  }
  if (classRecord.status !== "ACTIVE") {
    throw new ConflictError("Graduated classes are read-only", ApiErrorCode.CLASS_GRADUATED);
  }
  return classRecord;
}
