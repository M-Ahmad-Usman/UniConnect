# UniConnect Backend Architecture

## Document Control
- Version: 2.0
- Last Updated: 2026-03-05
- Owners: Backend Team
- Status: Active

## Purpose
Define backend API architecture standards, module boundaries, and delivery/maintenance expectations for `server/`.

## Scope
- Runtime/API: Node.js, TypeScript, Express 5
- Data: PostgreSQL + Prisma 7
- Validation/Auth: Zod 4 + JWT (HTTP-only cookies)
- Realtime: Socket.IO
- Testing: Jest + Supertest (integration-heavy)

## Current Delivery Status
All functional modules (0 to 12) are implemented and covered by integration tests.

## Verified Snapshot (2026-03-05)
The following items were verified against implementation files and a full test run:
- Route mounts and middleware chain: `src/app.ts`
- Security hardening controls: `src/middleware/rateLimiter.ts`, `src/middleware/upload.ts`, `src/middleware/authorize.ts`, `src/socket/index.ts`
- Auth hardening changes: `src/modules/auth/auth.service.ts`, `prisma/schema.prisma`
- Utility extraction and constants: `src/shared/utils/parseExpiry.ts`, `src/shared/constants.ts`
- Full test suite result: `447/447` passing (`npm test -- --runInBand`)

## Architecture Standard

### Request Flow
`Route -> Middleware (authenticate/authorize/validate) -> Controller -> Service -> Prisma -> DB`

### Module Layout
Each module lives under `src/modules/<name>/` and should include:
- `<name>.routes.ts`
- `<name>.controller.ts`
- `<name>.service.ts`
- `<name>.schema.ts`

Notes:
- Some modules may include additional module files where needed (for example listeners).
- Service layer must remain HTTP-agnostic.

### Mandatory Coding Conventions
- Use typed domain errors from `src/shared/errors/index.ts`; do not build ad-hoc error responses in services.
- Validate request boundaries with Zod schemas in `*.schema.ts` and `validate` middleware.
- Use `StatusCodes` from `http-status-codes` instead of numeric literals.
- Use singleton instances from `src/config/*`.
- Keep controllers thin; business rules belong in services.
- Keep multi-write flows in transactions.
- Use explicit select/include to avoid over-fetching and accidental sensitive field leakage.

### Import and ESM Rules
- Project uses native ESM (`"type": "module"`).
- Source imports must include `.js` extension.
- Use `import type` for type-only imports.

## Security and Auth Baseline
- Cookie-based JWT auth (access + refresh) with strict cookie flags.
- Configurable auth cookie flags support same-site deployment by default and future cross-site deployment when explicitly configured.
- Unsafe API methods are protected by trusted Origin/Referer checks plus signed double-submit CSRF (`XSRF-TOKEN` cookie and `X-XSRF-TOKEN` header).
- Refresh-token rotation with hash-before-store.
- Password reset tokens are one-time-use via `passwordResetTokenHash`.
- Rate limiting is active (`general`, `auth`, `upload` limiters).
- Upload validation includes MIME gate, magic-bytes verification, and image pixel-count limits.
- Cloudinary uploads are restricted to known image folders.
- Privileged successful writes are persisted in `AuditLog` with redacted field summaries.
- Error-handler response avoids leaking internal DB details.
- Pre-production follow-up: add MFA for admin accounts before any real deployment with live institutional data.

## Test Standard
- Integration tests live in `tests/modules/` and mirror module behavior.
- Shared helpers live in:
  - `tests/helpers/db.helper.ts`
  - `tests/helpers/factory.ts`
  - `tests/helpers/fixtures.ts`
- Most module suites use `beforeAll(resetDB)`; `admin.test.ts` intentionally uses `beforeEach(resetDB)` because assertions depend on isolated aggregate counts.

## Module Plan and Status

| Module | Name | Status |
|---|---|---|
| 0 | Foundation and shared infrastructure | Complete |
| 1 | Authentication | Complete |
| 2 | User management | Complete |
| 3 | Department, discipline, and program | Complete |
| 4 | Class management | Complete |
| 5 | Course catalog | Complete |
| 6 | Society management | Complete |
| 7 | Role management | Complete |
| 8 | Server and channel management | Complete |
| 9 | Posts and announcements | Complete |
| 10 | Notifications and Socket.IO | Complete |
| 11 | Semester transition and curriculum | Complete |
| 12 | Admin dashboard | Complete |

## Maintenance Rules
- Update this file when architecture conventions, module boundaries, or baseline standards change.
- Do not log per-step implementation history here; use `../docs/release_log.md`.
- Keep release status synchronized with `../docs/release_readiness.md`.
