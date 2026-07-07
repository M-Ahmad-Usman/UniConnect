# Backend Summary

## Canonical Sources
- Architecture and coding standards: `server/BACKEND_ARCHITECTURE.md`
- Frontend/backend API contract: `server/docs/FRONTEND_BACKEND_CONTRACT.md`
- Error code catalog: `server/docs/API_ERROR_CODES.md`
- Schema reference: `docs/database_erd.md`
- Active release log: `docs/release_log.md`

## Current Architecture
- Runtime: Node.js 24, native ESM, strict TypeScript.
- Framework: Express 5 with async-aware handlers.
- Database: PostgreSQL through Prisma 7 and `@prisma/adapter-pg`.
- Auth: JWT in httpOnly cookies, access cookie at `/api`, refresh cookie at
  `/api/auth/refresh`.
- Authorization: persisted base user types are `STAFF`, `TEACHER`, and
  `STUDENT`. Admin authority is an active global staff-role assignment, exposed
  to middleware as the effective `ADMIN` role for existing authorization rules.
- Validation: Zod schemas at request boundaries.
- Realtime: Socket.IO with cookie authentication.
- Testing: Jest and Supertest integration suites.
- Production: Docker container on Azure App Service, deployed via
  `ghcr.io` image pushed by the GitHub Actions CI/CD pipeline.

Request flow:

```text
Route -> validate -> authenticate -> authorize -> Controller -> Service -> Prisma -> DB
```

Controllers stay HTTP-thin. Services own business rules and throw typed errors
from `src/shared/errors/index.ts`. Multi-write flows use transactions and
Prisma queries must use explicit `select` or `include`.

## Implemented Backend Modules
All backend modules are implemented: foundation, auth, user management,
department/program/catalog, class/course management, society management, role
management, servers/channels, posts, notifications/Socket.IO, semester
transition/curriculum, rare deletion-impact reports, and admin dashboard.

## Hardening Summary
The earlier backend-only hardening pass is complete and its important outcomes
are now captured here and in `docs/security.md`:
- Added performance indexes, reduced N+1/query waterfall patterns, batched bulk
  import work, and added short TTL admin stats caching.
- Added rate limiting tiers, strict request body limits, request timeout
  middleware, DB-aware health checks, graceful shutdown timeout, and stale refresh
  token cleanup.
- Hardened auth with secret length validation, refresh-token rotation,
  hash-before-store refresh tokens, one-time password reset tokens, and Socket.IO
  expiry handling.
- Hardened uploads with file-size limits, MIME gates, magic-byte validation,
  image pixel-count limits, and Cloudinary folder/resource allowlisting.
- Added configurable CSRF protection, multi-origin CORS parsing, trusted
  Origin/Referer checks, and cookie same-site/secure configuration.
- Added persistent redacted `AuditLog` records for successful privileged writes.
- Added standardized frontend-facing API error codes and request IDs.
- Added optional Sentry telemetry for unexpected server failures, disabled unless
  `SENTRY_DSN` is configured.
- Added structured Pino logging with request IDs, safe redaction, env-controlled
  log levels, JSON stdout production output, pretty development output, silent
  test defaults, and Prisma warn/error event forwarding.
- Migrated server, channel, and post HTTP contracts to strict UUIDv7 public IDs
  with request-local target resolution while keeping numeric database keys
  internal.
- Kept archived channels readable as history while rejecting writes with
  `CHANNEL_ARCHIVED`; communication writes use transaction-time lifecycle and
  membership revalidation where required.
- Hardened Socket.IO channel subscriptions with public-ID envelopes, lifecycle
  checks, bounded join attempts, and a concurrency-safe 32-room cap.
- Added the Phase 1 redesign authorization foundation: `StaffRoleAssignment`,
  global Admin as a direct staff role, department-scoped enrollment officer
  role support, exactly-one active Admin enforcement in service flows, and an
  atomic Admin transfer endpoint.
- Added the Phase 2 enrollment module under `/api/enrollment`. Enrollment
  access is direct active Admin or active department-scoped
  `enrollment_officer`; HOD keeps academic rights and read-only roster
  visibility but does not create classes, create/import students, or transfer
  students.
- Added Phase 3 society leadership rules: society president/convenor candidates
  are university-wide, but Admin/HOD authority remains scoped to the society's
  owning department. SQL-only partial unique indexes reserve each leader only
  for active, non-deleted societies, and lifecycle activation/restoration checks
  return typed 409 conflict details when saved leadership is active elsewhere.
- Staff-role migrations are split so PostgreSQL enum values are committed before
  use. SQL-only exclusion constraints prevent overlapping staff-role periods and
  overlapping global Admin assignments.

## Current Maintenance Rules
- Run backend commands inside `server/`.
- Do not add ad-hoc error responses in controllers/services; use typed errors.
- Use Pino module loggers from `server/src/config/logger.ts`; do not add new
  backend runtime `console.*` logging except minimal env/bootstrap failure
  fallbacks before the logger is available.
- Update `server/docs/API_ERROR_CODES.md` when adding or changing emitted codes.
- Update `server/docs/FRONTEND_BACKEND_CONTRACT.md` when API request/response
  behavior changes.
- Keep Admin checks backed by active `staff_role_assignments` rows. Do not add
  a persisted `ADMIN` user type or grant Admin through generic role-permission
  lookup.
- Log future release work in `docs/release_log.md`, not a backend-local progress
  file.
- Do not modify `Dockerfile`, `.dockerignore`, or `.github/workflows/deploy-azure.yml`
  without reading `docs/deployment.md`. The deploy pipeline has specific ordering
  requirements: `prisma generate` must run in Docker Stage 2 before `tsc`;
  migrations run in the deploy job, not inside the image.
