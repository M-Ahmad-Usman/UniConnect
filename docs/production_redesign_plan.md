# UniConnect Production Redesign Plan

## Summary

Implement the redesign as a schema-first, capability-driven refactor. Foundation work
comes first: STAFF users, staff role assignment, Admin as exactly one active staff
role, and shared authorization helpers. Later phases build enrollment, academic access,
teacher workflows, posting features, and final regression coverage on that foundation.

Chosen defaults:

- STAFF users are role-scoped only; no administrative units or staff server
  auto-membership in this redesign.
- Exactly one active Admin, with atomic Admin transfer.
- Admin can post; non-admin STAFF roles cannot.
- Enrollment UI is a dedicated `/enrollment` workspace.
- Drafts are channel-scoped.
- Bulk posts support create + trace only in v1.
- Acknowledgment audience is snapshotted.
- Documentation is updated as each phase is implemented, not deferred to a final
  documentation phase.
- Phase progress, validation evidence, and cross-phase handoff context are tracked in
  `docs/production_redesign_progress.md`.

## Key API And Type Changes

- Replace `ADMIN` user type with `STAFF`; Admin becomes a `global` staff role
  assignment.
- Extend role scope values to `server`, `channel`, `department`, and `global`.
- Add `STAFF_ROLE_ASSIGNMENT` for global/department staff roles, using the same
  audited/revocable pattern as platform roles.
- Add direct Admin checks from active staff role assignment; never resolve Admin
  authority through `ROLE_PERMISSION`.
- Add department-scoped `enrollment_officer` role with permissions for class creation,
  student create/import, transfer, and read-only catalog/class roster access.
- Update auth/session and frontend role types to support global/department staff roles,
  and update guards to use backend capability flags instead of `userType === ADMIN`.
- Add direct course-channel access through `TEACHES.channelId`, not class server
  membership.
- Add `GET /api/teaching/me` for the teacher "My Teaching" view.
- Add bulk semester progression endpoint returning per-class success/failure.
- Add post status/draft/publish fields, bulk post group metadata, shared attachment
  asset references, and acknowledgment snapshot rows.

## Phased Implementation

### Phase 1: Role And Authorization Foundation

- Migrate `UserType.ADMIN` to `STAFF`; convert the existing Admin seed/user to STAFF
  plus active `admin` staff role.
- Add `StaffRoleAssignment`, extend role scope definitions, seed `admin` and
  `enrollment_officer`.
- Enforce exactly one active Admin in service code; add an atomic Admin transfer
  operation.
- Update `authorize`, permission context, auth responses, role cache, seed data,
  factories, and frontend guards/types for STAFF and staff roles.
- Keep academic roles as entity FKs and platform roles in `USER_ROLE_ASSIGNMENT`.
- Update relevant docs during this phase: `AGENTS.md`, backend/frontend summaries,
  security docs, API contract, functional requirements, and ERD.

Hardening outcome:

- PostgreSQL enum changes and staff-role table/constraint creation are split
  into separate migrations so enum values are committed before use.
- Staff-role period overlap and global Admin overlap are protected by SQL-only
  exclusion constraints in addition to service checks.
- Admin can discover, assign, list, and revoke `enrollment_officer` through the
  role workspace. Phase 2 still owns enrollment officer business permissions for
  class creation and student transfer.
- No intentional Phase 1 quick fixes remain.

Tests:

- Backend integration tests for Admin bypass, exactly-one Admin, Admin transfer, staff
  role assignment/revocation, and non-admin STAFF denial.
- Frontend unit/type tests for `UserType.STAFF`, role unions, guards, and
  capability-driven admin access.
- Run backend build/tests and frontend type-check/unit tests for this phase.

### Phase 2: Enrollment And HOD Responsibility Split

- Add an enrollment backend module or capability-gated service layer for class creation,
  student creation, CSV import, and student transfer.
- Move class creation and student transfer authorization from HOD to Admin/Enrollment
  Officer.
- Keep HOD authority academic only: curriculum, course creation, teacher assignment,
  semester progression, channels, societies.
- Add `/enrollment` frontend routes/pages for assigned departments: class creation,
  individual student create, bulk import, transfer, read-only programs/curricula/rosters.
- Ensure Enrollment Officer cannot post, assign roles, manage channels, edit curriculum,
  assign teachers, progress semesters, or manage societies.
- Update docs for the enrollment/academic authority split in the same phase.

Tests:

- Backend tests for department-scoped enrollment officer access and cross-department
  denial.
- Frontend tests for enrollment schemas/action visibility.
- E2E smoke test for Enrollment Officer creating a class and importing/transferring a
  student.

### Phase 3: Society Leadership Rules

- Remove department restrictions for society president/convenor candidate queries and
  create/update validation.
- Enforce one active Society President per student and one active Society Convenor per
  teacher across non-deleted active societies.
- Keep society membership university-wide.
- Update society UI text and candidate filters to no longer imply department-scoped
  leadership.
- Preserve HOD/Admin authority to create/change leadership for societies in the HOD's
  department.
- Update society and role docs in this phase.

Tests:

- Backend tests for cross-department president/convenor selection, duplicate active
  leadership rejection, and create/update paths.
- Frontend society utility/schema tests and E2E leadership-change coverage.

### Phase 4: Teaching Assignment And Course-Channel Access

- Add `assignedAt`, `assignedBy`, and `channelId` to `TEACHES`; populate on
  assign/replace.
- Stop auto-adding teachers to class servers solely because they teach a course.
- Create/unarchive course channels locked by default during semester progression; unlock
  a course channel only when its teacher is assigned.
- Refactor channel read/post authorization, post access, Socket.IO channel joins, and
  notification preference access to use a shared channel-access helper that recognizes
  `TEACHES.channelId`.
- Update moderator assignment so a teacher can be assigned channel moderator for a
  course channel they access through `TEACHES`, without requiring server membership.
- Update channel, role, realtime, and academic docs in this phase.

Tests:

- Backend tests for no class-server membership on teacher assignment, direct
  course-channel read/post/socket access, locked-channel denial, unlock on assignment,
  and moderator assignment without membership.
- Regression tests for ordinary member, CR, HOD, moderator, and Admin access.

### Phase 5: Teacher Workspace, Bulk Progression, Graduation Policy

- Add "My Teaching" API and frontend view grouped by course, listing classes and linking
  directly to course channels.
- Source "taught by" display from `TEACHES`, not server member lists.
- Add bulk semester progression with independent per-class transactions and explicit
  success/failure results.
- Update graduation behavior: course channels archived/read-only, Announcement and
  General remain open, server remains visible, no new members can be added, UI marks
  graduated classes/servers.
- Update teaching, class progression, and graduation docs in this phase.

Tests:

- Backend tests for `GET /api/teaching/me`, bulk progression partial success, and
  graduated class membership blocking.
- Frontend tests for My Teaching grouping and graduated UI states.
- E2E teacher direct navigation from My Teaching to a course channel.

### Phase 6: Notification Defaults

- Change auto-created preferences so Announcement channels start subscribed; Course and
  General channel preferences exist but start unsubscribed.
- Apply uniformly to user creation, bulk import, class transfer, society join
  approval/manual add, and teaching assignment course-channel preferences.
- Keep existing preference update screens working for opt-in toggles.
- Update notification docs and API contract in this phase.

Tests:

- Backend tests for preference defaults across all membership/assignment creation paths.
- Frontend notification preference tests for unsubscribed default Course/General rows.
- E2E notification smoke test confirming General/Course posts do not notify by default.

### Phase 7: Drafts, Bulk Posting, And Acknowledgments

- Add channel-scoped drafts: draft posts are author-only, excluded from
  feeds/search/notifications until published.
- Add publish endpoint that rechecks channel write authorization, lifecycle state, locks,
  attachments, and acknowledgment rules.
- Add bulk post creation endpoint: authorize every target first, reject all if any target
  fails, upload attachments once, create independent posts with shared bulk metadata.
- Add acknowledgment support for Important/Urgent posts only: snapshot eligible viewers
  when enabled/published, expose summary on post responses, allow one-time acknowledge,
  and add detail endpoint for author/moderator/Admin.
- Update post UI for Save Draft, Publish, bulk posting from My Teaching, acknowledgment
  controls, and summary/detail visibility.
- Update post, notification, security, and API docs in this phase.

Tests:

- Backend tests for draft invisibility, publish notification timing, bulk all-or-nothing
  behavior, shared attachment assets, acknowledgment priority validation, snapshot
  counts, one-time acknowledge, and detail authorization.
- Frontend post schema/component tests for draft, bulk, and acknowledgment states.
- E2E coverage for draft publish, teacher bulk post, and acknowledging an urgent post.

### Phase 8: Full Verification And Release Readiness

- Update seed data and E2E fixtures to cover STAFF/Admin role assignment, Enrollment
  Officer, course-only teachers, new notification defaults, and post acknowledgment
  examples as those features land.
- Run final verification sequentially, not in parallel:
  - `server`: migration status/apply to test DB, `npm run build`, `npm test`
  - `client`: `npm run type-check`, `npm run lint`, `npm run test`
  - E2E: `client npm run test:e2e`
- Fix regressions, then update release/readiness docs with the completed redesign notes.

## Assumptions

- Existing data can be migrated freely because there are no real users, but
  implementation still uses forward migrations and seed updates rather than manual
  database edits.
- Current academic `Department` remains academic only; future administrative units are
  deferred.
- Admin is the only STAFF role with full authorization bypass and posting ability.
- Enrollment Officer is department-scoped and may hold assignments for multiple
  departments.
- Bulk post v1 does not bulk edit/delete; it only stores traceable origin metadata.
