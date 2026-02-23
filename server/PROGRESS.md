# UniConnect — Backend Development Progress Tracker

**Last Updated:** February 23, 2026

---

## Module Progress

| Module | Name | Status | Tests | Notes |
|--------|------|--------|-------|-------|
| 0 | Project Foundation & Shared Infrastructure | ✅ Complete | 30/30 passing | All infra in place |
| 1 | Authentication | ⬜ Not Started | — | Depends on Module 0 |
| 2 | User Management | ⬜ Not Started | — | Depends on Module 1 |
| 3 | Department & Program Management | ⬜ Not Started | — | Depends on Module 2 |
| 4 | Class Management | ⬜ Not Started | — | Depends on Module 3 |
| 5 | Course Management | ⬜ Not Started | — | Depends on Module 3 |
| 6 | Society Management | ⬜ Not Started | — | Depends on Module 4 |
| 7 | Role Management | ⬜ Not Started | — | Depends on Module 2 |
| 8 | Server & Channel Management | ⬜ Not Started | — | Depends on Module 6 |
| 9 | Posts & Announcements | ⬜ Not Started | — | Depends on Module 8 |
| 10 | Notifications + Socket.IO | ⬜ Not Started | — | Depends on Module 9 |
| 11 | Semester Transition | ⬜ Not Started | — | Depends on Module 10 |
| 12 | Admin Dashboard | ⬜ Not Started | — | Depends on Module 11 |

---

## Module 0 — Detailed Completion Log

### What was built

| Component | File(s) | Description |
|-----------|---------|-------------|
| Docker Compose | `docker-compose.yml`, `docker/init-db.sh` | PostgreSQL 17 Alpine on port 5433; auto-creates `uniconnect_dev` and `uniconnect_test` databases |
| TypeScript Config | `tsconfig.json` | ESNext + bundler moduleResolution for Prisma 7 ESM compatibility |
| Nodemon Config | `nodemon.json` | Watches `src/` and runs via `tsx` |
| Prisma Schema | `prisma/schema.prisma` | Full ERD (25 tables, 11 enums) from schema.md |
| Prisma Config | `prisma.config.ts` | Prisma 7 required config file with datasource URL from env |
| Initial Migration | `prisma/migrations/20260223155652_init/` | Creates all 25 tables in PostgreSQL |
| Seed Script | `prisma/seed.ts` | Seeds roles (6), permissions (13), role-permission mappings, degree levels (3), and admin user |
| Env Validation | `src/config/env.ts` | Zod-validated environment variables with typed exports |
| Prisma Singleton | `src/config/prisma.ts` | PrismaClient with `@prisma/adapter-pg` driver adapter |
| Error Classes | `src/shared/errors/index.ts` | AppError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, ValidationError |
| Error Handler | `src/middleware/errorHandler.ts` | Global Express error handler with Prisma error mapping |
| Validation Middleware | `src/middleware/validate.ts` | Generic Zod validation for body, params, query |
| Pagination Utility | `src/shared/utils/pagination.ts` | `parsePagination()` and `buildPaginationResponse()` helpers |
| Constants | `src/shared/constants.ts` | Pagination defaults, post constraints, temp password prefix |
| TypeScript Types | `src/shared/types/index.ts` | ApiResponse, PaginatedResponse, ApiErrorResponse, AuthUser, Express augmentation |
| Express App | `src/app.ts` | Express 5 app with helmet, CORS, JSON parsing, cookies, health check, 404 handler, error handler |
| Server Bootstrap | `src/server.ts` | HTTP server with graceful shutdown (SIGTERM/SIGINT) |
| Jest Config | `jest.config.ts` | ts-jest ESM preset, module mappers, 30s timeout |
| Test Setup | `tests/setup.ts` | Sets NODE_ENV=test before test suites |
| DB Helper | `tests/helpers/db.helper.ts` | `resetDB()` — truncates all tables with CASCADE |
| Factory | `tests/helpers/factory.ts` | `createAdmin()` helper (stubs for others) |

### Test Suites (30 total tests)

| Suite | File | Tests | Status |
|-------|------|-------|--------|
| Express App | `tests/modules/app.test.ts` | 4 | ✅ |
| Pagination | `tests/shared/pagination.test.ts` | 10 | ✅ |
| Validation Middleware | `tests/shared/validate.test.ts` | 7 | ✅ |
| Error Handler | `tests/shared/errorHandler.test.ts` | 9 | ✅ |

---

## Library Versions & Key Decisions

### Installed Package Versions (auto-resolved, not hardcoded)

| Package | Version | Notes |
|---------|---------|-------|
| **express** | ^5.2.1 | **Express 5** (major upgrade from v4) — async error handling built-in, new path matching syntax |
| **@prisma/client** | ^7.4.1 | **Prisma 7** — ESM-only, requires driver adapter, new config file |
| **prisma** (CLI) | ^7.4.1 | Schema at `prisma/schema.prisma`, config at `prisma.config.ts` |
| **@prisma/adapter-pg** | ^7.4.1 | Required by Prisma 7 — replaces built-in query engine with `node-pg` |
| **pg** | (adapter dep) | PostgreSQL driver used by Prisma adapter |
| **zod** | ^4.3.6 | **Zod 4** — `error` param replaces `message`, `.email()` now top-level, `.flatten()` deprecated |
| **jsonwebtoken** | ^9.0.3 | JWT signing/verification |
| **bcrypt** | ^6.0.0 | Password hashing |
| **cookie-parser** | ^1.4.7 | Parse cookies from requests |
| **cors** | ^2.8.6 | CORS middleware |
| **helmet** | ^8.1.0 | Security headers |
| **http-status-codes** | ^2.3.0 | Readable HTTP status constants |
| **dotenv** | ^17.3.1 | Runtime env loading for server entry point |
| **dotenv-cli** | ^11.0.0 | CLI env loading for npm scripts (test, migrations) |
| **typescript** | ^5.9.3 | TypeScript compiler |
| **jest** | ^30.2.0 | **Jest 30** — test runner |
| **ts-jest** | ^29.4.6 | TypeScript transformer for Jest |
| **supertest** | ^7.2.2 | HTTP assertion library for testing Express |
| **tsx** | ^4.21.0 | TypeScript execution (dev mode, seed scripts) |
| **nodemon** | ^3.1.14 | File watcher for dev |

### Key Decisions & Breaking Change Adaptations

#### 1. Prisma 7 Migration (from typical v5/v6 patterns)
- **ESM required**: Added `"type": "module"` to `package.json`
- **`prisma.config.ts` required**: Datasource URL moved from `schema.prisma` to `prisma.config.ts`. The `datasource` block in schema now only has `provider`.
- **Driver adapter required**: Now uses `@prisma/adapter-pg` with `PrismaPg` instead of built-in query engine
- **Client generation path**: Generator `output` is required → generating to `src/generated/prisma/`
- **Imports changed**: `import { PrismaClient } from "./generated/prisma/client.js"` instead of `from "@prisma/client"`
- **No auto-generate/seed after migrate**: `prisma generate` and `prisma db seed` must be run explicitly
- **Seed config**: Moved from `package.json` `prisma.seed` field to `prisma.config.ts` `migrations.seed` field

#### 2. Express 5 (from v4)
- **Async error handling built-in**: Rejected promises in route handlers/middleware are automatically forwarded to error handler — no need for `asyncHandler` wrapper
- **Path matching**: Wildcard routes require names: `/*splat` instead of `/*`
- **`req.body` defaults to `undefined`** (was `{}` in v4)
- **`req.query` is a getter** (not writable)
- **`app.listen` callback receives error**: `(error) => { if (error) throw error; }`

#### 3. Zod 4 (from v3)
- **`error` replaces `message` param**: `z.string().min(5, { error: "Too short" })` instead of `{ message: "..." }`
- **`.email()` now top-level**: `z.email()` preferred over `z.string().email()` (latter still works, deprecated)
- **`.flatten()` and `.format()` deprecated**: Use `z.treeifyError()` instead
- **`.strict()` and `.passthrough()` deprecated**: Use `z.strictObject()` / `z.looseObject()`
- **`z.nativeEnum()` deprecated**: `z.enum()` now supports native TS enums too
- We use `safeParse` extensively which works identically in v4

#### 4. Jest 30 with ESM
- **`--experimental-vm-modules` required**: Prisma 7 generated client uses `import.meta.url` which needs Node ESM support in Jest's VM
- **Test command**: `node --experimental-vm-modules node_modules/.bin/jest` instead of plain `jest`
- **ts-jest ESM preset**: Using `ts-jest/presets/default-esm` with `useESM: true`

#### 5. Docker PostgreSQL Setup
- **Port 5433**: Mapped to avoid conflict with any host PostgreSQL on 5432
- **Single container, two databases**: `uniconnect_dev` (created by Postgres default) + `uniconnect_test` (created by `docker/init-db.sh` init script)
- **Named volume**: `uniconnect_pgdata` for data persistence across container restarts

#### 6. Project Architecture
- **ESM throughout**: `"type": "module"` in package.json, `.js` extensions in imports
- **tsconfig**: `module: "ESNext"` + `moduleResolution: "bundler"` (Prisma 7 recommended)
- **No build step for dev**: `tsx` handles TypeScript execution directly
- **Seed approach**: `upsert` for idempotency — safe to re-run

---

## Quick Reference — Commands

```bash
# Start PostgreSQL
docker compose up -d

# Generate Prisma client (required after schema changes)
npx prisma generate

# Run migration (dev database)
npx prisma migrate dev --name <migration_name>

# Apply migration to test database
npx dotenv -e .env.test -- npx prisma migrate deploy

# Seed dev database
npx prisma db seed

# Start dev server (port 4000)
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Open Prisma Studio (visual DB browser)
npm run db:studio
```

---

## Next Up: Module 1 — Authentication

**Scope:** FR-1, FR-2, FR-3, FR-6, FR-7, FR-8  
**Key endpoints:** login, logout, refresh, forgot-password, reset-password, change-password  
**New middleware:** `authenticate.ts` (JWT verification from cookies)  
**Dependencies:** Module 0 ✅  
