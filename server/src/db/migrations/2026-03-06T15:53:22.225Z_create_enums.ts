import type { Kysely } from 'kysely'
import { sql } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TYPE degree_level AS ENUM ('bachelors', 'masters', 'phd');
    CREATE TYPE discipline AS ENUM ('computer_science', 'software_engineering', 'artificial_intelligence', 'computer_engineering');
    CREATE TYPE user_type AS ENUM ('student', 'teacher', 'admin');
    CREATE TYPE gender AS ENUM ('male', 'female');
    CREATE TYPE teacher_designation AS ENUM ('lab_incharge', 'lecturer', 'assistant_professor', 'associate_professor', 'professor');
    CREATE TYPE class_section AS ENUM ('a', 'b');
    CREATE TYPE server_type AS ENUM ('class', 'society', 'department');
    CREATE TYPE channel_type AS ENUM ('announcements', 'program', 'course', 'general');
    CREATE TYPE membership_request_status AS ENUM ('pending', 'approved', 'rejected');
    CREATE TYPE post_priority AS ENUM ('normal', 'important', 'urgent');
    CREATE TYPE file_attachment_type AS ENUM ('image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf', 'application/msword');
    CREATE TYPE user_role AS ENUM ('cr', 'society_president', 'society_convenor', 'program_director', 'hod', 'moderator');
    CREATE TYPE action AS ENUM ('create', 'update', 'delete', 'post', 'assign');
    CREATE TYPE resource AS ENUM ('channel', 'society', 'class', 'role');
    CREATE TYPE moderator_scope_type AS ENUM ('channel', 'server');
    CREATE TYPE notification_type AS ENUM ('new_post', 'role_assigned');
    CREATE TYPE notification_preference_scope AS ENUM ('server', 'channel');
  `.execute(db)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    DROP TYPE IF EXISTS notification_preference_scope CASCADE;
    DROP TYPE IF EXISTS notification_type CASCADE;
    DROP TYPE IF EXISTS moderator_scope_type CASCADE;
    DROP TYPE IF EXISTS resource CASCADE;
    DROP TYPE IF EXISTS action CASCADE;
    DROP TYPE IF EXISTS user_role CASCADE;
    DROP TYPE IF EXISTS file_attachment_type CASCADE;
    DROP TYPE IF EXISTS post_priority CASCADE;
    DROP TYPE IF EXISTS membership_request_status CASCADE;
    DROP TYPE IF EXISTS channel_type CASCADE;
    DROP TYPE IF EXISTS server_type CASCADE;
    DROP TYPE IF EXISTS class_section CASCADE;
    DROP TYPE IF EXISTS teacher_designation CASCADE;
    DROP TYPE IF EXISTS gender CASCADE;
    DROP TYPE IF EXISTS user_type CASCADE;
    DROP TYPE IF EXISTS discipline CASCADE;
    DROP TYPE IF EXISTS degree_level CASCADE;
  `.execute(db)
}