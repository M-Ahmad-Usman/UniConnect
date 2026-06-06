# UniConnect Release Log

## Purpose
This is the single active implementation and release log going forward. Older backend-only and frontend-local progress files have been summarized into the canonical docs so developers do not need to read multiple stale ledgers.

## Historical Summary

### Backend API Completion
- Backend functional modules 0-12 were completed before the full-system
  hardening pass.
- The backend settled on Express 5, Prisma 7 with `@prisma/adapter-pg`, Zod 4,
  cookie-based JWT auth, Socket.IO, Jest/Supertest integration tests, and native
  ESM imports with `.js` extensions.
- Backend architecture and coding standards remain in
  `server/BACKEND_ARCHITECTURE.md`.

### Backend-Only Hardening Pass
- Completed performance, security, reliability, and operations hardening.
- Important retained outcomes: indexes, N+1 removal, role/cache optimizations,
  rate limits, upload magic-byte validation, JWT/reset-token hardening, proxy
  trust, request limits/timeouts, DB-aware health checks, stale refresh-token
  cleanup, multi-origin CORS parsing, helmet tuning, API error code catalog, and
  operations-focused README updates.
- Current security posture is summarized in `docs/security.md`.

### Frontend Implementation
- Frontend modules 0-9 were implemented: foundation, auth, layout/navigation,
  server/channel views, posts, notifications, profile/user management, admin
  CRUD, societies, and role management.
- Key retained decisions:
  - feature-based folders
  - TanStack Query for server state
  - Zustand for small client state
  - shadcn/ui + Tailwind v4
  - Tiptap for rich text
  - cookie-based auth only
  - same-origin runtime default
  - balanced unit/component testing plus Playwright for runtime flows
  - paginated/load-more post feed
  - committed Playwright tests preferred over ad-hoc browser automation for
    release verification
- Detailed frontend architecture remains in `client/ARCHITECTURE.md`.

### Full-System Hardening Modules 1-6
- Module 1: backend-driven permission capabilities and permission-sensitive
  query invalidation.
- Module 2: delegated academic workspace, student transfer, teacher replacement,
  class graduation/archive behavior.
- Module 3: society query gating, member privacy, join request UX, leadership
  candidate scoping.
- Module 4: scoped role-management option endpoints and lazy frontend role
  workspace.
- Module 5: CSRF, audit logs, content/link safety, upload pixel limits,
  Cloudinary folder allowlist.
- Module 6: accessible tabs/dialogs/forms/tables/states, cookie-backed theme,
  keyboard/mobile/axe Playwright coverage.

## Active Entries

### 2026-06-06 - User Detail and Admin Creation Hardening
- Student profile/admin detail payloads now include display-ready class metadata
  (`publicId`, `currentSemester`, `section`, `program.code`) so the frontend can
  render labels such as `BSCS-7-A` without an extra class lookup.
- Profile and admin user detail views now show the readable class label instead
  of exposing class public IDs as the primary display value.
- Application-level user creation and bulk import now reject `ADMIN` rows.
  Admin accounts are treated as bootstrap/DB-managed records rather than
  frontend-created accounts.
- Updated create-user and bulk-import UX copy, API contracts, and focused
  backend/frontend tests for the new policy.

### 2026-06-06 - Academic Edit Invariant Hardening
- Program code and semester count are now locked once any class exists for the
  program, preserving curriculum/class/channel lifecycle assumptions.
- Before class enrollment, reducing a program's semester count requires explicit
  confirmation and deletes only curriculum entries above the new semester count
  in the same transaction. Increasing semesters remains allowed but requires
  curriculum setup before classes can be admitted.
- Program code updates now return an explicit duplicate-code conflict instead
  of relying on raw database uniqueness errors.
- Course title, code, and credit hours are now locked once the course is used in
  curriculum, teaching assignments, or course channels.
- Program edit dialogs now show locked fields for used programs and require a
  destructive confirmation before confirmed semester reduction.

### 2026-06-05 - Production Readiness Audit Remediation
- Moved Programs out of the Admin navigation and into the Academics workspace as
  `/academics/programs`. Legacy `/admin/programs` routes now redirect to the
  academic workspace.
- Expanded curriculum authority so admins, own-department HODs, and
  directed-program Program Directors can add/remove curriculum entries. Program
  catalog creation/editing remains admin-only.
- Added `directedProgramIds` to `/api/permissions/me` and added scoped
  `/api/programs` list filters. `departmentIds` and `programIds` combine as a
  union when `departmentId` is omitted, so mixed HOD/PD users can see all
  programs in their authority.
- Made program and curriculum frontend actions backend-scope-aware; admins see
  catalog create/edit actions, while HOD/PD users see only permitted curriculum
  actions.
- Switched query error UX to inline-first. Query failures no longer toast
  globally by default; shared data states and the Academic guard render retry
  states with API copy and request IDs when available.
- Removed society leadership roles from the generic role-assignment form to
  match the backend boundary that manages leadership through society workflows.
- Replaced in-memory new-post notification fanout with set-based SQL
  `INSERT ... SELECT`, preserving server/channel unsubscribe behavior and
  Socket.IO unread-count emission.
- Removed the Express response-timeout middleware that could race later route
  responses; HTTP server request/header/socket/keep-alive timeouts now own this
  behavior.
- Renamed active tests and Playwright files/helpers from historical module
  numbers to domain workflow names.
- Added backend Jest coverage thresholds and frontend Vitest V8 coverage with an
  initial aggregate 10% ratchet. Generated coverage output is excluded from
  ESLint so running coverage does not pollute lint results.
- Added `@vitest/coverage-v8`, updated `axios`, `react-router-dom`, `vitest`,
  and `@vitest/coverage-v8`, and added npm overrides for transitive `hono` and
  `qs`. Frontend `npm audit` now reports 0 vulnerabilities.
- Removed hidden legacy `/admin/programs` redirects and route constants. Programs
  are now reached only through `/academics/programs`, with admin-only catalog
  controls rendered in that academic workspace.
- Removed deprecated `baseUrl` from `server/tsconfig.json`; the server build and
  explicit no-emit TypeScript check pass without adding `ignoreDeprecations`.
- Tightened scoped academic UX: HOD create-course and create-society dialogs now
  lock the department field when there is a single scoped department, and class
  program-filter options wait for permission bootstrap before requesting scoped
  program lists.
- Tightened curriculum/class lifecycle coupling:
  - class creation now requires a complete admission-year curriculum with at
    least one course in every program semester
  - class creation auto-creates current-semester course channels in the class
    server from that curriculum
  - semester progression requires teacher assignments for every target-semester
    curriculum course and rejects missing, duplicate, or extra assignments
  - curriculum edits/removals are blocked for semesters already reached by an
    existing class in the same program/batch
  - removing curriculum from a live class batch is blocked when it would make
    the batch curriculum incomplete
- Added curriculum bulk-add and copy-batch workflows for admins, own-department
  HODs, and directed-program Program Directors. Bulk add and copy skip duplicate
  program/batch courses; the existing schema uniqueness keeps a course from
  appearing more than once in the same degree batch.
- Updated the frontend curriculum workspace to add multiple semester courses in
  one dialog, copy a previous batch curriculum into a target batch, and show
  locked curriculum rows as read-only. The add-curriculum dialog now uses
  server-backed course search and distinct loading/empty states so large
  departments are not limited to the initially loaded course page.
- Reworked curriculum batch selection to avoid free-form invalid year input:
  the page now shows recent batch toggles, a paginated older-batch selector,
  and always renders one batch's full curriculum instead of mixing all batches
  in each semester group.
- Locked academic department filters where the caller has a single immutable
  scope. HOD course/class/program/society filters now display the scoped
  department as read-only, and PD-only class/program filters show a read-only
  directed-program scope indicator.
- Verification passed:
  - backend build
  - active server `tsconfig.json` no-emit check
  - backend coverage suite, 23/23 suites and 509/509 tests
  - frontend lint, type-check, Vitest, coverage, production build
  - Playwright E2E, 36/36
- Incremental verification after the admin-route, scoped-dialog, class-filter,
  and `tsconfig.json` edits passed: server no-emit TypeScript check, server
  build, frontend type-check, frontend lint, and frontend Vitest 136/136.
- Final verification after the curriculum/class lifecycle changes passed:
  server build, focused backend curriculum/class suites 93/93, frontend
  type-check, frontend lint, frontend Vitest 139/139, frontend production build,
  and `git diff --check`.
- Updated the development seed script for the stricter curriculum/class
  lifecycle. The seed now creates complete BSCS/BSSE curricula across multiple
  batches, three active classes with current-semester course channels and
  teacher assignments, richer demo users, society membership request examples,
  and presentation-ready posts.
- Changed the backend migration scripts so `npm run db:migrate` runs
  `prisma migrate deploy` for non-interactive fresh setup and pulls. New
  migration creation now uses `npm run db:migrate:dev -- --name <name>`.
  This avoids Prisma prompting for a migration name during fresh setup when the
  committed migration has already been applied.
- Known follow-up:
  - Prisma adapter/`pg` transaction deprecation warning still appears under
    backend coverage/E2E and should be resolved before a future `pg@9` upgrade.
  - The current server `tsconfig.json` compiles cleanly; a stricter ad-hoc
    NodeNext compatibility check surfaces many existing Prisma transaction/type
    inference issues, so switching from `moduleResolution: "bundler"` should be
    treated as a separate backend TypeScript hardening task.
  - Structured async logging with request IDs, redaction, and log levels is a
    high-value production upgrade. The current repo standard still uses
    prefixed console methods, so a Pino migration should be handled as an
    explicit logging-design change rather than a drive-by dependency addition.
  - Before horizontal scaling, add shared infrastructure for cross-instance
    behavior: Redis-backed rate-limit/session-style coordination where needed
    and the Socket.IO Redis adapter for room/event fanout.

### 2026-06-05 - Schema/Lifecycle Refactor Module 9 Complete
- Removed transitional `isActive`/`is_active` compatibility from users,
  societies, and servers across Prisma schema, backend services, frontend
  contracts, tests, and seed data. Lifecycle behavior now uses `status` plus
  `isDeleted` consistently.
- Removed temporary dual numeric/public core-ID resolution. Final core API
  helpers and routes accept strict UUIDv7 public IDs for users, classes,
  societies, servers, channels, and posts.
- Squashed Prisma history into the final baseline migration
  `20260605000000_module9_final_baseline`, preserving SQL-only partial indexes,
  lifecycle checks, role-assignment exclusion constraints, and
  notification-preference constraints.
- Regenerated the committed Prisma client, simplified Prisma adapter/Jest
  teardown wiring, and refreshed clean development/test databases from the final
  baseline.
- Resolved low-risk warning cleanup: backend log prefixes now follow module
  conventions, Vite chunk splitting removes the previous large
  `react-vendor` build warning, and Playwright uses an explicit socket URL.
- Verification passed: Prisma validate/generate; development DB reset and seed;
  test DB migration; backend build; focused backend suites `55/55`; full
  backend Jest `502/502`; frontend type-check, lint, Vitest `134/134`,
  production build, and Playwright `36/36`.
- The previous Playwright shutdown-time Vite websocket proxy `ECONNRESET` noise
  did not recur in the Module 9 full-suite runs.
- Deferred: Prisma adapter/`pg` transaction deprecation warning remains for
  row-locking raw SQL and should be handled before a future `pg@9` upgrade.
  Playwright also inherits an ambient Node color-env warning in this shell when
  `NO_COLOR` and `FORCE_COLOR` are both set; it does not affect the suite.

### 2026-06-03 - Schema/Lifecycle Refactor Module 8 Complete
- Added admin-only rare deletion-impact reports for departments, programs,
  classes, and courses. Reports are read-only and do not add destructive delete
  endpoints.
- Standardized rare impact responses around bounded blocker groups with
  `count`, `preview`, and `hasMore`, plus explicit communication cleanup impact.
- Completed class deletion impact by replacing the Module 7 provisional
  `COMMUNICATION_IMPACT` pending state with complete class-server channel, post,
  membership, notification-preference, and platform-role cleanup counts.
- Kept catalog IDs numeric for departments, programs, and courses while
  preserving public IDs for core preview rows such as users, classes, channels,
  servers, societies, and posts.
- Reported department-linked users according to the current
  `users.departmentId` schema, grouped by user type, so future hard-delete
  planning matches actual database blockers.
- Added Module 8 read-path indexes for rare impact reverse lookups and frontend
  catalog impact types/API methods/query hooks for future UI use.
- Verification passed: Prisma validate/generate; Module 8 SQL executed against
  the isolated test DB with `prisma db execute` before Module 9 established the
  final clean baseline; focused backend impact and class suites `68/68`; full
  backend Jest `502/502`; backend build;
  frontend type-check, lint, focused catalog Vitest `1/1`, full Vitest
  `134/134`, and production build.
- Deferred to Module 9 and completed there: final migration squash, `isActive`
  removal, and transitional compatibility cleanup.

### 2026-06-02 - Schema/Lifecycle Refactor Module 7 Complete
- Migrated class routes, nested workflows, frontend URLs, query keys, forms, CSV
  import, and E2E navigation helpers to strict UUIDv7 class public IDs.
- Replaced public academic student and teacher references with `studentPublicId`
  and `teacherPublicId`, removed composed DTO leaks, and converted graduation
  actor metadata to `graduatedByPublicId`.
- Closed authenticated class-detail and assigned-course IDOR exposure. Reads
  now require admin, own-department HOD, or own-program PD scope.
- Added shared transaction row locks and commit-time authority/lifecycle checks
  for delegated class writes, curriculum changes, HOD course creation, and
  academic role-owner changes. Added under-lock stale-state checks for owner and
  class-course mutations plus deterministic source/target locking for student
  transfers.
- Added admin-only provisional class deletion impact. Module 8 must add
  communication descendants before the endpoint can report a final decision.
- Added granular curriculum/course capabilities and moved Courses to
  `/academics/courses`. HODs can create courses only for their own departments;
  course editing remains admin-only.
- Verification passed: backend build and Jest `498/498`; frontend lint,
  type-check, Vitest `133/133`, and production build; targeted academic and
  accessibility Playwright `6/6`; isolated E2E timing-failure rerun `9/9`.
- Deferred release-hardening findings: investigate the Prisma adapter `pg`
  concurrent-query deprecation warning before `pg@9`, and stabilize the full
  parallel Playwright run under local load. The full run completed `28`, failed
  `5` timing-sensitive auth/post tests, and left `3` unrun before the isolated
  rerun passed.

### 2026-06-02 - Schema/Lifecycle Refactor Module 6 Complete
- Migrated server, channel, and post routes, DTOs, frontend URLs, query keys,
  realtime envelopes, notification links/preferences, linked admin navigation,
  and Playwright route helpers to strict UUIDv7 public IDs.
- Added request-local communication target resolution so routes parse and
  resolve public IDs once while services, Prisma relations, JWT subjects,
  internal events, and Socket.IO rooms retain efficient numeric keys.
- Made archived channels authorized read-only history: clients group them in a
  collapsed history section, suppress write controls and realtime joins, keep
  post reads available, and receive typed `CHANNEL_ARCHIVED` conflicts for
  attempted mutations.
- Added transaction-time lifecycle locks and membership revalidation for
  channel/post writes. Former post authors who lose server membership can no
  longer edit, delete, or trigger Cloudinary attachment uploads.
- Hardened Socket.IO channel joins with `{ channelPublicId }`, lifecycle and
  membership checks, a 32-room cap, a 60-attempt/minute cap, and pending-join
  reservations that prevent asynchronous burst joins from bypassing the room
  limit.
- Deferred to Module 7: remaining academic numeric class/user references and
  graduation actor references. Deferred to Module 8: rare destructive lifecycle
  impact reconciliation. Also recorded a later broad commit-time scoped-role
  authorization audit and notification deep-link model enhancement.
- Verification passed:
  - backend build and full Jest suite, 495/495
  - frontend lint, type-check, production build, and full Vitest suite, 131/131
  - focused communication Playwright suite, 8/8, and full Playwright suite,
    36/36

### 2026-06-01 - Schema/Lifecycle Refactor Module 5 Complete
- Migrated society-facing routes, DTOs, frontend URLs, query keys, and related
  user references to UUIDv7 public IDs.
- Added admin/own-department-HOD deletion-impact, suspend/activate, soft-delete,
  and restore APIs with audited transaction-scoped lifecycle row locking.
- Made suspended societies fully read-only, including membership, leadership,
  channel/server, moderator, posting, and post-mutation paths.
- Soft-delete now marks society-owned servers and live channels with one cascade
  ID, deletes pending membership requests, preserves historical and content
  data, and restores only descendants deleted by the same cascade.
- Added society-linked lifecycle notifications for suspend, activate, delete,
  and restore. Fanout uses one transactional `INSERT ... SELECT`, excludes the
  actor, targets active members, and emits Socket.IO updates after commit.
- Hardened notification preferences with SQL checks, channel/server ownership
  enforcement, null-safe uniqueness, and atomic upsert behavior.
- Hardened Cloudinary writes with deletion metadata and best-effort rollback;
  post rows and uploaded attachment rows now commit together after upload.
- Added deleted-society discovery, lifecycle filters and badges, impact-aware
  confirmation dialogs, and role-sensitive realtime cache invalidation.
- Verification passed:
  - Prisma generate and Module 5 migration SQL execution against the isolated
    test DB
  - backend build and full Jest suite, 488/488
  - frontend type-check, lint, production build, and full Vitest suite, 131/131
  - focused society Playwright suite, 3/3, and full Playwright suite, 36/36

### 2026-06-01 - Module 4 Hardening + E2E Reliability
- Enforced moderator eligibility to teacher/student users only, with assignable-user filtering, assignment validation, and updated contract/tests.
- Disconnected sockets when society members are removed and when class auto-memberships are cleaned up after teaching changes.
- Playwright E2E now loads `.env.e2e` for seeding, enables CSRF, and supports env-driven host/port overrides with forced server restarts.

### 2026-05-30 - Schema/Lifecycle Refactor Module 4 Complete
- Replaced destructive moderator rows with append-only platform role assignment
  history, UUIDv7 assignment IDs, optional expiry, audited revocation, and
  audited expiry editing.
- Added database scope-integrity constraints and a PostgreSQL `btree_gist`
  exclusion constraint to reject overlapping assignment periods under
  concurrency.
- Kept academic roles entity-owned with fixed TypeScript capability bundles;
  the `roles` table now stores platform roles only.
- Removed generic `/api/roles/assign` and `/api/roles/revoke` writes. Added
  canonical academic owner endpoints and platform assignment resource
  endpoints.
- Migrated `/api/roles/*` core references to public IDs and added admin-only
  paginated platform assignment history.
- Updated authorization readers, badges, cleanup checks, seed data, test
  fixtures, Socket.IO invalidation, the frontend role workspace, expiry editor,
  lazy admin history panel, and AuthGuard nearest-expiry refresh scheduling.
- Kept platform-assignment transactions focused on mutation plus audit, with
  response DTO hydration after commit, and documented SQL-only integrity
  constraints that future Prisma-generated migrations must preserve.
- Verification passed:
  - Prisma validate, generate, and isolated test migration deploy
  - backend build and full Jest suite, 479/479
  - frontend type-check, lint, production build, and full Vitest suite, 131/131
  - focused Module 4 Playwright suite, 4/4, and full Playwright suite, 36/36

### 2026-05-29 - Schema/Lifecycle Refactor Module 3 Complete
- Migrated user/auth/admin user surfaces to public user IDs while leaving
  role-management numeric user-ID contracts for Module 4.
- Switched access and refresh JWT payloads to standard `sub` and added DB-backed
  access-token and Socket.IO authentication checks for deleted, inactive,
  suspended, and missing users.
- Added admin user lifecycle APIs for deletion impact, status changes, soft
  delete, and restore; removed old deactivate/reactivate user routes.
- Added grouped deletion blockers for HOD departments, directed programs, CR
  classes, live society leadership, and active teaching assignments.
- Implemented lifecycle side effects for session revocation, socket disconnect,
  reset-token clearing, notification cleanup, pending society-request cleanup,
  audit logging, and preserved-status restore.
- Updated frontend auth/profile/admin user management contracts, API clients,
  query keys, filters, dialogs, and tests for user `publicId`, status, lifecycle
  filters, and deletion-impact confirmation.
- Verification passed:
  - backend build
  - focused backend user/auth/admin/security suites
  - backend schema-foundation regression suite
  - full backend Jest suite
  - frontend type-check, lint, Vitest, and production build

### 2026-05-28 - Schema/Lifecycle Refactor Module 2 Complete
- Added backend-only public-ID foundation utilities in `server/src/shared/ids/`:
  strict UUIDv7 validation, core entity resolvers, temporary dual-resolution
  support, and shallow public DTO mappers.
- Added `includeDeleted` resolver support for future lifecycle restore and
  deletion-impact modules without changing live route behavior.
- Added test factory helpers so future API tests can use public IDs while DB
  setup continues using internal IDs.
- Kept frontend code, live API routes, and live response bodies unchanged.
- Verification passed:
  - Prisma validate
  - focused public-ID foundation suite, 14/14
  - full backend Jest suite, 512/512
  - backend build

### 2026-05-28 - Schema/Lifecycle Refactor Module 1 Complete
- Added schema foundations for the public-ID and lifecycle refactor:
  UUIDv7 public IDs, user/society status enums, soft-delete metadata, lifecycle
  cascade metadata, designation lookup constraints, and explicit FK deletion
  policies.
- Replaced old Prisma migrations with one Module 1 baseline migration and added
  partial live-row indexes for reusable soft-deleted keys.
- Updated transitional backend behavior so auth, user, society, server, class,
  authorization, seed, and test-helper paths respect live rows and lifecycle
  status where needed.
- Added focused Module 1 integration coverage for UUID defaults, lifecycle
  defaults, status dual-write behavior, live-row uniqueness, and designation FK
  enforcement.
- Verification passed:
  - Prisma generate
  - Prisma validate
  - dev DB reset to the new baseline
  - test DB reset to the new baseline
  - focused Module 1 schema suite
  - auth lifecycle regression suite, 28/28
  - full backend Jest suite, 498/498
  - backend build

### 2026-05-28 - Schema/Lifecycle Refactor Module 0 Complete
- Added canonical planning and tracking docs for the schema, lifecycle,
  public-ID, platform-role, and deletion-policy refactor.
- Added `docs/entity_deletion_policy.md` as the branch source of truth for
  soft-delete, status, restore, cascade, and blocker-report behavior.
- Marked `pulled-docs/` as imported source material rather than canonical target
  docs.
- Locked JWT/public-ID policy: JWTs may keep internal numeric user IDs as signed
  readable metadata, while public APIs must use public IDs for core entities.

### 2026-05-25 - Module 7 Complete
- Added request ID propagation to backend error responses.
- Added specific safe API error codes for common domain conflicts, scoped
  authorization failures, upload failures, class lifecycle conflicts, locked
  channels, and expired post edit windows.
- Added auth-sensitive audit records for password reset/change/logout token
  revocation.
- Added optional Sentry telemetry dependencies and env-gated initialization for
  backend and frontend.
- Added canonical docs for project index, backend summary, frontend summary,
  security posture, and release readiness.
- Unified stale backend/frontend progress and hardening docs into the canonical
  root docs while retaining the implementation context future agents need.
- Verification passed:
  - backend build
  - focused auth/error-handler backend suites
  - full backend Jest suite, 490/490
  - frontend type-check, lint, Vitest, production build
  - targeted Playwright rerun for the initial regression files
  - full Playwright suite, 36/36
- Known follow-ups:
  - Module 9 resolved the Vite production large-chunk warning and configured an
    explicit Playwright socket URL to avoid shutdown-time websocket proxy noise.
  - Backend/E2E logs can still expose a Prisma adapter/pg transaction
    deprecation warning that should be cleaned up before pg 9.
