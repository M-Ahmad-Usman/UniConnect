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
| Phase 3: Society Leadership Rules | Not started | Plan already captures university-wide leadership candidates and one-active-leadership-position constraints. |
| Phase 4: Teaching Assignment And Course-Channel Access | Not started | Must preserve the moderator-assignment verification item for course-only teachers. |
| Phase 5: Teacher Workspace, Bulk Progression, Graduation Policy | Not started | Depends on Phase 4 teaching/channel access foundations. |
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

- Society President candidates become any active student university-wide.
- Society Convenor candidates become any active teacher university-wide.
- Add one-active-president-position-per-student and one-active-convenor-position-per-teacher safeguards.

Phase 4:

- `TEACHES` needs `assignedAt`, `assignedBy`, and direct `channelId`.
- Course-channel access for teachers must be derived from active `TEACHES.channelId`,
  not class-server membership.
- Teachers should not become class-server members solely because they teach a course.
- Verify and, if needed, decouple moderator assignment from server membership so a
  course-only teacher can become channel moderator for their own course channel.

Phase 5:

- Add `GET /api/teaching/me` and a teacher "My Teaching" view.
- Bulk semester progression is per-class independent success/failure.
- Graduated class servers remain visible to existing members; course channels are
  archived, Announcement/General remain open, and no new members can be added.

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
