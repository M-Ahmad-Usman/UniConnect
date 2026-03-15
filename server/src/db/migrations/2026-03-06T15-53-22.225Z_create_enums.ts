import type { Kysely } from 'kysely'
import { ENUMS } from '../types.js'
import { convertCamelToSnakeCase } from '../helpers.js'

/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 Creates PostgreSQL enum types for all enum values defined in ENUMS.
 ENUM names are converted to snake_cased before commiting them to DB.
*/
export async function up(db: Kysely<any>): Promise<void> {
  for (const [camelCasedEnumName, values] of Object.entries(ENUMS)) {
    const snakeCasedEnumName = convertCamelToSnakeCase(camelCasedEnumName)
    await db.schema
      .createType(snakeCasedEnumName)
      .asEnum(values)
      .execute()
  }
}

/*
  Drops all PostgreSQL enum types created in the up() function.
  Maintains order consistency by converting names the same way.
*/
export async function down(db: Kysely<any>): Promise<void> {
  for (const camelCasedEnumName in ENUMS) {
    const snakeCasedEnumName = convertCamelToSnakeCase(camelCasedEnumName)
    await db.schema
      .dropType(snakeCasedEnumName)
      .ifExists()
      .execute()
  }
}