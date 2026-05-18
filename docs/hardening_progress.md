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
| 2 | Academic and Class Management Hardening | Not started | TBD |  |  |  |
| 3 | Society Management UX and Access Hardening | Not started | TBD |  |  |  |
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
- [ ] Add delegated academic workspace routes.
- [ ] Preserve or redirect admin academic routes.
- [ ] Add permission-aware class tabs and actions.
- [ ] Add class student list API.
- [ ] Add class student enroll/transfer API.
- [ ] Implement transfer membership sync.
- [ ] Add one-teacher-per-class-course database constraint.
- [ ] Add replace-teacher API.
- [ ] Add replace-teacher UI.
- [ ] Add class graduation/archive schema fields.
- [ ] Add class graduation API.
- [ ] Add graduated class filtering and UI state.
- [ ] Keep semester progression admin/HOD-only.

### Tests
- [ ] Backend tests for HOD class management.
- [ ] Backend tests for PD course/teacher assignment only.
- [ ] Backend tests that PD cannot progress or graduate classes.
- [ ] Backend tests that CR cannot mutate academic records.
- [ ] Backend tests for student transfer and membership sync.
- [ ] Backend tests for cross-department transfer rejection.
- [ ] Backend tests for teacher replacement and membership sync.
- [ ] Backend tests for graduation/archive behavior.
- [ ] Frontend tests for role-based tabs/actions.
- [ ] Frontend tests for transfer form validation.
- [ ] Frontend tests for replace-teacher form validation.
- [ ] Playwright HOD transfer flow.
- [ ] Playwright PD teacher replacement flow.
- [ ] Playwright HOD semester progression flow.
- [ ] Playwright graduation flow.

### Documentation
- [ ] Update `docs/schema.md`.
- [ ] Update `server/docs/FRONTEND_BACKEND_CONTRACT.md`.
- [ ] Update `client/API_CONTRACT.md`.
- [ ] Update `client/PLAN.md`.
- [ ] Update `client/ARCHITECTURE.md`.
- [ ] Update `client/PROGRESS.md`.
- [ ] Update `server/PROGRESS.md`.

### Verification Log
- Commands run:
  - None yet.
- Result:
  - Not verified.

## Module 3 Checklist: Society Management UX and Access Hardening

### Implementation
- [ ] Gate society member query by membership/admin status.
- [ ] Gate society join-request query by management permission.
- [ ] Gate society member-candidate query by management permission.
- [ ] Hide unavailable society tabs before unauthorized queries run.
- [ ] Add clean unavailable states for non-members.
- [ ] Keep member privacy restricted to members/leaders/admins.
- [ ] Scope HOD society creation choices to own department where applicable.
- [ ] Review society create/edit candidate lookup strategy.

### Tests
- [ ] Backend tests for non-member member-list denial.
- [ ] Backend tests for member member-list access.
- [ ] Backend tests for president/convenor request and member management.
- [ ] Backend tests for HOD leadership change.
- [ ] Frontend tests that non-members do not call members/requests/candidates hooks.
- [ ] Frontend tests that members call members only.
- [ ] Frontend tests that leaders/admins can load management data.
- [ ] Frontend tests for unavailable tab fallback.
- [ ] Playwright non-member society overview without 403 UI.
- [ ] Playwright student join request flow.
- [ ] Playwright president/convenor request approval flow.

### Documentation
- [ ] Update `client/API_CONTRACT.md`.
- [ ] Update `server/docs/FRONTEND_BACKEND_CONTRACT.md`.
- [ ] Update `client/ARCHITECTURE.md`.
- [ ] Update `client/PROGRESS.md`.
- [ ] Update `server/PROGRESS.md`.

### Verification Log
- Commands run:
  - None yet.
- Result:
  - Not verified.

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
