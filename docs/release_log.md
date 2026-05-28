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
