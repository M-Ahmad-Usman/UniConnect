# UniConnect — Performance & Security Hardening Plan

**Created:** March 1, 2026  
**Reviewer:** GitHub Copilot (Senior Code Review)  
**Scope:** All 13 modules (0–12), full backend codebase  
**Test Baseline:** 446/446 tests passing across 17 suites

---

## Overview

The codebase follows solid architectural patterns (layered architecture, domain errors, parse-don't-validate, token rotation, hash-before-store). However, a detailed review identified ~30 issues across two categories:

- **Performance:** Zero database indexes beyond PK/unique keys, N+1 notification fan-out (1 COUNT query per recipient), 6-query role resolution on every authenticated request, sequential file uploads, and redundant double-fetch patterns.
- **Security:** No rate limiting on any endpoint, file upload validation trusts client-declared MIME types, JWT secrets accept min-1-char values, password reset tokens are not invalidated after use, Prisma errors leak DB column names, and `resolveId` has a parameter injection path.

**Priority order:** Performance first (immediately noticeable at ~1000 users), then Security.  
**Scope:** HIGH and MEDIUM severity issues only. LOW items deferred to a future pass.  
**Testing discipline:** Full 446-test suite after every step. No batching.

---

## Progress Tracker

| Step | Phase | Title | Status |
|------|-------|-------|--------|
| 1 | Perf | Add missing database indexes | ✅ Complete |
| 2 | Perf | Fix notification fan-out N+1 | ✅ Complete |
| 3 | Perf | Cache `getUserRoles` per-request | ✅ Complete |
| 4 | Perf | Parallelize attachment uploads | ✅ Complete |
| 5 | Perf | Optimize `canPostInChannel` query waterfall | ✅ Complete |
| 6 | Perf | Eliminate double-fetch in channel mutations | ⏭️ Deferred |
| 7 | Perf | Merge sequential validation queries in society service | ✅ Complete |
| 8 | Perf | Add short-TTL cache for `getSystemStats` | ✅ Complete |
| 9 | Sec  | Add rate limiting | ✅ Complete |
| 10 | Sec  | Validate file uploads using magic bytes | ✅ Complete |
| 11 | Sec  | Enforce JWT secret minimum length | ✅ Complete |
| 12 | Sec  | Invalidate reset password tokens after use | ✅ Complete |
| 13 | Sec  | Plug error information leakage | ✅ Complete |
| 14 | Sec  | Harden `resolveId` against parameter injection | ✅ Complete |
| 15 | Sec  | Add Socket.IO connection rate limiting & token expiry | ✅ Complete |
| 16 | Sec  | Add request audit logging | ✅ Complete |

**Status legend:** ⬜ Not started · 🔄 In progress · ✅ Complete · ⚠️ Blocked

---

## Phase 1 — Performance

---

### Step 1 — Add missing database indexes

**File:** `prisma/schema.prisma`  
**Severity:** HIGH  
**Impact:** Every query filtering by a non-PK/non-unique column does a full table scan. The `notifications`, `posts`, `post_attachments`, `refresh_tokens`, `server_memberships`, and `moderator_assignments` tables have no indexes beyond what `@unique`/`@@unique` implicitly creates.

**Root cause:** The schema contains zero `@@index` directives. Prisma only creates B-tree indexes for `@id`, `@unique`, and `@@unique` columns automatically. Everything else is unindexed.

**Queries that will benefit:**

| Table | Missing Index | Used By |
|---|---|---|
| `notifications` | `(userId, readAt)` | `listNotifications`, `getUnreadCount`, `markAllAsRead` |
| `notifications` | `postId` | Re-fetch after `createMany` in `createPostNotifications` |
| `posts` | `(channelId, isDeleted, isPinned, createdAt)` | `listPosts` hot path — pinned-first, date-sorted |
| `posts` | `authorId` | Author-scoped post queries |
| `post_attachments` | `postId` | Every post detail fetch joins attachments |
| `refresh_tokens` | `userId` | `updateMany({ where: { userId } })` on password reset/change |
| `server_memberships` | `serverId` | PK is `(userId, serverId)` — userId leads, so serverId-only filters can't use it efficiently. Affects member listing and notification fan-out |
| `moderator_assignments` | `serverId` | Badge resolution in `resolveMemberBadges` and `resolveAuthorBadges` |
| `channels` | `(serverId, isDeleted, isArchived)` | `listServerChannels` filters on all three |

**Changes:**

Add the following `@@index` blocks to each model in `schema.prisma`:

```prisma
// Notification model
@@index([userId, readAt])
@@index([postId])

// Post model
@@index([channelId, isDeleted, isPinned, createdAt(sort: Desc)])
@@index([authorId])

// PostAttachment model
@@index([postId])

// RefreshToken model
@@index([userId])

// ServerMembership model
@@index([serverId])

// ModeratorAssignment model
@@index([serverId])

// Channel model
@@index([serverId, isDeleted, isArchived])
```

**Migration steps:**
1. Add `@@index` directives to `prisma/schema.prisma`
2. `npx prisma migrate dev --name add_performance_indexes`
3. `npx dotenv -e .env.test -- npx prisma migrate deploy`
4. Run full test suite: `npm test`

**Verification:** Run `\d notifications` (or equivalent) in `psql` to confirm indexes were created.

---

### Step 2 — Fix notification fan-out N+1

**File:** `src/modules/notification/notification.service.ts`  
**Severity:** CRITICAL  
**Impact:** For a 500-member department server, posting one message fires 500 concurrent `COUNT(*)` queries (one per recipient). This is the single worst performance bottleneck in the codebase.

**Root cause:** `createPostNotifications` (lines ~185–222):
1. Calls `prisma.notification.createMany(...)` to bulk-insert N notifications
2. Re-fetches all N notifications with `findMany` (redundant — data already known)
3. Iterates over N notifications and calls `emitUnreadCount(userId)` for each, which runs a separate `COUNT(*)` per call

**Fix:**

```
// Before (N+1 fan-out):
await prisma.notification.createMany({ data: subscribedIds.map(...) });
const notifications = await prisma.notification.findMany({ where: { postId, userId: { in: subscribedIds } } });
await Promise.all(
  notifications.map(async (n) => {
    emitToUser(n.userId, "notification:new", ...);
    await emitUnreadCount(n.userId);  // ← 1 COUNT query per user
  })
);

// After (single groupBy for all counts):
await prisma.notification.createMany({ data: subscribedIds.map(...) });

// Compute unread counts for all recipients in a single query
const unreadCounts = await prisma.notification.groupBy({
  by: ["userId"],
  where: { userId: { in: subscribedIds }, readAt: null },
  _count: { _all: true },
});
const unreadCountMap = new Map(unreadCounts.map((r) => [r.userId, r._count._all]));

// Fetch created notifications once (postId is now indexed from Step 1)
const notifications = await prisma.notification.findMany({
  where: { postId, userId: { in: subscribedIds } },
  select: { ...notificationListSelect, userId: true },
});

// Emit using pre-computed counts — no per-user DB queries
for (const notification of notifications) {
  emitToUser(notification.userId, "notification:new", { ... });
  emitToUser(notification.userId, "notification:unread-count", {
    count: unreadCountMap.get(notification.userId) ?? 0,
  });
}
```

**Steps:**
1. Update `createPostNotifications` in `notification.service.ts`
2. `emitUnreadCount` can remain for other callers (mark-as-read, mark-all-read) but should NOT be called in the fan-out loop
3. Run full test suite: `npm test`

---

### Step 3 — Cache `getUserRoles` per-request

**Files:** `src/middleware/authorize.ts`, `src/modules/channel/channel.service.ts`  
**Severity:** CRITICAL  
**Impact:** `getUserRoles` fires 6 parallel DB queries. It runs in the `authorize` middleware on nearly every authenticated request, and then a second time inside `canPostInChannel` for every post creation — resulting in 12 DB queries per post write just for role resolution.

**Root cause:** `req.userRoles` is populated by `authorize` middleware and checked before calling `getUserRoles` — but `canPostInChannel` calls `getUserRoles(userId)` directly without checking `req.userRoles`. The cache exists but isn't used across the full call stack.

**Fix:**

Change `canPostInChannel` signature to accept an optional `preloadedRoles` parameter:

```typescript
// Before:
export async function canPostInChannel(
  userId: number,
  userType: string,
  channelId: number
): Promise<boolean>

// After:
export async function canPostInChannel(
  userId: number,
  userType: string,
  channelId: number,
  preloadedRoles?: UserRole[]
): Promise<boolean>

// Inside the function, replace:
const userRoles = await getUserRoles(userId);
// With:
const userRoles = preloadedRoles ?? await getUserRoles(userId);
```

In the post controller (`post.controller.ts`), pass `req.userRoles` to the service:

```typescript
// The controller passes roles if already resolved by authorize middleware
await postService.createPost({ ..., channelId, preloadedRoles: req.userRoles });
```

In turn, `createPost` in `post.service.ts` passes `preloadedRoles` down to `canPostInChannel`.

**Steps:**
1. Update `canPostInChannel` signature in `channel.service.ts`
2. Update `createPost` in `post.service.ts` to accept and pass `preloadedRoles`
3. Update `post.controller.ts` to pass `req.userRoles`
4. Run full test suite: `npm test`

---

### Step 4 — Parallelize attachment uploads

**File:** `src/modules/post/post.service.ts`  
**Severity:** HIGH  
**Impact:** With 3 attachments, post creation takes 3 sequential Cloudinary uploads + 3 sequential DB inserts (6 serial I/O operations). Parallelizing reduces this to 1 parallel Cloudinary round-trip + 1 DB `createMany`.

**Root cause:** `uploadAttachments` uses a `for...of` loop with `await` inside, making each upload and DB insert sequential. The re-fetch of the full post after attachment creation is also unnecessary.

**Fix:**

```typescript
// Before (sequential):
async function uploadAttachments(postId: number, files: Express.Multer.File[]) {
  for (const file of files) {
    const { url } = await cloudinaryService.uploadImage(file.buffer, "post-attachments");
    await prisma.postAttachment.create({ data: { postId, fileUrl: url, ... } });
  }
}

// After (parallel uploads + batch insert):
async function uploadAttachments(postId: number, files: Express.Multer.File[]) {
  const uploaded = await Promise.all(
    files.map((file) => cloudinaryService.uploadImage(file.buffer, "post-attachments"))
  );
  await prisma.postAttachment.createMany({
    data: uploaded.map(({ url }, i) => ({
      postId,
      fileUrl: url,
      fileType: files[i].mimetype,
      fileSize: files[i].size,
    })),
  });
}
```

Also remove the redundant post re-fetch after `uploadAttachments` in `createPost` — query and attach the data you already have.

**Steps:**
1. Update `uploadAttachments` in `post.service.ts`
2. Remove redundant post re-fetch in `createPost`
3. Run full test suite: `npm test`

---

### Step 5 — Optimize `canPostInChannel` query waterfall

**File:** `src/modules/channel/channel.service.ts`  
**Severity:** HIGH  
**Impact:** `canPostInChannel` runs up to 10 sequential DB queries on the critical path of every post creation. The channel fetch, server/membership checks, and role lookups are all chained sequentially.

**Root cause:** The function fetches the channel first, then server membership, then user roles, then conditionally more lookups — all in a waterfall pattern. With Step 3 eliminating the 6-query `getUserRoles` re-call, this step focuses on reducing the remaining waterfall.

**Fix:**

Combine the first two queries into a single fetch with `include`:

```typescript
// Fetch channel + server + user membership in one round-trip
const channel = await prisma.channel.findUnique({
  where: { id: channelId },
  include: {
    server: {
      include: {
        department: { select: { hodId: true } },
        class: { select: { id: true, programId: true, crId: true } },
        society: { select: { presidentId: true, convenorId: true } },
        memberships: {
          where: { userId },
          select: { userId: true },
          take: 1,
        },
      },
    },
  },
});
```

Derive membership and server context from the single query result, removing the separate `serverMembership.findUnique` call.

For CLASS server checks, keep the `teaches.findUnique` call but parallelize it alongside any remaining lookups using `Promise.all`.

**Steps:**
1. Refactor `canPostInChannel` to use the combined query
2. Remove the standalone `serverMembership.findUnique` call
3. Run full test suite: `npm test`

---

### Step 6 — Eliminate double-fetch in channel mutations

**Files:** `src/modules/channel/channel.service.ts`, `src/modules/channel/channel.routes.ts`  
**Severity:** MEDIUM  
**Impact:** Each of the 4 channel mutation operations (update, lock, unlock, delete) fetches the channel twice — once in `findActiveChannelOrThrow` for validation, and once implicitly when `channel.update` hits the DB. Additionally, `resolveServerIdFromChannel` in the `authorize` middleware fetches the same channel a third time.

**Root cause:** The `resolveServerIdFromChannel` function fetches the channel to resolve `serverId` for permission checks, but the result is discarded. `findActiveChannelOrThrow` then re-fetches before mutating.

**Fix:**

Stash the resolved channel on `req` within the `resolveServerIdFromChannel` function so the service can reuse it:

```typescript
// In channel.routes.ts — async resolver function:
async function resolveServerIdFromChannel(req: Request): Promise<number> {
  const channel = await prisma.channel.findUnique({
    where: { id: parseInt(req.params.id, 10) },
    select: { id: true, serverId: true, isDeleted: true, isAutoCreated: true, type: true },
  });
  if (!channel || channel.isDeleted) throw new NotFoundError("Channel not found");
  // Stash for downstream service
  (req as any).resolvedChannel = channel;
  return channel.serverId;
}
```

In `channel.service.ts`, accept the pre-resolved channel as an optional parameter, falling back to `findActiveChannelOrThrow` if not available.

Same pattern applies to `resolveServerIdFromPost` in `post.service.ts`.

**Steps:**
1. Update `resolveServerIdFromChannel` to stash the channel on `req`
2. Update channel service mutations to accept optional pre-resolved channel
3. Apply the same pattern to `resolveServerIdFromPost` and post mutations
4. Run full test suite: `npm test`

---

### Step 7 — Merge sequential validation queries in society service

**File:** `src/modules/society/society.service.ts`  
**Severity:** MEDIUM  
**Impact:** `assertStudentForSocietyOrThrow` and `assertTeacherForSocietyOrThrow` each run 2 queries where 1 would suffice.

**Root cause:**
```typescript
// Current (2 queries):
const studentInfo = await prisma.studentInfo.findUnique({ where: { studentId: userId } });
const student = await prisma.user.findFirst({ where: { id: userId, departmentId, isActive: true } });

// Fixed (1 query with join via include):
const user = await prisma.user.findFirst({
  where: { id: userId, departmentId, isActive: true },
  include: { studentInfo: true },
});
if (!user || !user.studentInfo) throw new ForbiddenError(...);
```

**Steps:**
1. Refactor both assertion helpers to use a single combined query
2. Update all callers to use the returned user object if needed
3. Run full test suite: `npm test`

---

### Step 8 — Add short-TTL cache for `getSystemStats`

**File:** `src/modules/admin/admin.service.ts`  
**Severity:** MEDIUM  
**Impact:** The admin stats endpoint runs 4 full-table aggregate queries (`groupBy` on users, servers, + `count` on posts) on every call. At university scale these are fast, but under any polling or dashboarding, they add up.

**Root cause:** No caching exists. Each request re-runs all aggregations.

**Fix:**

Add a simple in-process TTL cache using a module-level variable:

```typescript
interface StatsCache {
  data: SystemStats;
  cachedAt: number;
}

const STATS_CACHE_TTL_MS = 60_000; // 60 seconds
let statsCache: StatsCache | null = null;

export async function getSystemStats(): Promise<SystemStats> {
  const now = Date.now();
  if (statsCache && now - statsCache.cachedAt < STATS_CACHE_TTL_MS) {
    return statsCache.data;
  }

  // ... run aggregation queries ...

  statsCache = { data: result, cachedAt: now };
  return result;
}
```

> **Note for production:** For a multi-instance deployment, replace this with a shared cache (Redis). For a single server at university scale, 60-second in-memory TTL is sufficient.

**Steps:**
1. Add `StatsCache` interface and `statsCache` module-level variable
2. Wrap `getSystemStats` with the cache check
3. Export a `clearStatsCache()` function for tests (similar to `clearRolePermissionCache()`)
4. Run full test suite: `npm test`

---

## Phase 2 — Security

---

### Step 9 — Add rate limiting

**File:** `src/app.ts` (+ new `src/middleware/rateLimiter.ts`)  
**Severity:** HIGH  
**Impact:** All endpoints — including login, forgot-password, and file uploads — have zero throttling. This enables credential stuffing, inbox flooding, and resource exhaustion.

**Fix:**

Install: `npm install express-rate-limit`

Create `src/middleware/rateLimiter.ts` with three limiters:

```typescript
import rateLimit from "express-rate-limit";

// Used on: POST /api/auth/login, /forgot-password, /reset-password
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many attempts. Try again in 15 minutes." } },
  skip: () => process.env.NODE_ENV === "test",
});

// Used on: all /api/* routes
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Slow down." } },
  skip: () => process.env.NODE_ENV === "test",
});

// Used on: file upload endpoints
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many upload requests." } },
  skip: () => process.env.NODE_ENV === "test",
});
```

Apply in `app.ts`:
- `app.use("/api", generalLimiter)` — applied before all routes
- `authLimiter` on `/api/auth/login`, `/api/auth/forgot-password`, `/api/auth/reset-password` directly in `auth.routes.ts`
- `uploadLimiter` on `POST /api/users/me/profile-picture`, `POST /api/posts/:id/attachments`, `POST /api/users/bulk-import`

> **Upgrade path (documented):** When deploying multiple instances, replace the default in-memory store with `import { RedisStore } from "rate-limit-redis"` and connect to a shared Redis instance. The limiter configuration stays the same; only the store changes.

**Steps:**
1. `npm install express-rate-limit`
2. Create `src/middleware/rateLimiter.ts`
3. Apply limiters in `app.ts` and `auth.routes.ts`
4. Apply `uploadLimiter` to upload routes
5. Run full test suite: `npm test` (limiters skip in test env)

---

### Step 10 — Validate file uploads using magic bytes

**File:** `src/middleware/upload.ts`  
**Severity:** HIGH  
**Impact:** File type validation trusts the `Content-Type` header declared by the client. An attacker can upload an SVG with embedded JavaScript (XSS via CDN), a polyglot file, or any malicious content by spoofing the MIME type to `image/jpeg`.

**Root cause:**
```typescript
fileFilter: (_req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {  // Trusts client header
    cb(null, true);
  }
}
```

**Fix:**

Install: `npm install file-type`

Add a post-upload validation step that inspects the file buffer's magic bytes:

```typescript
import { fileTypeFromBuffer } from "file-type";

// After multer processes the file, validate actual content:
export async function validateImageMagicBytes(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const files = req.files as Express.Multer.File[] | undefined;
  const file = req.file;

  const toValidate = files ?? (file ? [file] : []);

  for (const f of toValidate) {
    const detected = await fileTypeFromBuffer(f.buffer);
    if (!detected || !ALLOWED_IMAGE_TYPES.includes(detected.mime)) {
      return next(new ValidationError("File content does not match declared type"));
    }
  }

  next();
}
```

Chain this after the existing multer middleware on all image upload routes:

```typescript
router.patch("/me/profile-picture",
  authenticate,
  uploadProfilePicture,
  validateImageMagicBytes,  // ← new
  handleUpdateProfilePicture
);
```

For CSV: add a check that the file doesn't detect as a binary format (anything `fileTypeFromBuffer` returns for a true CSV will be `undefined`, since CSV has no magic bytes — only binary formats like XLSX/XLS will register).

**Steps:**
1. `npm install file-type`
2. Add `validateImageMagicBytes` middleware to `upload.ts`
3. Add to all image upload routes in `user.routes.ts` and `post.routes.ts`
4. Add CSV binary-format rejection to `user.routes.ts`
5. Run full test suite: `npm test`

---

### Step 11 — Enforce JWT secret minimum length

**File:** `src/config/env.ts`  
**Severity:** HIGH  
**Impact:** Currently `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `RESET_PASSWORD_SECRET` accept any value ≥ 1 character. A 1-character secret is trivially brute-forceable. For HMAC-SHA256, secrets must be at least 256 bits (32 bytes).

Also: expiry values (`JWT_ACCESS_EXPIRY` etc.) accept any string. A typo like `"7days"` instead of `"7d"` silently falls back to 15 minutes at runtime.

**Fix:**

```typescript
// Before:
JWT_ACCESS_SECRET: z.string().min(1, { error: "JWT_ACCESS_SECRET is required" }),

// After:
JWT_ACCESS_SECRET: z.string().min(32, { error: "JWT_ACCESS_SECRET must be at least 32 characters" }),

// For expiry fields — add format validation:
JWT_ACCESS_EXPIRY: z.string().regex(/^\d+[smhd]$/, {
  error: "JWT_ACCESS_EXPIRY must be in format: <number><s|m|h|d> (e.g. 15m)"
}).default("15m"),
```

Apply to all three secrets and all three expiry fields.

**Note:** Update `.env.test` if your test secrets are shorter than 32 chars (use a long dummy string like `"test-secret-placeholder-min-32-chars-required"`).

**Steps:**
1. Update the 3 secret fields to `.min(32)` in `env.ts`
2. Update the 3 expiry fields with regex validation
3. Update `.env` and `.env.test` to use secrets of sufficient length
4. Run full test suite: `npm test`

---

### Step 12 — Invalidate reset password tokens after use

**File:** `src/modules/auth/auth.service.ts` (+ `prisma/schema.prisma`)  
**Severity:** MEDIUM  
**Impact:** Password reset tokens are stateless JWTs. After a successful reset, the token remains valid until expiry. If the reset email is intercepted, the attacker can use the token to reset the password again — locking out the legitimate user.

**Root cause:** `resetPassword` verifies the JWT signature and expiry, but doesn't mark the token as "used" anywhere.

**Fix:**

Add a `passwordResetTokenHash` column to the `User` model:

```prisma
model User {
  // ... existing fields ...
  passwordResetTokenHash String? @map("password_reset_token_hash") @db.VarChar(255)
}
```

Update `forgotPassword` to store a SHA-256 hash of the reset token:

```typescript
const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
await prisma.user.update({
  where: { id: user.id },
  data: { passwordResetTokenHash: tokenHash },
});
```

Update `resetPassword` to verify and consume the hash:

```typescript
const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
// Verify token AND that it matches the stored hash
if (user.passwordResetTokenHash !== tokenHash) {
  throw new UnauthorizedError("Invalid or expired reset token");
}
// Clear the hash after successful reset (one-time use)
await prisma.user.update({
  where: { id: user.id },
  data: { passwordHash: newHash, passwordResetTokenHash: null },
});
```

**Steps:**
1. Add `passwordResetTokenHash` field to `User` model in `schema.prisma`
2. `npx prisma migrate dev --name add_password_reset_token_hash`
3. `npx dotenv -e .env.test -- npx prisma migrate deploy`
4. Update `forgotPassword` in `auth.service.ts` to store hash
5. Update `resetPassword` to verify and clear hash
6. Update auth tests to cover: second use of same token returns 401
7. Run full test suite: `npm test`

---

### Step 13 — Plug error information leakage

**File:** `src/middleware/errorHandler.ts`  
**Severity:** MEDIUM  
**Impact:** Two leakage vectors:
1. Prisma unique-constraint errors expose DB column names to clients: `"A record with this email already exists"` reveals schema internals
2. Non-production environments return `err.message` verbatim, which can include Prisma query details, file paths, or internal logic

**Fix:**

For unique constraint errors — replace the dynamic field name with a generic message:

```typescript
// Before:
const fields = err.meta?.target?.join(", ") || "unknown";
const conflictError = new ConflictError(`A record with this ${fields} already exists`);

// After:
const conflictError = new ConflictError("A record with these values already exists");
// Note: Services that need specific conflict messages should pre-check and throw
// their own ConflictError with a safe message (already done in most modules).
```

For non-production error messages — move the raw message to a `debug` field:

```typescript
// Before:
message: env.NODE_ENV === "production" ? "An unexpected error occurred" : err.message || "...",

// After:
message: "An unexpected error occurred",
...(env.NODE_ENV !== "production" && { debug: err.message }),
```

**Steps:**
1. Update unique-constraint error message in `errorHandler.ts`
2. Move raw `err.message` to a `debug` field in non-production
3. Verify existing tests still pass (some tests may assert specific error messages)
4. Run full test suite: `npm test`

---

### Step 14 — Harden `resolveId` against parameter injection

**File:** `src/middleware/authorize.ts`  
**Severity:** MEDIUM  
**Impact:** When `resolver` is a string (e.g., `"serverId"`), `resolveId` checks `req.params` first, then falls through to `req.body` and `req.query`. An attacker crafting a request with an extra `serverId` in the body could potentially target a different server's permission scope.

**Root cause:**
```typescript
const rawValue =
  typeof resolver === "function"
    ? await resolver(req)
    : req.params[resolver] ??
      (req.body && typeof req.body === "object" ? req.body[resolver] : undefined) ??  // ← risky
      req.query[resolver];  // ← risky
```

**Fix:**

When `resolver` is a string, read **only** from `req.params`:

```typescript
const rawValue =
  typeof resolver === "function"
    ? await resolver(req)
    : req.params[resolver]; // Params only — body/query IDs must use a function resolver
```

This is safe because all current route definitions pass resource IDs via URL params (e.g., `/:serverId`), and function-based resolvers handle the cases where an ID needs to come from body or query.

**Steps:**
1. Remove the `req.body` and `req.query` fallthrough in `resolveId`
2. Audit all `authorize(...)` usages across all route files to confirm all string-based resolvers reference URL params
3. Run full test suite: `npm test`

---

### Step 15 — Socket.IO connection rate limiting and token expiry

**File:** `src/socket/index.ts`  
**Severity:** MEDIUM  
**Impact:**
1. No connection rate limiting — a flood of unauthenticated socket connections exhausts server resources
2. Once a socket is established, the JWT is never re-validated — a deactivated user retains socket access indefinitely beyond their access token expiry

**Fix:**

**Connection rate limiting** — add IP-based throttle in the auth middleware:

```typescript
const connectionCounts = new Map<string, { count: number; resetAt: number }>();
const MAX_CONNECTIONS_PER_MINUTE = 10;

io.use((socket, next) => {
  const ip = socket.handshake.address;
  const now = Date.now();
  const entry = connectionCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    connectionCounts.set(ip, { count: 1, resetAt: now + 60_000 });
  } else if (entry.count >= MAX_CONNECTIONS_PER_MINUTE) {
    return next(new Error("Too many connections"));
  } else {
    entry.count++;
  }

  // ... existing JWT validation ...
});
```

**Token expiry on connected sockets** — disconnect sockets when the access token expires:

```typescript
io.on("connection", (socket) => {
  const user = socket.data.user as AuthUser;
  socket.join(`user:${user.id}`);

  // Auto-disconnect when access token expires
  const payload = socket.data.tokenPayload as { exp: number };
  const msUntilExpiry = payload.exp * 1000 - Date.now();
  const disconnectTimer = setTimeout(() => {
    socket.emit("auth:expired");
    socket.disconnect(true);
  }, Math.max(msUntilExpiry, 0));

  socket.on("disconnect", () => clearTimeout(disconnectTimer));
});
```

Store `payload.exp` on `socket.data` during the auth middleware step.

**Steps:**
1. Add connection rate limiting map and check in `initializeSocket`
2. Store `exp` on `socket.data` during auth middleware
3. Add `setTimeout` to disconnect on token expiry in connection handler
4. Export `resetConnectionCounts()` for test isolation
5. Run full test suite: `npm test`

---

### Step 16 — Add request audit logging

**File:** `src/app.ts` (+ `src/modules/auth/auth.service.ts`)  
**Severity:** MEDIUM  
**Impact:** No HTTP request logging exists. Security-relevant events (failed logins, permission denials, password resets) have no forensic trail. Any security incident is undetectable after the fact.

**Fix:**

Install: `npm install morgan` / `npm install --save-dev @types/morgan`

Add HTTP request logging in `app.ts`:

```typescript
import morgan from "morgan";

// Use "combined" format in production (Apache log format — good for log aggregators)
// Use "dev" format in development (colorized, compact)
// Disabled in test (keeps test output clean)
if (env.NODE_ENV !== "test") {
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
}
```

Add structured security event logging in `auth.service.ts`:

```typescript
// On failed login attempt:
console.warn("[AUTH] Failed login attempt", { email, timestamp: new Date().toISOString() });

// On successful password reset:
console.info("[AUTH] Password reset completed", { userId: user.id, timestamp: new Date().toISOString() });

// On token revocation (logout/reset/change-password):
console.info("[AUTH] Session revoked", { userId, reason: "logout|reset|password-change" });
```

> **Production upgrade path (documented):** Replace `console.log/warn/error` + `morgan` with a structured logger (Pino or Winston) that writes JSON to stdout. Feed stdout into a log aggregator (ELK, CloudWatch, Datadog). Morgan can be replaced with `morgan` + a custom stream that routes to the structured logger.

**Steps:**
1. `npm install morgan && npm install --save-dev @types/morgan`
2. Add `morgan` middleware to `app.ts`
3. Add security event log calls to `auth.service.ts`
4. Run full test suite: `npm test`

---

## Deferred (LOW severity — future hardening pass)

These items were identified but are out of scope for this plan:

| Item | Reason for deferral |
|---|---|
| bcrypt cost factor 10 → 12 | Breaking change for all password hashes; requires migration script and user re-hash on next login |
| Password history enforcement | Requires new DB table; not a functional requirement |
| HTTP Parameter Pollution (HPP) protection | No current exploitable pattern identified; low attack surface |
| `parseExpiry` duplication (service vs controller) | Maintenance risk, not a security issue; covered by Step 11 regex validation |
| Connection pool limits for PostgreSQL | Default pool is adequate at university scale |
| Double shutdown registration (prisma.ts + server.ts) | Harmless; cleanup only |

---

## Notes

- All changes must maintain compatibility with the existing 446-test suite
- Run `npm test` after every individual step — do not batch
- For schema migrations (Steps 1, 12): run both `prisma migrate dev` + `dotenv -e .env.test -- prisma migrate deploy`
- Rate limiters (Step 9) use `skip: () => NODE_ENV === "test"` to avoid interfering with integration tests
- The `clearRolePermissionCache()` pattern (already in `authorize.ts`) is the template for new cache-clearing test helpers
