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
  - Vite production build still reports the existing large `react-vendor` chunk.
  - Playwright shutdown still emits Vite websocket proxy `ECONNRESET` noise.
  - E2E logs expose a pg deprecation warning for concurrent `client.query()`
    usage that should be cleaned up before pg 9.
