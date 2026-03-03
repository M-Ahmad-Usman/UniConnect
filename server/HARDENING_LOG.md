# UniConnect — Hardening Implementation Log

**Started:** March 3, 2026  
**Plan reference:** [HARDENING_PLAN.md](./HARDENING_PLAN.md)  
**Test baseline:** 446/446 passing (17 suites) as of February 28, 2026

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

