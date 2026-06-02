# UniConnect Schema, Lifecycle, Public-ID, and Deletion Refactor Progress

## Document Control

- Created: 2026-05-28
- Status: Module 7 complete
- Plan reference: `docs/schema_lifecycle_refactor_plan.md`
- Deletion policy reference: `docs/entity_deletion_policy.md`

## Status Legend

- Not started: no implementation work has begun.
- In progress: implementation has started.
- Blocked: waiting on a decision, dependency, or failing prerequisite.
- Implemented: code is complete, but verification or docs are incomplete.
- Complete: implementation, tests, and docs are complete.

## Module Status Board

| Module | Title | Status | Started | Completed | Notes |
|---|---|---|---|---|---|
| 0 | Canonical Planning and Tracking | Complete | 2026-05-28 | 2026-05-28 | Canonical docs and pulled-doc archive policy established |
| 1 | Schema Foundation and Transitional State | Complete | 2026-05-28 | 2026-05-28 | Public IDs, status enums, soft-delete metadata, designation lookup, FK policies, and baseline migration added |
| 2 | Public-ID Resolver and Test Foundation | Complete | 2026-05-28 | 2026-05-28 | Strict UUIDv7 validation, resolvers, DTO mappers, dual helper, and API-ID test helper support added |
| 3 | User Lifecycle and Auth | Complete | 2026-05-29 | 2026-05-29 | User public-ID routes, deletion impact, status/delete/restore, auth/session invalidation, and frontend admin lifecycle UI added |
| 4 | Platform RBAC Refactor | Complete | 2026-05-30 | 2026-05-30 | Append-only platform role assignments, expiry, public role-workspace IDs, canonical academic writes, and admin history added |
| 5 | Society Lifecycle and Notifications | Complete | 2026-06-01 | 2026-06-01 | Society UUIDv7 API migration, frozen suspension state, audited delete/restore cascade, transactional lifecycle notifications, and frontend lifecycle UI added |
| 6 | Server, Channel, and Post Public-ID Migration | Complete | 2026-06-02 | 2026-06-02 | Strict public communication IDs, archived read-only history, lifecycle-safe writes, and socket room hardening added |
| 7 | Class and Academic Public-ID Migration | Complete | 2026-06-02 | 2026-06-02 | Strict class UUIDv7 APIs, public academic DTOs, locked delegated writes, provisional class impact, and HOD course creation added |
| 8 | Rare Entity Impact Reports | Not started | - | - | Adds read-only blocker reports for rare destructive entities |
| 9 | Cleanup, Squash, and Final Contract | Not started | - | - | Removes transitional compatibility and squashes migrations |

## Module 0 Checklist

### Implementation

- [x] Add canonical refactor plan.
- [x] Add canonical progress tracker.
- [x] Add canonical entity deletion policy.
- [x] Update documentation index.
- [x] Add `pulled-docs` archive/source-reference note.
- [x] Record JWT payload and public-ID policy.

### Verification

- [x] Confirmed current docs index did not already contain this refactor.
- [x] Confirmed `pulled-docs` contains imported ERD and deletion policy source
  material.
- [x] Confirmed server Docker uses PostgreSQL 18.3, matching the `uuidv7()`
  target.

## Module 1 Checklist

### Implementation

- [x] Added UUIDv7 `publicId` columns to users, classes, societies, servers,
  channels, and posts.
- [x] Added `UserStatus` and `SocietyStatus` enums while preserving transitional
  `isActive` compatibility.
- [x] Added soft-delete metadata for users, societies, servers, and channels,
  including lifecycle cascade metadata for society-owned server/channel restore
  work in later modules.
- [x] Added `designations` lookup table and linked teacher profiles to seeded
  designation values.
- [x] Replaced live-entity uniqueness with partial indexes for user email,
  society name, channel name, and channel course assignment.
- [x] Aligned Prisma `onDelete` behavior with the entity deletion policy for
  cleanup children, actor references, and blocker ownership references.
- [x] Squashed Prisma migrations into a single Module 1 baseline migration.
- [x] Updated transitional auth, user, society, server, class, authorization,
  seed, and test-helper code paths to respect live rows and status where needed.

### Verification

- [x] `npx prisma generate`
- [x] `npx prisma validate`
- [x] `npm run db:reset -- --force` against `uniconnect_dev`
- [x] `npx dotenv -e .env.test -- prisma migrate reset --force` against
  `uniconnect_test`
- [x] `npm test -- tests/modules/schema-foundation.test.ts`
- [x] `npm test -- tests/modules/auth.test.ts` (28 tests)
- [x] `npm test` (20 suites, 498 tests)
- [x] `npm run build`

### Follow-Up for Module 2

- Reuse the Module 2 foundation from `server/src/shared/ids/`; do not recreate
  public-ID validators, resolvers, or DTO mappers in later modules.
- Keep transitional internal numeric route compatibility scoped until the final
  cleanup module removes it.

## Module 2 Checklist

### Implementation

- [x] Added strict UUIDv7 validation helpers:
  `publicIdSchema`, `parsePublicId`, and `isPublicId`.
- [x] Added core entity resolver helpers:
  `resolveUserPublicId`, `resolveClassPublicId`, `resolveSocietyPublicId`,
  `resolveServerPublicId`, `resolveChannelPublicId`, and
  `resolvePostPublicId`.
- [x] Added `resolveCoreIdentifier` with public-only default mode and explicit
  temporary `mode: "dual"` support for staged route migration.
- [x] Added `includeDeleted` resolver option for future lifecycle restore and
  impact paths.
- [x] Added shallow public DTO mappers for users, classes, societies, servers,
  channels, and posts.
- [x] Added test factory helpers `apiId(entity)` and `entityIds(entity)`.
- [x] Kept live API routes, live response bodies, and frontend code unchanged.

### Verification

- [x] `npx prisma validate`
- [x] `npm run build`
- [x] `npm test -- tests/modules/public-id.test.ts` (14 tests)
- [x] `npm test` (21 suites, 512 tests)

### Follow-Up for Module 3

- Use `resolveUserPublicId` for new user lifecycle routes.
- Use public DTO mappers when user lifecycle responses expose core user data.
- Do not use `mode: "dual"` for final public user lifecycle endpoints unless a
  temporary compatibility route is explicitly needed and covered by tests.

## Module 3 Checklist

### Implementation

- [x] Migrated user/auth/admin user surfaces to expose `publicId` instead of
  top-level internal numeric user IDs.
- [x] Switched access and refresh JWT payloads to standard `sub` for the signed
  internal authenticated user key.
- [x] Added DB-backed access-token authentication and Socket.IO authentication
  so deleted, inactive, suspended, or missing users are rejected even if they
  still hold an otherwise valid access token.
- [x] Added admin user lifecycle endpoints:
  `GET /api/users/:publicId/deletion-impact`,
  `PATCH /api/users/:publicId/status`, `DELETE /api/users/:publicId`, and
  `PATCH /api/users/:publicId/restore`.
- [x] Removed old public user `/:id/deactivate` and `/:id/reactivate` API
  routes.
- [x] Added grouped deletion-impact blockers for HOD departments, directed
  programs, CR classes, live society leadership, and active teaching
  assignments.
- [x] Implemented soft delete and restore side effects: refresh-token
  revocation, Socket.IO disconnect, reset-token clearing, notification cleanup,
  pending society-request cleanup, audit logs, and preserved status restore.
- [x] Updated admin/user list filters from transitional `isActive` to
  `status` plus `lifecycle`.
- [x] Updated frontend auth/profile/admin user management contracts, query keys,
  API endpoints, dialogs, filters, and tests for public user IDs and lifecycle
  actions.

### Verification

- [x] Backend build.
- [x] Focused backend user/auth/admin/security suites.
- [x] Backend schema-foundation regression suite.
- [x] Full backend Jest suite.
- [x] Frontend type-check.
- [x] Frontend lint.
- [x] Frontend Vitest suite.
- [x] Frontend production build.

### Follow-Up for Module 4

- Migrate `/api/roles/*` core user, class, server, channel, and assignment
  identifiers to UUIDv7 public IDs as part of the platform RBAC migration.
- Reuse the Module 2 public-ID resolver/DTO helpers and the Module 3
  authenticated-user DB reload pattern where Module 4 changes authorization or
  session-sensitive behavior.
- Continue treating catalog/admin support entities such as departments,
  programs, courses, disciplines, degree levels, curriculum entries, and
  notification IDs as numeric until their owning module explicitly migrates
  them.

## Module 4 Checklist

### Implementation

- [x] Replaced `moderator_assignments` and `moderator_scope_type` with
  append-only `user_role_assignments` and `platform_role_scope_type`.
- [x] Added UUIDv7 assignment public IDs, nullable expiry, revocation metadata,
  actor metadata, indexes, scope-integrity foreign keys, and a PostgreSQL
  `btree_gist` exclusion constraint preventing overlapping periods.
- [x] Backfilled legacy moderator rows and dropped the legacy table in the same
  migration because the project has no production data.
- [x] Kept academic roles on owning entities and moved fixed academic
  capability bundles into TypeScript.
- [x] Added canonical academic role writes:
  `PUT|DELETE /api/departments/:id/hod`,
  `PUT|DELETE /api/programs/:id/program-director`, and
  `PUT|DELETE /api/classes/:classPublicId/cr`.
- [x] Replaced generic platform writes with assignment resources:
  `POST /api/roles/platform-assignments`,
  `DELETE /api/roles/platform-assignments/:assignmentPublicId`, and
  `PATCH /api/roles/platform-assignments/:assignmentPublicId/expiry`.
- [x] Added admin-only paginated assignment history and lazy frontend history
  loading.
- [x] Migrated `/api/roles/*` core references to public IDs while retaining
  transitional numeric profile scope references until Modules 6 and 7.
- [x] Updated authorization, permission context, badges, class cleanup, seed
  data, fixtures, Socket.IO invalidation, client role workspace, expiry editor,
  and AuthGuard nearest-expiry refresh scheduling.
- [x] Kept platform-assignment transactions short: state mutation and audit
  insert commit together, then response DTO hydration happens after commit.
- [x] Documented SQL-only composite foreign keys and the exclusion constraint
  so future Prisma migration generation does not drop those safeguards.

### Verification

- [x] `npx prisma validate`
- [x] `npx prisma generate`
- [x] `npm run db:migrate:test`
- [x] Backend build
- [x] Focused backend role suite, 7/7
- [x] Adjacent backend channel suite, 34/34
- [x] Adjacent backend user suite, 31/31
- [x] Adjacent backend notification suite, 32/32
- [x] Full backend Jest suite, 479/479
- [x] Frontend type-check
- [x] Frontend lint
- [x] Focused frontend Vitest suites, 8/8
- [x] Full frontend Vitest suite, 131/131
- [x] Frontend production build
- [x] Focused society Playwright suite, 3/3
- [x] Full Playwright suite, 36/36. E2E global setup rebuilt its isolated
  database from all migrations, validating clean-schema Module 5 deployment.
- [x] Focused Module 4 Playwright suite, 4/4
- [x] Full Playwright suite, 36/36

### Follow-Up for Module 5

- Preserve platform assignment history when societies are suspended, deleted,
  or restored.
- Continue using `activePlatformRoleAssignmentWhere()` for operational role
  reads so suspended/deleted society scopes never authorize.

## Module 5 Checklist

### Implementation

- [x] Migrated society-facing API routes, DTOs, frontend URLs, query keys, and
  user references to UUIDv7 public IDs.
- [x] Added admin/own-department-HOD lifecycle endpoints:
  `GET /api/societies/:publicId/deletion-impact`,
  `PATCH /api/societies/:publicId/status`,
  `DELETE /api/societies/:publicId`, and
  `PATCH /api/societies/:publicId/restore`.
- [x] Enforced a fully frozen `SUSPENDED` society state for joins, request
  review, member changes, leadership/info edits, channel/server writes,
  moderator writes, posting, and post mutations.
- [x] Added transaction-scoped lifecycle row locking and database lifecycle
  state checks for societies, owned servers, and channels.
- [x] Soft-delete society-owned servers and live channels with one cascade ID,
  delete pending membership requests, preserve approved/rejected request
  history, and restore only descendants marked by the same cascade.
- [x] Preserved society status, memberships, posts, notification preferences,
  leadership, and platform-role assignment history across soft delete/restore.
- [x] Added `SOCIETY_SUSPENDED`, `SOCIETY_ACTIVATED`, `SOCIETY_DELETED`, and
  `SOCIETY_RESTORED` notifications linked to societies.
- [x] Persisted lifecycle notifications transactionally with set-based
  `INSERT ... SELECT` fanout to active members excluding the actor, then emitted
  Socket.IO updates only after commit.
- [x] Added notification-preference SQL safeguards: configurable-type checks,
  channel/server ownership FK, null-safe uniqueness, and atomic upsert.
- [x] Added lifecycle audit logs, role-sensitive socket invalidation, filtered
  deleted-society discovery, deletion-impact dialogs, list filters, state
  badges, and lifecycle action UI.
- [x] Added Cloudinary rollback metadata and best-effort cleanup so attachment,
  server-icon, and profile-picture persistence failures do not leave newly
  uploaded assets orphaned. Post rows and attachment rows now commit together.

### Verification

- [x] `npx prisma generate`
- [x] Applied the Module 5 migration SQL against the existing isolated test DB.
  `npm run db:migrate:test` could not deploy because that local DB predates
  Prisma migration tracking (`P3005`), so the additive migration was exercised
  with `prisma db execute`.
- [x] Backend build
- [x] Focused Module 5 lifecycle suite, 6/6
- [x] Existing society regression suite, 58/58
- [x] Adjacent backend notification/channel/post/role/server/admin/permission/
  public-ID/schema suites
- [x] Full backend Jest suite, 488/488
- [x] Frontend type-check
- [x] Frontend lint
- [x] Full frontend Vitest suite, 131/131
- [x] Frontend production build

### Follow-Up for Module 6

- Keep the lifecycle write guards in place while migrating server, channel, and
  post routes and frontend URLs to UUIDv7 public IDs.
- Preserve the SQL-only Module 5 preference and lifecycle safeguards in future
  Prisma-generated migrations.

## Module 6 Checklist

### Implementation

- [x] Added request-local communication target resolution middleware for strict
  UUIDv7 `:publicId` server, channel, and post routes while keeping numeric IDs
  internal to services, Prisma relations, internal events, and Socket.IO rooms.
- [x] Removed numeric communication IDs from public server, channel, post,
  notification, preference, profile-role, permission-bootstrap, department,
  program, and linked class DTOs.
- [x] Migrated frontend communication URLs, endpoint functions, types, query
  keys, realtime payloads, notification deep links, linked admin navigation,
  and Playwright route helpers to public IDs.
- [x] Made archived channels authorized read-only history: feeds and post detail
  remain readable, archived channels render in a separate collapsed sidebar
  section, realtime room joins are skipped, and write controls are hidden.
- [x] Added typed `CHANNEL_ARCHIVED` conflicts and blocked archived channel
  metadata, lock, unlock, delete, post, pin, attachment, and preference writes.
- [x] Serialized channel and post mutations with row locks and repeated
  lifecycle checks inside transactions.
- [x] Revalidated current membership for author post update, delete, and
  attachment writes. Attachment addition rejects former members before invoking
  Cloudinary and repeats the check transactionally to cover races.
- [x] Changed Socket.IO channel subscriptions to `{ channelPublicId }`, mapped
  authorized public IDs to internal rooms, rejected malformed, unauthorized,
  archived, deleted, and inactive targets without target-existence responses,
  capped joined rooms at 32 per socket, and capped join attempts at 60/minute.
- [x] Fixed a concurrent Socket.IO room-cap bypass by reserving pending joins
  before asynchronous database resolution.

### Verification

- [x] Backend build
- [x] Targeted backend server/channel/post/notification-socket/society-lifecycle/
  public-ID/department/class/role/permission/user suites
- [x] Full backend Jest suite, 495/495
- [x] Frontend lint
- [x] Frontend type-check
- [x] Full frontend Vitest suite, 131/131
- [x] Frontend production build
- [x] Focused communication Playwright suite, 8/8
- [x] Full Playwright suite, 36/36

### Deferred Risk Register for Modules 7 and 8

- Module 7 must complete academic public-ID migration: class primary routes,
  class/user references, and graduation actor references can still expose or
  accept numeric IDs on academic surfaces.
- Module 8 must reconcile communication impact reporting for rare destructive
  department, program, class, and course workflows before adding deletes.
- Generic scoped-role middleware authorization can race with authority changes
  between middleware execution and transaction commit. Module 6 revalidates
  communication lifecycle and membership where writes naturally require it;
  later modules must audit commit-time authority checks for broader scoped
  mutations.
- Role-assigned notifications do not persist related server/channel references,
  so deep-link quality remains limited to notification fallback routing. A
  future notification-model enhancement should add durable public-safe scope
  context if direct navigation is required.
- Preserve the SQL-only Module 4 role-assignment constraints and Module 5
  notification-preference constraints in all later migration generation and
  final squash work.

### Follow-Up for Module 7

- Keep external communication contracts strict public-ID only; do not add
  numeric compatibility routes while migrating academic surfaces.
- Preserve graduated-class behavior: course channels archive as read-only
  history while general and announcement channels remain governed by existing
  authorization rules.

## Module 7 Checklist

### Implementation

- [x] Migrated class primary and nested routes, frontend URLs, query keys, forms,
  CSV import, and E2E helpers to strict UUIDv7 class public IDs.
- [x] Replaced external academic user references with `studentPublicId` and
  `teacherPublicId`; kept numeric catalog IDs internal and documented.
- [x] Removed numeric core-ID leaks from class, user-student, academic
  role-holder, and academic role-mutation DTOs.
- [x] Closed authenticated class detail and assigned-course IDOR exposure.
  Reads now require admin, own-department HOD, or own-program PD scope.
- [x] Added admin-only provisional `GET /api/classes/:publicId/deletion-impact`.
- [x] Added shared academic row-lock helpers and commit-time authority/lifecycle
  checks for class writes, curriculum writes, HOD course creation, and academic
  role-owner changes. Academic owner and class-course mutations repeat
  stale-snapshot checks after locking. Student transfer locks its profile and
  source/target classes in deterministic class-ID order before committing.
- [x] Added own-department HOD course creation, granular permission capabilities,
  and the `/academics/courses` workspace. Removed `/admin/courses`.

### Deferred Risk Register for Modules 8 and 9

- Module 8 must enrich class impact reporting with communication descendants
  before any class deletion decision can be considered complete. The Module 7
  endpoint intentionally returns `checksComplete: false` and `canDelete: false`.
- Module 8 must add matching bounded impact reports for department, program, and
  course rare-delete planning. No rare destructive endpoints exist yet.
- Module 9 must remove transitional dual-resolution helpers, remove `isActive`,
  preserve SQL-only constraints during squash, and regenerate the final Prisma
  client.
- A later security pass should extend commit-time authority auditing to
  non-academic scoped writes and add durable public-safe notification scope links.
- A later dependency-hardening pass should investigate the `pg` deprecation
  warning emitted by Prisma adapter transactions: `client.query()` is invoked
  while the client is already executing a query. This must be resolved before a
  future `pg@9` upgrade.
- Before release, stabilize the full parallel Playwright run under local load.
  The Module 7 final run completed 28 tests, failed 5 timing-sensitive auth/post
  tests, and left 3 tests unrun; the 5 affected specs passed when rerun
  sequentially as part of an isolated 9/9 batch.

### Verification

- [x] Backend build.
- [x] Targeted backend class/role/user/course/permission integration suites,
  126/126.
- [x] Full backend Jest suite, 498/498.
- [x] Frontend lint.
- [x] Frontend type-check.
- [x] Full frontend Vitest suite, 133/133.
- [x] Frontend production build.
- [x] Targeted Module 2 academic and Module 6 accessibility Playwright suites,
  6/6.
- [x] Isolated rerun of full-suite timing failures, 9/9.
