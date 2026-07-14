# UniConnect Production Redesign Progress

## Purpose

This file is the running implementation handoff for `docs/production_redesign_plan.md`.
Keep it current as each phase lands. The plan describes what should happen; this file
records what actually happened, validation evidence, important constraints, and context
future phases must preserve.

The original `UNICONNECT_REDESIGN_DECISIONS_SUMMARY.md` was retired after its decisions
were folded into the production redesign plan and this progress file.

## Current Status

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: Role And Authorization Foundation | Complete | Hardened and fully verified on 2026-07-07. |
| Phase 2: Enrollment And HOD Responsibility Split | Implemented | Backend/frontend implementation and focused validation complete; broader regression still pending before marking complete. |
| Phase 3: Society Leadership Rules | Implemented | Backend/frontend implementation and full Playwright validation complete. |
| Phase 4: Teaching Assignment And Course-Channel Access | Complete | Implementation, focused coverage, and full backend/frontend/Playwright regression verified on 2026-07-14. |
| Phase 5: Teacher Workspace, Bulk Progression, Graduation Policy | Complete | Implementation, focused coverage, and full backend/frontend/Playwright regression verified on 2026-07-14. |
| Phase 6: Notification Defaults | Not started | Must update every membership/assignment creation path consistently. |
| Phase 7: Drafts, Bulk Posting, And Acknowledgments | Not started | Drafts are channel-scoped; bulk posting is all-or-nothing. |
| Phase 8: Full Verification And Release Readiness | Not started | Final broad release verification after all phases land. |

## Phase 1 Completion Notes

Completed on 2026-07-07.

Implemented:

- Persisted user types are now `STAFF`, `TEACHER`, and `STUDENT`; there is no
  persisted `ADMIN` user type.
- Admin authority is resolved from an active global `admin` staff-role assignment.
- `StaffRoleAssignment` was added for global and department-scoped staff roles.
- Staff role scopes `global` and `department` were added to `PlatformRoleScopeType`.
- The `admin` and `enrollment_officer` roles are seeded.
- Admin transfer is atomic and is the only supported way to change the active Admin.
- Non-admin staff cannot use Admin routes, Admin bypass, or posting privileges.
- Role management exposes `enrollment_officer` for Admin assignment, candidate listing,
  revokable listing, and revocation.
- Frontend guards and helper checks use capability data / active role data instead of
  `UserType.ADMIN`.
- Test factories now preserve the single-active-Admin invariant.

Hardening details:

- PostgreSQL enum changes are in `20260706000000_phase1_staff_roles`.
- Staff-role table creation and constraints are in
  `20260706001000_phase1_staff_role_assignments`.
- The migration split is required because PostgreSQL cannot safely use newly added enum
  values in later statements until the enum migration has committed.
- SQL-only exclusion constraints prevent overlapping staff-role periods and overlapping
  global Admin assignments.
- Prisma schema comments document SQL-only constraints that Prisma cannot represent.
- No intentional Phase 1 quick fixes remain.

Important files introduced:

- `server/src/shared/roles/staff.ts`
- `server/prisma/migrations/20260706000000_phase1_staff_roles/migration.sql`
- `server/prisma/migrations/20260706001000_phase1_staff_role_assignments/migration.sql`
- `server/tests/modules/staff-role.test.ts`
- `client/src/lib/roles.ts`
- `docs/production_redesign_plan.md`
- `docs/production_redesign_progress.md`

Important files changed:

- `server/prisma/schema.prisma`
- `server/prisma/seed.ts`
- `server/src/middleware/authenticate.ts`
- `server/src/middleware/authorize.ts`
- `server/src/shared/permissions/index.ts`
- `server/src/modules/role/*`
- `server/src/modules/user/*`
- `server/src/modules/admin/*`
- `server/src/socket/index.ts`
- `client/src/types/*`
- `client/src/routes/guards/AdminGuard.tsx`
- `client/src/features/roles/*`
- `client/API_CONTRACT.md`
- `server/docs/FRONTEND_BACKEND_CONTRACT.md`
- `docs/release_log.md`
- `docs/security.md`
- `docs/backend.md`
- `docs/frontend.md`
- `docs/functional_requirements.md`
- `docs/database_erd.md`

## Phase 1 Validation Evidence

Final validation run on 2026-07-07:

- `server`: `npx prisma validate`
- `server`: `npx dotenv -e .env.test -- prisma migrate reset --force`
- `server`: `npm run db:migrate:test`
- `server`: `npm run build`
- `server`: `npx tsc -p tests/tsconfig.json --noEmit --pretty false`
- `server`: `npm test` -> 24 suites, 528 tests passed
- `client`: `npm run type-check`
- `client`: `npm run test` -> 23 files, 139 tests passed
- `client`: `npm run build`
- `client`: `npm run test:e2e` -> 36 tests passed

Known validation noise:

- Backend Jest and Playwright runs emit a pg adapter deprecation warning:
  `Calling client.query() when the client is already executing a query is deprecated`.
  Tests pass; this warning predates the redesign work and should be handled separately
  when upgrading pg/Prisma adapter behavior.

## Current Invariants

- `ADMIN` may appear in route/service authorization as an effective runtime role, but
  must not be reintroduced as a persisted user type.
- Admin authorization must be a direct active staff-role lookup, never a
  `ROLE_PERMISSION` lookup.
- Exactly one active global Admin is the policy. The database prevents overlapping
  global Admin assignments; service flows preserve one current Admin through transfer.
- Staff users do not auto-join academic servers.
- Non-admin staff roles do not post, manage channels, assign roles, or receive Admin
  bypass unless a later phase explicitly adds scoped capability.
- Academic roles remain direct entity foreign keys.
- Server/channel moderator roles remain in `user_role_assignments`.
- Staff global/department roles remain in `staff_role_assignments`.

## Phase 2 Handoff

Implementation status on 2026-07-07:

- Added dedicated `/api/enrollment` routes for bootstrap, scoped programs,
  curriculum read, class list/detail/create, rosters, transfer candidates,
  transfers, single-student creation, and student-only CSV import.
- Added `/enrollment` frontend workspace with class list/detail, create class,
  create student, import, and transfer workflows.
- Admin can use enrollment across all departments; Enrollment Officer can use it
  only in active assigned departments.
- HOD no longer has enrollment mutations through class routes; HOD retains
  read-only roster visibility and academic permissions.
- Legacy `/api/classes` class creation is Admin-only; HOD class creation must go
  through the Enrollment Officer workflow instead.
- Generic Admin `/api/users/bulk-import` now rejects `STAFF` rows.

Focused validation:

- `server`: `npm run build`
- `server`: `npm test -- tests/modules/enrollment.test.ts` -> 7 focused
  enrollment workspace tests passed
- `server`: `npm test -- tests/modules/class.test.ts tests/modules/permission.test.ts tests/modules/enrollment.test.ts` -> 76 focused integration tests passed
- `server`: `npx tsc -p tests/tsconfig.json --noEmit --pretty false`
- `client`: `npm run type-check`
- `client`: `npm run lint`
- `client`: `npm run test -- src/features/enrollment/__tests__/schemas.test.ts src/features/admin/__tests__/schemas.test.ts src/features/admin/__tests__/utils.test.ts` -> 29 tests passed
- `client`: `npx playwright test e2e/academic-workflows.spec.ts --project=chromium` -> 5 tests passed
- `client`: `npx playwright test e2e/ui-accessibility.spec.ts --project=chromium` -> 2 tests passed

Remaining before Phase 2 complete:

- Keep stale test expectations aligned with the Phase 2 split:
  - HOD is read-only for rosters and cannot use enrollment APIs.
  - Legacy class student-transfer mutation is Admin-only.
  - Enrollment Officer owns browser-level student placement flows.
- Run full backend and frontend suites again after the focused slices pass.

Primary goal:

- Wire the existing `enrollment_officer` staff role into real enrollment workflows.

Required behavior:

- Enrollment Officer can, within assigned departments:
  - create classes;
  - create individual student accounts;
  - bulk-import students into a class;
  - transfer students between classes;
  - read programs, curricula, classes, and rosters needed for enrollment work.
- Enrollment Officer cannot:
  - post in any channel;
  - assign or revoke roles;
  - manage channels;
  - edit curriculum;
  - assign teachers;
  - progress semesters or graduate classes;
  - manage societies.
- HOD authority becomes academic-only:
  - keep course creation;
  - keep curriculum and teacher assignment authority;
  - keep semester progression and department-scoped society/channel authority;
  - remove class creation and student enrollment/transfer authority.

Docs to update during Phase 2:

- `docs/functional_requirements.md`
- `docs/backend.md`
- `docs/frontend.md`
- `docs/security.md` if capability/authorization policy changes
- `client/API_CONTRACT.md`
- `server/docs/FRONTEND_BACKEND_CONTRACT.md`
- `docs/release_log.md`
- `docs/production_redesign_progress.md`
- `AGENTS.md` only if workflow or architectural rules change

Suggested Phase 2 validation:

- Backend tests for same-department and cross-department Enrollment Officer access.
- Backend tests proving HOD no longer creates classes or transfers students.
- Frontend tests for enrollment forms and action visibility.
- E2E smoke for Enrollment Officer class creation and student import/transfer.
- E2E regression proving HOD cannot open the enrollment workspace.
- Permission bootstrap regression proving Enrollment Officer department scopes are
  exposed to the frontend guard contract.

## Later-Phase Context To Preserve

Phase 3:

- Implemented on 2026-07-08:
  - Society President candidates are active university-wide students with `StudentInfo`.
  - Society Convenor candidates are active university-wide teachers with `TeacherInfo`.
  - Admin/HOD authority remains scoped to the society's owning department.
  - Active, non-deleted society leadership uniqueness is backed by SQL-only partial unique indexes.
  - Suspended/deleted societies retain leadership history but do not reserve leaders.
  - Activation/restoration preflight uses `/api/societies/:publicId/leadership-conflicts`.
  - Activation/restoration returns 409 `CONFLICT` with details when saved leaders are active elsewhere.
- Focused validation:
  - `server`: `npx prisma validate`
  - `server`: `npx dotenv -e .env.test -- prisma migrate reset --force`
  - `server`: `npx prisma generate`
  - `server`: `npm test -- tests/modules/society.test.ts tests/modules/society-lifecycle.test.ts --runInBand` -> 68/68
  - `server`: `npm run build`
  - `server`: `npx tsc -p tests/tsconfig.json --noEmit --pretty false`
  - `server`: `npm test -- --runInBand` -> 25 suites, 539/539
  - `client`: `npm run type-check`
  - `client`: `npm run lint`
  - `client`: focused society API/schema/utility Vitest suites -> 8/8
  - `client`: `npm run test` -> 26 files, 147/147
  - `client`: `npm run build`
- Playwright validation:
  - `client`: `npx playwright test e2e/auth-force-change.spec.ts e2e/server-channel-workflows.spec.ts e2e/ui-accessibility.spec.ts --project=chromium --reporter=list` -> 8/8 after replacing stale waits and mutable academic fixture usage.
  - `client`: `npx playwright test e2e/society-workflows.spec.ts e2e/ui-accessibility.spec.ts --project=chromium --reporter=list` -> 7/7 after isolating society accessibility fixtures from Phase 3 leadership mutations.
  - `client`: `npm run test:e2e -- --reporter=list` -> 39/39.
  - Remaining log noise: backend E2E still emits the existing pg deprecation warning about calling `client.query()` while a client is already executing a query.

Phase 4:

- Implemented on 2026-07-08:
  - `TEACHES` now stores `assignedAt`, nullable historical `assignedBy`, and direct `channelId`.
  - Teaching assignment no longer creates class-server membership.
  - Class creation and semester progression create course channels locked by default when no teacher is assigned.
  - Semester progression accepts partial or empty target-semester teacher assignments.
  - Assigning/replacing a teacher unlocks the linked course channel.
  - Removing a current course assignment deletes the `TEACHES` row and locks the course channel until reassignment.
  - Channel/post/socket/preference access uses direct `TEACHES.channelId` for course-only teachers.
  - `NEW_POST` notifications include direct course teachers for their course channel.
  - Server/channel moderator roles remain limited to real server members; course-only access is not platform role eligibility.
- Focused validation:
  - `server`: `npx prisma validate`
  - `server`: `npx prisma generate`
  - `server`: test DB reset applied migrations through `20260708010000_phase4_teaching_channel_access`
  - `server`: `npm run build`
  - `server`: `npx tsc -p tests/tsconfig.json --noEmit --pretty false`
  - `server`: focused class/channel/post/notification/role integration slice -> 196/196
  - `client`: `npm run type-check`
  - `client`: `npm run lint`
  - `client`: `npm run test -- --run` -> 26 files, 147/147
  - `client`: `npm run build`
  - Existing pg adapter deprecation warning still appears in Jest runs.
- Completion validation on 2026-07-14:
  - Added deterministic per-socket channel-join serialization so burst joins do not
    issue overlapping Prisma access queries or intermittently lose valid rooms.
  - Full clean-migration/backend/frontend/browser evidence is shared with Phase 5 below.

Phase 5 implemented on 2026-07-11 and completed on 2026-07-14:

- Added append-only `TeachingAssignmentHistory` records for replacement, removal,
  semester progression, and graduation. Only progression/graduation history grants
  read-only access to archived course channels.
- Added `GET /api/teaching/me` and the guarded `/teaching` workspace with active and
  paginated historical assignments linked to existing channel routes.
- Added `POST /api/classes/semester-progression/bulk` for Admin/HOD callers. Up to 50
  unique classes are processed sequentially in independent transactions and return
  an HTTP 200 result array with per-class success or typed failure details.
- Graduation now archives teaching history, clears live `TEACHES`, archives/locks
  Course channels only, and leaves Announcement/General open to existing members.
- Student creation, import, enrollment, and transfer resolution reject graduated
  destination classes with `CLASS_GRADUATED`.
- Added `canAccessTeachingWorkspace` and `canBulkAdvanceSemester` permissions.
- Historical progression/graduation access now permits the exact archived server and
  channel shell data needed for direct navigation. Replacement/removal history remains
  audit-only and does not expose server or channel content.
- Mobile is outside Phase 5 scope; the hosted web client and server contract are the
  source of truth for this phase.
- Completion validation:
  - Clean test database reset applied all six migrations through
    `20260711000000_phase5_teaching_history`.
  - `server`: Prisma validation, production build, test TypeScript compilation, and
    full Jest integration regression -> 26 suites, 544/544.
  - `client`: type-check, lint, production build, and full Vitest regression ->
    28 files, 150/150.
  - Targeted academic Playwright -> 7/7, including replacement history denial and
    graduated archived-channel read-only navigation.
  - Full Chromium Playwright regression -> 41/41.
  - Remaining non-blocking warning: the Prisma pg adapter still reports deprecated
    concurrent `client.query()` usage in several unrelated integration paths.

Phase 6:

- Auto-subscribe users only to Announcement channels by default.
- Course and General notification preferences should exist but start unsubscribed.
- Apply consistently to account creation, bulk import, transfer, society membership,
  and teaching assignment course-channel preferences.

Phase 7:

- Draft posts are author-only, excluded from feeds/search/notifications until publish.
- Bulk posting must authorize every target before writing anything.
- Bulk-created posts are independent records sharing trace metadata.
- Attachments for bulk posts should upload once and be referenced by each post.
- Acknowledgment is allowed only for Important/Urgent posts, one-time and non-retractable,
  with summary on normal post responses and detail visible to author/moderators/Admin.
