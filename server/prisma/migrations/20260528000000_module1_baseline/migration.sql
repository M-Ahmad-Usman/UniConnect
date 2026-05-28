-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "gender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "user_type" AS ENUM ('Teacher', 'Student', 'Admin');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "society_status" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "server_type" AS ENUM ('Department', 'Class', 'Society');

-- CreateEnum
CREATE TYPE "channel_type" AS ENUM ('announcement', 'course', 'general', 'program');

-- CreateEnum
CREATE TYPE "post_priority" AS ENUM ('normal', 'important', 'urgent');

-- CreateEnum
CREATE TYPE "section" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "moderator_scope_type" AS ENUM ('server', 'channel');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('new_post', 'role_assigned', 'society_request_reviewed');

-- CreateEnum
CREATE TYPE "notification_scope_type" AS ENUM ('server', 'channel');

-- CreateEnum
CREATE TYPE "membership_request_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "class_status" AS ENUM ('active', 'graduated');

-- CreateTable
CREATE TABLE "degree_levels" (
    "id" SERIAL NOT NULL,
    "level" VARCHAR(50) NOT NULL,

    CONSTRAINT "degree_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disciplines" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "disciplines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designations" (
    "value" VARCHAR(50) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),

    CONSTRAINT "designations_pkey" PRIMARY KEY ("value")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "hod_id" INTEGER,
    "server_id" INTEGER NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" SERIAL NOT NULL,
    "department_id" INTEGER NOT NULL,
    "discipline_id" INTEGER NOT NULL,
    "degree_level_id" INTEGER NOT NULL,
    "semesters" INTEGER NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "program_director_id" INTEGER,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL DEFAULT uuidv7(),
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "gender" "gender" NOT NULL,
    "profile_picture_url" TEXT,
    "bio" TEXT,
    "user_type" "user_type" NOT NULL,
    "department_id" INTEGER,
    "status" "user_status" NOT NULL DEFAULT 'active',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" INTEGER,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "password_reset_token_hash" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_info" (
    "student_id" INTEGER NOT NULL,
    "class_id" INTEGER NOT NULL,
    "roll_number" VARCHAR(30) NOT NULL,

    CONSTRAINT "student_info_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "teacher_info" (
    "teacher_id" INTEGER NOT NULL,
    "designation" VARCHAR(50) NOT NULL,

    CONSTRAINT "teacher_info_pkey" PRIMARY KEY ("teacher_id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL DEFAULT uuidv7(),
    "program_id" INTEGER NOT NULL,
    "current_semester" INTEGER NOT NULL,
    "academic_year" INTEGER NOT NULL,
    "admission_year" INTEGER NOT NULL,
    "section" "section" NOT NULL,
    "cr_id" INTEGER,
    "server_id" INTEGER NOT NULL,
    "status" "class_status" NOT NULL DEFAULT 'active',
    "graduated_at" TIMESTAMP(3),
    "graduated_by" INTEGER,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "societies" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL DEFAULT uuidv7(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "department_id" INTEGER NOT NULL,
    "president_id" INTEGER NOT NULL,
    "convenor_id" INTEGER NOT NULL,
    "server_id" INTEGER NOT NULL,
    "status" "society_status" NOT NULL DEFAULT 'active',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" INTEGER,
    "deleted_cascade_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "societies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servers" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL DEFAULT uuidv7(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "type" "server_type" NOT NULL,
    "icon_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" INTEGER,
    "deleted_cascade_id" UUID,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL DEFAULT uuidv7(),
    "server_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "type" "channel_type" NOT NULL,
    "course_id" INTEGER,
    "program_id" INTEGER,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "locked_by" INTEGER,
    "locked_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" INTEGER,
    "deleted_cascade_id" UUID,
    "is_auto_created" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "archived_by" INTEGER,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "server_memberships" (
    "user_id" INTEGER NOT NULL,
    "server_id" INTEGER NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_auto_joined" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "server_memberships_pkey" PRIMARY KEY ("user_id","server_id")
);

-- CreateTable
CREATE TABLE "society_membership_requests" (
    "id" SERIAL NOT NULL,
    "society_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "status" "membership_request_status" NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "society_membership_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(50) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "credit_hours" INTEGER NOT NULL,
    "department_id" INTEGER NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teaches" (
    "teacher_id" INTEGER NOT NULL,
    "course_id" INTEGER NOT NULL,
    "class_id" INTEGER NOT NULL,

    CONSTRAINT "teaches_pkey" PRIMARY KEY ("teacher_id","course_id","class_id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL DEFAULT uuidv7(),
    "author_id" INTEGER NOT NULL,
    "channel_id" INTEGER NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "content" TEXT NOT NULL,
    "priority" "post_priority" NOT NULL DEFAULT 'normal',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "pinned_by" INTEGER,
    "pinned_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "updated_by" INTEGER,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_attachments" (
    "id" SERIAL NOT NULL,
    "post_id" INTEGER NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" VARCHAR(50) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "moderator_assignments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "scope_type" "moderator_scope_type" NOT NULL,
    "server_id" INTEGER NOT NULL,
    "channel_id" INTEGER,
    "assigned_by" INTEGER,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderator_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "post_id" INTEGER,
    "type" "notification_type" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "notification_type" "notification_type" NOT NULL DEFAULT 'new_post',
    "scope_type" "notification_scope_type" NOT NULL,
    "server_id" INTEGER NOT NULL,
    "channel_id" INTEGER,
    "is_subscribed" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "actor_user_id" INTEGER,
    "action" VARCHAR(100) NOT NULL,
    "target_type" VARCHAR(100) NOT NULL,
    "target_id" VARCHAR(100),
    "summary" JSONB,
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_curriculum" (
    "id" SERIAL NOT NULL,
    "program_id" INTEGER NOT NULL,
    "course_id" INTEGER NOT NULL,
    "semester_number" INTEGER NOT NULL,
    "batch_year" INTEGER NOT NULL,

    CONSTRAINT "program_curriculum_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "degree_levels_level_key" ON "degree_levels"("level");

-- CreateIndex
CREATE UNIQUE INDEX "disciplines_name_key" ON "disciplines"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "departments_hod_id_key" ON "departments"("hod_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_server_id_key" ON "departments"("server_id");

-- CreateIndex
CREATE UNIQUE INDEX "programs_code_key" ON "programs"("code");

-- CreateIndex
CREATE UNIQUE INDEX "programs_program_director_id_key" ON "programs"("program_director_id");

-- CreateIndex
CREATE UNIQUE INDEX "programs_department_id_discipline_id_degree_level_id_key" ON "programs"("department_id", "discipline_id", "degree_level_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_public_id_key" ON "users"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_live_key" ON "users"("email") WHERE "is_deleted" = false;

-- CreateIndex
CREATE INDEX "users_department_id_user_type_status_idx" ON "users"("department_id", "user_type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "student_info_roll_number_key" ON "student_info"("roll_number");

-- CreateIndex
CREATE UNIQUE INDEX "classes_public_id_key" ON "classes"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "classes_cr_id_key" ON "classes"("cr_id");

-- CreateIndex
CREATE UNIQUE INDEX "classes_server_id_key" ON "classes"("server_id");

-- CreateIndex
CREATE INDEX "classes_status_idx" ON "classes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "classes_program_id_current_semester_section_admission_year_key" ON "classes"("program_id", "current_semester", "section", "admission_year");

-- CreateIndex
CREATE UNIQUE INDEX "societies_public_id_key" ON "societies"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "societies_name_live_key" ON "societies"("name") WHERE "is_deleted" = false;

-- CreateIndex
CREATE UNIQUE INDEX "societies_president_id_key" ON "societies"("president_id");

-- CreateIndex
CREATE UNIQUE INDEX "societies_convenor_id_key" ON "societies"("convenor_id");

-- CreateIndex
CREATE UNIQUE INDEX "societies_server_id_key" ON "societies"("server_id");

-- CreateIndex
CREATE INDEX "societies_department_id_is_deleted_idx" ON "societies"("department_id", "is_deleted");

-- CreateIndex
CREATE INDEX "societies_status_is_deleted_idx" ON "societies"("status", "is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "servers_public_id_key" ON "servers"("public_id");

-- CreateIndex
CREATE INDEX "servers_type_is_deleted_idx" ON "servers"("type", "is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "channels_public_id_key" ON "channels"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "channels_server_id_name_live_key" ON "channels"("server_id", "name") WHERE "is_deleted" = false;

-- CreateIndex
CREATE UNIQUE INDEX "channels_server_id_course_id_live_key" ON "channels"("server_id", "course_id") WHERE "is_deleted" = false AND "course_id" IS NOT NULL;

-- CreateIndex
CREATE INDEX "channels_server_id_program_id_live_idx" ON "channels"("server_id", "program_id") WHERE "is_deleted" = false AND "program_id" IS NOT NULL;

-- CreateIndex
CREATE INDEX "channels_server_id_is_deleted_is_archived_idx" ON "channels"("server_id", "is_deleted", "is_archived");

-- CreateIndex
CREATE INDEX "server_memberships_server_id_idx" ON "server_memberships"("server_id");

-- CreateIndex
CREATE INDEX "server_memberships_user_id_idx" ON "server_memberships"("user_id");

-- CreateIndex
CREATE INDEX "society_membership_requests_society_id_status_requested_at_idx" ON "society_membership_requests"("society_id", "status", "requested_at");

-- CreateIndex
CREATE INDEX "society_membership_requests_user_id_status_idx" ON "society_membership_requests"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "society_membership_requests_society_id_user_id_key" ON "society_membership_requests"("society_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "courses_code_key" ON "courses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "teaches_class_id_course_id_key" ON "teaches"("class_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "posts_public_id_key" ON "posts"("public_id");

-- CreateIndex
CREATE INDEX "posts_channel_id_is_deleted_is_pinned_created_at_idx" ON "posts"("channel_id", "is_deleted", "is_pinned", "created_at" DESC);

-- CreateIndex
CREATE INDEX "posts_author_id_idx" ON "posts"("author_id");

-- CreateIndex
CREATE INDEX "post_attachments_post_id_idx" ON "post_attachments"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "moderator_assignments_server_id_idx" ON "moderator_assignments"("server_id");

-- CreateIndex
CREATE UNIQUE INDEX "moderator_assignments_user_id_server_id_channel_id_key" ON "moderator_assignments"("user_id", "server_id", "channel_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_type_created_at_idx" ON "notifications"("user_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "notifications_post_id_idx" ON "notifications"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_notification_type_scope_ty_key" ON "notification_preferences"("user_id", "notification_type", "scope_type", "server_id", "channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_created_at_idx" ON "audit_logs"("target_type", "target_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "program_curriculum_program_id_course_id_batch_year_key" ON "program_curriculum"("program_id", "course_id", "batch_year");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_hod_id_fkey" FOREIGN KEY ("hod_id") REFERENCES "teacher_info"("teacher_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_discipline_id_fkey" FOREIGN KEY ("discipline_id") REFERENCES "disciplines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_degree_level_id_fkey" FOREIGN KEY ("degree_level_id") REFERENCES "degree_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_program_director_id_fkey" FOREIGN KEY ("program_director_id") REFERENCES "teacher_info"("teacher_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_info" ADD CONSTRAINT "student_info_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_info" ADD CONSTRAINT "student_info_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_info" ADD CONSTRAINT "teacher_info_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_info" ADD CONSTRAINT "teacher_info_designation_fkey" FOREIGN KEY ("designation") REFERENCES "designations"("value") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_cr_id_fkey" FOREIGN KEY ("cr_id") REFERENCES "student_info"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_graduated_by_fkey" FOREIGN KEY ("graduated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "societies" ADD CONSTRAINT "societies_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "societies" ADD CONSTRAINT "societies_president_id_fkey" FOREIGN KEY ("president_id") REFERENCES "student_info"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "societies" ADD CONSTRAINT "societies_convenor_id_fkey" FOREIGN KEY ("convenor_id") REFERENCES "teacher_info"("teacher_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "societies" ADD CONSTRAINT "societies_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "societies" ADD CONSTRAINT "societies_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servers" ADD CONSTRAINT "servers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servers" ADD CONSTRAINT "servers_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_locked_by_fkey" FOREIGN KEY ("locked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "server_memberships" ADD CONSTRAINT "server_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "server_memberships" ADD CONSTRAINT "server_memberships_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "society_membership_requests" ADD CONSTRAINT "society_membership_requests_society_id_fkey" FOREIGN KEY ("society_id") REFERENCES "societies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "society_membership_requests" ADD CONSTRAINT "society_membership_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "society_membership_requests" ADD CONSTRAINT "society_membership_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaches" ADD CONSTRAINT "teaches_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teacher_info"("teacher_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaches" ADD CONSTRAINT "teaches_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaches" ADD CONSTRAINT "teaches_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_pinned_by_fkey" FOREIGN KEY ("pinned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_attachments" ADD CONSTRAINT "post_attachments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderator_assignments" ADD CONSTRAINT "moderator_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderator_assignments" ADD CONSTRAINT "moderator_assignments_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderator_assignments" ADD CONSTRAINT "moderator_assignments_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderator_assignments" ADD CONSTRAINT "moderator_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_curriculum" ADD CONSTRAINT "program_curriculum_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_curriculum" ADD CONSTRAINT "program_curriculum_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
