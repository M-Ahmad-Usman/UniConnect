import type { Prisma } from "../../generated/prisma/client.js";
import { ConflictError, ValidationError } from "../errors/index.js";

type CurriculumPrisma = Pick<
  Prisma.TransactionClient,
  "class" | "programCurriculum"
>;

export function missingCurriculumSemesters(
  semesters: number,
  entries: Array<{ semesterNumber: number }>,
) {
  const present = new Set(entries.map((entry) => entry.semesterNumber));
  return Array.from({ length: semesters }, (_, index) => index + 1).filter(
    (semester) => !present.has(semester),
  );
}

export async function assertFullCurriculumExists(
  db: CurriculumPrisma,
  input: { programId: number; programSemesters: number; batchYear: number },
) {
  const entries = await db.programCurriculum.findMany({
    where: {
      programId: input.programId,
      batchYear: input.batchYear,
      semesterNumber: { gte: 1, lte: input.programSemesters },
    },
    select: { semesterNumber: true },
    distinct: ["semesterNumber"],
  });

  const missing = missingCurriculumSemesters(input.programSemesters, entries);
  if (missing.length > 0) {
    throw new ValidationError(
      `Full curriculum is required for batch ${input.batchYear}. Missing semester(s): ${missing.join(", ")}`,
    );
  }
}

export async function getLockedCurriculumSemester(
  db: CurriculumPrisma,
  input: { programId: number; batchYear: number },
) {
  const classRecord = await db.class.findFirst({
    where: {
      programId: input.programId,
      admissionYear: input.batchYear,
    },
    select: { currentSemester: true },
    orderBy: { currentSemester: "desc" },
  });

  return classRecord?.currentSemester ?? 0;
}

export async function assertCurriculumSemesterEditable(
  db: CurriculumPrisma,
  input: { programId: number; batchYear: number; semesterNumber: number },
) {
  const lockedThroughSemester = await getLockedCurriculumSemester(db, input);
  if (input.semesterNumber <= lockedThroughSemester) {
    throw new ConflictError(
      `Curriculum for semester ${input.semesterNumber} is locked because batch ${input.batchYear} has already reached semester ${lockedThroughSemester}`,
    );
  }
}
