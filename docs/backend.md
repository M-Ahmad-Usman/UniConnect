# Backend Summary

## Canonical Sources
- Architecture and coding standards: `server/BACKEND_ARCHITECTURE.md`
- Frontend/backend API contract: `server/docs/FRONTEND_BACKEND_CONTRACT.md`
- Error code catalog: `server/docs/API_ERROR_CODES.md`
- Schema reference: `docs/database_erd.md`
- Active release log: `docs/release_log.md`

## Current Architecture
- Runtime: Node.js, native ESM, strict TypeScript.
- Framework: Express 5 with async-aware handlers.
- Database: PostgreSQL through Prisma 7 and `@prisma/adapter-pg`.
- Auth: JWT in httpOnly cookies, access cookie at `/api`, refresh cookie at
  `/api/auth/refresh`.
- Validation: Zod schemas at request boundaries.
- Realtime: Socket.IO with cookie authentication.
- Testing: Jest and Supertest integration suites.

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
transition/curriculum, and admin dashboard.

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
- Migrated server, channel, and post HTTP contracts to strict UUIDv7 public IDs
  with request-local target resolution while keeping numeric database keys
  internal.
- Kept archived channels readable as history while rejecting writes with
  `CHANNEL_ARCHIVED`; communication writes use transaction-time lifecycle and
  membership revalidation where required.
- Hardened Socket.IO channel subscriptions with public-ID envelopes, lifecycle
  checks, bounded join attempts, and a concurrency-safe 32-room cap.

## Current Maintenance Rules
- Run backend commands inside `server/`.
- Do not add ad-hoc error responses in controllers/services; use typed errors.
- Do not introduce a logger library without a specific decision; current app
  logging uses prefixed `console.warn`/`console.error`.
- Update `server/docs/API_ERROR_CODES.md` when adding or changing emitted codes.
- Update `server/docs/FRONTEND_BACKEND_CONTRACT.md` when API request/response
  behavior changes.
- Log future release work in `docs/release_log.md`, not a backend-local progress
  file.
