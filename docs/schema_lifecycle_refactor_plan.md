# UniConnect Schema, Lifecycle, Public-ID, and Deletion Refactor Plan

## Document Control

- Created: 2026-05-28
- Status: Module 9 complete
- Companion tracker: `docs/schema_lifecycle_refactor_progress.md`
- Canonical deletion policy: `docs/entity_deletion_policy.md`
- Source references: `pulled-docs/`

## Purpose

This plan incorporates the useful high-level schema and entity-deletion work from
`pulled-docs/` into the current UniConnect codebase without blindly replacing the
working implementation. The goal is a production-grade, scalable, and testable
refactor that can be executed module by module without losing track of decisions.

Each module should be a vertical slice where practical: schema, backend behavior,
frontend contracts, tests, and docs move together for one coherent behavior.
Temporary compatibility is allowed inside intermediate modules, but the final
contract must match this document.

## Locked Decisions

### Identity and Public IDs

- Core public entities get `publicId UUID NOT NULL DEFAULT uuidv7()`:
  - users
  - classes
  - societies
  - servers
  - channels
  - posts
- PostgreSQL 18 or newer is required because migrations will use built-in
  `uuidv7()`.
- External API routes for core entities will migrate to public IDs in this
  refactor.
- Route params should use explicit names such as `:publicId`.
- Core public DTOs expose `publicId: string` and omit internal numeric `id`.
- Request bodies reference core entities using explicit fields such as
  `userPublicId`, `classPublicId`, `serverPublicId`, `channelPublicId`, and
  `postPublicId`.
- Internal numeric IDs remain for database relations, service internals, and JWT
  subject resolution.
- Catalog/admin entities remain numeric for this pass:
  - departments
  - programs
  - courses
  - disciplines
  - degree levels
  - designations

### JWT and Session Policy

- JWT payloads are signed but not encrypted. Payload fields are readable metadata,
  not secrets.
- Access and refresh tokens should use the internal numeric user ID as the
  standard `sub` claim.
- Numeric user IDs in JWTs are not an authorization boundary and must never be
  accepted as public target identifiers for core APIs.
- The authenticated subject from a validated JWT must always be combined with
  service-level authorization checks.
- Public APIs, frontend URLs, public DTOs, and user-facing logs must not expose
  core entity internal numeric IDs.
- Token theft remains a bearer-token compromise regardless of whether the payload
  contains a numeric ID or public ID. Existing mitigations remain required:
  httpOnly cookies, short access-token TTL, refresh rotation, CSRF protection,
  Origin/Referer checks, secure/sameSite cookie settings, and server-side
  authorization.
- Add regression tests proving numeric IDs are rejected after route/body public-ID
  migration.

### User Model

- Keep the current single `userType`.
- Do not add `user_type_assignments` in this refactor.
- Keep current `email`; do not split `personalEmail` and `universityEmail` now.
- Keep `mustChangePassword`.
- Keep `passwordResetTokenHash`.
- Add `UserStatus` with:
  - `ACTIVE`
  - `SUSPENDED`
- User status is separate from soft-delete lifecycle.
- Suspended users cannot login, refresh, or connect sockets.
- Soft-deleted users are hidden from normal queries and cannot authenticate.
- Deleted user email may be reused by another active account. Restore fails if
  the email has been reused.
- Student roll numbers remain globally unique forever.

### Society and Server Lifecycle

- Add `SocietyStatus` with:
  - `ACTIVE`
  - `SUSPENDED`
- Society status is separate from soft-delete lifecycle.
- Suspended societies are visible to authorized members/admins/HODs but frozen:
  no joins, request review, posting, role changes, or member changes.
- Pending join requests remain pending while suspended, but new requests and
  reviews are blocked.
- Society soft-delete cascades to its owned server and channels using shared
  cascade metadata.
- Society restore preserves the society status and restores only the server and
  channels deleted by the same lifecycle cascade.
- Servers are owner-driven. They get soft-delete metadata but no independent
  status and no standalone restore API.
- Server restore is internal only as part of owner restore.
- Channel restore is internal only for lifecycle cascade restore.
- Post restore is deferred.
- Society lifecycle actions notify active affected society members with specific
  notification types.

### Role and Permission Model

- Academic roles remain stored on their owning entities:
  - HOD: `departments.hodId`
  - Program Director: `programs.programDirectorId`
  - CR: `classes.crId`
  - Society president/convenor: `societies.presidentId`, `societies.convenorId`
- Platform-specific communication roles move to `user_role_assignments`.
- `roles` contains platform roles only:
  - `server_moderator`
  - `channel_moderator`
- `permissions.name` remains the compatibility surface, for example
  `create:channel`, `delete:channel`, and `post:channel`.
- Platform role assignments include nullable `expiresAt`.
- Expired platform assignments are ignored by authorization, kept for history,
  and hidden from normal role lists.
- `/api/roles/*` remains the frontend role-workspace facade.
- Entity-specific academic role endpoints will also be added.

### Lookup and Enum Strategy

- Use a hybrid approach.
- Keep Prisma enums for stable application domains.
- Use lookup/reference tables for:
  - platform roles
  - permissions
  - designations
  - degree levels
  - disciplines
- Seed designations with:
  - Professor
  - Associate Professor
  - Assistant Professor
  - Lecturer

### Deletion and Impact APIs

- User lifecycle operations are admin-only.
- Society lifecycle operations are allowed for admins and own-department HODs.
- Deletion-impact reports require the same authority as the corresponding
  lifecycle/delete operation.
- Soft-delete endpoints use clear REST contracts:
  - `DELETE /api/users/:publicId`
  - `PATCH /api/users/:publicId/restore`
  - `PATCH /api/users/:publicId/status`
  - `DELETE /api/societies/:publicId`
  - `PATCH /api/societies/:publicId/restore`
  - `PATCH /api/societies/:publicId/status`
- Impact endpoints are explicit:
  - `GET /api/users/:publicId/deletion-impact`
  - `GET /api/societies/:publicId/deletion-impact`
  - `GET /api/departments/:id/deletion-impact`
  - `GET /api/programs/:id/deletion-impact`
  - `GET /api/classes/:publicId/deletion-impact`
  - `GET /api/courses/:id/deletion-impact`
- Rare destructive deletes for departments, programs, classes, and courses are
  deferred. Only blocker reports are implemented in this refactor.
- Lifecycle operation reasons are optional and recorded in audit/lifecycle
  metadata when supplied.

### Migration and Tracking Strategy

- Use a staged implementation to keep modules testable.
- Temporary dual ID resolution is allowed during intermediate modules.
- Final cleanup removes external numeric ID compatibility for core entities.
- Squash Prisma migrations into one final baseline migration during cleanup
  because the project is not in production.
- Keep generated Prisma client files committed, matching the current repo
  pattern.
- `pulled-docs/` is archived source material. Canonical target docs live in
  `docs/`.

## Module Order

### Module 0: Canonical Planning and Tracking

Goal: create the source of truth for this refactor before code changes begin.

Changes:
- Add this plan.
- Add `docs/schema_lifecycle_refactor_progress.md`.
- Add `docs/entity_deletion_policy.md`.
- Update `docs/README.md`.
- Add `pulled-docs/README.md` explaining that pulled docs are references, not
  canonical targets.
- Record JWT/public-ID policy.

Acceptance:
- A future implementer can start Module 1 without rereading the entire chat.
- `pulled-docs/` cannot be mistaken for the current target schema.

### Module 1: Schema Foundation and Transitional State

Goal: add the new schema primitives while keeping the app runnable.

Changes:
- Add public UUIDv7 IDs to core entities.
- Add `UserStatus` and `SocietyStatus`.
- Add soft-delete metadata to users, societies, and servers.
- Add cascade metadata needed for parent-to-child soft-delete restore.
- Add designation lookup.
- Add targeted constraints and partial indexes.
- Align FK `onDelete` behavior with `docs/entity_deletion_policy.md`.
- Transitional `isActive` fields were kept only during staged migration and are
  removed from the final Module 9 baseline.

Acceptance:
- Prisma generate, reset, seed, backend build, and focused schema tests pass.
- Existing behavior still works through transitional compatibility.

### Module 2: Public-ID Resolver and Test Foundation

Goal: make public-ID migration predictable before changing every route.

Changes:
- Added shared public-ID helpers in `server/src/shared/ids/`.
- Added strict UUIDv7 validation via `publicIdSchema`, `parsePublicId`, and
  `isPublicId`.
- Added public-ID-to-internal-ID resolvers for core entities:
  `resolveUserPublicId`, `resolveClassPublicId`, `resolveSocietyPublicId`,
  `resolveServerPublicId`, `resolveChannelPublicId`, and `resolvePostPublicId`.
- Added temporary staged dual-resolution support during migration. Module 9
  removed that compatibility; final core API helpers accept strict UUIDv7 public
  IDs only.
- Added shallow public DTO mappers:
  `mapUserPublicDto`, `mapClassPublicDto`, `mapSocietyPublicDto`,
  `mapServerPublicDto`, `mapChannelPublicDto`, and `mapPostPublicDto`.
- Updated backend test factories with `apiId(entity)` and `entityIds(entity)` so
  future API tests can use public IDs while DB setup can keep internal IDs.

Usage notes for later modules:
- Live routes and live response bodies were not changed in Module 2.
- Route migration modules should resolve `:publicId` with the entity-specific
  resolver, keep service internals numeric, then map outgoing core DTOs with the
  public DTO mappers.
- Use `includeDeleted: true` only for restore, deletion-impact, or admin
  lifecycle paths that intentionally target deleted rows.
- Dual mode exists only for staged compatibility and must be removed in the
  final cleanup module.

Acceptance:
- Resolver tests pass.
- Existing tests still pass before external numeric support is removed.

### Module 3: User Lifecycle and Auth

Goal: replace user activation semantics with status plus soft-delete.

Changes:
- Implement user delete, restore, status, and deletion-impact APIs.
- Block login, refresh, route auth, and Socket.IO for suspended or deleted users.
- User soft-delete revokes/deletes active sessions, deletes all notifications,
  deletes pending society requests, and writes audit logs.
- Restore preserves status and fails on email reuse conflict.
- Update frontend user management, auth types, and user lifecycle UI.

Acceptance:
- Auth tests cover active, suspended, and deleted users.
- User deletion-impact lists all blockers.
- Numeric user IDs are rejected in external user routes and payloads.

### Module 4: Platform RBAC Refactor

Goal: replace moderator-specific storage with reusable platform role assignment.

Changes:
- Add `user_role_assignments`.
- Migrate server/channel moderator assignment logic.
- Add nullable `expiresAt`.
- Ignore expired assignments in authorization.
- Keep `/api/roles/*` facade and add entity-specific academic role endpoints.
- Update permission context, Socket.IO role invalidation, seed data, backend
  tests, and frontend role workspace types.

Acceptance:
- Moderator assign/revoke tests pass.
- Expired platform roles do not authorize.
- Academic roles remain entity-owned and keep existing behavior.

### Module 5: Society Lifecycle and Notifications

Goal: implement status, soft-delete, restore cascade, and member notifications.

Changes:
- Implement society delete, restore, status, and deletion-impact APIs.
- Enforce suspended society read-only rules.
- Soft-delete society-owned server and channels using cascade metadata.
- Restore only rows deleted by the same cascade.
- Delete pending membership requests on soft-delete.
- Add specific society lifecycle notification types and notify active affected
  society members.
- Update society UI states.

Acceptance:
- Society suspend, delete, restore, and cascade tests pass.
- Pending request behavior matches policy.
- Posting and management actions are blocked while suspended.

### Module 6: Server, Channel, and Post Public-ID Migration

Goal: finish public-ID contracts for communication entities.

Changes:
- Migrate server, channel, and post API routes and frontend URLs to public IDs.
- Keep internal server restore only.
- Keep internal channel restore only.
- Do not add post restore.
- Block posting in suspended society channels.
- Keep archived channels as authorized read-only history: reads remain available,
  realtime subscriptions stop, and writes return `CHANNEL_ARCHIVED`.
- Use public Socket.IO channel envelopes while retaining internal numeric rooms.
- Revalidate communication lifecycle and current membership at mutation commit
  boundaries where author rights depend on current server membership.

Acceptance:
- Server/channel/post tests use public IDs.
- Numeric IDs are rejected externally.
- Existing channel/post deletion semantics remain intact.
- Archived-channel reads and write rejection are covered.
- Socket room caps remain effective during concurrent join bursts.

### Module 7: Class and Academic Public-ID Migration

Goal: migrate academic workflows that involve classes while keeping catalog IDs
numeric.

Changes:
- Migrate class routes and frontend URLs to strict UUIDv7 public IDs.
- Use `classPublicId`, `studentPublicId`, and `teacherPublicId` in external
  academic payloads and public-safe DTOs.
- Keep department, program, course, discipline, degree-level, and designation
  references numeric.
- Add the admin-only provisional class deletion-impact endpoint. Module 8
  completes this endpoint with communication cleanup impact.
- Update class transfer, course assignment, semester progression, and graduation
  flows.
- Revalidate delegated academic authority and class lifecycle under transaction
  row locks before committing academic writes.
- Allow HODs to create courses only for their own departments. Keep course
  editing admin-only and expose granular frontend capabilities.

Acceptance:
- Class and academic tests use public IDs where appropriate.
- Catalog IDs remain numeric and documented.

### Module 8: Rare Entity Impact Reports

Goal: expose safe blocker reports for rare destructive cleanup planning.

Changes:
- Add deletion-impact endpoints for departments, programs, classes, and courses.
- Return all blockers in one stable bounded response shape with counts, preview
  rows, and `hasMore`.
- Mark class communication impact complete and move class impact from
  provisional to final report semantics.
- Add frontend API methods, query keys, hooks, and contract types for future
  admin UI use without adding destructive UI.
- Do not implement destructive delete endpoints for these entities.

Acceptance:
- Impact endpoints are read-only and authorization-gated.
- Docs and API contracts match response shapes.

### Module 9: Cleanup, Squash, and Final Contract

Goal: remove transitional compatibility and lock the final API/schema contract.

Changes:
- Remove `isActive`.
- Confirm the Module 4 removal of `moderator_assignments` remains reflected in
  the squashed baseline.
- Remove old deactivate/reactivate endpoints and frontend calls.
- Remove temporary dual numeric/public ID support.
- Squash migrations into a final baseline.
- Regenerate committed Prisma client.
- Update all canonical docs and contracts.

Acceptance:
- Full backend, frontend, and Playwright regression passes.
- Docs match the implemented final state.

Implementation status:
- Complete as of 2026-06-05.
- The final baseline is
  `server/prisma/migrations/20260605000000_module9_final_baseline/migration.sql`.
- `isActive`/`is_active` no longer exists on users, societies, or servers.
- Temporary dual numeric/public core-ID resolution has been removed.
- SQL-only partial indexes, lifecycle checks, role-assignment constraints, and
  notification-preference constraints are preserved in the squashed baseline.

## Final Verification Gate

Run from the correct app workspace:

Backend:
- `cd server && npx prisma generate`
- `cd server && npm run db:reset`
- `cd server && npm test -- --runInBand`
- `cd server && npm run build`

Frontend:
- `cd client && npm run lint`
- `cd client && npm run type-check`
- `cd client && npm run test`
- `cd client && npx playwright test`

## Deferred Work

- Multi-type users.
- Split personal and university emails.
- Hard-delete APIs and destructive UI workflows.
- Post restore/moderation restore flows.
- Public IDs for catalog entities.
- User lifecycle email notifications.
- Background cleanup or revocation events for expired platform roles.
- Full trigger-based lifecycle stamping.
- Opaque server-side sessions.
- Investigate the Prisma adapter/`pg` transaction deprecation warning before a
  future `pg@9` upgrade. Row-locking raw SQL is preserved for lifecycle
  correctness until a lower-risk adapter or query pattern is available.
