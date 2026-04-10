import type { Kysely } from 'kysely'
import { sql } from 'kysely'

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function up(db: Kysely<any>): Promise<void> {
  await triggerFunctions.create(db)
  await triggers.create(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  await triggers.destroy(db)
  await triggerFunctions.destroy(db)
}

type PGFunction = (db: Kysely<any>) => Promise<void>

const triggerFunctions: { create: PGFunction, destroy: PGFunction } = {
  create: async function (db) {

    // Syncs locked_at/locked_by with is_locked.
    // - On lock   (FALSE → TRUE):  stamps locked_at, requires locked_by
    // - On unlock (TRUE  → FALSE): clears locked_at and locked_by
    await sql`
      CREATE OR REPLACE FUNCTION trg_fn_sync_lock_state()
        RETURNS TRIGGER
        LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NEW.is_locked = TRUE AND NEW.locked_by IS NULL THEN
          RAISE EXCEPTION 'channels.locked_by cannot be NULL when locking channel %', NEW.id;
        END IF;

        IF TG_OP = 'INSERT' THEN
          IF NEW.is_locked = TRUE THEN
            NEW.locked_at := NOW();
          END IF;
        ELSE
          IF NEW.is_locked = TRUE AND OLD.is_locked IS DISTINCT FROM TRUE THEN
            NEW.locked_at := NOW();
          ELSIF NEW.is_locked = FALSE AND OLD.is_locked IS DISTINCT FROM FALSE THEN
            NEW.locked_at := NULL;
            NEW.locked_by := NULL;
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$;
    `.execute(db)

    // Syncs archived_at/archived_by with is_archived.
    // - On archive   (FALSE → TRUE):  stamps archived_at, requires archived_by
    // - On unarchive (TRUE  → FALSE): clears archived_at and archived_by
    await sql`
      CREATE OR REPLACE FUNCTION trg_fn_sync_archive_state()
        RETURNS TRIGGER
        LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NEW.is_archived = TRUE AND NEW.archived_by IS NULL THEN
          RAISE EXCEPTION '%.archived_by cannot be NULL when archiving', TG_TABLE_NAME;
        END IF;

        IF TG_OP = 'INSERT' THEN
          IF NEW.is_archived = TRUE THEN
            NEW.archived_at := NOW();
          END IF;
        ELSE
          IF NEW.is_archived = TRUE AND OLD.is_archived IS DISTINCT FROM TRUE THEN
            NEW.archived_at := NOW();
          ELSIF NEW.is_archived = FALSE AND OLD.is_archived IS DISTINCT FROM FALSE THEN
            NEW.archived_at := NULL;
            NEW.archived_by := NULL;
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$;
    `.execute(db)

    // Syncs pinned_at/pinned_by with is_pinned.
    // - On pin   (FALSE → TRUE):  stamps pinned_at, requires pinned_by
    // - On unpin (TRUE  → FALSE): clears pinned_at and pinned_by
    await sql`
      CREATE OR REPLACE FUNCTION trg_fn_sync_pin_state()
        RETURNS TRIGGER
        LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NEW.is_pinned = TRUE AND NEW.pinned_by IS NULL THEN
          RAISE EXCEPTION 'posts.pinned_by cannot be NULL when pinning post %', NEW.id;
        END IF;

        IF TG_OP = 'INSERT' THEN
          IF NEW.is_pinned = TRUE THEN
            NEW.pinned_at := NOW();
          END IF;
        ELSE
          IF NEW.is_pinned = TRUE AND OLD.is_pinned IS DISTINCT FROM TRUE THEN
            NEW.pinned_at := NOW();
          ELSIF NEW.is_pinned = FALSE AND OLD.is_pinned IS DISTINCT FROM FALSE THEN
            NEW.pinned_at := NULL;
            NEW.pinned_by := NULL;
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$;
    `.execute(db)

    // Syncs edited_at/edited_by with is_edited.
    // - On edit   (FALSE → TRUE):  stamps edited_at, requires edited_by
    // - On revert (TRUE  → FALSE): clears edited_at and edited_by
    await sql`
      CREATE OR REPLACE FUNCTION trg_fn_sync_edit_state()
        RETURNS TRIGGER
        LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NEW.is_edited = TRUE AND NEW.edited_by IS NULL THEN
          RAISE EXCEPTION 'posts.edited_by cannot be NULL when marking post % as edited', NEW.id;
        END IF;

        IF TG_OP = 'INSERT' THEN
          IF NEW.is_edited = TRUE THEN
            NEW.edited_at := NOW();
          END IF;
        ELSE
          IF NEW.is_edited = TRUE AND OLD.is_edited IS DISTINCT FROM TRUE THEN
            NEW.edited_at := NOW();
          ELSIF NEW.is_edited = FALSE AND OLD.is_edited IS DISTINCT FROM FALSE THEN
            NEW.edited_at := NULL;
            NEW.edited_by := NULL;
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$;
    `.execute(db)

    // Stamps updated_at with the current timestamp on every UPDATE.
    // Generic — reused across multiple tables.
    await sql`
      CREATE OR REPLACE FUNCTION trg_fn_stamp_updated_at()
        RETURNS TRIGGER
        LANGUAGE plpgsql
      AS $$
      BEGIN
        NEW.updated_at := NOW();
        RETURN NEW;
      END;
      $$;
    `.execute(db)

    // Syncs deleted_at/deleted_by with is_deleted.
    // - On delete   (FALSE → TRUE):  stamps deleted_at, requires deleted_by
    // - On restore  (TRUE  → FALSE): clears deleted_at and deleted_by
    // Generic — reused across all soft-deletable tables.
    await sql`
      CREATE OR REPLACE FUNCTION trg_fn_sync_delete_state()
        RETURNS TRIGGER
        LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NEW.is_deleted = TRUE AND NEW.deleted_by IS NULL THEN
          RAISE EXCEPTION '%.deleted_by cannot be NULL when deleting', TG_TABLE_NAME;
        END IF;

        IF TG_OP = 'INSERT' THEN
          IF NEW.is_deleted = TRUE THEN
            NEW.deleted_at := NOW();
          END IF;
        ELSE
          IF NEW.is_deleted = TRUE AND OLD.is_deleted IS DISTINCT FROM TRUE THEN
            NEW.deleted_at := NOW();
          ELSIF NEW.is_deleted = FALSE AND OLD.is_deleted IS DISTINCT FROM FALSE THEN
            NEW.deleted_at := NULL;
            NEW.deleted_by := NULL;
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$;
    `.execute(db)

    // Stamps reviewed_at/reviewed_by when a society membership request status
    // is changed to 'approved' or 'rejected'. Rejects any other status value.
    await sql`
      CREATE OR REPLACE FUNCTION trg_fn_stamp_review_state()
        RETURNS TRIGGER
        LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NEW.reviewed_by IS NULL THEN
          RAISE EXCEPTION 'society_membership_requests.reviewed_by cannot be NULL when reviewing a request';
        END IF;

        IF NEW.status NOT IN ('approved', 'rejected') THEN
          RAISE EXCEPTION 'society_membership_requests.status can only be set to ''approved'' or ''rejected'', got: %', NEW.status;
        END IF;

        NEW.reviewed_at := NOW();

        RETURN NEW;
      END;
      $$;
    `.execute(db)

    // Validates that program_curricula.semester_number does not exceed
    // the total semesters defined in the associated program.
    await sql`
      CREATE OR REPLACE FUNCTION trg_fn_validate_curriculum_semester()
        RETURNS TRIGGER
        LANGUAGE plpgsql
      AS $$
      DECLARE
        max_semesters INTEGER;
      BEGIN
        SELECT semesters INTO max_semesters
        FROM programs
        WHERE id = NEW.program_id;

        IF NEW.semester_number < 1 OR NEW.semester_number > max_semesters THEN
          RAISE EXCEPTION 'semester_number % is out of range for program % (max: %)',
            NEW.semester_number, NEW.program_id, max_semesters;
        END IF;

        RETURN NEW;
      END;
      $$;
    `.execute(db)

    // Validates that classes.current_semester does not exceed the total
    // semesters defined in the class's enrolled program.
    await sql`
      CREATE OR REPLACE FUNCTION trg_fn_validate_class_semester()
        RETURNS TRIGGER
        LANGUAGE plpgsql
      AS $$
      DECLARE
        max_semesters INTEGER;
      BEGIN
        SELECT semesters INTO max_semesters
        FROM programs
        WHERE id = NEW.program_id;

        IF NEW.current_semester < 1 OR NEW.current_semester > max_semesters THEN
          RAISE EXCEPTION 'current_semester % is out of range for program % (max: %)',
            NEW.current_semester, NEW.program_id, max_semesters;
        END IF;

        RETURN NEW;
      END;
      $$;
    `.execute(db)

    // Validates that the student assigned as CR actually belongs to the
    // class they are being assigned to. Skipped when cr_id is NULL (see WHEN
    // clause on the trigger) to allow removal of a CR without validation.
    await sql`
      CREATE OR REPLACE FUNCTION trg_fn_validate_cr_membership()
        RETURNS TRIGGER
        LANGUAGE plpgsql
      AS $$
      DECLARE
        cr_class_id INTEGER;
      BEGIN
        SELECT class_id INTO cr_class_id
        FROM students
        WHERE id = NEW.cr_id;

        IF NEW.id != cr_class_id THEN
          RAISE EXCEPTION 'Student % doesn''t belong to class %. CR must be a member of the same class.',
            NEW.cr_id, NEW.id;
        END IF;

        RETURN NEW;
      END;
      $$;
    `.execute(db)
  },

  destroy: async function (db) {
    await sql`DROP FUNCTION IF EXISTS trg_fn_sync_lock_state CASCADE;`.execute(db)
    await sql`DROP FUNCTION IF EXISTS trg_fn_sync_archive_state CASCADE;`.execute(db)
    await sql`DROP FUNCTION IF EXISTS trg_fn_sync_pin_state CASCADE;`.execute(db)
    await sql`DROP FUNCTION IF EXISTS trg_fn_sync_edit_state CASCADE;`.execute(db)
    await sql`DROP FUNCTION IF EXISTS trg_fn_stamp_updated_at CASCADE;`.execute(db)
    await sql`DROP FUNCTION IF EXISTS trg_fn_sync_delete_state CASCADE;`.execute(db)
    await sql`DROP FUNCTION IF EXISTS trg_fn_stamp_review_state CASCADE;`.execute(db)
    await sql`DROP FUNCTION IF EXISTS trg_fn_validate_curriculum_semester CASCADE;`.execute(db)
    await sql`DROP FUNCTION IF EXISTS trg_fn_validate_class_semester CASCADE;`.execute(db)
    await sql`DROP FUNCTION IF EXISTS trg_fn_validate_cr_membership CASCADE;`.execute(db)
  },
}

const triggers: { create: PGFunction, destroy: PGFunction } = {
  create: async function (db) {

    await sql`
      CREATE TRIGGER trg_channels_sync_lock_state
      BEFORE INSERT OR UPDATE OF is_locked ON channels
      FOR EACH ROW EXECUTE FUNCTION trg_fn_sync_lock_state();
    `.execute(db)

    await sql`
      CREATE TRIGGER trg_channels_sync_archive_state
      BEFORE INSERT OR UPDATE OF is_archived ON channels
      FOR EACH ROW EXECUTE FUNCTION trg_fn_sync_archive_state();
    `.execute(db)

    await sql`
      CREATE TRIGGER trg_posts_sync_pin_state
      BEFORE INSERT OR UPDATE OF is_pinned ON posts
      FOR EACH ROW EXECUTE FUNCTION trg_fn_sync_pin_state();
    `.execute(db)

    await sql`
      CREATE TRIGGER trg_posts_sync_edit_state
      BEFORE INSERT OR UPDATE OF is_edited ON posts
      FOR EACH ROW EXECUTE FUNCTION trg_fn_sync_edit_state();
    `.execute(db)

    await sql`
      CREATE TRIGGER trg_users_stamp_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION trg_fn_stamp_updated_at();
    `.execute(db)

    await sql`
      CREATE TRIGGER trg_notification_preferences_stamp_updated_at
      BEFORE UPDATE OF is_subscribed ON notification_preferences
      FOR EACH ROW EXECUTE FUNCTION trg_fn_stamp_updated_at();
    `.execute(db)

    await sql`
      CREATE TRIGGER trg_users_sync_delete_state
      BEFORE INSERT OR UPDATE OF is_deleted ON users
      FOR EACH ROW EXECUTE FUNCTION trg_fn_sync_delete_state();
    `.execute(db)

    await sql`
      CREATE TRIGGER trg_societies_sync_delete_state
      BEFORE INSERT OR UPDATE OF is_deleted ON societies
      FOR EACH ROW EXECUTE FUNCTION trg_fn_sync_delete_state();
    `.execute(db)

    await sql`
      CREATE TRIGGER trg_servers_sync_delete_state
      BEFORE INSERT OR UPDATE OF is_deleted ON servers
      FOR EACH ROW EXECUTE FUNCTION trg_fn_sync_delete_state();
    `.execute(db)

    await sql`
      CREATE TRIGGER trg_channels_sync_delete_state
      BEFORE INSERT OR UPDATE OF is_deleted ON channels
      FOR EACH ROW EXECUTE FUNCTION trg_fn_sync_delete_state();
    `.execute(db)

    await sql`
      CREATE TRIGGER trg_posts_sync_delete_state
      BEFORE INSERT OR UPDATE OF is_deleted ON posts
      FOR EACH ROW EXECUTE FUNCTION trg_fn_sync_delete_state();
    `.execute(db)

    await sql`
      CREATE TRIGGER trg_society_membership_requests_stamp_review_state
      BEFORE UPDATE OF status ON society_membership_requests
      FOR EACH ROW EXECUTE FUNCTION trg_fn_stamp_review_state();
    `.execute(db)

    await sql`
      CREATE TRIGGER trg_program_curricula_validate_semester
      BEFORE INSERT OR UPDATE ON program_curricula
      FOR EACH ROW EXECUTE FUNCTION trg_fn_validate_curriculum_semester();
    `.execute(db)

    await sql`
      CREATE TRIGGER trg_classes_validate_semester
      BEFORE INSERT OR UPDATE OF current_semester ON classes
      FOR EACH ROW EXECUTE FUNCTION trg_fn_validate_class_semester();
    `.execute(db)

    // Attached to UPDATE only — classes.cr_id has a circular dependency with
    // students.class_id so cr_id is always NULL on INSERT and set via a
    // subsequent UPDATE. WHEN clause skips validation on cr_id removal.
    await sql`
      CREATE TRIGGER trg_classes_validate_cr_membership
      BEFORE UPDATE OF cr_id ON classes
      FOR EACH ROW
      WHEN (NEW.cr_id IS NOT NULL)
      EXECUTE FUNCTION trg_fn_validate_cr_membership();
    `.execute(db)
  },

  destroy: async function (db) {
    await sql`DROP TRIGGER IF EXISTS trg_channels_sync_lock_state ON channels;`.execute(db)
    await sql`DROP TRIGGER IF EXISTS trg_channels_sync_archive_state ON channels;`.execute(db)
    await sql`DROP TRIGGER IF EXISTS trg_posts_sync_pin_state ON posts;`.execute(db)
    await sql`DROP TRIGGER IF EXISTS trg_posts_sync_edit_state ON posts;`.execute(db)
    await sql`DROP TRIGGER IF EXISTS trg_users_stamp_updated_at ON users;`.execute(db)
    await sql`DROP TRIGGER IF EXISTS trg_notification_preferences_stamp_updated_at ON notification_preferences;`.execute(db)
    await sql`DROP TRIGGER IF EXISTS trg_users_sync_delete_state ON users;`.execute(db)
    await sql`DROP TRIGGER IF EXISTS trg_societies_sync_delete_state ON societies;`.execute(db)
    await sql`DROP TRIGGER IF EXISTS trg_servers_sync_delete_state ON servers;`.execute(db)
    await sql`DROP TRIGGER IF EXISTS trg_channels_sync_delete_state ON channels;`.execute(db)
    await sql`DROP TRIGGER IF EXISTS trg_posts_sync_delete_state ON posts;`.execute(db)
    await sql`DROP TRIGGER IF EXISTS trg_society_membership_requests_stamp_review_state ON society_membership_requests;`.execute(db)
    await sql`DROP TRIGGER IF EXISTS trg_program_curricula_validate_semester ON program_curricula;`.execute(db)
    await sql`DROP TRIGGER IF EXISTS trg_classes_validate_semester ON classes;`.execute(db)
    await sql`DROP TRIGGER IF EXISTS trg_classes_validate_cr_membership ON classes;`.execute(db)
  },
}