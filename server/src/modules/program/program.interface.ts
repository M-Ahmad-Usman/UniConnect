import type { Kysely } from 'kysely'
import type {
  Database,
  ProgramEntity,
  InsertProgramEntity,
  ProgramCurriculumEntity,
  InsertProgramCurriculumEntity,
} from '../../db/types.js'

export interface IProgramRepository {

  createProgram(
    programInsert: InsertProgramEntity,
    trx?: Kysely<Database>,
  ): Promise<ProgramEntity>,

  createProgramCurricula(
    programCurriculaInsert: InsertProgramCurriculumEntity[],
    trx?: Kysely<Database>,
  ): Promise<ProgramCurriculumEntity[]>,

  findProgramById(
    id: number,
    trx?: Kysely<Database>,
  ): Promise<ProgramEntity | undefined>,

  findTotalSemestersById(
    programId: number,
    trx?: Kysely<Database>,
  ): Promise<number | undefined>,
}