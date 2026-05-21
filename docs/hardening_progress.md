# UniConnect Hardening Progress Tracker

## Document Control
- Created: 2026-05-18
- Status: In progress
- Plan reference: `docs/hardening_plan.md`

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
| 4 | Role Management Hardening | Not started | TBD |  |  |  |
| 5 | Security Hardening | Not started | TBD |  |  |  |
| 6 | UI and Accessibility Hardening | Not started | TBD |  |  |  |
| 7 | Cross-Cutting Release Readiness | Not started | TBD |  |  |  |

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
- [x] Update `client/PROGRESS.md`.
- [x] Update `server/PROGRESS.md`.

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
- [x] Update `docs/schema.md`.
- [x] Update `server/docs/FRONTEND_BACKEND_CONTRACT.md`.
- [x] Update `client/API_CONTRACT.md`.
- [x] Update `client/PLAN.md`.
- [x] Update `client/ARCHITECTURE.md`.
- [x] Update `client/PROGRESS.md`.
- [x] Update `server/PROGRESS.md`.

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
- [x] Update `client/PROGRESS.md`.
- [x] Update `server/PROGRESS.md`.

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
- [ ] Add assignable-role backend response for caller.
- [ ] Add assignable-scope backend response for selected role.
- [ ] Add assignable-user backend response for selected role/scope.
- [ ] Add revokable-role backend response or filtered current-role response.
- [ ] Replace broad role-management frontend loading.
- [ ] Hide invalid role options and scopes.
- [ ] Add role-workspace guard or unavailable state.
- [ ] Keep society leadership changes out of generic revoke.
- [ ] Verify manipulated payloads still fail backend authorization.

### Tests
- [ ] Backend tests for assignable roles by admin.
- [ ] Backend tests for assignable roles/scopes by HOD.
- [ ] Backend tests for assignable roles/scopes by PD.
- [ ] Backend tests for CR moderator delegation scope.
- [ ] Backend tests for society leader moderator delegation scope.
- [ ] Backend tests for manipulated out-of-scope payload rejection.
- [ ] Frontend tests for backend-driven role options.
- [ ] Frontend tests for dependent field resets.
- [ ] Frontend tests for no-actions unavailable state.
- [ ] Playwright HOD assigns CR.
- [ ] Playwright CR assigns class server moderator.
- [ ] Playwright society leader assigns society moderator.

### Documentation
- [ ] Update `client/API_CONTRACT.md`.
- [ ] Update `server/docs/FRONTEND_BACKEND_CONTRACT.md`.
- [ ] Update `docs/functional_requirements.md`.
- [ ] Update `client/PROGRESS.md`.
- [ ] Update `server/PROGRESS.md`.

### Verification Log
- Commands run:
  - None yet.
- Result:
  - Not verified.

## Module 5 Checklist: Security Hardening

### Implementation
- [ ] Add configurable cookie/CSRF environment settings.
- [ ] Add Origin/Referer validation for unsafe methods.
- [ ] Add CSRF token flow for unsafe methods.
- [ ] Integrate frontend CSRF handling if required by token design.
- [ ] Add audit log schema/model.
- [ ] Log privileged user and role mutations.
- [ ] Log privileged class, curriculum, course, and society mutations.
- [ ] Log auth-sensitive privileged events where appropriate.
- [ ] Ensure audit logs exclude sensitive values.
- [ ] Harden rich-content allowed protocols.
- [ ] Review external-link `rel` behavior.
- [ ] Review upload dimension/pixel-count limits.
- [ ] Review Cloudinary resource/folder restrictions.
- [ ] Replace remaining inappropriate app logging.
- [ ] Document admin MFA follow-up.

### Tests
- [ ] Backend tests for CSRF rejection.
- [ ] Backend tests for valid CSRF/origin success.
- [ ] Backend tests for test environment behavior.
- [ ] Backend tests for audit log creation.
- [ ] Backend tests that audit logs exclude secrets/tokens/passwords.
- [ ] Frontend tests for CSRF client behavior if needed.
- [ ] Frontend tests for rich-content sanitization.
- [ ] Playwright unsafe mutation with CSRF enabled.
- [ ] Playwright missing/stale CSRF recovery path.

### Documentation
- [ ] Update `server/API_DEVELOPMENT_PLAN.md`.
- [ ] Update `server/docs/FRONTEND_BACKEND_CONTRACT.md`.
- [ ] Update `server/docs/API_ERROR_CODES.md` if new codes are added.
- [ ] Update `docs/schema.md`.
- [ ] Update `.env.example` if new env vars are added.
- [ ] Update `server/PROGRESS.md`.
- [ ] Update `client/PROGRESS.md`.

### Verification Log
- Commands run:
  - None yet.
- Result:
  - Not verified.

## Module 6 Checklist: UI and Accessibility Hardening

### Implementation
- [ ] Replace ad hoc tabs with accessible tab semantics.
- [ ] Improve dialog focus, labels, descriptions, and validation state.
- [ ] Add accessible names for icon-only and compact action buttons.
- [ ] Add consistent destructive confirmations.
- [ ] Improve data table captions/headings and responsive behavior.
- [ ] Improve form labels and error associations.
- [ ] Improve loading, empty, forbidden, retry, and success states.
- [ ] Review mobile layouts for hardened class, society, and role workflows.
- [ ] Review text overflow and clipped actions.

### Tests
- [ ] Frontend tests for accessible tab markup.
- [ ] Frontend tests for dialog accessible names/descriptions.
- [ ] Frontend tests for form error associations.
- [ ] Playwright keyboard navigation through society detail.
- [ ] Playwright keyboard navigation through class detail.
- [ ] Playwright keyboard navigation through role management.
- [ ] Playwright mobile viewport smoke tests.

### Documentation
- [ ] Update `client/ARCHITECTURE.md`.
- [ ] Update `client/PLAN.md`.
- [ ] Update `client/PROGRESS.md`.
- [ ] Update API docs only if accessibility-driven UI behavior changes API usage.

### Verification Log
- Commands run:
  - None yet.
- Result:
  - Not verified.

## Module 7 Checklist: Cross-Cutting Release Readiness

### Implementation
- [ ] Review dependency/version audit follow-ups.
- [ ] Align environment/runbook notes after all module changes.
- [ ] Review seed/demo data for every hardened role.
- [ ] Add missing seed/demo data not already covered by earlier modules.
- [ ] Confirm migrations and generated Prisma client are in sync.
- [ ] Confirm delegated workflows are not only reachable through admin routes.
- [ ] Final consistency review across frontend, backend, schema, and docs.

### Final Regression
- [ ] Server: `cd server && timeout 120 npm test`
- [ ] Client type-check: `cd client && timeout 120 npm run type-check`
- [ ] Client lint: `cd client && timeout 120 npm run lint`
- [ ] Client unit tests: `cd client && timeout 120 npm run test`
- [ ] Client Playwright hardened-flow smoke suite.

### Documentation
- [ ] Verify all module-specific docs were updated inside their modules.
- [ ] Update root/shared summary docs only if still needed.
- [ ] Mark final status in this tracker.

### Verification Log
- Commands run:
  - None yet.
- Result:
  - Not verified.

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
