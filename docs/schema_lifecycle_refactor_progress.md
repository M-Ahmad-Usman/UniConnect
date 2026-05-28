# UniConnect Schema, Lifecycle, Public-ID, and Deletion Refactor Progress

## Document Control

- Created: 2026-05-28
- Status: Module 0 complete
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
| 1 | Schema Foundation and Transitional State | Not started | - | - | Adds public IDs, statuses, soft-delete metadata, lookup changes, constraints |
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

### Follow-Up for Module 1

- Convert this plan into implementation tasks before editing Prisma schema.
- Keep temporary compatibility scoped and remove it in Module 9.
- When adding migrations, verify PostgreSQL 18+ is used in dev, test, and E2E
  database environments.

