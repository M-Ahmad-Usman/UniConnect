import { Pool, type QueryResultRow } from 'pg';

const DEFAULT_E2E_DATABASE_URL =
  'postgresql://uniconnect:uniconnect@localhost:5433/uniconnect_test';

const TABLE_NAMES = [
  'audit_logs',
  'refresh_tokens',
  'notification_preferences',
  'notifications',
  'post_attachments',
  'posts',
  'user_role_assignments',
  'role_permissions',
  'permissions',
  'roles',
  'society_membership_requests',
  'server_memberships',
  'teaches',
  'program_curriculum',
  'channels',
  'societies',
  'classes',
  'courses',
  'student_info',
  'teacher_info',
  'programs',
  'departments',
  'disciplines',
  'degree_levels',
  'servers',
  'users',
] as const;

export function createDbPool() {
  return new Pool({
    connectionString:
      process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL ?? DEFAULT_E2E_DATABASE_URL,
    max: 1,
  });
}

export async function withDb<T>(operation: (pool: Pool) => Promise<T>) {
  const pool = createDbPool();

  try {
    return await operation(pool);
  } finally {
    await pool.end();
  }
}

export async function resetE2EDatabase(pool: Pool) {
  await pool.query(`TRUNCATE TABLE ${TABLE_NAMES.join(', ')} RESTART IDENTITY CASCADE`);
}

export async function findOne<T extends QueryResultRow>(
  pool: Pool,
  query: string,
  values: unknown[],
) {
  const result = await pool.query<T>(query, values);
  return result.rows[0] ?? null;
}
