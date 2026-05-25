# UniConnect Full-System Hardening Progress

## Document Control
- Created: 2026-05-18
- Status: Complete
- Plan reference: `docs/full_system_hardening_plan.md`

## Status Legend
- Not started: no implementation work has begun.
- In progress: implementation has started.
- Blocked: waiting on a decision, dependency, or failing prerequisite.
- Implemented: code is complete, but verification or docs are incomplete.
- Complete: implementation, tests, and docs are complete.

## Module Status Board

| Module | Title | Status | Owner | Started | Completed | Notes |
|---|---|---|---|---|---|---|
| 1 | Permission Policy Foundation | Complete | Codex | 2026-05-18 | 2026-05-18 | Focused permission tests, regression slices, build, and type-check pass |
| 2 | Academic and Class Management Hardening | Complete | Codex | 2026-05-18 | 2026-05-19 | Backend/frontend implementation, focused unit tests, DB-backed backend tests, Playwright academic flows, and docs complete |
| 3 | Society Management UX and Access Hardening | Complete | Codex | 2026-05-20 | 2026-05-20 | Backend/frontend implementation, focused Jest/Vitest coverage, Playwright society flows, lint, build, type-check, and docs complete |
| 4 | Role Management Hardening | Complete | Codex | 2026-05-21 | 2026-05-21 | Scoped backend option APIs, lazy frontend role workspace, focused Jest/Vitest coverage, Playwright role flows, lint, build, type-check, and docs complete |
| 5 | Security Hardening | Complete | Codex | 2026-05-21 | 2026-05-21 | CSRF, audit logs, content/link safety, upload pixel limits, Cloudinary folder allowlist, focused unit/Jest/Playwright verification complete |
| 6 | UI and Accessibility Hardening | Complete | Codex | 2026-05-21 | 2026-05-21 | Cookie-backed theme support, semantic tabs, accessible state/form/table primitives, hardened society/class/role flows, Vitest coverage, Playwright keyboard/mobile/axe coverage, lint, type-check, build complete |
| 7 | Cross-Cutting Release Readiness | Complete | Codex | 2026-05-25 | 2026-05-25 | Request ID/error-code hardening, auth audit coverage, optional telemetry, docs unification, final regression, and release-readiness docs complete |

## Module 1 Checklist: Permission Policy Foundation

### Implementation
- [x] Create canonical role/capability matrix.
- [x] Extract or standardize backend scoped permission helpers.
- [x] Add capability data to class detail responses.
- [x] Add capability data to society detail responses.
- [x] Add role-management bootstrap or scoped option endpoints.
- [x] Update frontend permission helpers to consume backend capabilities.
- [x] Ensure role-update socket events invalidate permission-sensitive state.

### Tests
- [x] Backend tests for admin capabilities.
- [x] Backend tests for HOD own-department capabilities.
- [x] Backend tests for PD own-program capabilities.
- [x] Backend tests for CR communication/moderator capabilities only.
- [x] Backend tests for society leader capabilities.
- [x] Frontend tests for action visibility from capabilities.
- [x] Frontend tests for role-update invalidation behavior.

### Documentation
- [x] Update `docs/functional_requirements.md`.
- [x] Update `client/API_CONTRACT.md`.
- [x] Update `server/docs/FRONTEND_BACKEND_CONTRACT.md`.
- [x] Update `client/ARCHITECTURE.md`.
- [x] Update `docs/release_log.md`.
- [x] Update `docs/release_log.md`.

### Verification Log
- Commands run:
  - `cd server && timeout 120 npm test -- tests/modules/permission.test.ts`
  - `cd server && timeout 120 npm test -- tests/modules/class.test.ts tests/modules/society.test.ts tests/modules/role.test.ts tests/modules/user.test.ts`
  - `cd server && timeout 120 npm run build`
  - `cd client && timeout 120 npm run test -- src/hooks/__tests__/usePermissions.test.ts src/lib/__tests__/socket.test.ts`
  - `cd client && timeout 120 npm run type-check`
- Result:
  - Focused Module 1 backend and frontend tests pass.
  - Existing class, society, role, and user backend regression slices pass.
  - Backend build and frontend type-check pass.
  - Backend database-backed tests require local PostgreSQL test DB access outside the filesystem sandbox.

## Module 2 Checklist: Academic and Class Management Hardening

### Implementation
- [x] Add delegated academic workspace routes.
- [x] Preserve or redirect admin academic routes.
- [x] Add permission-aware class tabs and actions.
- [x] Add class student list API.
- [x] Add class student enroll/transfer API.
- [x] Implement transfer membership sync.
- [x] Add one-teacher-per-class-course database constraint.
- [x] Add replace-teacher API.
- [x] Add replace-teacher UI.
- [x] Add class graduation/archive schema fields.
- [x] Add class graduation API.
- [x] Add graduated class filtering and UI state.
- [x] Keep semester progression admin/HOD-only.

### Tests
- [x] Backend tests for HOD class management.
- [x] Backend tests for PD course/teacher assignment only.
- [x] Backend tests that PD cannot progress or graduate classes.
- [x] Backend tests that CR cannot mutate academic records.
- [x] Backend tests for student transfer and membership sync.
- [x] Backend tests for cross-department transfer rejection.
- [x] Backend tests for teacher replacement and membership sync.
- [x] Backend tests for graduation/archive behavior.
- [x] Frontend tests for role-based tabs/actions.
- [x] Frontend tests for transfer form validation.
- [x] Frontend tests for replace-teacher form validation.
- [x] Playwright HOD transfer flow.
- [x] Playwright PD teacher replacement flow.
- [x] Playwright HOD semester progression flow.
- [x] Playwright graduation flow.

### Documentation
- [x] Update `docs/database_erd.md`.
- [x] Update `server/docs/FRONTEND_BACKEND_CONTRACT.md`.
- [x] Update `client/API_CONTRACT.md`.
- [x] Update `client/FRONTEND_IMPLEMENTATION_PLAN.md`.
- [x] Update `client/ARCHITECTURE.md`.
- [x] Update `docs/release_log.md`.
- [x] Update `docs/release_log.md`.

### Verification Log
- Commands run:
  - `cd server && npx prisma generate`
  - `cd server && timeout 120 npm run build`
  - `cd server && timeout 120 npm run db:migrate:test`
  - `cd server && timeout 120 npm test -- tests/modules/class.test.ts`
  - `cd server && timeout 120 npm test -- tests/modules/class.test.ts -t "POST /api/classes/:id/courses"`
  - `cd client && timeout 120 npm run type-check`
  - `cd server && timeout 120 npm test -- tests/modules/class.test.ts -t "Module 2 - Academic class hardening"`
  - `cd server && timeout 120 npm test -- tests/modules/course.test.ts`
  - `cd client && timeout 120 npm run lint`
  - `cd client && timeout 120 npm run test -- src/features/admin/__tests__/schemas.test.ts src/features/admin/__tests__/utils.test.ts`
  - `cd client && timeout 120 npm run type-check`
  - `cd client && timeout 300 npx playwright test e2e/module2-academics.spec.ts`
- Result:
  - Prisma generate, backend build, test migration, frontend type-check, and frontend lint pass.
  - DB-backed class and course Jest slices pass when run with local PostgreSQL test DB access outside the filesystem sandbox.
  - Frontend admin schema/action-state Vitest coverage passes.
  - Module 2 Playwright academic flows pass for HOD transfer, PD cross-department teacher replacement, HOD semester progression, and HOD graduation.

### Current verification:

- server: npm run build passed
- server: full npm test passed, 471/471
- client: full npm run test passed, 103/103
- client: npm run lint passed
- client: npm run type-check passed
- client: full npx playwright test passed, 25/25

## Module 3 Checklist: Society Management UX and Access Hardening

### Implementation
- [x] Gate society member query by membership/admin status.
- [x] Gate society join-request query by management permission.
- [x] Gate society member-candidate query by management permission.
- [x] Hide unavailable society tabs before unauthorized queries run.
- [x] Add clean unavailable states for non-members.
- [x] Keep member privacy restricted to members/leaders/admins.
- [x] Scope HOD society creation choices to own department where applicable.
- [x] Review society create/edit candidate lookup strategy.

### Tests
- [x] Backend tests for non-member member-list denial.
- [x] Backend tests for member member-list access.
- [x] Backend tests for president/convenor request and member management.
- [x] Backend tests for HOD leadership change.
- [x] Frontend tests that non-members do not call members/requests/candidates hooks.
- [x] Frontend tests that members call members only.
- [x] Frontend tests that leaders/admins can load management data.
- [x] Frontend tests for unavailable tab fallback.
- [x] Playwright non-member society overview without 403 UI.
- [x] Playwright student join request flow.
- [x] Playwright president/convenor request approval flow.

### Documentation
- [x] Update `client/API_CONTRACT.md`.
- [x] Update `server/docs/FRONTEND_BACKEND_CONTRACT.md`.
- [x] Update `client/ARCHITECTURE.md`.
- [x] Update `docs/release_log.md`.
- [x] Update `docs/release_log.md`.

### Verification Log
- Commands run:
  - `cd server && timeout 120 npm run build`
  - `cd server && timeout 120 npm test -- tests/modules/society.test.ts`
  - `cd client && timeout 120 npm run test -- src/features/societies/__tests__/utils.test.ts src/lib/__tests__/socket.test.ts`
  - `cd client && timeout 120 npm run type-check`
  - `cd client && timeout 120 npm run lint`
  - `cd client && timeout 300 npx playwright test e2e/module3-societies.spec.ts`
- Result:
  - Backend build passes.
  - Focused society Jest suite passes, 57/57.
  - Frontend society/socket Vitest coverage passes, 5/5.
  - Frontend type-check and lint pass.
  - Module 3 Playwright society hardening flows pass for unrelated teacher overview, student join request, and president approval/member-list update.
  - DB-backed Jest and Playwright commands require local PostgreSQL/server access outside the filesystem sandbox.

## Module 4 Checklist: Role Management Hardening

### Implementation
- [x] Add assignable-role backend response for caller.
- [x] Add assignable-scope backend response for selected role.
- [x] Add assignable-user backend response for selected role/scope.
- [x] Add revokable-role backend response or filtered current-role response.
- [x] Replace broad role-management frontend loading.
- [x] Hide invalid role options and scopes.
- [x] Add role-workspace guard or unavailable state.
- [x] Keep society leadership changes out of generic revoke.
- [x] Verify manipulated payloads still fail backend authorization.

### Tests
- [x] Backend tests for assignable roles by admin.
- [x] Backend tests for assignable roles/scopes by HOD.
- [x] Backend tests for assignable roles/scopes by PD.
- [x] Backend tests for CR moderator delegation scope.
- [x] Backend tests for society leader moderator delegation scope.
- [x] Backend tests for manipulated out-of-scope payload rejection.
- [x] Frontend tests for backend-driven role options.
- [x] Frontend tests for dependent field resets.
- [x] Frontend tests for no-actions unavailable state.
- [x] Playwright HOD assigns CR.
- [x] Playwright PD assigns CR.
- [x] Playwright CR assigns class server moderator.
- [x] Playwright society leader assigns society moderator.

### Documentation
- [x] Update `client/API_CONTRACT.md`.
- [x] Update `server/docs/FRONTEND_BACKEND_CONTRACT.md`.
- [x] Update `docs/functional_requirements.md`.
- [x] Update `docs/release_log.md`.
- [x] Update `docs/release_log.md`.

### Verification Log
- Commands run:
  - `cd server && timeout 120 npm run build`
  - `cd server && timeout 120 npm test -- tests/modules/role.test.ts`
  - `cd client && timeout 120 npm run test -- src/features/roles/__tests__/utils.test.ts src/lib/__tests__/socket.test.ts`
  - `cd client && timeout 120 npm run type-check`
  - `cd client && timeout 120 npm run lint`
  - `cd client && timeout 120 npm run build`
  - `cd client && timeout 300 npx playwright test e2e/module4-role-management.spec.ts`
- Result:
  - Backend build passes.
  - Focused role Jest suite passes, 47/47.
  - Frontend role/socket Vitest coverage passes, 6/6.
  - Frontend type-check, lint, and production build pass. Vite still reports the existing large `react-vendor` chunk warning.
  - Module 4 Playwright role-management flows pass for HOD CR assignment, PD CR assignment, CR class-server moderator assignment, and society leader moderator assignment.

## Module 5 Checklist: Security Hardening

### Implementation
- [x] Add configurable cookie/CSRF environment settings.
- [x] Add Origin/Referer validation for unsafe methods.
- [x] Add CSRF token flow for unsafe methods.
- [x] Integrate frontend CSRF handling if required by token design.
- [x] Add audit log schema/model.
- [x] Log privileged user and role mutations.
- [x] Log privileged class, curriculum, course, and society mutations.
- [ ] Log auth-sensitive privileged events where appropriate.
- [x] Ensure audit logs exclude sensitive values.
- [x] Harden rich-content allowed protocols.
- [x] Review external-link `rel` behavior.
- [x] Review upload dimension/pixel-count limits.
- [x] Review Cloudinary resource/folder restrictions.
- [x] Replace remaining inappropriate app logging.
- [x] Document admin MFA follow-up.

### Tests
- [x] Backend tests for CSRF rejection.
- [x] Backend tests for valid CSRF/origin success.
- [x] Backend tests for test environment behavior.
- [x] Backend tests for audit log creation.
- [x] Backend tests that audit logs exclude secrets/tokens/passwords.
- [x] Frontend tests for CSRF client behavior if needed.
- [x] Frontend tests for rich-content sanitization.
- [x] Playwright unsafe mutation with CSRF enabled.
- [x] Playwright missing/stale CSRF recovery path.

### Documentation
- [x] Update `server/BACKEND_ARCHITECTURE.md`.
- [x] Update `server/docs/FRONTEND_BACKEND_CONTRACT.md`.
- [x] Update `server/docs/API_ERROR_CODES.md` if new codes are added.
- [x] Update `docs/database_erd.md`.
- [x] Update `.env.example` if new env vars are added.
- [x] Update `docs/release_log.md`.
- [x] Update `docs/release_log.md`.

### Verification Log
- Commands run:
  - `cd server && npx prisma generate`
  - `cd server && timeout 120 npm run build`
  - `cd server && timeout 120 npm test -- tests/modules/security.test.ts`
  - `cd server && timeout 120 npm test -- tests/modules/user.test.ts tests/modules/role.test.ts`
  - `cd client && timeout 120 npm run test -- src/features/posts/__tests__/utils.test.ts`
  - `cd client && timeout 120 npm run test -- src/api/__tests__/client.test.ts src/features/posts/__tests__/utils.test.ts`
  - `cd client && timeout 120 npm run type-check`
  - `cd client && timeout 120 npm run lint`
  - `cd client && timeout 300 npx playwright test e2e/module5-security.spec.ts`
  - `cd client && timeout 300 npx playwright test e2e/auth-flows.spec.ts`
- Result:
  - Backend build passes.
  - Focused security Jest suite passes, 4/4, with CSRF enabled inside tests.
  - Focused user/role regression suites pass, 73/73.
  - Frontend API CSRF client and post sanitizer Vitest coverage passes, 20/20.
  - Frontend type-check and lint pass.
  - Module 5 Playwright security flows pass, 2/2, covering normal unsafe mutation and stale CSRF recovery.
  - Auth Playwright regression passes, 4/4, after enabling CSRF in the E2E backend.
  - Local `npm run db:migrate:test` reported Prisma `P3005` because the existing test DB was non-empty and unbaselined; `prisma db push` was used only to sync the isolated local test DB for verification.

## Module 6 Checklist: UI and Accessibility Hardening

### Implementation
- [x] Replace ad hoc tabs with accessible tab semantics.
- [x] Improve dialog focus, labels, descriptions, and validation state.
- [x] Add accessible names for icon-only and compact action buttons.
- [x] Add consistent destructive confirmations.
- [x] Improve data table captions/headings and responsive behavior.
- [x] Improve form labels and error associations.
- [x] Improve loading, empty, forbidden, retry, and success states.
- [x] Review mobile layouts for hardened class, society, and role workflows.
- [x] Review text overflow and clipped actions.

### Tests
- [x] Frontend tests for accessible tab markup.
- [x] Frontend tests for dialog accessible names/descriptions.
- [x] Frontend tests for form error associations.
- [x] Playwright keyboard navigation through society detail.
- [x] Playwright keyboard navigation through class detail.
- [x] Playwright keyboard navigation through role management.
- [x] Playwright mobile viewport smoke tests.

### Documentation
- [x] Update `client/ARCHITECTURE.md`.
- [x] Update `client/FRONTEND_IMPLEMENTATION_PLAN.md`.
- [x] Update `docs/release_log.md`.
- [x] Update API docs only if accessibility-driven UI behavior changes API usage.

### Verification Log
- Commands run:
  - `cd client && timeout 120 npm run type-check`
  - `cd client && timeout 120 npm run lint`
  - `cd client && timeout 120 npm run test`
  - `cd client && timeout 120 npm run build`
  - `cd client && timeout 120 npx playwright test e2e/module6-ui-accessibility.spec.ts --reporter=line`
- Result:
  - Passed. Initial Playwright run required escalation because the sandbox blocked `tsx` IPC under `/tmp`; the final escalated run passed 2/2.

## Module 7 Checklist: Cross-Cutting Release Readiness

### Implementation
- [x] Review dependency/version audit follow-ups.
- [x] Align environment/runbook notes after all module changes.
- [x] Review seed/demo data for every hardened role.
- [x] Add missing seed/demo data not already covered by earlier modules.
- [x] Confirm migrations and generated Prisma client are in sync.
- [x] Confirm delegated workflows are not only reachable through admin routes.
- [x] Final consistency review across frontend, backend, schema, and docs.
- [x] Add request ID propagation for API errors and response correlation.
- [x] Replace generic frontend-safe errors with stable domain-specific error codes where recoverable.
- [x] Add optional backend/frontend telemetry with sensitive-data scrubbing.
- [x] Add auth-sensitive audit logs for password reset/change/logout token revocation.

### Final Regression
- [x] Server: `cd server && timeout 180 npm test`
- [x] Client type-check: `cd client && npm run type-check`
- [x] Client lint: `cd client && npm run lint`
- [x] Client unit tests: `cd client && npm run test`
- [x] Client production build: `cd client && npm run build`
- [x] Client Playwright hardened-flow smoke suite: `cd client && npx playwright test --reporter=line`

### Documentation
- [x] Verify all module-specific docs were updated inside their modules.
- [x] Update root/shared summary docs only if still needed.
- [x] Mark final status in this tracker.
- [x] Unify stale backend/frontend progress docs into canonical root docs without dropping retained implementation context.

### Verification Log
- Commands run:
  - `cd server && timeout 120 npm run build`
  - `cd server && timeout 120 npm test -- tests/shared/errorHandler.test.ts tests/modules/auth.test.ts`
  - `cd server && timeout 180 npm test`
  - `cd client && timeout 120 npm run type-check`
  - `cd client && timeout 120 npm run lint`
  - `cd client && timeout 120 npm run test`
  - `cd client && timeout 120 npm run build`
  - `cd client && npx playwright test e2e/auth-flows.spec.ts e2e/auth-force-change.spec.ts e2e/module2-shell.spec.ts e2e/module3-societies.spec.ts e2e/module4-posts-announcements.spec.ts --reporter=line`
  - `cd client && npx playwright test --reporter=line`
- Result:
  - Backend build passes.
  - Focused backend auth/error-handler suites pass.
  - Full backend Jest suite passes, 490/490.
  - Frontend type-check, lint, Vitest, production build, targeted Playwright, and full Playwright pass.
  - Full frontend Vitest suite passes, 129/129.
  - Full Playwright suite passes, 36/36.
  - Vite still reports the existing large `react-vendor` chunk warning during production build.
  - Playwright runs still emit shutdown-time Vite websocket proxy `ECONNRESET` noise and a pg deprecation warning about concurrent `client.query()` usage; these did not fail the suite and should be tracked as follow-up operational cleanup.

## Decision Log

| Date | Decision |
|---|---|
| 2026-05-18 | Test and documentation tasks belong inside their implementation modules. Module 7 contains only cross-cutting release readiness. |
| 2026-05-18 | HODs can manage student class placement but not create/edit/deactivate users. |
| 2026-05-18 | PDs can manage own-program class course/teacher assignment but not progression. |
| 2026-05-18 | Society member visibility remains members/leaders/admin only. |
| 2026-05-18 | CRs keep class-server moderator delegation but cannot manage academic records. |
| 2026-05-18 | Add configurable CSRF protection and privileged-write audit logging. |

## Open Risks
- The academic workspace may require significant route/layout reuse to avoid duplicating admin CRUD components.
- Capability response design must be settled before large frontend permission changes.
- CSRF behavior depends on final deployment topology, so environment configuration must be explicit.
- Schema changes for class graduation and class-course uniqueness need careful migration and seed updates.
