# UniConnect — Backend Development Progress Tracker

**Last Updated:** February 27, 2026

**Current Automated Test Status:** 218/218 passing (10 suites)

---

## Module Progress

| Module | Name | Status | Tests | Notes |
|--------|------|--------|-------|-------|
| 0 | Project Foundation & Shared Infrastructure | ✅ Complete | 30 tests | All infra in place |
| 1 | Authentication | ✅ Complete | 24 tests | JWT cookies, Resend email, mustChangePassword guard |
| 2 | User Management | ✅ Complete | 24 tests | Admin user creation/import, profile endpoints, listing + get-by-id scope rules, deactivation/reactivation |
| 3 | Department & Program Management | ✅ Complete | 36 tests | Department/program/discipline APIs, auto-created channels, hardening + sync integrity |
| 4 | Class Management | ✅ Complete | 36 tests | Class CRUD, course assignment/removal, channel archiving |
| 5 | Course Management | ✅ Complete | 16 tests | Course catalog CRUD with channel sync |
| 6 | Society Management | ✅ Complete | 52 tests | Society CRUD, join requests, member management |
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
| Factory | `tests/helpers/factory.ts` | `createAdmin()`, `createUser()`, `loginAs()` helpers |

### Test Suites (30 total tests)

| Suite | File | Tests | Status |
|-------|------|-------|--------|
| Express App | `tests/modules/app.test.ts` | 4 | ✅ |
| Pagination | `tests/shared/pagination.test.ts` | 10 | ✅ |
| Validation Middleware | `tests/shared/validate.test.ts` | 7 | ✅ |
| Error Handler | `tests/shared/errorHandler.test.ts` | 9 | ✅ |

---

## Module 1 — Detailed Completion Log

### What was built

| Component | File(s) | Description |
|-----------|---------|-------------|
| Email Service | `src/config/email.ts` | Resend SDK instance; `sendResetPasswordEmail()` and `sendTempPasswordEmail()` (used in Module 2) |
| Auth Schemas | `src/modules/auth/auth.schema.ts` | Zod 4 validation schemas for login, forgot-password, reset-password, change-password with full password strength rules |
| Auth Service | `src/modules/auth/auth.service.ts` | All business logic: login, refresh (with token rotation), logout (idempotent), forgotPassword, resetPassword, changePassword |
| Auth Controller | `src/modules/auth/auth.controller.ts` | Express handlers; `setCookies()` / `clearCookies()` helpers; cookie config (httpOnly, secure in prod, sameSite=strict) |
| Auth Routes | `src/modules/auth/auth.routes.ts` | 6 endpoints mounted at `/api/auth` |
| Authenticate Middleware | `src/middleware/authenticate.ts` | Reads `access_token` cookie → verifies JWT → attaches `req.user`; blocks all non-`/change-password` routes when `mustChangePassword=true` |
| Env Config (updated) | `src/config/env.ts` | Added `RESET_PASSWORD_SECRET`, `RESET_PASSWORD_EXPIRY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| AuthUser Type (updated) | `src/shared/types/index.ts` | Added `mustChangePassword: boolean` field |
| Factory (updated) | `tests/helpers/factory.ts` | Added `createUser()` (generic) and `loginAs()` (returns set-cookie headers) |
| Auth Tests | `tests/modules/auth.test.ts` | 24 integration tests across 6 describe blocks |

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | Public | Verify credentials → issue JWT pair as cookies |
| POST | `/api/auth/logout` | ✅ Required | Revoke refresh token → clear cookies |
| POST | `/api/auth/refresh` | Cookie | Rotate refresh token → issue new pair |
| POST | `/api/auth/forgot-password` | Public | Send reset link via Resend (silent for unknown emails) |
| POST | `/api/auth/reset-password` | Public | Verify reset JWT → update password → revoke all refresh tokens |
| PATCH | `/api/auth/change-password` | ✅ Required | Verify current password → update → revoke all refresh tokens |

### Cookie Configuration

| Cookie | Path | Max-Age | Flags |
|--------|------|---------|-------|
| `access_token` | `/api` | 15 minutes | `httpOnly`, `secure` (prod), `sameSite=strict` |
| `refresh_token` | `/api/auth/refresh` | 7 days | `httpOnly`, `secure` (prod), `sameSite=strict` |

### Test Suites (24 tests)

| Suite | Tests | Status |
|-------|-------|--------|
| POST `/api/auth/login` | 6 | ✅ |
| POST `/api/auth/refresh` | 4 | ✅ |
| POST `/api/auth/logout` | 2 | ✅ |
| PATCH `/api/auth/change-password` | 4 | ✅ |
| POST `/api/auth/forgot-password` | 2 | ✅ |
| POST `/api/auth/reset-password` | 3 | ✅ |
| First-login `mustChangePassword` guard | 3 | ✅ |

### Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Reset token storage | Stateless JWT (signed with `RESET_PASSWORD_SECRET`) | No migration needed; short-lived (1h); separate secret isolates risk |
| Refresh token storage | SHA-256 hash of the JWT stored in `refresh_tokens` table | JWTs are high-entropy so bcrypt is unnecessary; SHA-256 allows O(1) lookup |
| Token uniqueness | `jti: crypto.randomUUID()` embedded in every token | Avoids unique constraint collisions when issuing multiple tokens rapidly |
| First-login behaviour | Issue full token pair, block non-auth routes via middleware | Avoids a separate pre-auth flow; client uses the standard change-password endpoint |
| Email failures | Caught and logged, not re-thrown | forgotPassword must not leak whether an email exists; failures are non-critical |

---

## Module 2 — Detailed Completion Log

### What was built

| Component | File(s) | Description |
|-----------|---------|-------------|
| Cloudinary Config | `src/config/cloudinary.ts` | Singleton Cloudinary uploader service for profile pictures |
| Env Validation (updated) | `src/config/env.ts`, `.env.test` | Added Cloudinary environment variables and test placeholders |
| Authorization Middleware | `src/middleware/authorize.ts` | Coarse userType gates + scoped role-permission checks with role resolution helpers |
| Upload Middleware | `src/middleware/upload.ts` | Multer memory uploads for profile images and CSV with type/size validation |
| Shared Types (updated) | `src/shared/types/index.ts` | Added `UserRole` and `req.userRoles` for request-scoped authorization caching |
| User Validation Schemas | `src/modules/user/user.schema.ts` | Zod 4 schemas for create/import/profile/list/id routes |
| User Service | `src/modules/user/user.service.ts` | User create/import/profile/list/get/deactivate/reactivate business logic |
| User Controller | `src/modules/user/user.controller.ts` | Thin handlers for Module 2 endpoints with standard response contract |
| User Routes | `src/modules/user/user.routes.ts` | Full route wiring with `authenticate`, `authorize`, `validate`, `upload` |
| App Route Mount (updated) | `src/app.ts` | Mounted `/api/users` routes |
| Test Factories (updated) | `tests/helpers/factory.ts` | Added module-aware helpers (department/program/class/teacher/student/csv generation) |
| User Integration Tests | `tests/modules/user.test.ts` | Comprehensive Module 2 API tests including hardening scenarios |

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/users` | Admin | Create single user (student/teacher/admin) |
| POST | `/api/users/bulk-import` | Admin | Bulk import users via CSV upload |
| GET | `/api/users/me` | Authenticated | Fetch own profile |
| PATCH | `/api/users/me` | Authenticated | Update own bio |
| PATCH | `/api/users/me/profile-picture` | Authenticated | Upload/update profile picture |
| GET | `/api/users` | Admin/HOD | Paginated list with filters and HOD scope restrictions |
| GET | `/api/users/:id` | Admin/HOD | Fetch user details with HOD department scoping |
| PATCH | `/api/users/:id/deactivate` | Admin | Soft deactivate account and revoke active refresh tokens |
| PATCH | `/api/users/:id/reactivate` | Admin | Reactivate previously deactivated account |

### Test Suites (24 tests)

| Suite | Tests | Status |
|-------|-------|--------|
| POST `/api/users` | 5 | ✅ |
| POST `/api/users/bulk-import` | 3 | ✅ |
| GET/PATCH `/api/users/me` | 3 | ✅ |
| GET `/api/users` | 4 | ✅ |
| GET `/api/users/:id` | 3 | ✅ |
| PATCH `/api/users/:id/deactivate|reactivate` | 6 | ✅ |

### Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Authorization strategy | Added full `authorize` middleware in Module 2 | Establishes reusable permission infrastructure early for later modules |
| HOD scope enforcement | Route allows `ADMIN` + `TEACHER`; service enforces HOD-only dept scope | Keeps coarse auth in middleware and fine-grained business scope in service |
| Temp password policy | `TEMP_PASSWORD_PREFIX + Aa1@ + random hex` | Guarantees strength requirements and aligns with `mustChangePassword` flow |
| Duplicate email handling | Explicit pre-check in service + domain `ConflictError` | Cleaner domain-level conflict behavior than relying only on Prisma mapping |
| Auto-membership writes | Performed in transaction with user/info creation | Ensures atomic state for user + role-specific info + memberships |
| CSV parsing robustness | Header normalization (trim + BOM strip) | Handles common spreadsheet-exported CSV quirks safely |
| Bulk import failure model | Partial success report (`successful`, `failed`, `errors`) | Avoids all-or-nothing failure on mixed-validity imports |
| Upload validation | MIME/type + size checks in middleware | Enforces constraints at boundary before business logic |
| Email failure behavior | Temp password email errors are logged, not blocking create | Preserves successful account creation even with transient email issues |
| Session revocation on deactivation | Revoke all active refresh tokens in deactivation transaction | Immediately cuts existing sessions after deactivation |

---

## Module 3 — Detailed Completion Log

### What was built

| Component | File(s) | Description |
|-----------|---------|-------------|
| Discipline Schemas/Service/Controller/Routes | `src/modules/discipline/*` | Discipline create/list APIs with admin guard on create |
| Department Schemas/Service/Controller/Routes | `src/modules/department/*` | Department create/list/get/update and nested program create/list endpoints |
| Program Schemas/Service/Controller/Routes | `src/modules/program/*` | Program update endpoint |
| App Route Mounts (updated) | `src/app.ts` | Mounted `/api/departments`, `/api/programs`, `/api/disciplines` |
| Test Factory (updated) | `tests/helpers/factory.ts` | Added `createDiscipline()` and `createDegreeLevelIfNeeded()` helpers |
| Module 3 Integration Tests | `tests/modules/department.test.ts` | Full integration coverage for discipline/department/program endpoints and side effects |

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/disciplines` | Admin | Create discipline |
| GET | `/api/disciplines` | Authenticated | List disciplines |
| POST | `/api/departments` | Admin | Create department + auto-create department server + `announcements` channel |
| GET | `/api/departments` | Authenticated | List departments |
| GET | `/api/departments/:id` | Authenticated | Get department details (including HOD info + program count) |
| PATCH | `/api/departments/:id` | Admin | Update department (includes linked server-name sync) |
| POST | `/api/departments/:id/programs` | Admin | Create program + auto-create program channel |
| GET | `/api/departments/:id/programs` | Authenticated | List programs in department |
| PATCH | `/api/programs/:id` | Admin | Update program (includes linked channel-name sync on code change) |

### Test Suites (36 tests)

| Suite | Tests | Status |
|-------|-------|--------|
| POST/GET `/api/disciplines` | 6 | ✅ |
| POST/GET/PATCH `/api/departments` (+ `/:id`) | 17 | ✅ |
| POST/GET `/api/departments/:id/programs` | 8 | ✅ |
| PATCH `/api/programs/:id` | 5 | ✅ |

### Key Design & Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Module boundaries | Split into `discipline`, `department`, `program` modules | Keeps route/service ownership clear and consistent with existing architecture |
| Nested resources | Program create/list handled under department routes | Reflects data ownership (`Program.departmentId`) and aligns with API plan |
| Auto-created channels | Department creation auto-creates `announcements`; program creation auto-creates `PROGRAM` channel | Enforces FR-19/FR-20 behavior at write boundary |
| Immutable auto-created flag | All system-created channels marked `isAutoCreated: true` | Required to enforce FR-21 semantics in later channel-management modules |
| Transactional writes | Multi-step create/update flows wrapped in `prisma.$transaction()` | Prevents partial state (e.g., entity created without required side-channel records) |
| Cross-entity name/code sync | Updating department name syncs server name; updating program code syncs program channel name | Preserves consistency for derived resources and avoids stale identifiers |
| Existence checks strategy | Domain-level `NotFoundError` checks for referenced entities before writes | Produces explicit API semantics (404) and avoids generic DB errors |
| Validation style | Zod 4 object schemas with `body/params/query` and clear field errors | Matches established middleware contract and existing module conventions |
| Input normalization | Added `.trim()` for discipline/department/program string fields | Hardens API against whitespace variants and uniqueness edge cases |
| List response shape | Non-paginated list endpoints for low-cardinality reference/domain data | Keeps payloads simple while staying aligned with project guidance for module 3 |

### Hardening Pass Outcomes

- Added synchronization logic for dependent resources on update flows:
	- `department.name` → linked `server.name`
	- `program.code` → linked auto-created program `channel.name`
- Added regression tests for:
	- duplicate department name conflicts
	- duplicate program code conflicts
	- unauthenticated create request behavior
	- input trimming for discipline/department/program fields
	- update-flow synchronization side effects (server/channel naming)
- Removed unused schema export (`programIdParamSchema`) to keep module surface minimal.

---

## Library Versions & Key Decisions

### Installed Package Versions (auto-resolved, not hardcoded)

| Package | Version | Notes |
|---------|---------|-------|
| **express** | ^5.2.1 | **Express 5** (major upgrade from v4) — async error handling built-in, new path matching syntax |
| **@prisma/client** | ^7.4.1 | **Prisma 7** — ESM-only, requires driver adapter, new config file |
| **prisma** (CLI) | ^7.4.1 | Schema at `prisma/schema.prisma`, config at `prisma.config.ts` |
| **@prisma/adapter-pg** | ^7.4.1 | Required by Prisma 7 — replaces built-in query engine with `node-pg` |
| **cloudinary** | ^2.9.0 | Profile picture uploads (Module 2) |
| **multer** | ^2.0.2 | Multipart file handling for profile picture and CSV endpoints |
| **csv-parser** | ^3.2.0 | Streaming CSV parsing for bulk import |
| **pg** | (adapter dep) | PostgreSQL driver used by Prisma adapter |
| **zod** | ^4.3.6 | **Zod 4** — `error` param replaces `message`, `.email()` now top-level, `.flatten()` deprecated |
| **resend** | ^6.9.2 | Transactional email (password reset, temp password notifications) |
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

## Module 4 — Detailed Completion Log

### What was built

| Component | File(s) | Description |
|-----------|---------|-------------|
| Class Schemas | `src/modules/class/class.schema.ts` | Zod 4 schemas for class create/list/get, course assignment/list/removal |
| Class Service | `src/modules/class/class.service.ts` | Business logic with transactional class+server+channel creation, course assignment with auto-channel, course removal with channel archiving |
| Class Controller | `src/modules/class/class.controller.ts` | Thin handlers following established response contract |
| Class Routes | `src/modules/class/class.routes.ts` | Route wiring with authenticate, authorize, validate middleware |
| App Route Mount (updated) | `src/app.ts` | Mounted `/api/classes` routes |
| Schema Migration | `prisma/migrations/20260226152732_*` | Changed `Channel.courseId` from `@unique` to `@@unique([serverId, courseId])`; added `isArchived`, `archivedAt`, `archivedBy` fields and `ChannelArchiver` relation |
| Prisma Schema (updated) | `prisma/schema.prisma` | `Channel` now supports archiving and allows same course in multiple servers; `Course.channels` is now one-to-many |
| Test Factory (updated) | `tests/helpers/factory.ts` | Added `createCourse()` helper; fixed `createProgram()` default code length for VARCHAR(20) |
| Module 4 Integration Tests | `tests/modules/class.test.ts` | 36 integration tests covering all endpoints and authorization scenarios |

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/classes` | Admin / HOD | Create class + auto-create CLASS server + `#announcements` + `#general` channels |
| GET | `/api/classes` | Authenticated | List classes (paginated, filterable by programId, semester) |
| GET | `/api/classes/:id` | Authenticated | Get class details with program, CR, student/course counts |
| POST | `/api/classes/:id/courses` | Admin / HOD / PD | Assign course + teacher to class, auto-create course channel, auto-add teacher to server |
| GET | `/api/classes/:id/courses` | Authenticated | List courses assigned to class with teacher info |
| DELETE | `/api/classes/:id/courses/:courseId` | Admin / HOD / PD | Remove course from class, archive course channel |

### Test Suites (36 tests)

| Suite | Tests | Status |
|-------|-------|--------|
| POST `/api/classes` | 10 | ✅ |
| GET `/api/classes` | 3 | ✅ |
| GET `/api/classes/:id` | 2 | ✅ |
| POST `/api/classes/:id/courses` | 13 | ✅ |
| GET `/api/classes/:id/courses` | 3 | ✅ |
| DELETE `/api/classes/:id/courses/:courseId` | 5 | ✅ |

### Schema Changes

| Change | Before | After | Reason |
|--------|--------|-------|--------|
| `Channel.courseId` constraint | `@unique` (1:1 globally) | `@@unique([serverId, courseId])` (unique per server) | Same course can be assigned to multiple classes, each needing its own channel |
| `Course.channels` relation | `channel Channel?` (1:1) | `channels Channel[]` (1:many) | Follows from courseId constraint change |
| Channel archiving | No archive mechanism | `isArchived`, `archivedAt`, `archivedBy` fields + `ChannelArchiver` relation | Preserves course channel history when courses are removed from classes |

### Key Design & Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Authorization model | Route-level `userTypes: ["ADMIN", "TEACHER"]` + service-level HOD/PD scope | Consistent with Module 2 pattern; avoids over-complicating middleware |
| HOD scope enforcement | Compare `department.hodId === userId` in service | Only HOD of the class's program's department can create/manage |
| PD scope enforcement | Compare `program.programDirectorId === userId` in service | Only PD of the class's program can assign/remove courses |
| Course removal strategy | Archive channel (not delete) + delete Teaches records | Preserves channel history for audit; clean removal of assignment record |
| Student auto-membership | Deferred to user creation flow (Module 2) | At class creation time, no students are assigned yet |
| Teacher auto-membership | Auto-added to class server on course assignment | Teacher needs server access to use course channel |
| Single assignment per request | `{ courseId, teacherId }` body | Simpler error handling, clearer REST semantics |
| Course catalog dependency | Module 4 uses factory-created courses in tests | Course CRUD is Module 5; Module 4 focuses on class ↔ course assignment |
| Semester validation | Reject if `currentSemester > program.semesters` | Prevents invalid class configurations |

---

## Module 5 — Detailed Completion Log

### What was built

| Component | File(s) | Description |
|-----------|---------|-------------|
| Course Schemas | `src/modules/course/course.schema.ts` | Zod 4 schemas for course create/list/get/update with param validation |
| Course Service | `src/modules/course/course.service.ts` | CRUD business logic with department validation, duplicate code checks, channel name sync on code change |
| Course Controller | `src/modules/course/course.controller.ts` | Thin handlers following established response contract |
| Course Routes | `src/modules/course/course.routes.ts` | Route wiring with authenticate, authorize, validate middleware |
| App Route Mount (updated) | `src/app.ts` | Mounted `/api/courses` routes |
| Module 5 Integration Tests | `tests/modules/course.test.ts` | 16 integration tests covering all endpoints, authorization, and channel sync |

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/courses` | Admin | Create course in the course catalog |
| GET | `/api/courses` | Authenticated | List courses (paginated, filterable by departmentId) |
| GET | `/api/courses/:id` | Authenticated | Get course details with department info |
| PATCH | `/api/courses/:id` | Admin | Update course (title, code, creditHours); syncs channel names on code change |

### Test Suites (16 tests)

| Suite | Tests | Status |
|-------|-------|--------|
| POST `/api/courses` | 5 | ✅ |
| GET `/api/courses` | 3 | ✅ |
| GET `/api/courses/:id` | 2 | ✅ |
| PATCH `/api/courses/:id` | 6 | ✅ |

### Key Design & Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Update scope | `title`, `code`, `creditHours` only — not `departmentId` | Avoids complexity of cross-department moves and cascading side-effects |
| Channel name sync | Update all auto-created COURSE channels by `courseId` (no `serverId` filter) | Unlike programs (scoped to one department server), courses can be assigned to multiple class servers |
| Pagination | Paginated list with `parsePagination`/`buildPaginationResponse` | Courses can grow significantly; matches `GET /classes` pattern |
| Detail response | Includes nested `department: { id, name }` | Consistent with class details including related entity info |
| Duplicate code check | Explicit pre-check in service + `ConflictError` | Cleaner domain-level error than relying on Prisma P2002 mapping |
| Department validation | Verify `departmentId` exists before course creation | Produces explicit 404 rather than FK constraint error |

---

## Module 6 — Detailed Completion Log

### What was built

| Component | File(s) | Description |
|-----------|---------|-------------|
| Society Schemas | `src/modules/society/society.schema.ts` | Zod 4 validation for all 10 endpoints (CRUD, join requests, members) |
| Society Service | `src/modules/society/society.service.ts` | All business logic: create with auto-provisioned server/channels, list/get/update, join request flow, member management |
| Society Controller | `src/modules/society/society.controller.ts` | 10 thin Express handlers following established ApiResponse/PaginatedResponse patterns |
| Society Routes | `src/modules/society/society.routes.ts` | 10 endpoints mounted at `/api/societies` with authenticate/authorize/validate middleware |
| App Route Mount (updated) | `src/app.ts` | Mounted `/api/societies` routes |
| Factory Helpers (updated) | `tests/helpers/factory.ts` | Added `createSociety()` and `createSocietyMembershipRequest()` helpers |
| Module 6 Integration Tests | `tests/modules/society.test.ts` | 52 integration tests covering all endpoints, authorization, and side-effects |

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/societies` | Admin / HOD | Create society with auto-provisioned server, #announcements + #general channels |
| GET | `/api/societies` | Authenticated | List societies (paginated, filterable by departmentId) |
| GET | `/api/societies/:id` | Authenticated | Get society details with member count, department, leadership info |
| PATCH | `/api/societies/:id` | Convenor / President / HOD / Admin | Update society info and/or leadership (field-level auth) |
| POST | `/api/societies/:id/join-request` | Student | Submit a join request (supports re-apply after rejection) |
| GET | `/api/societies/:id/join-requests` | Convenor / President / Admin | List join requests (filterable by status) |
| PATCH | `/api/societies/:id/join-requests/:requestId` | Convenor / President / Admin | Approve or reject a pending request |
| POST | `/api/societies/:id/members` | Convenor / President / Admin | Manually add a member (auto-approves pending request) |
| DELETE | `/api/societies/:id/members/:userId` | Convenor / President / Admin | Remove a member (cannot remove leadership) |
| GET | `/api/societies/:id/members` | Member | List society members (paginated) |

### Test Suites (52 tests)

| Suite | Tests | Status |
|-------|-------|--------|
| POST `/api/societies` | 13 | ✅ |
| GET `/api/societies` | 3 | ✅ |
| GET `/api/societies/:id` | 2 | ✅ |
| PATCH `/api/societies/:id` | 9 | ✅ |
| POST `/api/societies/:id/join-request` | 5 | ✅ |
| GET `/api/societies/:id/join-requests` | 3 | ✅ |
| PATCH `/api/societies/:id/join-requests/:requestId` | 5 | ✅ |
| POST `/api/societies/:id/members` | 4 | ✅ |
| DELETE `/api/societies/:id/members/:userId` | 4 | ✅ |
| GET `/api/societies/:id/members` | 4 | ✅ |

### Key Design & Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Single PATCH endpoint | Field-level auth in service: Convenor/President edit name+description, HOD/Admin edit leadership | Consistent with existing single-PATCH pattern; avoids endpoint proliferation |
| User IDs in API body | `presidentId`/`convenorId` accept User IDs, resolved to StudentInfo/TeacherInfo IDs internally | Friendlier API surface — clients don't know internal info-table IDs |
| Re-apply after rejection | Rejected requests are updated back to PENDING (same row) | Satisfies `@@unique([societyId, userId])` without requiring delete-and-recreate |
| Leadership immovable via remove | DELETE `/members/:userId` prevents removing president/convenor | Leadership changes must go through PATCH; avoids orphaned society state |
| Auto-provisioned server | Society creation auto-creates Server (type: SOCIETY) + 2 channels + 2 memberships in a transaction | Matches department/class creation patterns; ensures data consistency |
| Server name sync | Updating society name also updates server name | Server name should always reflect society name |
| Manual add auto-approves | Adding a member directly also approves any pending join request | Prevents stale PENDING requests after manual intervention |

---

## Next Up: Module 7 — Role Management

**Scope:** Assign/revoke/get contextual roles (HOD, CR, Program Director, Moderator)  
**Dependencies:** Module 6 ✅
