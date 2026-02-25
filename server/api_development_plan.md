# UniConnect - API Development Plan

**Version:** 1.0  
**Date:** February 23, 2026 (Conventions added February 25, 2026)  
**Team:** Muhammad Ahmad, Awais Hanif, Wasif Ali

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js with **TypeScript** |
| Framework | **Express.js** |
| Database | **PostgreSQL** with **Prisma ORM** |
| Validation | **Zod** |
| Authentication | **JWT** (access + refresh tokens in **HTTP-only cookies**) |
| File Storage | **Cloudinary** |
| Email | **Resend** |
| Real-time | **Socket.IO** |
| CSV Parsing | **csv-parser** (streaming) |
| Testing | **Supertest** + **Jest** with dedicated test database |

---

## Architecture Pattern

```
Request → Route → Middleware (auth, validate) → Controller → Service → Prisma → DB
```

- **Routes**: Define endpoints, attach middleware and controller handlers
- **Middleware**: Auth guards, role checks, Zod validation, error handling
- **Controllers**: Handle HTTP concerns (parse req, send res). Thin layer — delegates to services
- **Services**: All business logic lives here. Receive plain data, return plain data. Testable independently
- **Prisma**: Data access layer auto-generated from schema

---

## Coding Conventions & Design Patterns

This section is the single source of truth for how every module in this project must be written. Deviating from these conventions requires a deliberate team decision.

---

### 1. Module Structure (Module Pattern)

Every domain feature is a self-contained module under `src/modules/<name>/` with exactly four files:

```
src/modules/auth/
├── auth.routes.ts      ← HTTP routing: declares the middleware chain, maps paths to handlers
├── auth.controller.ts  ← HTTP layer: reads req, calls service, writes res
├── auth.service.ts     ← Business logic: receives plain values, returns plain objects
└── auth.schema.ts      ← Validation: Zod schemas for this module's endpoints
```

**Rules:**
- The service must never import `Request`, `Response`, or anything from `express`. It knows nothing about HTTP.
- The controller must contain no business logic. If it does more than "call service → set cookies/res → return JSON", the logic belongs in the service.
- Schemas live in their own file — never inline Zod schemas inside a route or controller.
- Module-private helpers (functions not exported) go at the top of `auth.service.ts`, clearly separated with a comment banner:

```typescript
// ─── Helpers ────────────────────────────────────────────────────────────────

function hashToken(token: string): string { ... }
```

Section banners use `// ─── Title ${'─'.repeat(N)}` to visually separate code blocks within a file.

---

### 2. Layered Architecture & Data Flow

```
Request
  │
  ▼
routes.ts        → validate(schema), authenticate, authorize, handler
  │
  ▼
controller.ts    → reads req.body / req.params / req.user
  │
  ▼
service.ts       → pure logic, Prisma, throws domain errors
  │
  ▼
prisma.ts        → DB (singleton instance only, never `new PrismaClient()`)
```

**Controller shape — always this thin:**

```typescript
export async function handleCreate(req: Request, res: Response): Promise<void> {
  const result = await someService.create(req.body, req.user!.id);

  const response: ApiResponse<typeof result> = {
    success: true,
    data: result,
    message: "Created successfully",
  };

  res.status(StatusCodes.CREATED).json(response);
}
```

**Service shape — always these contracts:**

```typescript
// ✅ Correct: accepts plain values, returns plain object
export async function createDepartment(name: string, code: string): Promise<Department> { ... }

// ❌ Wrong: service must not touch req/res
export async function createDepartment(req: Request): Promise<void> { ... }
```

---

### 3. Error Handling (Domain Error Pattern)

Never use `res.status(x).json(...)` to represent errors inside services or middleware. Always throw a typed domain error — the global `errorHandler` catches everything.

**Error class hierarchy (`src/shared/errors/index.ts`):**

| Class | HTTP | Code | When to use |
|-------|------|------|-------------|
| `NotFoundError` | 404 | `NOT_FOUND` | Resource doesn't exist by ID |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` | Not authenticated, or identity verification failed (wrong password, bad token) |
| `ForbiddenError` | 403 | `FORBIDDEN` | Authenticated but not permitted (wrong role, wrong scope) |
| `ConflictError` | 409 | `CONFLICT` | Uniqueness violation (duplicate email, etc.) |
| `ValidationError` | 400 | `VALIDATION_ERROR` | Schema validation failed (Zod) |
| `AppError` | 500 | `INTERNAL_ERROR` | Custom errors that don't fit the above |

**Usage:**

```typescript
// ✅ Throw and forget — errorHandler converts to JSON automatically
throw new NotFoundError("Department not found");
throw new ForbiddenError("You can only manage your own department");
throw new UnauthorizedError("Invalid credentials");

// ❌ Never do this in a service
res.status(404).json({ error: "not found" });
```

**Prisma errors are auto-mapped by the global error handler:**
- `P2002` (unique constraint) → `ConflictError` — you rarely need to handle this manually
- `P2025` (record not found) → `NotFoundError` — same

**Anti-enumeration rule:** When a login-type operation could fail for multiple reasons (user not found vs. wrong password vs. deactivated), always throw the *same* error with the *same* message regardless of which condition triggered it. This prevents attackers from discovering which emails are registered.

```typescript
// ✅ Correct — identical message for both cases
if (!user || !user.isActive) throw new UnauthorizedError("Invalid credentials");
const valid = await bcrypt.compare(password, user.passwordHash);
if (!valid) throw new UnauthorizedError("Invalid credentials");

// ❌ Wrong — leaks information
if (!user) throw new NotFoundError("No account with this email");
if (!valid) throw new UnauthorizedError("Wrong password");
```

---

### 4. Validation (Parse-Don't-Validate Pattern)

We use Zod at the HTTP boundary. Once the request passes validation, all code downstream treats the data as fully typed and safe — no further defensive checks needed.

**Schema file convention:**

```typescript
// auth.schema.ts
import { z } from "zod";

export const loginSchema = {
  body: z.object({ ... }),        // ← key matches ValidationSchemas interface
};

export const getUserSchema = {
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: paginationQuerySchema,   // ← compose reusable schemas
};
```

**Route usage:**

```typescript
router.post("/login", validate(loginSchema), handleLogin);
router.get("/:id", validate(getUserSchema), handleGetUser);
```

**Zod 4 rules — must follow these, not Zod 3 patterns:**

| Pattern | Zod 3 (wrong) | Zod 4 (correct) |
|---------|---------------|-----------------|
| Inline error messages | `z.string().min(1, { message: "Required" })` | `z.string().min(1, { error: "Required" })` |
| Email validation | `z.string().email()` (works but deprecated) | `z.email()` (preferred, top-level) |
| Native enums | `z.nativeEnum(UserType)` (deprecated) | `z.enum(UserType)` |
| Strict objects | `.strict()` (deprecated) | `z.strictObject(...)` |
| Error formatting | `.flatten()` / `.format()` (deprecated) | `z.treeifyError(result.error)` |

After `validate()` runs, `req.body` is replaced with the fully-typed Zod output — you get TypeScript safety without manual casting.

**Password schema:** Any endpoint that accepts a new password must use the shared password strength schema from `auth.schema.ts`. Do not reinvent per-module password validation.

---

### 5. Import & Module Conventions (ESM)

This project uses **native ESM** (`"type": "module"` in `package.json`). TypeScript compiles to ESM. All imports must use `.js` extensions even for `.ts` source files — this is Node ESM's requirement.

```typescript
// ✅ Correct
import { prisma } from "../../config/prisma.js";
import { NotFoundError } from "../../shared/errors/index.js";
import type { AuthUser } from "../../shared/types/index.js";

// ❌ Wrong — will fail at runtime
import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../shared/errors";
```

**Path aliases:** Use `@/*` for imports from `src/` to avoid deep relative paths:

```typescript
import { prisma } from "@/config/prisma.js";
import { NotFoundError } from "@/shared/errors/index.js";
```

**`import type` rule:** When importing only TypeScript types (interfaces, type aliases), always use `import type`. This is stripped at compile time with zero runtime cost:

```typescript
import type { Request, Response, NextFunction } from "express";
import type { AuthUser } from "@/shared/types/index.js";
```

**Barrel files:** `shared/errors/index.ts` and `shared/types/index.ts` are barrel files — export everything from one place so callers import from the index, not from individual files.

---

### 6. Singleton Pattern (Config Instances)

Anything expensive to construct or that must be shared across the entire app lifecycle is a module-level singleton:

| Singleton | File | What it is |
|-----------|------|------------|
| `prisma` | `src/config/prisma.ts` | Prisma client with pg adapter |
| `env` | `src/config/env.ts` | Zod-validated env object |
| `emailService` | `src/config/email.ts` | Resend client wrapper |
| `cloudinary` | `src/config/cloudinary.ts` | Cloudinary SDK instance (Module 2) |

**Never call `new PrismaClient()` outside `src/config/prisma.ts`.** Never call `new Resend()` outside `src/config/email.ts`. Import the shared instance.

---

### 7. Response Format (Enforced Contract)

Every handler must return one of these three shapes. Never invent custom response formats.

```typescript
// Single resource (201 or 200)
const response: ApiResponse<User> = {
  success: true,
  data: user,
  message: "User created successfully",
};
res.status(StatusCodes.CREATED).json(response);

// Paginated list (200)
const response: PaginatedResponse<User> = {
  success: true,
  data: users,
  pagination: buildPaginationResponse(page, limit, total),
};
res.status(StatusCodes.OK).json(response);

// No-data operation (200)
const response: ApiResponse<null> = {
  success: true,
  data: null,
  message: "Operation completed",
};
res.status(StatusCodes.OK).json(response);
```

**Always use `StatusCodes` from `http-status-codes`** — never raw numbers (`201`, `404`, etc.):

```typescript
// ✅ Correct
res.status(StatusCodes.CREATED).json(response);
res.status(StatusCodes.NO_CONTENT).send();

// ❌ Wrong
res.status(201).json(response);
```

---

### 8. Authentication & Security Patterns

#### Cookie configuration
All auth cookies must be set with these flags:

```typescript
res.cookie("access_token", token, {
  httpOnly: true,                          // JS cannot read it — blocks XSS token theft
  secure: env.NODE_ENV === "production",   // HTTPS only in prod
  sameSite: "strict",                      // Blocks CSRF
  path: "/api",                            // Scope to API only
  maxAge: parseExpiry(env.JWT_ACCESS_EXPIRY),
});
```

Refresh token cookie must use `path: "/api/auth/refresh"` — it should only be sent to the refresh endpoint, not on every API request.

#### JWT payload
Every JWT must include `jti: crypto.randomUUID()`. This prevents unique-constraint collisions when multiple tokens are issued for the same user in rapid succession (tokens with identical payloads and the same `iat` second would hash identically).

#### Refresh tokens — hash before storing
Store `crypto.createHash("sha256").update(token).digest("hex")` in the database, not the raw token. Never store raw tokens. SHA-256 is correct here (not bcrypt) because JWTs are already high-entropy — bcrypt's dictionary-attack protection is unnecessary, and SHA-256 allows direct hash-based lookup (`WHERE token_hash = $hash`).

#### Token rotation
On every successful `/refresh` call: revoke the old refresh token first, then issue a new pair. Never extend an existing token — always replace it.

#### Password hashing
Always use `bcrypt.hash(password, 10)`. Never MD5, SHA-x, or any non-adaptive algorithm for passwords.

#### Secret isolation
Use separate secrets for separate token purposes:
- `JWT_ACCESS_SECRET` — access tokens only
- `JWT_REFRESH_SECRET` — refresh tokens only
- `RESET_PASSWORD_SECRET` — password reset tokens only

If a secret is compromised, the blast radius is limited to one token type.

#### Revoke on sensitive operations
After any password change or password reset, revoke **all** active refresh tokens for the affected user. This terminates all existing sessions across all devices.

#### Idempotent operations
Logout must be idempotent — calling it twice on the same token must not throw an error. Use `updateMany` (not `update`) when revoking, so a missing record is silently ignored.

---

### 9. Authorization Pattern (Module 2+)

The `authorize` middleware (created in Module 2) wraps permission checks into the middleware chain. The convention is:

```typescript
// Route declaration
router.post("/channels", authenticate, authorize("create:channel", getServerId), handleCreate);
//                                      ↑ permission slug   ↑ scope resolver fn

// Scope resolver: extracts the relevant entity ID from the request for permission scoping
function getServerId(req: Request): number {
  return parseInt(req.params.serverId, 10);
}
```

**Business-logic permission checks stay in the service**, not the controller or route. The `authorize` middleware is for coarse-grained role/permission gates. Fine-grained checks (e.g., "HOD can only manage their own department") are enforced inside the service by comparing `req.user.departmentId` with the target entity.

---

### 10. Prisma Conventions

**Always use the singleton:**
```typescript
import { prisma } from "@/config/prisma.js";
```

**Select only what you need.** Never fetch entire records when you only need a few fields — this matters both for performance and for never accidentally sending `passwordHash` to the client:

```typescript
// ✅ Correct — explicit select
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, fullName: true, email: true, userType: true },
});

// ❌ Wrong — fetches all fields including passwordHash
const user = await prisma.user.findUnique({ where: { id } });
return user; // passwordHash could leak
```

**Use transactions for multi-step writes.** Whenever a business operation requires multiple DB mutations (e.g., create user → create StudentInfo → create ServerMembership), wrap them in a `prisma.$transaction`:

```typescript
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ ... });
  await tx.studentInfo.create({ data: { userId: user.id, ... } });
  await tx.serverMembership.create({ data: { userId: user.id, serverId } });
});
```

**Let the global error handler catch Prisma errors.** P2002 (unique) and P2025 (not found) are already mapped. Only add explicit Prisma error handling when you need a custom message beyond the defaults.

---

### 11. Test Conventions

**File location:** Test files mirror the source structure — `tests/modules/auth.test.ts` corresponds to `src/modules/auth/`.

**Test isolation:** Call `await resetDB()` in `beforeAll` of each `describe` block (not `beforeEach`). Creating users is expensive (bcrypt). Tests that mutate state must either use isolated users per test or reset and re-create as needed.

**Factory pattern:** All test data must be created via factory helpers in `tests/helpers/factory.ts`. Never write raw `prisma.user.create(...)` in a test file.

```typescript
// ✅ Correct — uses factory
const user = await createUser({ email: "test@test.com", password: "Pass@1234" });

// ❌ Wrong — raw Prisma in test
const user = await prisma.user.create({ data: { email: "test@test.com", passwordHash: "..." } });
```

**Authentication in tests:** Use `loginAs(email, password)` from the factory. It performs a real login via the Express app and returns the `Set-Cookie` headers, which you pass to protected requests:

```typescript
const cookies = await loginAs("user@test.com", "Pass@1234");
const res = await request(app)
  .get("/api/protected")
  .set("Cookie", cookies);
```

**Assertions follow this order:**
1. Assert the HTTP status code first.
2. Assert `res.body.success` is `true`/`false` second.
3. Assert specific fields on `res.body.data` third.
4. Assert side effects (DB state) last, with a separate Prisma query.

**Always disconnect after tests:**
```typescript
afterAll(async () => {
  await prisma.$disconnect();
});
```

---

### 12. Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Files | `kebab-case` | `auth.service.ts`, `error-handler.ts` |
| Functions | `camelCase` | `createUser`, `hashToken`, `handleLogin` |
| Route handlers | `handle` prefix | `handleLogin`, `handleGetUser`, `handleCreate` |
| Service functions | verb-noun | `login`, `createUser`, `assignRole`, `getProfile` |
| Zod schema exports | `<scope>Schema` | `loginSchema`, `changePasswordSchema` |
| TypeScript interfaces | `PascalCase` | `AuthUser`, `ApiResponse<T>` |
| Constants | `UPPER_SNAKE_CASE` | `TEMP_PASSWORD_PREFIX`, `MAX_PAGE_SIZE` |
| Env variable keys | `UPPER_SNAKE_CASE` | `JWT_ACCESS_SECRET`, `RESEND_API_KEY` |
| DB tables/columns (Prisma) | `snake_case` in DB, `camelCase` in TS | `user_type` ↔ `userType` |

---

### Summary: What Pattern Is Each File?

| Pattern | Where it lives |
|---------|---------------|
| **Layered Architecture** (Route → Controller → Service → DB) | Every module |
| **Module Pattern** (self-contained domain folder) | `src/modules/<name>/` |
| **Singleton** (shared expensive instances) | `src/config/prisma.ts`, `src/config/env.ts`, `src/config/email.ts` |
| **Domain Error Hierarchy** (typed error classes) | `src/shared/errors/index.ts` |
| **Middleware Chain** (authenticate → authorize → validate → handler) | `src/modules/*/routes.ts` |
| **Parse-Don't-Validate** (Zod replaces req.body with typed output) | `src/middleware/validate.ts` + `*.schema.ts` |
| **Factory** (test data creation helpers) | `tests/helpers/factory.ts` |
| **Token Rotation** (revoke-old on every refresh) | `src/modules/auth/auth.service.ts` |
| **Hash-Before-Store** (bcrypt passwords, SHA-256 refresh tokens) | `src/modules/auth/auth.service.ts` |
| **Soft Delete** (mark deleted, don't remove) | Posts, Channels |
| **Anti-Enumeration** (same error for multiple failure modes) | `src/modules/auth/auth.service.ts` |

---

## Project Structure

```
server/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                    # Seed roles, permissions, test data
├── src/
│   ├── app.ts                     # Express app setup (middleware, routes)
│   ├── server.ts                  # HTTP + Socket.IO server bootstrap
│   ├── config/
│   │   ├── env.ts                 # Validated env vars (Zod)
│   │   ├── prisma.ts              # Prisma client singleton
│   │   └── cloudinary.ts          # Cloudinary config
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.schema.ts     # Zod schemas
│   │   ├── user/
│   │   ├── department/
│   │   ├── program/
│   │   ├── class/
│   │   ├── course/
│   │   ├── society/
│   │   ├── server/
│   │   ├── channel/
│   │   ├── post/
│   │   ├── notification/
│   │   ├── role/
│   │   └── admin/
│   ├── middleware/
│   │   ├── authenticate.ts        # JWT verification
│   │   ├── authorize.ts           # Role/permission checking
│   │   ├── validate.ts            # Zod validation middleware
│   │   ├── upload.ts              # Multer + Cloudinary
│   │   └── errorHandler.ts        # Global error handler
│   ├── shared/
│   │   ├── types/                 # Shared TypeScript types
│   │   ├── errors/                # Custom error classes (AppError, etc.)
│   │   ├── utils/                 # Helpers (pagination, etc.)
│   │   └── constants.ts
│   └── socket/
│       ├── index.ts               # Socket.IO setup
│       └── handlers/              # Event handlers
├── tests/
│   ├── setup.ts                   # Test DB setup, Prisma reset, helpers
│   ├── helpers/
│   │   ├── auth.helper.ts         # Login helper, get cookies
│   │   ├── factory.ts             # Create test users, servers, etc.
│   │   └── db.helper.ts           # Reset DB between tests
│   └── modules/
│       ├── auth.test.ts
│       ├── user.test.ts
│       ├── department.test.ts
│       └── ... (mirrors src/modules)
├── package.json
├── tsconfig.json
├── jest.config.ts
├── .env
└── .env.test
```

---

## Module Development Plan

Modules are ordered by dependency — each module builds on the previous ones. Every module includes its API endpoints, the functional requirements it fulfills, and testing scope.

---

### Module 0: Project Foundation & Shared Infrastructure

**Goal:** Set up the project skeleton, tooling, database, and shared utilities that all modules depend on.

**Tasks:**
1. Initialize Node.js project with TypeScript (`tsconfig.json`, `package.json`)
2. Install core dependencies: `express`, `prisma`, `@prisma/client`, `zod`, `jsonwebtoken`, `bcrypt`, `cookie-parser`, `cors`, `helmet`
3. Install dev dependencies: `jest`, `ts-jest`, `supertest`, `@types/*`, `tsx`, `nodemon`
4. Create Prisma schema from the ERD (all tables)
5. Run initial migration, set up seed script (roles, permissions, admin user)
6. Create shared infrastructure:
   - `config/env.ts` — Zod-validated environment variables
   - `config/prisma.ts` — singleton Prisma client
   - `middleware/errorHandler.ts` — global async error handler
   - `middleware/validate.ts` — generic Zod validation middleware
   - `shared/errors/` — `AppError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`
   - `shared/utils/pagination.ts` — pagination helper (FR-41, FR-42)
   - `app.ts` — Express app with JSON parsing, cookies, CORS, helmet
7. Configure Jest + Supertest with dedicated test database
8. Create test helpers: DB reset, factory functions

**Test Scope:**
- Verify Express app starts and returns 404 for unknown routes
- Verify Prisma connects to test database
- Verify pagination utility returns correct `skip`, `take`, and response format
- Verify Zod validation middleware rejects bad input and returns proper error shape
- Verify error handler formats `AppError` into consistent JSON response

---

### Module 1: Authentication

**Functional Requirements:** FR-1, FR-2, FR-3, FR-6, FR-7, FR-8

**Endpoints:**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Login with email + password, set JWT cookies | Public |
| POST | `/api/auth/logout` | Clear cookies, revoke refresh token | Authenticated |
| POST | `/api/auth/refresh` | Refresh access token using refresh token cookie | Cookie |
| POST | `/api/auth/forgot-password` | Send password reset email | Public |
| POST | `/api/auth/reset-password` | Reset password with token | Public |
| PATCH | `/api/auth/change-password` | Change password (requires current password) | Authenticated |

**Business Logic:**
- Login: Verify credentials → check `is_active` → generate access token (15min) + refresh token (7d) → store refresh token hash in DB → set HTTP-only cookies
- First login detection: if password matches a temp pattern/flag → force password change (FR-7)
- Refresh: validate refresh token cookie → check not revoked → issue new pair
- Logout: revoke refresh token in DB, clear cookies
- Forgot password: generate time-limited reset token → send via Resend
- Change password: verify current password → update hash

**Middleware Created:**
- `authenticate.ts` — Verifies access token from cookie, attaches `req.user`

**Test Scope (Supertest):**
```
✓ POST /login — valid credentials → 200 + sets cookies
✓ POST /login — invalid password → 401
✓ POST /login — deactivated user → 403
✓ POST /login — non-existent email → 401
✓ POST /logout — clears cookies + revokes refresh token
✓ POST /refresh — valid refresh token → new cookies
✓ POST /refresh — expired/revoked token → 401
✓ PATCH /change-password — wrong current password → 400
✓ PATCH /change-password — valid → 200 + password updated
✓ POST /forgot-password — valid email → 200 (email sent)
✓ POST /reset-password — valid token → 200 + password updated
✓ POST /reset-password — expired token → 400
✓ First login → forced password change flow
✓ All protected endpoints → 401 without cookies
```

---

### Module 2: User Management

**Functional Requirements:** FR-1, FR-4, FR-5, FR-6, FR-52, FR-53, FR-54, FR-55, FR-56, FR-57, FR-74, FR-76

**Endpoints:**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/users` | Admin creates single user | Admin |
| POST | `/api/users/bulk-import` | Admin bulk-imports users via CSV | Admin |
| GET | `/api/users/me` | Get own profile with roles | Authenticated |
| PATCH | `/api/users/me` | Update own profile (picture, bio) | Authenticated |
| PATCH | `/api/users/me/profile-picture` | Upload/update profile picture | Authenticated |
| GET | `/api/users` | List all users (admin filters) | Admin |
| GET | `/api/users/:id` | Get user details | Admin / HOD (own dept) |
| PATCH | `/api/users/:id/deactivate` | Deactivate user | Admin |
| PATCH | `/api/users/:id/reactivate` | Reactivate user | Admin |

**Business Logic:**
- Create user: validate uniqueness (email) → hash temp password → create User + StudentInfo/TeacherInfo based on `user_type` → auto-add to department server + class server (students) → send email with temp password via Resend (FR-6, FR-13, FR-14)
- Bulk import: stream CSV with `csv-parser` → validate each row → batch create in transaction → return success/failure report (FR-5)
- Profile update: users can update only their own bio and profile picture (Cloudinary upload)
- Admin list: paginated with filters by `user_type`, `department_id`, `is_active` (FR-74)
- HOD view: list students and teachers in their department only (FR-76)
- Deactivate: soft-deactivate (`is_active = false`), posts preserved (FR-55, FR-56)

**Middleware Created:**
- `authorize.ts` — Role/permission checking middleware (used by all subsequent modules)
- `upload.ts` — Multer memory storage + Cloudinary upload middleware

**Test Scope:**
```
✓ POST /users — admin creates student → 201 + StudentInfo created + auto-joined servers
✓ POST /users — admin creates teacher → 201 + TeacherInfo created + auto-joined dept server
✓ POST /users — duplicate email → 409
✓ POST /users — non-admin → 403
✓ POST /users/bulk-import — valid CSV → 200 + users created
✓ POST /users/bulk-import — CSV with errors → 200 + partial success report
✓ GET /users/me — returns profile with roles and badges
✓ PATCH /users/me — updates bio
✓ GET /users — admin with filters → paginated list
✓ GET /users — non-admin → 403
✓ GET /users — HOD sees only own department users
✓ PATCH /users/:id/deactivate — admin → user deactivated
✓ PATCH /users/:id/deactivate — deactivated user cannot login
✓ PATCH /users/:id/reactivate — admin → user reactivated
```

---

### Module 3: Department & Program Management

**Functional Requirements:** FR-9 (department part), FR-20, FR-21

**Endpoints:**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/departments` | Create department + auto-create server | Admin |
| GET | `/api/departments` | List all departments | Authenticated |
| GET | `/api/departments/:id` | Get department details | Authenticated |
| PATCH | `/api/departments/:id` | Update department | Admin |
| POST | `/api/departments/:id/programs` | Create program under department | Admin |
| GET | `/api/departments/:id/programs` | List programs in department | Authenticated |
| PATCH | `/api/programs/:id` | Update program | Admin |

**Business Logic:**
- Create department: create Department → auto-create Server (type=Department) → auto-create `#announcements` channel (FR-19) → link server_id
- Create program: validate uniqueness (dept + discipline + degree level) → create Program → auto-create program channel in department server (FR-20)
- Program channel is auto-created and cannot be deleted (FR-21) — enforced by `is_auto_created` flag
- HOD assignment is handled in Module 7 (Role Management)

**Test Scope:**
```
✓ POST /departments — admin → 201 + server auto-created + #announcements channel
✓ POST /departments — non-admin → 403
✓ POST /departments — duplicate code → 409
✓ GET /departments — returns all departments
✓ POST /departments/:id/programs — creates program + auto-creates program channel in dept server
✓ POST /departments/:id/programs — duplicate (dept+discipline+level) → 409
✓ Program channel has is_auto_created=true flag
✓ GET /departments/:id/programs — lists programs
```

---

### Module 4: Class Management

**Functional Requirements:** FR-9, FR-10, FR-31, FR-32, FR-33, FR-34

**Endpoints:**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/classes` | Create class + auto-create server | Admin / HOD |
| GET | `/api/classes` | List classes (filtered by program, semester) | Authenticated |
| GET | `/api/classes/:id` | Get class details | Authenticated |
| POST | `/api/classes/:id/courses` | Assign courses + teachers to class | Admin / HOD / PD |
| GET | `/api/classes/:id/courses` | List courses assigned to class | Authenticated |
| DELETE | `/api/classes/:id/courses/:courseId` | Remove course from class | Admin / HOD / PD |

**Business Logic:**
- Create class: validate program exists → create Class → auto-create Server (type=Class) → auto-create `#announcements` and `#general` channels → auto-add class students to server (FR-9, FR-10)
- HOD can create classes only within their department's programs (FR-10)
- Assign courses: create TEACHES record → auto-create course channel in class server (FR-33) → teacher gets auto-posting rights via TEACHES relationship (FR-34)
- PD can only assign courses for their program (Section 5.3)
- Class server auto-membership: when students are created/updated with a class_id, they auto-join the class server

**Test Scope:**
```
✓ POST /classes — admin creates class → 201 + server auto-created + default channels
✓ POST /classes — HOD creates class in own dept → 201
✓ POST /classes — HOD creates class in other dept → 403
✓ POST /classes — duplicate (program+semester+section+year) → 409
✓ POST /classes/:id/courses — assigns course + teacher → course channel auto-created
✓ POST /classes/:id/courses — teacher auto-gets posting rights in course channel
✓ POST /classes/:id/courses — PD assigns for own program → 200
✓ POST /classes/:id/courses — PD assigns for other program → 403
✓ GET /classes/:id/courses — lists assigned courses with teachers
```

---

### Module 5: Course Management

**Functional Requirements:** Related to FR-31, FR-32, FR-33, FR-34

**Endpoints:**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/courses` | Create a course | Admin |
| GET | `/api/courses` | List courses (filter by department) | Authenticated |
| GET | `/api/courses/:id` | Get course details | Authenticated |
| PATCH | `/api/courses/:id` | Update course | Admin |

**Business Logic:**
- CRUD for the course catalog (course code, title, credit hours, department)
- Courses are department-scoped
- Actual assignment of courses to classes is handled in Module 4

**Test Scope:**
```
✓ POST /courses — admin creates course → 201
✓ POST /courses — duplicate code → 409
✓ POST /courses — non-admin → 403
✓ GET /courses — filter by department → returns filtered list
✓ PATCH /courses/:id — admin updates course → 200
```

---

### Module 6: Society Management

**Functional Requirements:** FR-9, FR-11, FR-12, FR-64, FR-65, FR-66, FR-67, FR-68, FR-69

**Endpoints:**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/societies` | Create society + server | Admin / HOD |
| GET | `/api/societies` | List societies (filter by department) | Authenticated |
| GET | `/api/societies/:id` | Get society details | Authenticated |
| PATCH | `/api/societies/:id` | Update society info | Convenor / President |
| POST | `/api/societies/:id/join-request` | Student sends join request | Student |
| GET | `/api/societies/:id/join-requests` | List pending requests | Convenor / President |
| PATCH | `/api/societies/:id/join-requests/:requestId` | Approve/reject request | Convenor / President |
| POST | `/api/societies/:id/members` | Manually add member | Convenor / President |
| DELETE | `/api/societies/:id/members/:userId` | Remove member | Convenor / President |
| GET | `/api/societies/:id/members` | List society members | Member |

**Business Logic:**
- Create society: requires `convenor_id` (teacher) and `president_id` (student) (FR-12) → auto-create Server (type=Society) → auto-create `#announcements` and `#general` channels → add convenor + president as server members
- HOD can create societies only in their department (FR-11)
- Join request flow: student submits → pending → convenor/president approves → auto-add to server (FR-65, FR-66, FR-69)
- Manual add: convenor/president directly adds a student → create server membership (FR-67)
- Students can browse societies in their department (FR-64)

**Test Scope:**
```
✓ POST /societies — admin/HOD creates with convenor+president → 201 + server + channels
✓ POST /societies — HOD in other dept → 403
✓ POST /societies — missing president/convenor → 400
✓ POST /societies/:id/join-request — student sends request → 201
✓ POST /societies/:id/join-request — duplicate request → 409
✓ PATCH /join-requests/:id — approve → student auto-added to server
✓ PATCH /join-requests/:id — reject → student not added
✓ POST /societies/:id/members — manual add → member created
✓ DELETE /societies/:id/members/:userId — remove member → membership removed
✓ GET /societies — student sees only department societies
```

---

### Module 7: Role Management

**Functional Requirements:** FR-58, FR-59, FR-60, FR-61, FR-62, FR-63

**Endpoints:**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/roles/assign` | Assign a role to a user | Varies (see rules) |
| DELETE | `/api/roles/revoke` | Revoke a role from a user | Varies |
| GET | `/api/roles/users/:id` | Get all roles for a user | Admin / HOD |

**Request Body for assign:**
```json
{
  "userId": 5,
  "role": "cr",
  "scopeId": 12   // classId for CR, departmentId for HOD/PD, societyId for convenor/president
}
```

**Business Logic:**
- Admin can assign any role (FR-58)
- HOD can assign: CR, Program Director, Moderators, Society Convenor within their dept (FR-59, FR-60)
- CR can assign moderators in their class server (FR-61)
- Society Convenor/President can assign moderators in their society server (FR-62)
- Each role assignment updates the specific entity:
  - `HOD` → sets `department.hod_id`
  - `Program Director` → sets `program.program_director_id`
  - `CR` → sets `class.cr_id`
  - `Society President` → sets `society.president_id`
  - `Society Convenor` → sets `society.convenor_id`
  - `Moderator` → creates `MODERATOR_ASSIGNMENT` record
- Uniqueness enforcement: only one HOD per dept, one PD per program, one CR per class, etc.
- Role changes take effect immediately (FR-63)

**Test Scope:**
```
✓ POST /roles/assign — admin assigns HOD → department.hod_id updated
✓ POST /roles/assign — admin assigns CR → class.cr_id updated
✓ POST /roles/assign — HOD assigns CR within dept → 200
✓ POST /roles/assign — HOD assigns CR outside dept → 403
✓ POST /roles/assign — assigning second HOD to same dept → 409 (uniqueness)
✓ POST /roles/assign — CR assigns moderator in class server → 200
✓ POST /roles/assign — CR assigns moderator in other server → 403
✓ POST /roles/assign — convenor assigns moderator in society → 200
✓ DELETE /roles/revoke — revoke HOD → department.hod_id nulled
✓ Role changes are immediately effective (test with a subsequent permission-dependent request)
```

---

### Module 8: Server & Channel Management

**Functional Requirements:** FR-15, FR-16, FR-17, FR-18, FR-19, FR-22, FR-23, FR-24, FR-25, FR-26, FR-27, FR-28, FR-29, FR-30

**Endpoints:**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/servers` | List servers user is member of | Authenticated |
| GET | `/api/servers/:id` | Get server details | Member |
| GET | `/api/servers/:id/channels` | List channels in server | Member |
| GET | `/api/servers/:id/members` | List members with roles/badges | Member |
| POST | `/api/servers/:id/channels` | Create channel in server | HOD/CR/Convenor/President |
| PATCH | `/api/channels/:id` | Update channel info | Manager |
| PATCH | `/api/channels/:id/lock` | Lock a channel | Admin/HOD/CR/Convenor/President |
| PATCH | `/api/channels/:id/unlock` | Unlock a channel | Admin/HOD/CR/Convenor/President |
| DELETE | `/api/channels/:id` | Soft-delete channel | Admin/HOD/CR/Convenor/President |

**Business Logic:**
- Users see only servers they're members of (FR-15)
- Members can browse channels and member list within a server (FR-16, FR-17)
- Member list shows name, role badges, profile picture (FR-18)
- Channel creation rules:
  - HOD creates in department server (FR-24)
  - CR creates in class server
  - Convenor/President creates in society server (FR-27)
- Lock/delete rules:
  - Admin can lock/delete any channel (FR-25)
  - HOD can lock/delete in department server (FR-26)
  - Convenor/President can lock/delete in society server (FR-27)
  - Auto-created program channels CANNOT be deleted (FR-21)
- Posting rights resolution (used by Module 9):
  - HOD → all channels in dept server (FR-22)
  - PD → their program channel only (FR-23)
  - Teacher → assigned course channels (FR-34)
  - CR → all channels in class server
  - Server moderator → all channels (FR-29)
  - Channel moderator → assigned channels only (FR-30)

**Test Scope:**
```
✓ GET /servers — returns only user's servers
✓ GET /servers/:id — non-member → 403
✓ GET /servers/:id/channels — returns channels list
✓ GET /servers/:id/members — returns members with badges
✓ POST /servers/:id/channels — HOD creates in dept server → 201
✓ POST /servers/:id/channels — HOD creates in other server → 403
✓ POST /servers/:id/channels — CR creates in class server → 201
✓ PATCH /channels/:id/lock — admin locks channel → is_locked=true
✓ DELETE /channels/:id — admin deletes → soft delete
✓ DELETE /channels/:id — delete auto-created program channel → 400 (forbidden)
✓ Locked channel prevents new posts (tested in Module 9)
```

---

### Module 9: Posts & Announcements

**Functional Requirements:** FR-35, FR-36, FR-37, FR-38, FR-39, FR-40, FR-41, FR-42, FR-49, FR-50, FR-51

**Endpoints:**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/channels/:id/posts` | Create post in channel | Authorized poster |
| GET | `/api/channels/:id/posts` | List posts (paginated, pinned first) | Member |
| GET | `/api/posts/:id` | Get single post | Member |
| PATCH | `/api/posts/:id` | Edit post (within 24h) | Author |
| DELETE | `/api/posts/:id` | Soft-delete post | Author / Admin |
| PATCH | `/api/posts/:id/pin` | Pin/unpin post | Channel manager |
| POST | `/api/posts/:id/attachments` | Upload attachments (max 3 images, 5MB each) | Author |

**Query params for GET:**
- `page`, `limit` — pagination (default 20, max 50) (FR-41, FR-42)
- `search` — search by title (FR-49)
- `priority` — filter by normal/important/urgent (FR-50)
- `startDate`, `endDate` — filter by date range (FR-51)

**Business Logic:**
- Authorization check: Use a `canPostInChannel(userId, channelId)` service that resolves the permission matrix from Section 5.1 of functional requirements
- Cannot post in locked channels
- Post display: author info with role badge (FR-37), sorted by date with pinned first (FR-38)
- Edit window: 24 hours from creation, sets `updated_at` and shows "Edited" (FR-39)
- Soft delete: `is_deleted=true`, preservable (FR-40)
- Attachments: max 3 images, max 5MB each → upload to Cloudinary → store URLs in `POST_ATTACHMENT`
- After creating a post → emit Socket.IO event to channel members (triggers notification in Module 10)

**Test Scope:**
```
✓ POST /channels/:id/posts — authorized user → 201
✓ POST /channels/:id/posts — regular student in announcement channel → 403
✓ POST /channels/:id/posts — teacher in assigned course channel → 201 (FR-36)
✓ POST /channels/:id/posts — teacher in non-assigned course channel → 403
✓ POST /channels/:id/posts — in locked channel → 403
✓ POST /channels/:id/posts — with attachments → uploaded to Cloudinary
✓ POST /channels/:id/posts — >3 attachments → 400
✓ POST /channels/:id/posts — >5MB file → 400
✓ GET /channels/:id/posts — paginated, pinned first
✓ GET /channels/:id/posts?search=exam — filters by title
✓ GET /channels/:id/posts?priority=urgent — filters by priority
✓ GET /channels/:id/posts?startDate=X&endDate=Y — date range filter
✓ PATCH /posts/:id — author edits within 24h → 200 + "edited" flag
✓ PATCH /posts/:id — author edits after 24h → 403
✓ PATCH /posts/:id — non-author → 403
✓ DELETE /posts/:id — author deletes → soft delete
✓ DELETE /posts/:id — admin deletes → soft delete
✓ Role badge displayed in post author info
```

---

### Module 10: Notifications

**Functional Requirements:** FR-43, FR-44, FR-45, FR-46, FR-47, FR-48

**Endpoints:**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/notifications` | Get user's notifications (paginated) | Authenticated |
| GET | `/api/notifications/unread-count` | Get unread count | Authenticated |
| PATCH | `/api/notifications/:id/read` | Mark single as read | Authenticated |
| PATCH | `/api/notifications/read-all` | Mark all as read | Authenticated |
| GET | `/api/notification-preferences` | Get subscription preferences | Authenticated |
| PATCH | `/api/notification-preferences` | Update preferences (subscribe/unsubscribe) | Authenticated |

**Business Logic:**
- When a post is created (from Module 9), create notifications for all subscribed members of that channel (FR-44)
- Users are auto-subscribed to all servers they're members of (FR-47)
- Users can unsubscribe from server or specific channels (FR-48)
- Unread count for notification bell (FR-43)
- Urgent posts have prominent visual indicator flag in notification (FR-46)
- Real-time delivery: Socket.IO emits `new_notification` to online users
- Notification creation happens asynchronously (does not block post creation)

**Socket.IO Events:**
- Server → Client: `notification:new` — real-time push when notification created
- Server → Client: `notification:unread-count` — updated unread count

**Test Scope:**
```
✓ Creating a post generates notifications for subscribed channel members
✓ Creating an urgent post marks notifications with urgent flag
✓ GET /notifications — returns paginated notifications, newest first
✓ GET /notifications/unread-count — returns correct count
✓ PATCH /notifications/:id/read — mark as read → read_at set
✓ PATCH /notifications/read-all — marks all as read
✓ Unsubscribed user does NOT receive notification for that channel
✓ Unsubscribed from server → no notifications for any channel in server
✓ PATCH /notification-preferences — unsubscribe from channel → 200
✓ Auto-subscription on server membership creation
✓ Socket.IO emits notification event (integration test)
```

---

### Module 11: Semester Transition

**Functional Requirements:** FR-70, FR-71, FR-72, FR-73

**Endpoints:**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/classes/:id/semester-progression` | Advance class to next semester | Admin / HOD |
| GET | `/api/programs/:id/curriculum` | Get program curriculum | Authenticated |
| POST | `/api/programs/:id/curriculum` | Add course to curriculum | Admin / HOD |
| DELETE | `/api/programs/:id/curriculum/:id` | Remove from curriculum | Admin / HOD |

**Business Logic:**
- Semester progression:
  1. Validate `current_semester < program.semesters` (can't exceed max)
  2. Archive (lock) all existing course channels → set `is_locked=true` (FR-71)
  3. Clear all TEACHES records for this class (FR-73)
  4. Increment `class.current_semester`
  5. If curriculum exists for new semester → auto-create course channels (FR-72)
  6. If no curriculum → courses must be manually assigned (Module 4)
- Curriculum management: define default courses per semester per program per batch year

**Test Scope:**
```
✓ POST /classes/:id/semester-progression — admin → semester incremented
✓ POST /classes/:id/semester-progression — existing course channels archived (locked)
✓ POST /classes/:id/semester-progression — TEACHES records cleared
✓ POST /classes/:id/semester-progression — curriculum exists → new course channels auto-created
✓ POST /classes/:id/semester-progression — already at max semester → 400
✓ POST /classes/:id/semester-progression — HOD in own dept → 200
✓ POST /classes/:id/semester-progression — HOD in other dept → 403
✓ Archived channels are read-only (cannot create posts)
✓ POST /programs/:id/curriculum — adds course to curriculum
```

---

### Module 12: Admin Dashboard

**Functional Requirements:** FR-74, FR-75, FR-76

**Endpoints:**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/admin/stats` | System statistics | Admin |
| GET | `/api/admin/users` | Full user list with advanced filters | Admin |
| GET | `/api/departments/:id/stats` | Department stats | Admin / HOD |

**Business Logic:**
- System stats: total users (by type), total servers (by type), total posts, active users count (FR-75)
- Admin user list: superset of Module 2's GET /users with additional filters (FR-74)
- HOD department view: students, teachers, classes, societies count in their department (FR-76)

**Test Scope:**
```
✓ GET /admin/stats — returns correct counts
✓ GET /admin/stats — non-admin → 403
✓ GET /admin/users — returns all users, supports filtering
✓ GET /departments/:id/stats — HOD sees own dept stats
✓ GET /departments/:id/stats — HOD sees other dept → 403
```

---

## Module Dependency Graph

```
Module 0 (Foundation)
  │
  ▼
Module 1 (Auth)
  │
  ▼
Module 2 (Users) ──────────────────────────────────┐
  │                                                 │
  ▼                                                 ▼
Module 3 (Department & Program)          Module 7 (Role Mgmt)
  │                                                 │
  ├──────────────┐                                  │
  ▼              ▼                                  │
Module 4       Module 5                             │
(Class)        (Course)                             │
  │                                                 │
  ▼                                                 │
Module 6 (Society) ◄───────────────────────────────┘
  │
  ▼
Module 8 (Server & Channel)
  │
  ▼
Module 9 (Posts)
  │
  ▼
Module 10 (Notifications + Socket.IO)
  │
  ▼
Module 11 (Semester Transition)
  │
  ▼
Module 12 (Admin Dashboard)
```

---

## Testing Strategy

### Setup
- **Test Database:** Separate PostgreSQL database (e.g., `uniconnect_test`)
- **Prisma Migrations:** Applied before test suite runs
- **DB Reset:** Truncate all tables between test suites (not between individual tests for speed)
- **Seeding:** Each test file seeds its own required data using factory helpers

### Factory Helpers (`tests/helpers/factory.ts`)
```typescript
// Example factory functions
createAdmin(): Promise<User>
createTeacher(departmentId: number): Promise<User>
createStudent(classId: number): Promise<User>
createDepartment(): Promise<Department>
createClass(programId: number): Promise<Class>
createServer(type: ServerType): Promise<Server>
createChannel(serverId: number): Promise<Channel>
loginAs(user: User): Promise<{ agent: SuperTest }>  // Returns agent with auth cookies
```

### Test File Structure
```typescript
// Example: tests/modules/post.test.ts
import { app } from '../../src/app';
import request from 'supertest';
import { resetDB, createAdmin, createTeacher, loginAs } from '../helpers';

beforeAll(async () => {
  await resetDB();
});

describe('POST /api/channels/:id/posts', () => {
  it('should allow authorized teacher to post in course channel', async () => {
    const teacher = await createTeacher(deptId);
    const agent = await loginAs(teacher);
    
    const res = await agent
      .post(`/api/channels/${courseChannelId}/posts`)
      .send({ title: 'Class cancelled', content: '...', priority: 'urgent' });
    
    expect(res.status).toBe(201);
    expect(res.body.data.priority).toBe('urgent');
  });

  it('should reject unauthorized student', async () => {
    const student = await createStudent(classId);
    const agent = await loginAs(student);
    
    const res = await agent
      .post(`/api/channels/${announcementChannelId}/posts`)
      .send({ title: 'Test', content: '...' });
    
    expect(res.status).toBe(403);
  });
});
```

### Running Tests
```bash
# Run all tests
npm test

# Run specific module
npm test -- --testPathPattern=auth

# Run with coverage
npm test -- --coverage
```

---

## API Response Format (Standard)

All endpoints follow a consistent JSON response shape:

```json
// Success
{
  "success": true,
  "data": { ... },
  "message": "Resource created successfully"
}

// Success (paginated)
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [ { "field": "email", "message": "Invalid email format" } ]
  }
}
```

---

## Suggested Development Timeline

| Week | Module | Focus |
|------|--------|-------|
| 1 | Module 0 | Project setup, Prisma schema, shared infra, test config |
| 2 | Module 1 | Authentication (login, JWT cookies, refresh, password reset) |
| 3 | Module 2 | User management (CRUD, bulk import, profile, deactivation) |
| 4 | Module 3 + 5 | Department, Program, Course CRUD |
| 5 | Module 4 | Class management with course assignment |
| 6 | Module 6 | Society management + join request flow |
| 7 | Module 7 | Role assignment/revocation with all permission rules |
| 8 | Module 8 | Server & Channel management (listing, creation, lock/delete) |
| 9 | Module 9 | Posts (CRUD, auth checks, attachments, search/filter) |
| 10 | Module 10 | Notifications + Socket.IO real-time delivery |
| 11 | Module 11 + 12 | Semester transition + Admin dashboard |
| 12 | — | Integration testing, bug fixes, polish |

---
