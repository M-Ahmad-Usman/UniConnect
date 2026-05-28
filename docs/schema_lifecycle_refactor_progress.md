# UniConnect Schema, Lifecycle, Public-ID, and Deletion Refactor Progress

## Document Control

- Created: 2026-05-28
- Status: Module 1 complete
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
| 2 | Public-ID Resolver and Test Foundation | Not started | - | - | Adds resolvers, DTO mapping helpers, test helper support |
| 3 | User Lifecycle and Auth | Not started | - | - | Adds user delete/restore/status/impact and auth enforcement |
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

- Add public-ID resolver helpers and DTO mapping helpers.
- Extend test helpers to support public-ID route/body contracts.
- Keep transitional internal numeric route compatibility scoped until the final
  cleanup module removes it.
