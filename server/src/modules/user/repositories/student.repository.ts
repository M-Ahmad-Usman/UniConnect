
import type { Kysely } from 'kysely'
import type { Database } from '../../../db/types.js'

export default class StudentRepository {

  constructor(private readonly db: Kysely<Database>) {}

}