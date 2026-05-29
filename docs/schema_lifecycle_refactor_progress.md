# UniConnect Schema, Lifecycle, Public-ID, and Deletion Refactor Progress

## Document Control

- Created: 2026-05-28
- Status: Module 3 complete
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
| 4 | Platform RBAC Refactor | Not started | - | - | Replaces moderator assignments with platform role assignments |
| 5 | Society Lifecycle and Notifications | Not started | - | - | Adds society status/delete/restore cascade and lifecycle notifications |
| 6 | Server, Channel, and Post Public-ID Migration | Not started | - | - | Migrates communication routes and URLs to public IDs |
| 7 | Class and Academic Public-ID Migration | Not started | - | - | Migrates class routes and academic workflows to public IDs |
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

- Keep `/api/roles/*` numeric user IDs and existing role-assignment contracts
  scoped to Module 4. Do not retroactively mix Module 3 public-ID route behavior
  into role-management endpoints without the platform RBAC migration.
- Reuse the Module 2 public-ID resolver/DTO helpers and the Module 3
  authenticated-user DB reload pattern where Module 4 changes authorization or
  session-sensitive behavior.
- Continue treating catalog/admin support entities such as departments,
  programs, courses, disciplines, degree levels, curriculum entries, and
  notification IDs as numeric until their owning module explicitly migrates
  them.
