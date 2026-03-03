# UniConnect — Hardening Implementation Log

**Started:** March 3, 2026  
**Plan reference:** [HARDENING_PLAN.md](./HARDENING_PLAN.md)  
**Test baseline:** 446/446 passing (17 suites) as of February 28, 2026
**Current:** 447/447 passing (17 suites) as of March 3, 2026 — Phase 2 (Security) complete

This is an append-only log. Each entry records what was implemented, any decisions made that deviated from or extended the plan, and the test result after the change.

---

## Log Format

```
### Step N — <Title>
**Date:** YYYY-MM-DD  
**Status:** ✅ Complete | ⚠️ Partial | ❌ Reverted  
**Tests after:** NNN/446 passing

#### What was done
- bullet points of actual changes made

#### Deviations from plan
- Any differences from HARDENING_PLAN.md, and why

#### Key decisions
- Decisions made during implementation that aren't obvious from the code

#### Issues encountered
- Anything unexpected; how it was resolved
```

---

## Entries

<!-- New entries go here, oldest at the top -->

### Step 0 — Test Suite Optimization
**Date:** 2026-03-03
**Status:** ✅ Complete
**Tests after:** 446/446 passing

#### What was done
- Lowered bcrypt cost factor from 10 to 1 in test factory (`createAdmin`, `createUser`) — production code untouched
- Refactored `seedRolesAndPermissions` from sequential upserts (~72 queries) to batch `createMany` with `skipDuplicates` (3 queries total)

#### Deviations from plan
- Skipped `admin.test.ts` `beforeEach → beforeAll` conversion — tests check exact aggregate counts (`users.total === 3`) which require a clean DB per test. The `beforeEach(resetDB)` pattern is necessary there.

#### Key decisions
- bcrypt cost 1 is safe: bcrypt embeds cost factor in the hash prefix, so `bcrypt.compare` auto-detects it regardless of original cost
- Test baseline improved from **163.8s → 67.9s (58.6% reduction)** from bcrypt alone

#### Issues encountered
- None

---

### Step 1 — Add missing database indexes
**Date:** 2026-03-03
**Status:** ✅ Complete
**Tests after:** 446/446 passing

#### What was done
- Added 9 `@@index` directives across 7 models in `prisma/schema.prisma`:
  - `Notification`: `(userId, readAt)`, `(postId)`
  - `Post`: `(channelId, isDeleted, isPinned, createdAt DESC)`, `(authorId)`
  - `PostAttachment`: `(postId)`
  - `RefreshToken`: `(userId)`
  - `ServerMembership`: `(serverId)`
  - `ModeratorAssignment`: `(serverId)`
  - `Channel`: `(serverId, isDeleted, isArchived)`
- Generated single migration `20260303152510_add_performance_indexes`
- Deployed to both dev and test databases

#### Deviations from plan
- None

#### Key decisions
- Single migration for all indexes (cleaner history)

#### Issues encountered
- None

---

### Step 2 — Fix notification fan-out N+1
**Date:** 2026-03-03
**Status:** ✅ Complete
**Tests after:** 446/446 passing

#### What was done
- Replaced per-user `emitUnreadCount` loop (N separate `COUNT(*)` queries) with single `prisma.notification.groupBy` query
- Parallelized the groupBy + findMany into a single `Promise.all` call
- Emit `notification:unread-count` using pre-computed `Map<userId, count>` — zero per-user DB queries in fan-out
- Kept `emitUnreadCount` function intact for other callers (`markAsRead`, `markAllAsRead`)

#### Deviations from plan
- Parallelized the groupBy and findMany into `Promise.all` (plan had them sequential)

#### Key decisions
- `emitUnreadCount` helper remains for non-fan-out paths where single-user count is appropriate

#### Issues encountered
- None

---

### Step 3 — Cache getUserRoles per-request
**Date:** 2026-03-03
**Status:** ✅ Complete
**Tests after:** 446/446 passing

#### What was done
- Added optional `preloadedRoles?: UserRole[]` parameter to `canPostInChannel` in `channel.service.ts`
- Extended `CallerInfo` type in `post.service.ts` to include `userRoles?: UserRole[]`
- Updated `handleCreatePost` in `post.controller.ts` to pass `req.userRoles` to service
- Inside `canPostInChannel`: `const roles = preloadedRoles ?? await getUserRoles(userId)` — falls back gracefully

#### Deviations from plan
- None

#### Key decisions
- Parameter passing over request-level cache keeps service layer HTTP-unaware (consistent with project conventions)
- `handleCreatePost` route goes through `authenticate` but NOT `authorize`, so `req.userRoles` is `undefined` on that path — the fallback handles it. Optimization kicks in on routes that use `authorize` middleware.

#### Issues encountered
- None

---

### Step 4 — Parallelize attachment uploads
**Date:** 2026-03-03
**Status:** ✅ Complete
**Tests after:** 446/446 passing

#### What was done
- Replaced sequential `for...of` loop in `uploadAttachments` with `Promise.all` for parallel Cloudinary uploads
- Replaced individual `prisma.postAttachment.create` calls with single `prisma.postAttachment.createMany`

#### Deviations from plan
- Did not remove the post re-fetch after `uploadAttachments` in `createPost` — the re-fetch includes full `postDetailSelect` with author/attachment joins, and removing it would require restructuring the return type. Low-impact given the post is fetched by PK (instant with index).

#### Key decisions
- `createMany` doesn't return created records in Prisma, so the existing re-fetch pattern is still needed for the API response

#### Issues encountered
- None

---

### Step 5 — Optimize canPostInChannel query waterfall
**Date:** 2026-03-03
**Status:** ✅ Complete
**Tests after:** 446/446 passing

#### What was done
- Combined channel + server + membership fetch into single query using nested `include`
- Server query now includes `memberships: { where: { userId }, take: 1 }` — eliminates standalone `serverMembership.findUnique`
- Server query now includes `class: { select: { id: true } }` — eliminates standalone class fetch for COURSE channel checks
- Reduced from 3 sequential queries (channel → membership → class) to 1

#### Deviations from plan
- Plan suggested also including `department`, `society` relations in the combined query for HOD/president checks. Skipped because those checks use `getUserRoles` which already resolves role-to-server mappings. Including them would be redundant data.

#### Key decisions
- Only included `class` relation (needed for COURSE channel `teaches` lookup) and `memberships` (needed for membership check). Other server details not needed since role-based checks use the roles array, not server entity data.

#### Issues encountered
- None

---

### Step 6 — Eliminate double-fetch in channel mutations
**Date:** 2026-03-03
**Status:** ⏭️ Skipped
**Tests after:** N/A

#### Reason
- MEDIUM severity with tight coupling between middleware and service (stashing on `req` via `(req as any).resolvedChannel`)
- Deferred to a future pass

---

### Step 7 — Merge sequential validation queries in society service
**Date:** 2026-03-03
**Status:** ✅ Complete
**Tests after:** 446/446 passing

#### What was done
- Merged 2-query `assertStudentForSocietyOrThrow` into single `prisma.user.findFirst` with `include: { studentInfo: true }`
- Merged 2-query `assertTeacherForSocietyOrThrow` into single `prisma.user.findFirst` with `include: { teacherInfo: true }`
- Parallelized `createSociety` leadership validation: `Promise.all([assertStudent..., assertTeacher...])`

#### Deviations from plan
- Also parallelized the two assertions in `createSociety` (plan only mentioned merging queries within each assertion)

#### Key decisions
- Did not parallelize assertions in `updateSociety` — they're conditional and inside a transaction, so parallelizing would complicate control flow for minimal gain

#### Issues encountered
- None

---

### Step 8 — Add short-TTL cache for getSystemStats
**Date:** 2026-03-03
**Status:** ✅ Complete
**Tests after:** 446/446 passing

#### What was done
- Added `StatsCache` interface and `statsCache` module-level variable with 60-second TTL
- Wrapped `getSystemStats` with TTL check — returns cached data if within window
- Exported `clearStatsCache()` for test isolation
- Added `clearStatsCache()` call in `admin.test.ts` `beforeEach` to prevent stale cache across tests

#### Deviations from plan
- None

#### Key decisions
- 60-second TTL sufficient for university scale; document Redis upgrade path for multi-instance deployment
- `clearStatsCache()` follows same pattern as existing `clearRolePermissionCache()` in `authorize.ts`

#### Issues encountered
- None

---

## Phase 2 — Security

### Step 9 — Add rate limiting
**Date:** 2026-03-03
**Status:** ✅ Complete
**Tests after:** 446/446 passing

#### What was done
- Installed `express-rate-limit` dependency
- Created `src/middleware/rateLimiter.ts` with three tiers:
  - `authLimiter`: 5 requests / 15 min — applied directly in `auth.routes.ts` on POST `/login`, `/forgot-password`, `/reset-password`
  - `generalLimiter`: 100 requests / 1 min — applied globally via `app.use("/api", generalLimiter)` in `app.ts`
  - `uploadLimiter`: 10 requests / 1 min — applied on 4 upload routes:
    - `PATCH /me/profile-picture` in `user.routes.ts`
    - `POST /bulk-import` in `user.routes.ts`
    - `POST /:id/posts` (channel post creation) in `post.routes.ts`
    - `POST /:id/attachments` in `post.routes.ts`
- `generalLimiter` is placed after the `/api/health` route in `app.ts` — the health check endpoint is intentionally excluded from rate limiting
- All limiters skip enforcement when `NODE_ENV === "test"` to avoid flaky tests
- Error response follows project's `ApiResponse` contract: `{ success: false, error: { code: "RATE_LIMIT_EXCEEDED", message } }`

#### Deviations from plan
- `uploadLimiter` applied to channel post creation route (`POST /:id/posts`) in addition to the three routes listed in the plan — post creation can include file attachments so the same limit applies

#### Key decisions
- Rate limiters use `standardHeaders: "draft-8"` for modern `RateLimit-*` headers
- Skipping in test avoids coupling test execution order to rate limit state
- Health check excluded from `generalLimiter` so uptime monitors are never throttled; morgan still logs it

#### Issues encountered
- None

---

### Step 10 — Validate file uploads using magic bytes
**Date:** 2026-03-03
**Status:** ✅ Complete
**Tests after:** 446/446 passing

#### What was done
- Installed `file-type` (ESM-only package) for magic bytes detection
- Added `validateImageMagicBytes` middleware to `upload.ts`:
  - Handles both `req.file` (single upload) and `req.files` (multi-upload) via `files ?? (file ? [file] : [])`
  - Throws `ValidationError("File content does not match an allowed image type")` for rejected files
  - Checks against `ALLOWED_IMAGE_TYPES`: `["image/jpeg", "image/png", "image/gif", "image/webp"]`
- Added `validateCSVNotBinary` middleware:
  - Throws `ValidationError("File appears to be a binary format, not a valid CSV")` when `fileTypeFromBuffer` detects any known binary format
  - No-ops when `req.file` is absent (upload already handled by multer's `fileFilter`)
- Applied `validateImageMagicBytes` after multer on 3 image upload routes:
  - `PATCH /me/profile-picture`
  - `POST /:id/posts` (channel post creation)
  - `POST /:id/attachments`
- Applied `validateCSVNotBinary` after multer on `POST /bulk-import`
- Created `tests/helpers/fixtures.ts` with minimal valid JPEG (340 bytes) and PNG (67 bytes) buffers — 1×1 pixel, raw byte arrays
- Updated `post.test.ts` and `user.test.ts` to use `VALID_JPEG_BUFFER` / `VALID_PNG_BUFFER` from fixtures instead of `Buffer.from("fake-image")`

#### Deviations from plan
- Added CSV validation in addition to image validation (plan only mentioned images)
- Middleware uses `throw new ValidationError(...)` instead of `return next(new ValidationError(...))` — both work identically with Express async error handling via the project's `wrapAsync` pattern

#### Key decisions
- `file-type` is ESM-only — compatible with project's `"type": "module"` configuration
- Minimal fixture buffers (67–340 bytes) avoid bloating the test suite
- CSV detection works by exclusion: if `fileTypeFromBuffer` detects any format, the file is binary → rejected
- Error messages deliberately omit format details to avoid giving attackers hints about bypassing checks

#### Issues encountered
- None

---

### Step 11 — Enforce JWT secret minimum length
**Date:** 2026-03-03
**Status:** ✅ Complete
**Tests after:** 446/446 passing

#### What was done
- Updated `env.ts` Zod schema: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `RESET_PASSWORD_SECRET` now require `.min(32)`
- Added regex validation `/^\d+[smhd]$/` on all three expiry fields: `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`, and `RESET_PASSWORD_EXPIRY`
- Updated `.env.test` secrets to be ≥32 characters (dev `.env` secrets were already compliant at 38–40 chars)

#### Deviations from plan
- Added expiry format validation on all three expiry fields (plan only mentioned secret length; log initially recorded only two expiry fields validated, but `RESET_PASSWORD_EXPIRY` was also validated in the same pass)

#### Key decisions
- 32-character minimum is a common industry standard for HMAC-SHA256 secrets
- `.env.test` secrets use descriptive placeholder values like `test-access-secret-placeholder-min-32`
- All expiry fields share the same regex — consistent format enforcement across all token types

#### Issues encountered
- None

---

### Step 12 — Invalidate reset password tokens after use
**Date:** 2026-03-03
**Status:** ✅ Complete
**Tests after:** 447/447 passing (+1 new test)

#### What was done
- Added `passwordResetTokenHash` field to `User` model in Prisma schema (`String? @db.VarChar(255)`)
- Generated and applied migration `20260303163235_add_password_reset_token_hash` to dev and test databases
- Updated `forgotPassword` in `auth.service.ts`: stores SHA-256 hash of the reset token in `passwordResetTokenHash`
- Updated `resetPassword` in `auth.service.ts`: verifies incoming token hash matches stored hash, clears hash on success
- Added test: "should return 401 when using the same reset token twice"
- Updated existing reset-password test to pre-store token hash (since `forgotPassword` sends email, test bypasses it)

#### Deviations from plan
- None

#### Key decisions
- SHA-256 hash stored instead of raw token — if DB is compromised, tokens are not recoverable
- One-time use: hash is cleared (`null`) after successful reset, so replaying the same token returns 401
- JWT expiry still applies as a secondary guard
- Used the existing `hashToken` helper in `auth.service.ts` (already used for refresh tokens) rather than inlining `crypto.createHash` calls

#### Issues encountered
- Initial test update missed storing the token hash in the DB before calling reset-password — test got 401. Fixed by adding `crypto.createHash("sha256").update(token).digest("hex")` and updating the user record in the test setup.
- Existing success test was also updated to assert `passwordResetTokenHash` is `null` after a successful reset (`expect(updated!.passwordResetTokenHash).toBeNull()`).

---

### Step 13 — Plug error information leakage
**Date:** 2026-03-03
**Status:** ✅ Complete
**Tests after:** 446/446 passing

#### What was done
- Updated `errorHandler.ts` Prisma `P2002` handler: replaced `target.join(", ")` (leaked column names) with generic `"A record with these values already exists"`
- Updated fallback 500 handler: always returns `"An unexpected error occurred"` as the user-facing `message`; raw `err.message` moved to a `debug` field present only in non-production environments
- Updated `errorHandler.test.ts` to match new behaviour:
  - P2002 test: changed `expect(...message).toContain("email")` → `expect(...message).toBe("A record with these values already exists")`
  - 500 test: added `expect(res.body.error.message).toBe("An unexpected error occurred")` and `expect(res.body.error.debug).toBe("Something broke")` to explicitly assert the debug field

#### Deviations from plan
- None

#### Key decisions
- `debug` field pattern: `...(env.NODE_ENV !== "production" && { debug: err.message })` — spread conditional keeps response clean in prod
- P2002 generic message prevents attackers from enumerating which fields have unique constraints
- Test environment is not `"production"`, so the `debug` field is present in test responses — test suite validates both the safe message and the debug field

#### Issues encountered
- None

---

### Step 14 — Harden resolveId against parameter injection
**Date:** 2026-03-03
**Status:** ✅ Complete
**Tests after:** 446/446 passing

#### What was done
- Updated `resolveId` in `authorize.ts`: when resolver is a string, only reads from `req.params` (removed `req.body` and `req.query` fallthrough)
- Audited all `serverIdFrom` usages — only 1 string-based resolver exists (`"id"` in `server.routes.ts`), always supplied via URL params

#### Deviations from plan
- None

#### Key decisions
- 1-line change (removed `?? req.body[resolver] ?? req.query[resolver]`) — minimal blast radius
- Function-based resolvers (the majority) are unaffected as they already extract from specific sources

#### Issues encountered
- None

---

### Step 15 — Add Socket.IO connection rate limiting & token expiry
**Date:** 2026-03-03
**Status:** ✅ Complete
**Tests after:** 447/447 passing

#### What was done
- Added connection rate limiting in `socket/index.ts`: module-level `Map<IP, {count, resetAt}>` with 10 connections/min per IP
  - Rate limiting middleware registered before auth middleware in the `io.use()` chain
  - Skipped entirely when `NODE_ENV === "test"`
- Added `exp` field to `AccessTokenPayload` interface and stored on `socket.data.tokenExp` during auth middleware
- Added token expiry auto-disconnect in the connection handler: `setTimeout` computes `msUntilExpiry = payload.exp * 1000 - Date.now()`, emits `auth:expired`, then calls `socket.disconnect(true)`; timer is cleared on disconnect
- Added periodic cleanup `setInterval` (60s) to prune stale rate-limit map entries and prevent memory growth; interval carries `.unref()` so it doesn't keep the process alive
- The `cleanupInterval` module-level variable is cleared and reset at the top of `initializeSocket` (handles re-initialization in tests) and also cleared in `resetIO()`
- `resetIO()` updated to also clear the `cleanupInterval` and call `connectionCounts.clear()` directly
- Exported `resetConnectionCounts()` as a standalone test helper that clears the map; `resetIO()` achieves the same effect but resets the entire socket server too

#### Deviations from plan
- None

#### Key decisions
- In-memory rate limiting (no Redis) — appropriate for single-instance deployment; documented upgrade path
- `setTimeout` for token expiry uses `Math.max(msUntilExpiry, 0)` to handle already-expired tokens at connection time
- `auth:expired` event emitted before disconnect so clients can handle gracefully (e.g. redirect to login)
- Cleanup interval uses `.unref()` — important for test teardown so Jest can exit cleanly without hanging on the open interval

#### Issues encountered
- Extra closing brace left over from code replacement caused `TS1128` compile error — fixed by removing the duplicate brace

---

### Step 16 — Add request audit logging
**Date:** 2026-03-03
**Status:** ✅ Complete
**Tests after:** 446/446 passing

#### What was done
- Installed `morgan` and `@types/morgan` dependencies
- Added morgan middleware to `app.ts` before the health check route:
  - `morgan("combined")` in production (Apache-style log format)
  - `morgan("dev")` in development/staging (colorized, compact)
  - Disabled entirely when `NODE_ENV === "test"` to keep test output clean
- Added structured audit logs in `auth.service.ts`:
  - `console.warn("[AUTH] Failed login attempt", { email, reason: "invalid_credentials", timestamp })` — fires from **both** the user-not-found branch and the password-mismatch branch using the same log message and reason string
  - `console.info("[AUTH] Session revoked", { reason: "logout", timestamp })` — on logout
  - `console.info("[AUTH] Password reset completed", { userId, timestamp })` — on successful reset
  - `console.info("[AUTH] Password changed", { userId, timestamp })` — on successful change-password

#### Deviations from plan
- None

#### Key decisions
- Failed login log uses the identical message and `reason: "invalid_credentials"` from both branches — prevents log-based user enumeration (distinguishing "email not found" from "wrong password" in logs leaks account existence)
- Morgan placed before health check — health check requests are logged, but they are not rate-limited (by design; see Step 9)
- `console.warn` for failure events, `console.info` for successful security events — consistent severity mapping across auth module

#### Issues encountered
- Initial replacement corrupted a section comment header (`// ─── Change Password`). Fixed with targeted replacement.
