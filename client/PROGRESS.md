# UniConnect Frontend - Implementation Progress Tracker

**Project:** UniConnect Frontend
**Start Date:** 2026-03-07
**Status:** Hardening Module 4 Complete
**Current Phase:** Role management hardening verified; ready for Module 5 security hardening

---

## Overview

### 2026-05-21 - Hardening Module 4 Role Management Completed
- ✅ Replaced broad role-management frontend loading with backend-scoped assignable role, scope, channel, user, and revokable-assignment queries.
- ✅ Added clean unavailable state for users without role-management actions.
- ✅ Removed society leadership from generic role assignment UI; society president/convenor changes stay in society workflows.
- ✅ Verified focused role Vitest coverage, type-check, lint, and Playwright role-management flows.

### 2026-05-18 - Hardening Module 2 Academic Workspace Implemented
- ✅ Added canonical `/academics/classes`, class detail, and curriculum routes with admin academic URL redirects.
- ✅ Added permission-aware class UI for student transfer, teacher replacement, semester progression, graduation, and graduated read-only state.
- ✅ Replaced broad teacher/student selection in class workflows with scoped class candidate APIs.
- ✅ Verified `npm run type-check` passes after the Module 2 frontend changes.

This document tracks the implementation progress of the UniConnect frontend, logging all completed tasks, key decisions, challenges encountered, and solutions applied. It serves as a historical record of the project's development journey.

---

## Module Completion Status

| Module | Status | Start Date | Completion Date | Notes |
|--------|--------|------------|-----------------|-------|
| Module 0: Project Foundation | Complete | 2026-03-07 | 2026-03-08 | Verified with type-check, lint, format, production build, and Vite proxy health check |
| Module 1: Authentication | Complete | 2026-03-08 | 2026-03-10 | Verified with format, type-check, lint, production build, and focused Playwright runtime coverage for critical auth flows |
| Module 2: Layout & Navigation | Complete | 2026-03-10 | 2026-03-10 | Hardened after implementation and verified with unit tests, type-check, lint, production build, and focused Playwright runtime coverage |
| Module 3: Server & Channel Views | Complete | 2026-04-24 | 2026-04-24 | Hardened after implementation and verified with unit tests, type-check, lint, production build, and focused Playwright runtime coverage |
| Module 4: Posts & Announcements | Complete | 2026-05-03 | 2026-05-03 | Production-grade feed, post detail, editor, attachments, moderation actions, cache hardening, and focused Playwright coverage |
| Module 5: Notifications | Complete | 2026-05-08 | 2026-05-09 | Full inbox, per-server preferences, type-aware notification preferences, realtime dropdown hardening, and feed freshness fixes |
| Module 6: User Profile & Management | Complete | 2026-05-09 | 2026-05-10 | Profile page, avatar upload, admin user list, create user, bulk import, activation actions, NTU roll-number backend contract, and avatar/header hardening verified |
| Module 7: Admin Dashboard & CRUD | Implemented | 2026-05-10 | 2026-05-10 | Admin dashboard, academic CRUD screens, curriculum, class course assignment, semester progression wizard, and backend contract hardening |
| Module 8: Society Management | Complete | 2026-05-17 | 2026-05-18 | Role-based society workspace, join request workflow, member management, backend contract hardening, and requester notifications |
| Module 9: Role Management | Complete | 2026-05-17 | 2026-05-18 | Role assignment/revocation workspace, scoped role context, role refresh socket event, and permission-aware UI |

---

## Changelog

### 2026-05-18 - Module 1 Permission Policy Foundation Implemented

#### Implemented
- ✅ Added frontend permission capability types and `/api/permissions/me` endpoint client
- ✅ Added `useMyPermissions()` for backend-driven global permission bootstrap data
- ✅ Extended class and society detail types with caller-specific backend permission payloads
- ✅ Added false-by-default class/society permission helpers for safe UI gating
- ✅ Updated `auth:roles-updated` handling to invalidate permissions, class, society, server, and role queries

#### Verification Notes
- ✅ `client`: `timeout 120 npm run test -- src/hooks/__tests__/usePermissions.test.ts src/lib/__tests__/socket.test.ts`
- ✅ `client`: `timeout 120 npm run type-check`

### 2026-05-18 - Module 8 Society Management and Module 9 Role Management Implemented

#### Implemented
- ✅ Added role-based `/societies`, `/societies/:societyId`, and `/roles` workspaces outside the admin dashboard
- ✅ Kept `/admin/societies`, `/admin/societies/:id`, and `/admin/roles` as compatibility redirects
- ✅ Added profile-menu access for society and role management, then removed duplicate Societies/Roles entries from the admin dashboard sidebar
- ✅ Added society list/detail, create/edit, membership summary, join request review, member list, and member candidate flows
- ✅ Added role assignment/revocation UI with contextual scope pickers and enriched current-role display
- ✅ Added `SOCIETY_REQUEST_REVIEWED` notifications for join request approval/rejection
- ✅ Added backend support for membership/candidate lookups, admin-aware society permissions, role-refresh socket events, notification filtering, and schema migration

#### Verification Notes
- ✅ `server`: `timeout 120 npm run build`
- ✅ `server`: `timeout 120 npm run db:migrate:test`
- ✅ `server`: focused society/role/notification integration tests pass with 125 Jest tests
- ✅ `server`: full backend suite passes with 459 Jest tests
- ✅ `client`: `npm run type-check`
- ✅ `client`: `npm run lint`
- ✅ `client`: `npm run test` passes with 92 Vitest tests
- ✅ `client`: `npm run build`

### 2026-05-10 - Module 7 Admin Dashboard and Academic CRUD Implemented

#### Implemented
- ✅ Replaced admin placeholders with real dashboard, department, program, discipline, class, curriculum, and course management routes
- ✅ Added URL-backed filters and pagination for scalable program, class, and course tables
- ✅ Added create/update dialogs for departments, programs, disciplines, classes, courses, and curriculum entries with RHF/Zod validation
- ✅ Added class detail course assignment/removal and semester progression wizard with required next-semester teacher assignments
- ✅ Added backend degree-level lookup, program list/detail endpoints, discipline rename, course search, class department/section filters, and dashboard stats cache invalidation
- ✅ Added focused backend integration coverage for new Module 7 API surfaces

#### Verification Notes
- ✅ `server`: `timeout 120 npm run build`
- ✅ `server`: focused admin/catalog tests pass with 129 Jest tests
- ✅ `client`: `npm run type-check`
- ✅ `client`: `npm run lint`
- ✅ `client`: `npm run test` passes with 90 Vitest tests
- ✅ `client`: `npm run build`

### 2026-05-10 - Module 6 Verification and UI Hardening Completed

#### Fixed
- ✅ Fixed the user dropdown crash by wrapping Base UI menu labels in the required menu group context
- ✅ Fixed long profile and admin-detail bios overflowing their containers by constraining height and enabling internal scrolling/wrapping
- ✅ Synced `/users/me` profile data back into the auth store so the header avatar reflects newly uploaded profile pictures
- ✅ Added a shared preloading user avatar component so profile/header avatars keep stable dimensions while remote images load

#### Verification Notes
- ✅ `server`: Full backend test suite confirmed passing after Module 6 fixes
- ✅ `client`: `npm run type-check`
- ✅ `client`: `npm run lint`

### 2026-05-09 - Module 6 User Profile & Management Implementation

#### Implemented
- ✅ Added a real profile page with editable bio, profile-picture upload preview, role badges, and profile detail display
- ✅ Added admin user list with URL-backed search, user type/department/status filters, pagination, and user detail dialog
- ✅ Added create-user and bulk-import flows with React Hook Form/Zod validation, department/program/class selectors, CSV template download, upload progress, and errors CSV export
- ✅ Kept temporary passwords email-only and removed stale frontend-contract guidance that exposed generated passwords to admins
- ✅ Changed student roll numbers to NTU formatted strings, including Prisma schema, migration, backend validation, seeds, tests, frontend types, and docs
- ✅ Fixed notification lint regressions in NotificationItem and SubscriptionToggle while restoring frontend lint health

#### Verification Notes
- ✅ `server`: Prisma client regenerated after the roll-number schema change
- ✅ `server`: `npm run db:migrate:test` applied `20260509120000_student_roll_number_string` with local DB access
- ✅ `server`: `npm run build`
- ✅ `server`: Full backend test suite confirmed passing after focused Module 6 test fixes
- ✅ `client`: `npm run type-check`
- ✅ `client`: `npm run lint`
- ✅ `client`: `npm run test` passes with 90 Vitest tests
- ✅ `client`: `npm run build`

### 2026-05-08 - Module 5 Notifications Implementation Started

#### Implemented
- ✅ Added the Module 5 notification inbox route, per-server notification preferences route, and server-picker fallback route
- ✅ Added type-aware notification preferences so `NEW_POST` and `ROLE_ASSIGNED` settings can be controlled independently
- ✅ Added role-assignment notification creation for successful role assignments, with server-level mute support
- ✅ Hardened the notification dropdown with mark-all-read, full-inbox navigation, and context-aware settings navigation
- ✅ Added post priority to notification payloads so urgent realtime toasts are driven by structured data
- ✅ Added focused backend tests for role-assignment notifications and type-aware preference filtering

#### Verification Notes
- ✅ `server`: Prisma test DB reset applied all 5 migrations, including `20260508120000_type_aware_notification_preferences`
- ✅ `server`: Prisma client regenerated
- ✅ `server`: `npm run build`
- ✅ `client`: `npm run type-check`
- ✅ Full backend test-suite health was later confirmed during Module 6 verification after the Socket.IO test client path was corrected to `/api/socket.io`

### 2026-05-09 - Module 5 Notification UI Fixes

#### Fixed
- ✅ Fixed notification preference toggles staying in pending/loading UI after a successful mutation by checking the active mutation pending state before showing spinner state
- ✅ Constrained the notification bell dropdown as a flex column so long notification lists scroll inside the panel and cannot cover the footer actions
- ✅ Fixed unsubscribed users seeing stale channel feeds by refetching post feed queries whenever a channel feed mounts; notification preferences now affect notification delivery only, not feed freshness

### 2026-05-08 - Module 4 Documentation and Pre-Module-5 Cleanup

#### Documentation Alignment
- ✅ Updated the Module 4 task ledger to reflect the implemented feed, editor, attachment, moderation, realtime, and sanitization work
- ✅ Clarified that Module 5 remains not started beyond the Module 2 notification preview foundation
- ✅ Aligned the post API contract with backend responses used by Module 4 cache patching for update, pin/unpin, and attachment flows

#### Pre-Module-5 Cleanup
- ✅ Fixed the channel realtime hook lint issue caused by unused pagination-filter destructuring
- ✅ Re-ran frontend unit, type-check, lint, and production build verification after the cleanup
- ⚠️ Focused Module 4 Playwright could not complete in this environment because the configured web servers timed out during startup

### 2026-05-03 - Module 4 Posts & Announcements Implemented and Verified

#### Production Feed and Reading Experience
- ✅ Replaced the Module 3 channel feed preview with a real posts and announcements feed
- ✅ Added load-more pagination, URL-backed search/priority/date filters, pinned-first rendering, loading skeletons, empty states, and retry states
- ✅ Added polished post cards with author avatars, role badges, priority badges, pinned/edited/attachment indicators, sanitized previews, and focused post detail dialogs
- ✅ Added attachment thumbnail grids and full-size image preview dialogs for post detail views

#### Publishing, Editor, and Moderation Actions
- ✅ Added permission-aware post creation with a Tiptap editor, priority selection, title/content/file validation, multipart submission, and upload limits
- ✅ Added edit, delete, pin, and unpin actions with role/ownership/edit-window gating and confirmation dialogs
- ✅ Kept existing attachments read-only in edit flows until backend attachment delete/reorder support exists
- ✅ Added channel post cache patching for create, update, delete, and pin flows, plus socket-driven active post-feed updates

#### Verification and Runtime Hardening
- ✅ Added post schemas, permission helpers, edit-window helpers, preview/sanitization helpers, attachment validation, and cache-helper unit tests
- ✅ Added focused Module 4 Playwright coverage for feed search/filtering, detail reading, create/edit/pin/delete, unauthorized publishing controls, and locked-channel publishing controls
- ✅ Fixed a rapid filter-update URL race caught by Playwright
- ✅ Fixed top-bar search synchronization so unrelated filter URL changes no longer overwrite a quick search clear
- ✅ `npm run test` passes with 76 Vitest tests
- ✅ `npm run type-check` passes
- ✅ `npm run lint` passes
- ✅ `npm run build` passes
- ✅ Focused Playwright runtime coverage passes for `client/e2e/module4-posts-announcements.spec.ts`

### 2026-05-05 - Channel Realtime Feed Updates

#### Socket-Scoped Post Updates
- ✅ Added channel room join/leave with membership checks for Socket.IO
- ✅ Emitted `post:created`, `post:updated`, `post:pinned`, and `post:deleted` events to channel rooms
- ✅ Added a channel-scoped realtime hook to patch post caches while a channel is open
- ✅ Kept notification subscriptions independent from active channel feed updates

### 2026-04-24 - Scoped Moderator Role Model Finalized Across Backend, Frontend, and Docs

#### Breaking Change Applied Cleanly
- ✅ Replaced the legacy single `moderator` concept with explicit `server_moderator` and `channel_moderator` roles
- ✅ Updated frontend permission checks to require server/channel-scoped role matches instead of flattened role-name checks
- ✅ Changed `/api/users/me` consumption to rely on scoped role assignments for authorization-sensitive UI
- ✅ Strengthened role-related frontend types so assignment payloads and current-user role data reflect the real backend contract

#### Seed and Contract Hardening
- ✅ Expanded the Prisma seed with realistic scoped moderator assignments and richer demo data for department, class, and society flows
- ✅ Updated functional requirements, proposal, schema notes, and frontend/backend API contracts to match the explicit moderation model
- ✅ Added backend test coverage to lock in the new scoped current-user role payload returned by `/api/users/me`

#### Verification Completed
- ✅ Focused backend role, user, auth, and channel test suites pass after the breaking change
- ✅ Frontend unit tests still pass with the scoped permission model
- ✅ Type-safe frontend contracts now align with the backend response shapes used by authorization-sensitive UI

### 2026-04-24 - Module 3 Hardening and Verification Completed

#### Final Refinement Pass Applied
- ✅ Wrapped the protected app-shell route branch in `SuspenseOutlet` so lazy-loaded protected pages have a reliable loading boundary in production
- ✅ Replaced stale Module 2 copy in the Module 3 channel and server screens with finalized Module 3 messaging
- ✅ Tightened channel creation affordances with accessible icon-button labeling and direct navigation to newly created channels
- ✅ Switched the edit-channel dialog to the dedicated update schema instead of reusing the create schema implicitly

#### Cache and Mutation Hardening Applied
- ✅ Added cache-safe channel list helpers for insert, update, and delete flows
- ✅ Updated create, edit, lock, unlock, and delete mutations to patch server-channel query caches immediately before invalidation
- ✅ Kept server detail channel counts in sync after create/delete mutations to avoid stale sidebar metadata
- ✅ Removed deleted-channel post caches so route transitions cannot briefly reuse stale channel data after destructive actions

#### Verification Expanded
- ✅ Added unit tests for channel cache-list helpers and the update schema
- ✅ `npm run test` passes with 61 Vitest tests
- ✅ `npm run type-check` passes
- ✅ `npm run lint` passes
- ✅ `npm run build` passes
- ✅ Focused Playwright runtime coverage passes for `client/e2e/module3-server-channel.spec.ts`

#### Remaining Follow-up
- ✅ Follow-up completed on 2026-04-24: frontend permission UI now consumes scoped current-user role assignments from the backend instead of flattened role names

### 2026-03-10 - Module 2 Layout & Navigation Implemented

#### Delivered Shell and Navigation
- ✅ Replaced the placeholder protected shell with a real `AppShell` layout under `src/components/layout/`
- ✅ Added `ServerSidebar`, `ChannelSidebar`, `TopBar`, `NotificationBell`, `UserDropdown`, `MobileDrawer`, and `AdminLayout`
- ✅ Added a responsive authenticated layout with desktop sidebars and a drawer-based sub-`lg` navigation flow
- ✅ Added route-aware breadcrumbs, contextual channel search input wiring, and authenticated user menu actions

#### Data Layer and Route Behavior
- ✅ Added typed frontend endpoint helpers for servers, notifications, and channel-post search-backed feed loading
- ✅ Added React Query hooks for servers, server detail, server channels, unread-count sync, notification preview, mark-read, and channel posts
- ✅ Implemented `/servers` landing page with active server cards
- ✅ Implemented `/servers/:serverId` redirect behavior with fallback order: first announcement channel, then general, then first visible channel, else empty state
- ✅ Implemented `/servers/:serverId/channels/:channelId` as a shell-ready channel page with channel-scoped search and feed preview wiring
- ✅ Implemented the admin route shell with stable navigation targets for later CRUD modules

#### Notification and Search Scope Decisions Applied
- ✅ Kept Socket.IO ownership in `AuthGuard` and extended shell behavior to consume the existing auth/socket lifecycle instead of moving it into `AppShell`
- ✅ Added a lightweight notification preview dropdown instead of prematurely implementing the full notifications module
- ✅ Scoped Module 2 search to the active channel because the backend contract currently supports search via `GET /api/channels/:id/posts`
- ✅ Kept future server/channel management actions as disabled placeholders rather than dead clickable UI

#### Tests and Verification
- ✅ Added unit tests for channel grouping, default-channel selection, route-param parsing, and search-param normalization utilities
- ✅ `npm run test` passes with 47 Vitest tests
- ✅ `npm run type-check` passes
- ✅ `npm run lint` passes
- ✅ `npm run build` passes

#### Focused Runtime Coverage Added
- ✅ Added `client/e2e/module2-shell.spec.ts` with focused Playwright coverage for:
  - direct `/servers/:serverId` redirect to the default announcement channel
  - channel-scoped search URL sync and filtered feed results
  - mobile drawer server-to-channel navigation with back-navigation
  - notification preview unread-count display and linked-channel navigation
- ✅ Verified the Module 2 Playwright spec passes against the isolated backend on port `4100` and the separate `uniconnect_test` database

#### Runtime Issues Caught and Fixed
- ✅ Fixed paginated API response unwrapping in `src/api/client.ts` so frontend consumers retain pagination metadata instead of losing it at runtime
- ✅ Reduced the server list query limit to stay within backend validation bounds during shell loading
- ✅ Adjusted the mobile drawer dialog mode so drawer navigation controls remain interactable during runtime use

#### Post-Implementation Hardening Applied
- ✅ Centralized numeric route-param parsing to remove duplicated parsing logic across shell and page components
- ✅ Normalized channel-post query params before both request dispatch and React Query cache-key generation to prevent cache fragmentation
- ✅ Hardened notification read and realtime update flows with broader, safer notifications cache invalidation
- ✅ Added explicit shell and page-level error and retry states for server lists, channel lists, channel pages, and notification preview loading
- ✅ Re-ran unit tests after hardening additions; the suite now passes with 47 Vitest tests

#### Remaining Follow-up
- ⏳ Consider folding the focused Module 2 Playwright spec into the default release-check suite if runtime shell coverage should remain mandatory

### 2026-03-10 - Module 1 Post-Audit Hardening

#### Unit Test Infrastructure Added
- ✅ Installed Vitest and configured it in `vite.config.ts` (with e2e exclusion)
- ✅ Added `npm run test` (vitest run) and `npm run test:watch` (vitest) scripts
- ✅ Added 32 unit tests across 3 test suites:
  - `src/features/auth/__tests__/schemas.test.ts` — 19 tests covering all Zod schemas (login, password, forgot-password, reset-password, change-password)
  - `src/features/auth/__tests__/utils.test.ts` — 8 tests covering `getApiErrorMessage` and `applyApiValidationErrors`
  - `src/stores/__tests__/auth.store.test.ts` — 5 tests covering setUser, clearUser, markPasswordChangeRequired state transitions

#### Route-Level Lazy Loading Implemented
- ✅ Converted all auth page imports to `React.lazy()` with dynamic imports
- ✅ Added `SuspenseOutlet` wrapper and `Suspense` fallbacks in AppShell and route guards
- ✅ Production build now code-splits auth pages into separate chunks (main bundle reduced from 54KB to 42KB)

#### GuestGuard Added for Public Routes
- ✅ Created `GuestGuard` that redirects already-authenticated users away from `/login`, `/forgot-password`, `/reset-password` to `/servers`
- ✅ Wrapped public routes under `GuestGuard` → `SuspenseOutlet` in the router

#### Documentation Alignment Completed
- ✅ ARCHITECTURE.md: Replaced stale `AuthGuard` code example (was TanStack Query, now matches actual useEffect + Zustand pattern)
- ✅ ARCHITECTURE.md: Documented all 5 route guards (`GuestGuard`, `AuthGuard`, `MustChangePasswordGuard`, `ForceChangePasswordGuard`, `AdminGuard`)
- ✅ ARCHITECTURE.md: Updated Socket.IO section to reflect centralized listeners in `socket.ts` and connection lifecycle in `AuthGuard` (was incorrectly attributed to AppShell)
- ✅ ARCHITECTURE.md: Updated Socket.IO connection pattern to match actual same-origin setup
- ✅ ARCHITECTURE.md: Updated QueryClient error handling to show actual `QueryCache`/`MutationCache` pattern with `suppressErrorToast` meta
- ✅ ARCHITECTURE.md: Updated code splitting description to reflect `React.lazy()` with `Suspense`
- ✅ API_CONTRACT.md: Fixed login Frontend Action to check `mustChangePassword` before calling `connectSocket()`
- ✅ PLAN.md: Fixed Zod schema examples to use Zod v4 syntax (`z.email()` instead of `z.string().email()`)

#### Verification Completed
- ✅ TypeScript type-check passes
- ✅ ESLint passes
- ✅ Prettier passes
- ✅ 32 Vitest unit tests pass
- ✅ Production build succeeds with lazy-loaded chunks

### 2026-03-10 - Module 1 Runtime Verification Completed

#### E2E Infrastructure Completed
- ✅ Added a dedicated backend E2E startup path via `server/.env.e2e` and `npm run dev:e2e`
- ✅ Isolated Playwright backend execution on port `4100` to avoid collisions with a local development backend on port `4000`
- ✅ Added `client/e2e/global-setup.ts` to rebuild the `uniconnect_test` schema from committed Prisma migrations before each Playwright run
- ✅ Added Playwright DB and auth helpers for direct test-data setup and valid password-reset token generation
- ✅ Kept runtime tests on the separate `uniconnect_test` database instead of the development database

#### Auth Runtime Coverage Added
- ✅ Added server-backed login success coverage
- ✅ Added invalid-credentials coverage
- ✅ Added logout coverage with protected-route redirect verification
- ✅ Added forced password change redirect and completion coverage
- ✅ Added forgot-password silent-success coverage
- ✅ Added reset-password valid-token and invalid-token coverage

#### Verification Completed
- ✅ `npm run test:e2e` passes with 13 Playwright tests in Chromium
- ✅ Module 1 now has focused runtime browser verification for the highest-value auth journeys

#### Remaining Follow-up
- ⏳ Add explicit auth-expired/session-expiry redirect coverage when that behavior becomes easier to exercise deterministically

### 2026-03-09 - Playwright Set Up in Frontend Package

#### Placement Decision
- ✅ Placed Playwright in `client/` rather than the repo root
- ✅ Kept runtime browser tests adjacent to the Vite frontend package, scripts, and auth routes
- ✅ Used Playwright `webServer` to coordinate both frontend and backend startup instead of creating a separate top-level test workspace

#### Setup Completed
- ✅ Installed `@playwright/test` in the frontend package
- ✅ Installed Chromium and Linux dependencies with the official command `npx playwright install --with-deps chromium`
- ✅ Added `client/playwright.config.ts` with official-style `webServer`, `baseURL`, retries, and failure-artifact settings
- ✅ Added Playwright npm scripts for headless, headed, UI mode, and HTML report access
- ✅ Added initial smoke coverage for the public auth pages under `client/e2e/auth-public-pages.spec.ts`

#### Verification Completed
- ✅ Playwright smoke suite passes: `npx playwright test e2e/auth-public-pages.spec.ts --workers=1 --reporter=list`
- ✅ Prettier remains clean after Playwright setup

#### Next Runtime Targets
- ⏳ Add server-backed login success and invalid-credentials coverage
- ⏳ Add forced password change flow coverage
- ⏳ Add logout and auth-expired redirect coverage

### 2026-03-08 - Module 1 Authentication Implemented and Hardened

#### Delivered Authentication Module
- ✅ Added real auth routes and pages for login, forgot password, reset password, forced password change, and voluntary password change
- ✅ Added typed auth and user endpoint helpers under `src/api/endpoints`
- ✅ Added auth mutation hooks for login, logout, forgot password, reset password, and change password
- ✅ Added branded `AuthLayout`, shared `PasswordField`, and live `PasswordStrengthIndicator`
- ✅ Added Zod-backed form schemas and inline API validation mapping helpers
- ✅ Wired `AuthGuard` to the new users endpoint helper instead of an inline request

#### Hardening Completed
- ✅ Prevented token refresh attempts for public auth failures such as invalid login requests
- ✅ Reused existing Socket.IO client instances more safely during auth transitions
- ✅ Made password inputs explicit React Hook Form refs instead of relying on custom-component forwarding behavior
- ✅ Split large frontend vendor chunks to remove the oversized bundle warning from the production build

#### Verification Completed
- ✅ Prettier passes: `npx prettier --check "src/**/*.{ts,tsx,css}"`
- ✅ TypeScript build passes: `npx tsc -b --pretty false`
- ✅ ESLint passes: `npx eslint .`
- ✅ Production build passes: `npm run build`

#### Runtime Testing Direction Chosen
- ✅ Playwright selected as the browser-runtime testing layer once the harness is added
- ✅ Auth flows identified as the first Playwright smoke suite
- ✅ Ubuntu on WSL2 confirmed as a supported Playwright environment, with headless Chromium as the recommended starting point

### 2026-03-08 - Module 0 Complete and Verified

#### Delivered Foundation
- ✅ Replaced the Vite starter scaffold with the routed application shell
- ✅ Added Prettier, format scripts, and ESLint/Prettier integration
- ✅ Enabled stricter TypeScript checks with `noUncheckedIndexedAccess`
- ✅ Initialized shadcn/ui v4 and added the Module 0 primitive component set
- ✅ Implemented backend-aligned type definitions under `src/types`
- ✅ Implemented the shared axios client with success unwrapping and 401 refresh retry
- ✅ Configured TanStack Query with cache defaults and global unhandled-error toasts
- ✅ Added Zustand auth and notification stores
- ✅ Added Socket.IO client wiring for notification and auth-expiry events
- ✅ Added `AuthGuard`, `MustChangePasswordGuard`, and `AdminGuard`
- ✅ Added the initial route tree with placeholder pages and a fallback route
- ✅ Added shared `ErrorBoundary`, `LoadingSpinner`, `EmptyState`, `ConfirmDialog`, and `RoleBadge`

#### Verification Completed
- ✅ TypeScript build passes: `npx tsc -b --pretty false`
- ✅ ESLint passes: `npx eslint .`
- ✅ Prettier passes: `npx prettier --check "src/**/*.{ts,tsx,css}"`
- ✅ Production build passes: `npm run build`
- ✅ Dev proxy verified: `http://127.0.0.1:5173/api/health` returns `{"success":true,"message":"OK","db":"ok"}`

#### Key Decisions
- shadcn/ui v4 is kept on its current Base UI stack instead of backporting to the older Radix-based templates
- The font is loaded from `main.tsx` via `@fontsource-variable/geist/wght.css` so Vite emits the font files cleanly in production
- TanStack Query now owns the default unhandled API error toast behavior required by the plan
- The root route redirects to `/servers`, and `/servers` now resolves to a valid placeholder page instead of a dead path

#### Challenges & Solutions
- Build-time Geist font warnings were resolved by moving the font import out of `index.css` and into `main.tsx`
- The toast wrapper originally depended on `next-themes` without a mounted provider; adding `ThemeProvider` fixed that runtime gap
- The initial route tree redirected authenticated users to `/servers` before that route existed; a concrete `/servers` placeholder route and fallback page fixed navigation correctness

### 2026-03-07 - Planning Phase Complete

#### Documentation Created
- ✅ **PLAN.md** - Comprehensive development plan with all 10 modules
- ✅ **PROGRESS.md** (this file) - Progress tracking and decision log
- ✅ **API_CONTRACT.md** - Backend API reference aligned with backend contract
- ✅ **ARCHITECTURE.md** - Architecture decisions and patterns aligned with current implementation plan

#### Technology Stack Finalized
- **Framework:** React 19 + Vite 7 + TypeScript 5.9
- **UI:** shadcn/ui + Tailwind CSS v4 (official Vite plugin setup)
- **State:** TanStack Query v5 + Zustand
- **Routing:** React Router v7
- **Forms:** React Hook Form + Zod
- **Rich Text:** Tiptap
- **Real-time:** socket.io-client
- **HTTP:** axios with interceptors

**Rationale:** This stack provides:
- Maximum type safety (TypeScript + Zod)
- Best-in-class server state management (TanStack Query)
- Lightweight client state (Zustand)
- Accessible UI primitives (shadcn/ui v4 on Base UI)
- Modern, fast development experience (Vite HMR)

---

## Module 0: Project Foundation

### Tasks

| Task | Status | Date | Notes |
|------|--------|------|-------|
| Replace Vite starter scaffold | ✅ Complete | 2026-03-07 | Root rendering now goes through RouterProvider and app providers |
| shadcn/ui setup | ✅ Complete | 2026-03-07 | Initialized shadcn/ui v4 and added the planned primitive set |
| Folder structure creation | ✅ Complete | 2026-03-07 | Shared foundation folders and route guards are in place |
| Axios instance + interceptors | ✅ Complete | 2026-03-07 | Success unwrap + refresh retry + normalized ApiError |
| TanStack Query configuration | ✅ Complete | 2026-03-08 | Cache defaults plus global unhandled-error toasts |
| Zustand stores (auth, notification) | ✅ Complete | 2026-03-07 | Auth/session and unread count state ready |
| Socket.IO client setup | ✅ Complete | 2026-03-07 | Same-origin socket client with notification/auth listeners |
| Type definitions | ✅ Complete | 2026-03-07 | Backend-aligned type layer implemented under `src/types` |
| Route tree + guards | ✅ Complete | 2026-03-08 | Default route fixed, `/servers` placeholder added, wildcard fallback added |
| Error boundary + toast system | ✅ Complete | 2026-03-08 | ErrorBoundary mounted globally and Sonner wired through ThemeProvider |
| Shared components | ✅ Complete | 2026-03-07 | EmptyState, LoadingSpinner, ConfirmDialog, RoleBadge, ErrorBoundary |
| API endpoint functions | ⏳ Deferred | - | Planned for feature modules; not a blocker for Module 0 foundation |

### Key Decisions
- shadcn/ui v4 uses Base UI primitives in this codebase; docs and implementation are aligned to that stack
- Query-level and mutation-level unhandled API errors surface through Sonner to satisfy the global toast requirement
- Same-origin deployment remains the target production topology, with Vite proxy used only for local development

### Challenges & Solutions
- Initial `/` navigation redirected to a non-existent `/servers` page; a concrete placeholder route fixed the mismatch
- `next-themes` was installed for Sonner theming but no provider was mounted; the app now wraps routing in `ThemeProvider`
- Vite emitted unresolved Geist font warnings during production build; importing `@fontsource-variable/geist/wght.css` from `main.tsx` resolved them

---

## Module 1: Authentication

### Tasks

| Task | Status | Date | Notes |
|------|--------|------|-------|
| LoginForm component | ✅ Complete | 2026-03-08 | Email + password form with Zod validation and inline API error handling |
| ForgotPasswordForm | ✅ Complete | 2026-03-08 | Silent-success email reset request flow |
| ResetPasswordForm | ✅ Complete | 2026-03-08 | Token from URL, invalid-link handling, password strength feedback |
| ChangePasswordForm | ✅ Complete | 2026-03-08 | Shared between forced and voluntary password change flows |
| PasswordStrengthIndicator | ✅ Complete | 2026-03-08 | Combined strength bar and checklist aligned with backend rules |
| AuthLayout | ✅ Complete | 2026-03-08 | Branded centered card with gradient background |
| Auth API integration | ✅ Complete | 2026-03-08 | Login, logout, refresh, forgot-password, reset-password, and change-password endpoints |
| Auth store integration | ✅ Complete | 2026-03-08 | Auth state updates, redirect handling, and socket lifecycle alignment |
| mustChangePassword flow | ✅ Complete | 2026-03-08 | Forced redirect, special route guard, and post-change sign-in reset |
| 401 interceptor hardening | ✅ Complete | 2026-03-08 | Public auth routes excluded from refresh logic; focused runtime auth coverage added on 2026-03-10 |
| Playwright E2E infrastructure | ✅ Complete | 2026-03-10 | Dedicated backend E2E env, isolated test DB bootstrap, DB helpers, and reset-token utilities added |
| Critical auth Playwright flows | ✅ Complete | 2026-03-10 | Login, invalid credentials, logout, forced password change, forgot-password, and reset-password covered |

### Key Decisions
- Shared `ChangePasswordForm` handles both forced and voluntary flows while keeping different page wrappers
- Success feedback uses Sonner toasts, while validation and most API failures stay inline within forms
- React Hook Form stays on the standard `@hookform/resolvers/zod` import path with Zod v4 in the current dependency set
- Runtime browser verification will use Playwright instead of trying to overextend jsdom-based tests

### Challenges & Solutions
- Public auth requests originally risked triggering the global refresh interceptor; excluding login, forgot-password, reset-password, and refresh endpoints fixed that behavior
- Socket initialization could duplicate across login and guarded-route transitions; reusing the existing socket instance fixed the race
- Password inputs originally depended on implicit custom-component ref behavior; making the input ref path explicit removed that fragility

---

## Module 2: Layout & Navigation

### Tasks

| Task | Status | Date | Notes |
|------|--------|------|-------|
| AppShell (3-column layout) | ✅ Complete | 2026-03-10 | Responsive authenticated shell with server, channel, and main-content regions |
| ServerSidebar | ✅ Complete | 2026-03-10 | Vertical server navigation with active-state handling |
| ChannelSidebar | ✅ Complete | 2026-03-10 | Grouped channels, lock indicators, member route, and create entry point |
| TopBar | ✅ Complete | 2026-03-10 | Breadcrumbs, contextual search, notification bell, and user dropdown |
| NotificationBell | ✅ Complete | 2026-03-10 | Unread count badge with preview dropdown wiring |
| UserDropdown | ✅ Complete | 2026-03-10 | Session-aware menu with profile and sign-out actions |
| MobileDrawer | ✅ Complete | 2026-03-10 | Responsive drawer navigation with server/channel drill-in |
| AdminLayout | ✅ Complete | 2026-03-10 | Stable admin shell for later CRUD modules |
| Socket.IO event listeners | ✅ Complete | 2026-03-10 | Notification and auth-expiry listeners remain centralized in the auth/socket lifecycle |
| Responsive design | ✅ Complete | 2026-03-10 | Desktop and sub-`lg` navigation flows verified through focused runtime coverage |

### Key Decisions
- Socket lifecycle ownership stays in `AuthGuard`; shell components consume that lifecycle rather than duplicating it
- Channel-scoped search remains tied to `GET /api/channels/:id/posts` until the broader posts module lands
- Future admin CRUD pages reuse the current admin shell instead of introducing a second layout system

### Challenges & Solutions
- Paginated API unwrapping originally dropped pagination metadata; the client interceptor was fixed to preserve both data and pagination
- Mobile drawer interaction needed dialog-mode adjustments before it behaved correctly under runtime navigation
- Channel/page query params were normalized to avoid cache fragmentation across equivalent search states

---

## Module 3: Server & Channel Views

### Tasks

| Task | Status | Date | Notes |
|------|--------|------|-------|
| ServerPage | ✅ Complete | 2026-04-24 | Auto-redirects to the default visible channel with a production-ready empty state |
| ChannelPage | ✅ Complete | 2026-04-24 | Channel header plus search-aware feed preview with resilient route validation |
| ChannelHeader | ✅ Complete | 2026-04-24 | Name, type, description, lock state, create action, and management actions |
| ChannelActions dropdown | ✅ Complete | 2026-04-24 | Edit, lock, unlock, and delete flows with confirm and toast feedback |
| CreateChannelDialog | ✅ Complete | 2026-04-24 | Zod-backed form with description counter and inline API validation handling |
| EditChannelDialog | ✅ Complete | 2026-04-24 | Prefilled edit flow using the dedicated update schema |
| MemberListPage | ✅ Complete | 2026-04-24 | Paginated member roster with URL-synced page state |
| MemberCard | ✅ Complete | 2026-04-24 | Avatar, email, user type, badges, and joined-date summary |
| RoleBadge | ✅ Complete | 2026-04-24 | Consistent role pill styling across member and auth-adjacent surfaces |
| Permission checks | ✅ Complete | 2026-04-24 | `usePermissions` and `Can` gate channel-management affordances in the UI |

### Key Decisions
- Module 3 keeps posts as a preview/feed-loading surface and defers rich post composition to Module 4
- Channel mutations patch query caches immediately, then invalidate, to avoid stale navigation and stale sidebar counts after write operations
- Runtime verification stays focused on the highest-value management flows instead of waiting for a later all-modules release suite

### Challenges & Solutions
- Protected lazy routes under the authenticated shell were not consistently wrapped in a suspense boundary; adding `SuspenseOutlet` closed that runtime gap
- Channel create/update/delete flows originally depended on refetch timing; immediate cache patching now prevents stale redirects and stale channel counts
- The backend originally returned flattened current-user roles via `/users/me`; switching to scoped role assignments aligned frontend authorization decisions with backend server/channel scope rules

---

## Module 4: Posts & Announcements

### Tasks

| Task | Status | Date | Notes |
|------|--------|------|-------|
| PostFeed | ✅ Complete | 2026-05-03 | Hybrid paginated feed, pinned-first rendering, load more, empty/error/loading states |
| PostCard | ✅ Complete | 2026-05-03 | Compact list view with author, badges, priority, pinned, edited, attachment, and preview metadata |
| PostDetail | ✅ Complete | 2026-05-03 | Dialog-based full post view with sanitized HTML, author metadata, attachments, and actions |
| CreatePostForm | ✅ Complete | 2026-05-03 | Dialog-based Tiptap editor with title, content, priority, attachments, and multipart submission |
| EditPostForm | ✅ Complete | 2026-05-03 | 24h edit-window gating, pre-filled editor, priority updates, and read-only existing attachments |
| Tiptap editor configuration | ✅ Complete | 2026-05-03 | StarterKit, CharacterCount, Placeholder, and controlled content synchronization |
| Tiptap toolbar | ✅ Complete | 2026-05-03 | Bold, italic, strike, headings, lists, code block, undo, redo, and character count |
| PostSearchBar | ✅ Complete | 2026-05-03 | Implemented in `TopBar` with 500ms debounce and channel-scoped URL search sync |
| PostFilters | ✅ Complete | 2026-05-03 | Priority and date filters backed by URL search params with clear controls |
| PriorityBadge | ✅ Complete | 2026-05-03 | Normal, Important, and Urgent styling |
| AttachmentPreview | ✅ Complete | 2026-05-03 | Thumbnail grid with full-size image dialog preview |
| PostActions dropdown | ✅ Complete | 2026-05-03 | Edit, delete, pin, and unpin actions with permission gates and confirmations |
| File upload with validation | ✅ Complete | 2026-05-03 | Max 3 images, 5MB each, JPEG/PNG/WEBP validation |
| DOMPurify sanitization | ✅ Complete | 2026-05-03 | Sanitized rendered post content and sanitized plain-text previews |
| Channel post realtime | ✅ Complete | 2026-05-05 | Joins/leaves active channel rooms and patches active post caches for create/update/pin/delete events |

### Key Decisions
- Post feed filters are URL-backed so refreshes and navigation preserve search, priority, and date state.
- The top-bar search remains channel-scoped because the backend exposes search through `GET /api/channels/:id/posts`.
- Existing attachments stay read-only while editing posts until backend delete/reorder support is added.
- Active channel realtime updates are separate from notification subscription preferences.

### Challenges & Solutions
- Rapid filter updates could race with search-param synchronization; fixed by tracking the latest search params while applying URL updates.
- Unfiltered post caches can be patched directly from socket events, while filtered caches are invalidated to avoid inserting posts that may not match active filters.
- A lint issue in the realtime hook's pagination-filter cleanup was fixed on 2026-05-08 before beginning Module 5.

---

## Module 5: Notifications

### Tasks

| Task | Status | Date | Notes |
|------|--------|------|-------|
| NotificationPanel dropdown | ✅ Implemented | 2026-05-08 | Mark-all-read, full inbox link, settings link, and reusable item rendering added |
| NotificationItem | ✅ Implemented | 2026-05-08 | Bold unread state, type icon, timestamp, and navigation callback |
| NotificationInboxPage | ✅ Implemented | 2026-05-08 | Global paginated inbox with URL-backed unread/type/page filters |
| NotificationPreferencesPage | ✅ Implemented | 2026-05-08 | Per-server post and role notification settings |
| NotificationSettingsServerPickerPage | ✅ Implemented | 2026-05-08 | Fallback for user-menu access outside server context |
| SubscriptionToggle | ✅ Implemented | 2026-05-08 | Accessible switch with pending state |
| Socket.IO notification:new | ✅ Implemented | 2026-05-08 | Preview cache patching, invalidation, post feed refresh, and urgent toast behavior |
| Socket.IO unread-count | ✅ Implemented | 2026-05-08 | Foundation listener remains authoritative for count sync |
| Navigation on click | ✅ Implemented | 2026-05-08 | Shared notification target helper used by dropdown and inbox |
| Mark as read mutation | ✅ Implemented | 2026-05-08 | Cache-wide read patching and unread rollback |
| Mark all as read | ✅ Implemented | 2026-05-08 | Optimistic reset to 0 with cache rollback |
| Role-assignment notifications | ✅ Implemented | 2026-05-08 | Backend emits assignment notifications and honors role preferences |

### Key Decisions
- Do not start Module 5 until the Module 4 documentation and verification baseline is clean.
- Keep the existing notification bell/preview foundation in place, but treat preferences, subscription toggles, mark-all-read, and full notification workflow tests as Module 5 work.

### Challenges & Solutions
- Module 2 introduced a lightweight notification preview, which made Module 5 look partially complete. The Module 5 ledger now distinguishes that foundation from the completed inbox, preference, subscription, and read-state workflows.

---

## Module 6: User Profile & Management

### Tasks

| Task | Status | Date | Notes |
|------|--------|------|-------|
| ProfilePage | ✅ Complete | 2026-05-09 | Editable bio, avatar upload, profile details, role badges |
| ProfilePictureUpload | ✅ Complete | 2026-05-09 | File picker, preview, validation, multipart upload |
| BioEditor | ✅ Complete | 2026-05-09 | Inline edit, 500 char max, optimistic cache update |
| AdminUserListPage | ✅ Complete | 2026-05-09 | URL-backed table with search and filters |
| CreateUserPage | ✅ Complete | 2026-05-09 | Conditional fields by userType plus department/program/class selectors |
| BulkImportPage | ✅ Complete | 2026-05-09 | CSV upload, progress, result summary, errors CSV export |
| UserDetailDialog | ✅ Complete | 2026-05-09 | Full info modal with activation controls |
| Deactivate/reactivate users | ✅ Complete | 2026-05-09 | Confirmation + mutation + cache patching |
| Zod schemas for user creation | ✅ Complete | 2026-05-09 | User-type-aware schema with NTU roll-number validation |

### Key Decisions
- Temporary passwords remain email-only; admins see a credential-delivery confirmation, not the generated password.
- Student roll numbers now use NTU formatted strings such as `22-NTU-CS-1184`; backend schema and docs were updated to match.
- Bulk-import failed-row download exports row numbers and backend error messages from the current API response.

### Challenges & Solutions
- Backend integration tests can be disruptive inside the constrained WSL/VS Code session; reruns should stay bounded with explicit timeout guards and focused filtering when possible.

---

## Module 7: Admin Dashboard & CRUD

### Tasks

| Task | Status | Date | Notes |
|------|--------|------|-------|
| AdminDashboardPage | ✅ Complete | 2026-05-10 | Real stats cards from `/api/admin/stats` |
| DepartmentListPage + CRUD | ✅ Complete | 2026-05-10 | Table, create/edit dialogs |
| DepartmentDetailPage | ✅ Complete | 2026-05-10 | Overview, stats, programs management |
| ProgramListPage + CRUD | ✅ Complete | 2026-05-10 | Paginated table, filters, edit dialogs |
| CurriculumPage | ✅ Complete | 2026-05-10 | Semester grouping, batch filter, add/remove courses |
| DisciplineListPage + CRUD | ✅ Complete | 2026-05-10 | Create and rename flows |
| ClassListPage + CRUD | ✅ Complete | 2026-05-10 | Table with filters, create dialog |
| ClassDetailPage | ✅ Complete | 2026-05-10 | Overview, assigned courses, semester progression wizard |
| AssignCourseDialog | ✅ Complete | 2026-05-10 | Course + teacher selection |
| SemesterProgressionButton | ✅ Complete | 2026-05-10 | Wizard validates next-semester teacher assignments |
| CourseListPage + CRUD | ✅ Complete | 2026-05-10 | Search/filter table, create/edit dialogs |

### Key Decisions
- Module 7 remains admin-only in the frontend; HOD-facing management can be added with permission UI work.
- HOD, Program Director, and CR assignment is deferred to Module 9 role management.
- Academic records do not hard-delete in Module 7; destructive archive/delete policy remains a future schema decision.
- Degree levels are served by backend lookup instead of hardcoded frontend IDs.

### Challenges & Solutions
- Added missing backend read endpoints and filters needed by scalable admin tables.
- Used a semester progression wizard so teacher assignments are collected before the atomic progression mutation.

---

## Module 8: Society Management

### Tasks

| Task | Status | Date | Notes |
|------|--------|------|-------|
| SocietyListPage | ✅ Complete | 2026-05-18 | Role-based `/societies` route with card grid and department filter |
| CreateSocietyDialog | ✅ Complete | 2026-05-18 | Name, description, department, president, convenor |
| SocietyDetailPage | ✅ Complete | 2026-05-18 | Overview, members, and join request tabs |
| JoinRequestButton | ✅ Complete | 2026-05-18 | Membership-aware request flow |
| JoinRequestList | ✅ Complete | 2026-05-18 | Approve/reject actions with requester notifications |
| SocietyMemberList | ✅ Complete | 2026-05-18 | Paginated members with role badges and remove actions |
| AddMemberDialog | ✅ Complete | 2026-05-20 | Search-backed university-wide member candidate picker |
| Permission checks | ✅ Complete | 2026-05-20 | Backend-permission-driven tabs, queries, and actions |
| EditSocietyDialog | ✅ Complete | 2026-05-20 | Info edits and HOD/admin leadership changes with typed candidate lookup |

### Key Decisions
- Societies live outside the admin dashboard because the workspace is used by admins, HODs, convenors, presidents, and students.
- All authenticated users can browse societies; management actions remain permission-gated.
- Join request approval/rejection creates a persisted notification for the requester.
- Society detail uses backend `viewer` and `permissions` as the canonical source for tab/query gating, preventing expected 403 states.
- Ordinary society membership is university-wide; president/convenor candidate lookup remains same-department and scoped to admin/HOD callers.

### Challenges & Solutions
- Added backend membership and member-candidate endpoints so the frontend can avoid broad user queries.
- Replaced society create/edit leadership loading with typed candidate endpoints and HOD-scoped department choices.
- Preserved `/admin/societies` deep links with redirects while moving the primary entry point to the profile menu.

---

## Module 9: Role Management

### Tasks

| Task | Status | Date | Notes |
|------|--------|------|-------|
| RoleManagementPage | ✅ Complete | 2026-05-18 | User search plus assignment/revocation workflow |
| UserRolesView | ✅ Complete | 2026-05-18 | Current roles with scope context |
| AssignRoleForm | ✅ Complete | 2026-05-18 | Dynamic form adapting to role type |
| RevokeRoleButton | ✅ Complete | 2026-05-18 | Confirmation-backed revoke mutation |
| RoleScopePicker | ✅ Complete | 2026-05-18 | Loads entities based on selected role |
| usePermissions hook | ✅ Complete | 2026-05-18 | Shared permission checks used by role-aware UI |
| Can component | ✅ Complete | 2026-05-18 | Existing permission component retained for conditional UI |
| Apply permission-aware UI | ✅ Complete | 2026-05-18 | Society/role actions and navigation are permission-aware |

### Key Decisions
- Role management lives outside the admin dashboard because delegated managers can use parts of the workspace.
- Society leadership roles are changed through society update flows; generic role assign/revoke handles HOD, Program Director, CR, and moderator roles.
- Role assignment/revocation options come from backend-scoped lazy endpoints; the frontend no longer loads broad catalog/user/server lists for this workspace.
- Successful role changes emit `auth:roles-updated` so authenticated clients can refresh their scoped role context.

### Challenges & Solutions
- Enriched `GET /api/roles/users/:id` with display-ready scope context to keep frontend role rendering deterministic.
- Kept `/admin/roles` as a redirect for old links while moving the primary entry point to the profile menu.
- Added `GET /api/roles/revokable` so scoped managers revoke only assignments the backend confirms they can manage.

---

## Performance Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Initial Load Time | < 2s | - | ⏳ Not measured |
| Time to Interactive | < 3s | - | ⏳ Not measured |
| API Request Time | < 500ms (p95) | - | ⏳ Not measured |
| Bundle Size (gzipped) | < 500KB | - | ⏳ Not measured |
| Lighthouse Score | > 90 | - | ⏳ Not measured |

---

## Key Decisions Log

### Decision 1: Feature-Based Folder Structure
**Date:** 2026-03-07
**Context:** Choosing between feature-based vs. type-based organization
**Decision:** Feature-based (`features/auth/`, `features/posts/`)
**Rationale:**
- Co-locates related code (pages, components, hooks)
- Easier to find and modify feature-specific code
- Scales better as the app grows
- Clear module boundaries

### Decision 2: TanStack Query for Server State
**Date:** 2026-03-07
**Context:** Choosing server state management solution
**Decision:** TanStack Query v5
**Alternatives Considered:** RTK Query, SWR
**Rationale:**
- Best-in-class caching and background refetching
- Built-in optimistic updates with automatic rollback
- Smaller bundle size than RTK Query
- More flexible than SWR (supports mutations better)
- Active community and excellent documentation

### Decision 3: Zustand for Client State
**Date:** 2026-03-07
**Context:** Choosing client state management (auth, notifications count)
**Decision:** Zustand
**Alternatives Considered:** Redux Toolkit, Jotai, Context API
**Rationale:**
- Minimal boilerplate compared to Redux
- No provider wrapper needed
- Tiny bundle size (~1KB)
- Simple API for small state surfaces
- Easy to integrate with TanStack Query

### Decision 4: shadcn/ui Over Component Libraries
**Date:** 2026-03-07
**Context:** Choosing UI component library
**Decision:** shadcn/ui + Tailwind CSS v4
**Alternatives Considered:** Material UI, Ant Design, Chakra UI
**Rationale:**
- Copy-paste approach: full control over components
- No dependency lock-in (components are yours to modify)
- Built on Base UI in the current shadcn/ui v4 stack (accessible by default)
- Tailwind v4 integrates cleanly with the official Vite plugin pipeline used in this repo
- Lightweight (only include what you use)

### Decision 5: Tiptap for Rich Text
**Date:** 2026-03-07
**Context:** Choosing rich text editor for posts
**Decision:** Tiptap
**Alternatives Considered:** React Quill, Slate, Draft.js
**Rationale:**
- Headless: full control over UI
- Built on ProseMirror (robust, extensible)
- Modern API with React hooks
- Excellent documentation
- Active development

### Decision 6: Cookie-Based Auth (No Manual Token Handling)
**Date:** 2026-03-07
**Context:** Frontend auth strategy
**Decision:** httpOnly cookies, no localStorage/sessionStorage
**Rationale:**
- Backend already uses httpOnly cookies
- More secure (XSS cannot access tokens)
- Simpler frontend (no manual token storage/retrieval)
- axios `withCredentials: true` handles everything
- Automatic refresh flow via 401 interceptor

### Decision 7: Same-Origin Deployment by Default
**Date:** 2026-03-07
**Context:** Choosing the recommended production topology for cookie auth and Socket.IO
**Decision:** Default to same-origin deployment for frontend and backend
**Rationale:**
- Matches backend `SameSite=Strict` cookie policy
- Minimizes CORS and cross-site cookie complexity
- Simplifies Socket.IO connection behavior
- Reduces production auth edge cases

### Decision 8: Balanced Frontend Testing
**Date:** 2026-03-07
**Context:** Choosing the minimum quality gate for feature completion
**Decision:** Require unit plus component or integration coverage for each module
**Rationale:**
- Prevents regressions without blocking progress on full E2E coverage
- Fits the current project phase better than an E2E-heavy mandate
- Keeps permission, auth, and form logic verifiable early

### Decision 9: Hybrid Post Feed UX
**Date:** 2026-03-07
**Context:** Resolving the post list UX while keeping requirement-aligned pagination
**Decision:** Use paginated APIs with load-more or infinite-style interaction for channel feeds
**Rationale:**
- Preserves the functional requirement for pagination
- Allows a smoother content consumption experience
- Keeps cache and query state deterministic

### Decision 10: Production Readiness Includes Monitoring
**Date:** 2026-03-07
**Context:** Deciding whether to defer observability work until after MVP
**Decision:** Include error tracking and analytics in the production-readiness plan from the start
**Rationale:**
- Improves post-release visibility into failures and usage
- Avoids treating production diagnostics as an afterthought
- Does not block local development if introduced after the app shell is stable

### Decision 11: Playwright Owns Runtime Browser Verification
**Date:** 2026-03-08
**Context:** Choosing the correct tool for browser-runtime behavior such as cookie auth, redirects, token refresh, and guarded routes
**Decision:** Use Playwright as the dedicated runtime behavior testing layer
**Rationale:**
- Browser cookies, navigation guards, and redirect chains are materially different from jsdom-based test environments
- Playwright covers the exact runtime surface we need without turning every feature into a heavy E2E mandate
- Trace viewer, HTML reports, screenshots, and videos provide strong post-failure evidence

### Decision 12: Agentic Workflow Uses Tests First, MCP Second
**Date:** 2026-03-08
**Context:** Deciding how browser automation should fit into coding-agent workflows for this repo
**Decision:** Prefer committed Playwright tests, CLI runs, codegen, and traces as the default workflow; keep Playwright MCP optional for exploratory sessions
**Rationale:**
- Versioned Playwright tests are reproducible locally and in CI
- CLI-based test runs are usually more token-efficient for coding agents than rich interactive browser protocols
- MCP still has value for exploratory or persistent stateful sessions, but it should not be the primary verification artifact

---

## Challenges & Solutions Log

### Challenge 1: (To be logged as encountered)
**Date:** -
**Challenge:** -
**Impact:** -
**Solution:** -
**Lessons Learned:** -

---

## Testing Strategy

### Unit Testing
- [ ] Set up Vitest for unit tests
- [ ] Test utility functions (date formatting, validation helpers)
- [ ] Test custom hooks (usePermissions, usePagination)
- [ ] Test Zustand stores

### Integration Testing
- [ ] Set up Testing Library for component tests
- [ ] Test form submissions with validation
- [ ] Test API integrations with MSW (Mock Service Worker)

### E2E Testing
- [x] Set up `@playwright/test` for E2E tests
- [x] Configure Playwright `webServer` for frontend and backend startup or reuse
- [x] Add Chromium-only local project
- [x] Add trace, screenshot, and video retention defaults for failure debugging
- [x] Add initial public auth smoke coverage
- [x] Test first critical runtime flows:
  - Login success and invalid credentials
  - Forced password change
  - Forgot-password silent success
  - Reset-password success and invalid token
  - Logout redirect
- [ ] Add explicit auth-expired redirect coverage
- [ ] Expand later to posts, notifications, admin CRUD, and role assignment flows

---

## Deployment Checklist

- [ ] Environment variables configured (API URL, Socket.IO URL)
- [ ] Same-origin production deployment confirmed or cross-origin cookie review completed
- [ ] Vite build optimization (code splitting, tree shaking)
- [ ] Bundle size analysis with `rollup-plugin-visualizer`
- [ ] Lighthouse audit (aim for >90 score)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Responsive testing (mobile, tablet, desktop)
- [ ] Accessibility audit (aXe DevTools)
- [ ] Error tracking setup (Sentry or similar)
- [ ] Analytics setup (Google Analytics or similar)
- [ ] CDN configuration for assets
- [ ] HTTPS configuration
- [ ] Cache headers for static assets
- [ ] Security headers (CSP, HSTS)

---

## Dependencies

### Production Dependencies
(To be installed and logged during Module 0 setup)

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "@tanstack/react-query": "^5.x",
    "react-router-dom": "^7.x",
    "zustand": "^5.x",
    "axios": "^1.x",
    "socket.io-client": "^4.x",
    "react-hook-form": "^7.x",
    "zod": "^4.x",
    "@tiptap/react": "^3.x",
    "@tiptap/starter-kit": "^3.x",
    "dompurify": "^3.x",
    "date-fns": "^4.x",
    "lucide-react": "latest",
    "sonner": "latest"
  }
}
```

### Dev Dependencies
```json
{
  "devDependencies": {
    "vite": "^7.x",
    "@vitejs/plugin-react": "^5.x",
    "typescript": "^5.9.x",
    "tailwindcss": "^4.x",
    "@tailwindcss/vite": "^4.x",
    "eslint": "^9.x",
    "prettier": "^3.x",
    "vitest": "latest",
    "@testing-library/react": "latest",
    "@testing-library/jest-dom": "latest",
    "@testing-library/user-event": "latest",
    "jsdom": "latest",
    "msw": "latest",
    "@playwright/test": "latest",
    "rollup-plugin-visualizer": "latest"
  }
}
```

---

## Notes & Observations

### 2026-03-07
- Planning phase completed
- All 10 modules specified with detailed component breakdown
- Technology stack finalized after evaluating trade-offs
- Documentation structure established (PLAN.md, PROGRESS.md, API_CONTRACT.md, ARCHITECTURE.md)

### 2026-03-08
- Module 0 completed and verified against the plan
- Production build cleaned up to emit Geist font assets without unresolved warnings
- Dev proxy confirmed via `http://127.0.0.1:5173/api/health`
- Module 1 authentication implemented and statically verified
- Runtime testing recommendation finalized: Playwright for browser-runtime behavior, Testing Library plus MSW for deterministic integration coverage
- Ubuntu on WSL2 documented as a supported Playwright environment, with headless Chromium recommended as the local default

### 2026-03-09
- Playwright installed in the frontend package and configured with frontend plus backend `webServer` entries
- Initial public auth smoke suite added and passing in Chromium

### 2026-03-10
- Module 1 runtime verification completed with a 13-test Playwright auth suite
- Playwright now boots the backend through a dedicated E2E environment and targets the separate `uniconnect_test` database
- Global Playwright setup rebuilds the test schema from committed Prisma migrations and seeds only the users required for focused auth coverage

### 2026-04-24
- Resolved a Tailwind styling regression by restoring the required Tailwind v4 core import: `@import 'tailwindcss';` in `src/index.css`
- Migrated frontend Tailwind integration from PostCSS to the official Vite plugin setup (`@tailwindcss/vite` + CSS core import)

---

## Team Communication

(To be logged: Meetings, decisions from supervisor feedback, blockers escalated, etc.)

---

## Future Enhancements (Post-MVP)

Ideas for features to add after the initial MVP is complete:
- Dark mode support
- Internationalization (i18n) for multiple languages
- PWA support (offline mode, push notifications)
- Advanced search with Elasticsearch integration
- Post reactions/emojis
- Direct messaging between users
- Calendar integration for events
- Mobile app (React Native)
- Analytics dashboard for admins (post views, engagement metrics)
- Email digest of unread notifications
- LDAP/SSO integration for university authentication

---

## Resources & References

- [Backend API Documentation](../server/docs/FRONTEND_BACKEND_CONTRACT.md)
- [Backend Error Codes](../server/docs/API_ERROR_CODES.md)
- [Functional Requirements](../docs/functional_requirements.md)
- [Database Schema](../docs/schema.md)
- [Backend Architecture](../server/API_DEVELOPMENT_PLAN.md)

---

**Last Updated:** 2026-03-07
**Next Review:** After Module 0 completion
