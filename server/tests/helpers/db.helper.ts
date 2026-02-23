import { prisma } from "../../src/config/prisma.js";

/**
 * Truncate all tables in the test database.
 * Uses TRUNCATE ... CASCADE to handle foreign key constraints.
 */
export async function resetDB(): Promise<void> {
  const tableNames = [
    "refresh_tokens",
    "notification_preferences",
    "notifications",
    "post_attachments",
    "posts",
    "moderator_assignments",
    "role_permissions",
    "permissions",
    "roles",
    "society_membership_requests",
    "server_memberships",
    "teaches",
    "program_curriculum",
    "channels",
    "societies",
    "classes",
    "courses",
    "student_info",
    "teacher_info",
    "programs",
    "departments",
    "disciplines",
    "degree_levels",
    "servers",
    "users",
  ];

  // Disable triggers temporarily and truncate
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tableNames.join(", ")} RESTART IDENTITY CASCADE`
  );
}
