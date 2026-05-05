# UniConnect Frontend - Implementation Progress Tracker

**Project:** UniConnect Frontend
**Start Date:** 2026-03-07
**Status:** Module 4 Complete
**Current Phase:** Module 4 posts and announcements implemented, hardened, and verified with unit, build, and focused browser-runtime coverage

---

## Overview

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
| Module 5: Notifications | Not Started | - | - | - |
| Module 6: User Profile & Management | Not Started | - | - | - |
| Module 7: Admin Dashboard & CRUD | Not Started | - | - | - |
| Module 8: Society Management | Not Started | - | - | - |
| Module 9: Role Management | Not Started | - | - | - |

---

## Changelog

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
| PostFeed | ⏳ Pending | - | Hybrid paginated feed, pinned first |
| PostCard | ⏳ Pending | - | Compact list view |
| PostDetail | ⏳ Pending | - | Full post view |
| CreatePostForm | ⏳ Pending | - | Tiptap + attachments |
| EditPostForm | ⏳ Pending | - | 24h window, pre-filled |
| Tiptap editor configuration | ⏳ Pending | - | StarterKit, CharacterCount, Placeholder |
| Tiptap toolbar | ⏳ Pending | - | Bold, Italic, Headings, Lists |
| PostSearchBar | ⏳ Pending | - | 500ms debounce |
| PostFilters | ⏳ Pending | - | Priority + date range |
| PriorityBadge | ⏳ Pending | - | Normal, Important, Urgent styling |
| AttachmentPreview | ⏳ Pending | - | Thumbnail grid + lightbox |
| PostActions dropdown | ⏳ Pending | - | Edit, Delete, Pin/Unpin |
| File upload with validation | ⏳ Pending | - | Max 3, 5MB each, JPEG/PNG/WEBP |
| DOMPurify sanitization | ⏳ Pending | - | XSS protection for rendered HTML |

### Key Decisions
- (To be logged)

### Challenges & Solutions
- (To be logged)

---

## Module 5: Notifications

### Tasks

| Task | Status | Date | Notes |
|------|--------|------|-------|
| NotificationPanel dropdown | ⏳ Pending | - | List + mark all read |
| NotificationItem | ⏳ Pending | - | Bold if unread, click to navigate |
| NotificationPreferencesPage | ⏳ Pending | - | Server/channel subscription toggles |
| SubscriptionToggle | ⏳ Pending | - | Optimistic update switch |
| Socket.IO notification:new | ⏳ Pending | - | Prepend to cache, toast for urgent |
| Socket.IO unread-count | ⏳ Pending | - | Update Zustand store |
| Navigation on click | ⏳ Pending | - | Post location from notification data |
| Mark as read mutation | ⏳ Pending | - | Optimistic decrement |
| Mark all as read | ⏳ Pending | - | Optimistic reset to 0 |

### Key Decisions
- (To be logged)

### Challenges & Solutions
- (To be logged)

---

## Module 6: User Profile & Management

### Tasks

| Task | Status | Date | Notes |
|------|--------|------|-------|
| ProfilePage | ⏳ Pending | - | Editable bio, avatar upload |
| ProfilePictureUpload | ⏳ Pending | - | File picker, preview, multipart upload |
| BioEditor | ⏳ Pending | - | Inline edit, 500 char max |
| AdminUserListPage | ⏳ Pending | - | Table with filters |
| CreateUserPage | ⏳ Pending | - | Conditional fields by userType |
| BulkImportPage | ⏳ Pending | - | CSV upload, progress, result summary |
| UserDetailDialog | ⏳ Pending | - | Full info modal |
| Deactivate/reactivate users | ⏳ Pending | - | Confirmation + mutation |
| Zod schemas for user creation | ⏳ Pending | - | Discriminated union by userType |

### Key Decisions
- (To be logged)

### Challenges & Solutions
- (To be logged)

---

## Module 7: Admin Dashboard & CRUD

### Tasks

| Task | Status | Date | Notes |
|------|--------|------|-------|
| AdminDashboardPage | ⏳ Pending | - | Stat cards: users, servers, posts |
| DepartmentListPage + CRUD | ⏳ Pending | - | Table, create/edit dialogs |
| DepartmentDetailPage | ⏳ Pending | - | Overview + programs tabs |
| ProgramListPage + CRUD | ⏳ Pending | - | Table, create/edit dialogs |
| CurriculumPage | ⏳ Pending | - | Semester grouping, add/remove courses |
| DisciplineListPage + CRUD | ⏳ Pending | - | Simple list + create |
| ClassListPage + CRUD | ⏳ Pending | - | Table with filters, create dialog |
| ClassDetailPage | ⏳ Pending | - | Overview, courses, semester progression tabs |
| AssignCourseDialog | ⏳ Pending | - | Course + teacher selection |
| SemesterProgressionButton | ⏳ Pending | - | Confirmation dialog, mutation |
| CourseListPage + CRUD | ⏳ Pending | - | Table, create/edit dialogs |

### Key Decisions
- (To be logged)

### Challenges & Solutions
- (To be logged)

---

## Module 8: Society Management

### Tasks

| Task | Status | Date | Notes |
|------|--------|------|-------|
| SocietyListPage | ⏳ Pending | - | Card grid, filter by department |
| CreateSocietyDialog | ⏳ Pending | - | Name, description, president, convenor |
| SocietyDetailPage | ⏳ Pending | - | Overview, members, join requests tabs |
| JoinRequestButton | ⏳ Pending | - | Student join request flow |
| JoinRequestList | ⏳ Pending | - | Approve/reject actions |
| SocietyMemberList | ⏳ Pending | - | Paginated list with remove |
| AddMemberDialog | ⏳ Pending | - | Search + add student |
| Permission checks | ⏳ Pending | - | Convenor/president/admin only |

### Key Decisions
- (To be logged)

### Challenges & Solutions
- (To be logged)

---

## Module 9: Role Management

### Tasks

| Task | Status | Date | Notes |
|------|--------|------|-------|
| RoleManagementPage | ⏳ Pending | - | User search + role assignment UI |
| UserRolesView | ⏳ Pending | - | Current roles with scope context |
| AssignRoleForm | ⏳ Pending | - | Dynamic form adapting to role type |
| RevokeRoleButton | ⏳ Pending | - | Confirmation + mutation |
| RoleScopePicker | ⏳ Pending | - | Loads entities based on role |
| usePermissions hook | ⏳ Pending | - | Permission checks across app |
| Can component | ⏳ Pending | - | Conditional rendering by permission |
| Apply permission-aware UI | ⏳ Pending | - | All modules: hide unauthorized actions |

### Key Decisions
- (To be logged)

### Challenges & Solutions
- (To be logged)

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
