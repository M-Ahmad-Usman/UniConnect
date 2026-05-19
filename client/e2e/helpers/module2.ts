import { withDb } from './db';

export const module2Fixtures = {
  shellServerName: 'Computer Science Hub',
  announcementChannelName: 'announcements',
  generalChannelName: 'general',
  notificationServerName: 'Realtime Updates Hub',
  notificationChannelName: 'updates',
  searchablePostTitle: 'Searchable Architecture Notes',
  filteredOutPostTitle: 'Module 2 Runtime Update',
  notificationTitle: 'Realtime Notification Drill',
  academicProgramCode: 'E2EACAD',
  transferTargetServerName: 'Academic Transfer Target Class',
  replacementServerName: 'Academic Teacher Replacement Class',
  progressionServerName: 'Academic Semester Progression Class',
  graduationServerName: 'Academic Graduation Class',
} as const;

export async function findServerIdByName(name: string) {
  return withDb(async (pool) => {
    const result = await pool.query<{ id: number }>(
      'SELECT id FROM servers WHERE name = $1 LIMIT 1',
      [name],
    );

    return result.rows[0]?.id ?? null;
  });
}

export async function findChannelIdByName(serverId: number, name: string) {
  return withDb(async (pool) => {
    const result = await pool.query<{ id: number }>(
      'SELECT id FROM channels WHERE server_id = $1 AND name = $2 LIMIT 1',
      [serverId, name],
    );

    return result.rows[0]?.id ?? null;
  });
}

export async function findClassIdByServerName(name: string) {
  return withDb(async (pool) => {
    const result = await pool.query<{ id: number }>(
      `
        SELECT c.id
        FROM classes c
        INNER JOIN servers s ON s.id = c.server_id
        WHERE s.name = $1
        LIMIT 1
      `,
      [name],
    );

    return result.rows[0]?.id ?? null;
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
