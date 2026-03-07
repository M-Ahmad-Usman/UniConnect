import type { Kysely } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createType('degree_level')
    .asEnum(['bachelors', 'masters', 'phd'])
    .execute()

  await db.schema
    .createType('discipline')
    .asEnum(['computer_science', 'software_engineering', 'artificial_intelligence', 'computer_engineering'])
    .execute()

  await db.schema
    .createType('user_type')
    .asEnum(['student', 'teacher', 'admin'])
    .execute()

  await db.schema
    .createType('gender')
    .asEnum(['male', 'female'])
    .execute()

  await db.schema
    .createType('teacher_designation')
    .asEnum(['lab_incharge', 'lecturer', 'assistant_professor', 'associate_professor', 'professor'])
    .execute()

  await db.schema
    .createType('class_section')
    .asEnum(['a', 'b'])
    .execute()

  await db.schema
    .createType('server_type')
    .asEnum(['class', 'society', 'department'])
    .execute()

  await db.schema
    .createType('channel_type')
    .asEnum(['announcements', 'program', 'course', 'general'])
    .execute()

  await db.schema
    .createType('membership_request_status')
    .asEnum(['pending', 'approved', 'rejected'])
    .execute()

  await db.schema
    .createType('post_priority')
    .asEnum(['normal', 'important', 'urgent'])
    .execute()

  await db.schema
    .createType('file_attachment_type')
    .asEnum(['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf', 'application/msword'])
    .execute()

  await db.schema
    .createType('user_role')
    .asEnum(['cr', 'society_president', 'society_convenor', 'program_director', 'hod', 'moderator'])
    .execute()

  await db.schema
    .createType('action')
    .asEnum(['create', 'update', 'delete', 'post', 'assign'])
    .execute()

  await db.schema
    .createType('resource')
    .asEnum(['channel', 'society', 'class', 'role'])
    .execute()

  await db.schema
    .createType('moderator_scope_type')
    .asEnum(['channel', 'server'])
    .execute()

  await db.schema
    .createType('notification_type')
    .asEnum(['new_post', 'role_assigned'])
    .execute()

  await db.schema
    .createType('notification_preference_scope')
    .asEnum(['server', 'channel'])
    .execute()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropType('notification_preference_scope').ifExists().execute()
  await db.schema.dropType('notification_type').ifExists().execute()
  await db.schema.dropType('moderator_scope_type').ifExists().execute()
  await db.schema.dropType('resource').ifExists().execute()
  await db.schema.dropType('action').ifExists().execute()
  await db.schema.dropType('user_role').ifExists().execute()
  await db.schema.dropType('file_attachment_type').ifExists().execute()
  await db.schema.dropType('post_priority').ifExists().execute()
  await db.schema.dropType('membership_request_status').ifExists().execute()
  await db.schema.dropType('channel_type').ifExists().execute()
  await db.schema.dropType('server_type').ifExists().execute()
  await db.schema.dropType('class_section').ifExists().execute()
  await db.schema.dropType('teacher_designation').ifExists().execute()
  await db.schema.dropType('gender').ifExists().execute()
  await db.schema.dropType('user_type').ifExists().execute()
  await db.schema.dropType('discipline').ifExists().execute()
  await db.schema.dropType('degree_level').ifExists().execute()
}