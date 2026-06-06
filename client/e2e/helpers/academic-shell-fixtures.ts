import { withDb } from './db';

export const academicShellFixtures = {
  shellServerName: 'Computer Science Hub',
  announcementChannelName: 'announcements',
  generalChannelName: 'general',
  notificationServerName: 'Realtime Updates Hub',
  notificationChannelName: 'updates',
  searchablePostTitle: 'Searchable Architecture Notes',
  filteredOutPostTitle: 'Runtime Update',
  notificationTitle: 'Realtime Notification Drill',
  academicProgramCode: 'E2EACAD',
  transferTargetServerName: 'Academic Transfer Target Class',
  replacementServerName: 'Academic Teacher Replacement Class',
  progressionServerName: 'Academic Semester Progression Class',
  graduationServerName: 'Academic Graduation Class',
} as const;

export async function findServerPublicIdByName(name: string) {
  return withDb(async (pool) => {
    const result = await pool.query<{ public_id: string }>(
      'SELECT public_id FROM servers WHERE name = $1 LIMIT 1',
      [name],
    );

    return result.rows[0]?.public_id ?? null;
  });
}

export async function findChannelPublicIdByName(serverPublicId: string, name: string) {
  return withDb(async (pool) => {
    const result = await pool.query<{ public_id: string }>(
      `
        SELECT channel.public_id
        FROM channels channel
        INNER JOIN servers server ON server.id = channel.server_id
        WHERE server.public_id = $1 AND channel.name = $2
        LIMIT 1
      `,
      [serverPublicId, name],
    );

    return result.rows[0]?.public_id ?? null;
  });
}

export async function findClassByServerName(name: string) {
  return withDb(async (pool) => {
    const result = await pool.query<{ id: number; public_id: string }>(
      `
        SELECT c.id, c.public_id
        FROM classes c
        INNER JOIN servers s ON s.id = c.server_id
        WHERE s.name = $1
        LIMIT 1
      `,
      [name],
    );

    return result.rows[0] ?? null;
  });
}

export async function findClassStudentClassId(studentId: number) {
  return withDb(async (pool) => {
    const result = await pool.query<{ class_id: number }>(
      'SELECT class_id FROM student_info WHERE student_id = $1 LIMIT 1',
      [studentId],
    );

    return result.rows[0]?.class_id ?? null;
  });
}

export async function findCourseTeacherName(classId: number, courseCode: string) {
  return withDb(async (pool) => {
    const result = await pool.query<{ full_name: string }>(
      `
        SELECT u.full_name
        FROM teaches t
        INNER JOIN courses c ON c.id = t.course_id
        INNER JOIN users u ON u.id = t.teacher_id
        WHERE t.class_id = $1 AND c.code = $2
        LIMIT 1
      `,
      [classId, courseCode],
    );

    return result.rows[0]?.full_name ?? null;
  });
}

export async function findClassStatus(classId: number) {
  return withDb(async (pool) => {
    const result = await pool.query<{ status: string }>(
      'SELECT status::text FROM classes WHERE id = $1 LIMIT 1',
      [classId],
    );

    return result.rows[0]?.status ?? null;
  });
}
