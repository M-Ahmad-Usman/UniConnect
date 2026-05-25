# UniConnect Full-System Hardening Plan

## Document Control
- Created: 2026-05-18
- Status: Complete
- Scope: Frontend, backend, schema, security, permissions, accessibility, and documentation alignment
- Companion tracker: `docs/full_system_hardening_progress.md`

## Purpose
The frontend implementation plan is complete, but the current system still needs a hardening pass before production-style use. The main gaps are permission-aware UI behavior, delegated academic management, society access states, class student/course workflows, security controls, accessibility, and synchronized documentation.

This plan is divided into implementation modules so each module can be built, tested, and documented independently.

## Locked Product Decisions
- Academic management:
  - Admins manage all academic data.
  - HODs manage their own department classes, student placement, curriculum, courses, semester progression, and graduation.
  - Program Directors can view curriculum and manage course/teacher assignments for classes in their own program.
  - Program Directors cannot run semester progression.
- Student class management:
  - Admins and own-department HODs can enroll or transfer existing students between classes.
  - HODs do not create, edit, deactivate, or reactivate users in this hardening pass.
  - Student transfer moves class access: add the new class server membership and remove the old auto class server membership.
- Class Representatives:
  - CRs keep communication powers and moderator delegation in their own class server.
  - CRs cannot manage academic records, students, course assignments, or semester progression.
- Society management:
  - Members are visible only to society members, society leadership, and admins.
  - Both society president and convenor manage join requests and ordinary members.
  - Ordinary society membership is university-wide.
  - Society president and convenor eligibility remains same-department.
  - Society leadership changes remain admin/HOD-only for the society department.
- Course teacher assignments:
  - Each class-course has one active teacher.
  - Teacher assignment must be replaceable without removing and re-adding the course.
- Final-semester classes:
  - Add explicit graduation/archive behavior.
- Security:
  - Add configurable CSRF protection because deployment topology is undecided.
  - Add persistent audit logging for privileged writes.
  - Defer admin MFA implementation, but document it as a pre-production follow-up.
- Accessibility:
  - Target WCAG 2.2 AA for practical app-level coverage.

## Module 1: Permission Policy Foundation

### Goal
Make backend permissions the source of truth and expose enough caller-specific capability data for the frontend to avoid unauthorized queries and broken action states.

### Key Changes
- Create a canonical role/capability matrix covering:
  - user management
  - academic catalog management
  - class student placement
  - class course/teacher assignment
  - semester progression and graduation
  - society browsing, membership, requests, and leadership
  - role assignment/revocation
  - server/channel moderation
  - post/channel actions
- Add shared backend permission helpers instead of scattering role checks across services.
- Add caller-specific permission/capability metadata to detail responses that drive UI:
  - `GET /api/classes/:id`
  - `GET /api/societies/:id`
  - a new role-management bootstrap endpoint or scoped assignable-options endpoints.
- Update frontend permission utilities to consume backend-provided capabilities where available, with local helpers only as optimistic display shortcuts.
- Ensure `auth:roles-updated` invalidates current-user, role, server, society, and permission-sensitive query data.

### Tests for This Module
- Backend Jest:
  - admin receives all relevant capabilities.
  - HOD receives only own-department academic capabilities.
  - PD receives only own-program class course/teacher capabilities.
  - CR receives class communication/moderator-delegation capabilities only.
  - society leader receives only own-society capabilities.
  - unauthorized users receive no management capabilities.
- Frontend Vitest:
  - permission helpers map backend capabilities to visible actions correctly.
  - stale role context invalidation clears gated actions after role updates.

### Documentation Updates for This Module
- Update `docs/functional_requirements.md` with final role/capability rules.
- Update `client/API_CONTRACT.md` and `server/docs/FRONTEND_BACKEND_CONTRACT.md` with capability fields.
- Update `client/ARCHITECTURE.md` to document backend-driven UI authorization.
- Update `docs/release_log.md` after implementation.

### Acceptance Criteria
- No frontend module has to infer high-risk management rights from role names alone when backend capability data is available.
- Permission rules are documented in one consistent matrix.
- Existing scoped role tests still pass after helper extraction.

## Module 2: Academic and Class Management Hardening

### Goal
Expose complete class operations to the correct delegated users and close gaps around student placement, course teacher assignment, semester progression, and graduation.

### Key Changes
- Add a delegated academic workspace outside the admin-only route tree:
  - `/academics/classes`
  - `/academics/classes/:id`
  - `/academics/programs/:id/curriculum`
- Keep current `/admin/*` academic routes for admins, either as wrappers, aliases, or redirects.
- Make academic screens permission-aware:
  - overview visible to authorized viewers.
  - students tab visible to admins and own-department HODs.
  - course/teacher tab editable by admins, own-department HODs, and own-program PDs.
  - semester progression and graduation visible only to admins and own-department HODs.
- Add class student APIs:
  - `GET /api/classes/:id/students`
  - `POST /api/classes/:id/students` with `{ studentId }` for enroll/transfer.
- Student transfer rules:
  - target student must be active, same department, and have `StudentInfo`.
  - update `StudentInfo.classId`.
  - add membership to the new class server.
  - remove old class server membership only when it is an auto class membership.
  - preserve department, society, moderator, and manually granted memberships.
- Harden class course assignment:
  - add a schema/database constraint for one teacher per class-course.
  - add replace-teacher endpoint, for example `PATCH /api/classes/:id/courses/:courseId/teacher`.
  - replacement keeps the course channel active.
  - replacement auto-adds the new teacher to the class server.
  - replacement removes the previous teacher's auto class membership only if they no longer teach in that class and do not otherwise need access.
- Harden semester progression:
  - keep admin/HOD-only authorization.
  - keep required teacher assignment validation for next-semester curriculum.
  - ensure archived/locked old course channels and new assignments stay atomic.
  - block progression for graduated classes.
- Add graduation/archive:
  - add class status fields such as `status`, `graduatedAt`, and `graduatedBy`.
  - add `POST /api/classes/:id/graduation`.
  - allow only final-semester classes to graduate.
  - archive/lock active course channels.
  - hide graduated classes from active class lists by default, with an explicit status filter.

### Tests for This Module
- Backend Jest:
  - HOD can create/manage own-department classes.
  - PD can assign/remove/replace teachers only for own-program classes.
  - PD cannot progress or graduate classes.
  - CR cannot manage academic class records.
  - student transfer moves server memberships correctly.
  - student transfer cannot cross departments.
  - teacher replacement updates `Teaches` and memberships correctly.
  - graduation archives/locks course channels and blocks future progression.
  - active class filters exclude graduated classes by default.
- Frontend Vitest:
  - academic tab/action visibility by admin/HOD/PD/CR/student.
  - class transfer form validates selected student.
  - replace-teacher form validates selected teacher.
  - graduated class state hides mutation controls.
- Playwright:
  - HOD class student transfer flow.
  - PD course teacher replacement flow.
  - HOD semester progression flow.
  - graduation flow.

### Documentation Updates for This Module
- Update `docs/database_erd.md` for class status and class-course uniqueness changes.
- Update `server/docs/FRONTEND_BACKEND_CONTRACT.md` and `client/API_CONTRACT.md` for new class endpoints.
- Update `client/FRONTEND_IMPLEMENTATION_PLAN.md`, `client/ARCHITECTURE.md`, and `docs/release_log.md` with the academic workspace.
- Update `docs/release_log.md`.

### Acceptance Criteria
- HOD and PD users can complete their delegated academic tasks without entering the admin-only route tree.
- Student placement and server memberships stay consistent after transfers.
- Course teacher changes no longer require removing and reassigning the course.
- Final-semester classes have a clear terminal state.

## Module 3: Society Management UX and Access Hardening

### Goal
Keep the society workspace useful for all authenticated users while preventing unauthorized API calls, noisy 403 states, and accidental member-list exposure.

### Key Changes
- Fix eager unauthorized queries in `SocietyDetailPage`:
  - fetch overview and membership status for valid society IDs.
  - fetch members only when caller is a member, society leader, or admin.
  - fetch join requests and member candidates only when caller can manage the society.
- Hide or disable unavailable tabs before requests are made:
  - non-members see overview and join/request status only.
  - members see overview and members.
  - society president/convenor/admin see overview, members, requests, add/remove controls.
- Preserve backend enforcement:
  - member list remains restricted to members/leaders/admin.
  - join request review remains president/convenor/admin.
  - add/remove ordinary members remains president/convenor/admin.
  - leadership change remains admin/HOD for the society department.
- Add clean forbidden/empty states:
  - expected lack of access is shown as unavailable UI, not a broken error.
  - real request failures still show retry/error affordances.
- Improve society creation/edit dialogs:
  - use typed candidate endpoints instead of broad user queries.
  - ensure HODs see only own-department choices when creating societies.

### Tests for This Module
- Backend Jest:
  - non-member cannot list members.
  - member can list members.
  - president and convenor can list requests and manage members.
  - HOD can change leadership but cannot view members unless admin/member if that policy remains unchanged.
  - unauthorized member/request endpoints return stable 403 codes/messages.
- Frontend Vitest:
  - non-member detail page does not call members/requests/candidates hooks.
  - member detail page calls members but not requests/candidates.
  - leader/admin page enables management queries and actions.
  - tab parsing redirects or falls back when a tab is unavailable.
- Playwright:
  - PD or unrelated teacher opens a society and sees no member-query error.
  - student non-member can request to join.
  - president/convenor can approve a request and see the member list update.

### Documentation Updates for This Module
- Update `client/API_CONTRACT.md` society auth notes.
- Update `server/docs/FRONTEND_BACKEND_CONTRACT.md` society visibility rules.
- Update `client/ARCHITECTURE.md` with society permission-gated query behavior.
- Update `docs/release_log.md`.

### Acceptance Criteria
- Users never see a 403-driven error state just because the UI exposed a tab or query they cannot use.
- Society member privacy matches the locked product decision.
- Management actions remain backend-enforced and frontend-gated.

## Module 4: Role Management Hardening

### Goal
Make the role-management workspace safe for scoped managers by loading only assignable roles, scopes, and users for the current caller.

### Key Changes
- Replace broad frontend role-management loading with backend-driven scoped options:
  - assignable roles for caller.
  - assignable scopes for selected role.
  - assignable channels for selected server when assigning channel moderators.
  - assignable target users for selected role/scope.
  - revokable role assignments for selected role/scope.
- Add or refine endpoints as needed, for example:
  - `GET /api/roles/assignable`
  - `GET /api/roles/assignable-scopes?role=...`
  - `GET /api/roles/assignable-channels?serverId=...`
  - `GET /api/roles/assignable-users?role=...&scopeId=...`
  - `GET /api/roles/revokable?role=...`
- Enforce role-management access:
  - admin sees all valid role actions.
  - HOD sees department-scoped PD, CR, and moderator actions; society leadership changes remain in society workflows.
  - PD sees CR assignment for own-program classes.
  - CR sees moderator delegation for own class server.
  - society president/convenor see moderator delegation for own society server.
  - users with no assignable or viewable role actions cannot open a functional management page.
- Keep society president/convenor leadership changes through society endpoints, not generic assign/revoke.
- Ensure backend rejects out-of-scope IDs even if the frontend is manipulated.
- Add clearer UI:
  - hide irrelevant role options.
  - load scopes after role selection.
  - load users after role/scope selection.
  - show explanatory empty states when no assignment is possible.

### Tests for This Module
- Backend Jest:
  - each manager receives only assignable roles/scopes/users allowed by policy.
  - manipulated out-of-scope assignment payloads fail with 403.
  - CR moderator delegation remains limited to own class server.
  - society president/convenor moderator delegation remains limited to own society server.
  - society leadership revoke remains rejected by role revoke schema/service.
- Frontend Vitest:
  - role options render from assignable backend data.
  - selected role resets dependent scope/user fields.
  - users with no role actions see access/empty state.
  - revoke payload builder handles scoped roles and moderation roles.
- Playwright:
  - HOD assigns CR within department.
  - PD assigns CR within own program.
  - CR assigns a server moderator in own class server and cannot select another server.
  - society leader assigns society server moderator.

### Documentation Updates for This Module
- Update `client/API_CONTRACT.md` role-management endpoints and authorization.
- Update `server/docs/FRONTEND_BACKEND_CONTRACT.md`.
- Update role matrix in `docs/functional_requirements.md`.
- Update `docs/release_log.md`.

### Acceptance Criteria
- The role-management UI does not expose global lists to scoped managers.
- All assign/revoke choices come from backend-scoped options.
- Backend remains authoritative for every role mutation.

## Module 5: Security Hardening

### Goal
Add production-oriented security controls that complement the existing cookie auth, rate limiting, upload validation, and RBAC work.

### Key Changes
- Add configurable CSRF protection:
  - validate `Origin` and/or `Referer` for unsafe methods.
  - add a CSRF token flow for unsafe methods.
  - make cookie behavior configurable for same-site and future cross-site deployment.
  - keep test bypasses explicit and limited to test environment.
- Add persistent audit logging for privileged writes:
  - schema model such as `AuditLog`.
  - fields: actor user ID, action, target type, target ID, before/after summary, IP, user agent, createdAt.
  - log privileged user, role, class, curriculum, course, society, and auth-sensitive mutations.
  - do not log passwords, tokens, raw secrets, or full uploaded content.
- Harden content and link safety:
  - keep DOMPurify for post HTML.
  - restrict allowed protocols for rich content links.
  - ensure external links use safe `rel` values.
- Review upload safety:
  - keep magic-byte checks.
  - add image dimension or pixel-count limits if practical.
  - ensure Cloudinary uploads use restricted folders/resource types.
- Review logging:
  - replace remaining unprefixed or inappropriate console calls in app code with prefixed `console.warn`/`console.error` where aligned with project rules.
  - avoid logging sensitive request data.
- Document admin MFA as a pre-production follow-up:
  - expected users: admins only.
  - implementation approach left for a later module.

### Tests for This Module
- Backend Jest:
  - unsafe requests without valid CSRF/origin are rejected.
  - valid CSRF/origin requests succeed.
  - test environment remains deterministic.
  - audit logs are created for role, class, society, user activation, and auth-sensitive privileged writes.
  - audit logs exclude sensitive values.
- Frontend Vitest:
  - API client attaches CSRF header/token for unsafe methods if frontend participation is required.
  - sanitized post HTML strips unsafe URLs/attributes.
- Playwright:
  - login and normal unsafe mutations still work with CSRF enabled.
  - stale/missing CSRF token path redirects or recovers cleanly.

### Documentation Updates for This Module
- Update `server/BACKEND_ARCHITECTURE.md` security section.
- Update `server/docs/FRONTEND_BACKEND_CONTRACT.md` auth and CSRF contract.
- Update `server/docs/API_ERROR_CODES.md` with CSRF/audit-related errors if new codes are added.
- Update `docs/database_erd.md` for audit log schema.
- Update `.env.example` if new cookie/CSRF environment variables are added.
- Update `docs/release_log.md`.

### Acceptance Criteria
- Unsafe state-changing requests are protected against CSRF under the chosen deployment config.
- Privileged writes are traceable through persistent audit records.
- Sensitive data is not written to audit logs or routine logs.

## Module 6: UI and Accessibility Hardening

### Goal
Improve the overall frontend quality and accessibility of permission-heavy workflows to a practical WCAG 2.2 AA standard.

### Key Changes
- Replace ad hoc tab buttons with semantic tab patterns:
  - `role="tablist"`, `role="tab"`, `role="tabpanel"` or a local UI abstraction.
  - keyboard navigation for tab groups.
- Improve dialogs:
  - focus trap and restore.
  - clear title/description.
  - accessible validation error association.
  - no invisible broken submit states.
- Improve action controls:
  - accessible names for icon-only buttons.
  - consistent destructive confirmations.
  - disabled actions explain why where needed.
- Improve data tables:
  - captions or contextual headings.
  - consistent empty/loading/error states.
  - responsive overflow that does not hide controls on mobile.
- Improve forms:
  - labels for every input.
  - stable field errors.
  - keyboard-friendly selects/search inputs.
- Improve live states:
  - loading, retry, forbidden, and success states should be readable by assistive tech.
  - urgent toasts and permission messages should not be the only source of critical information.
- Review visual polish:
  - avoid text overflow in cards, buttons, tabs, and table cells.
  - keep dense admin/academic UI readable and predictable.

### Tests for This Module
- Frontend Vitest:
  - core UI primitives expose accessible names and states.
  - permission-gated tabs render stable accessible markup.
  - form validation messages are associated with fields.
- Playwright:
  - keyboard-only navigation through society detail, class detail, role management, and dialogs.
  - mobile viewport smoke tests for academic and society pages.
  - no obvious text overlap or clipped primary actions.

### Documentation Updates for This Module
- Update `client/ARCHITECTURE.md` with accessibility conventions.
- Update `client/FRONTEND_IMPLEMENTATION_PLAN.md` and `docs/release_log.md`.
- Add accessibility notes to the relevant feature sections in `client/API_CONTRACT.md` only if UI behavior affects API usage.

### Acceptance Criteria
- Main hardened workflows are usable with keyboard-only navigation.
- Permission states are understandable without relying on failed API calls.
- Responsive layouts preserve primary actions and readable content.

## Module 7: Cross-Cutting Release Readiness

### Goal
Handle items that do not belong to one feature module and prepare the hardened system for iterative release.

### Key Changes
- Keep this module limited to cross-cutting work:
  - dependency/version audit follow-up.
  - environment/runbook alignment.
  - full regression pass after all modules.
  - final consistency review across frontend, backend, schema, and docs.
  - final seed/demo-data review for all hardened roles and workflows.
- Add seed/demo users and records if earlier modules did not already add them:
  - admin
  - HOD
  - PD
  - CR
  - assigned course teacher
  - society president
  - society convenor
  - ordinary society member
  - non-member browsing societies
- Confirm migrations, generated Prisma client, and docs are in sync.
- Confirm no admin-only frontend paths are the only way to access delegated workflows.

### Tests for This Module
- Run the final regression suite only after module-specific tests pass:
  - server: `timeout 120 npm test`
  - client: `timeout 120 npm run type-check`
  - client: `timeout 120 npm run lint`
  - client: `timeout 120 npm run test`
  - client Playwright smoke suite for hardened flows.
- Do not use this module as a dumping ground for feature-specific tests. Add those tests to the module that implements the behavior.

### Documentation Updates for This Module
- Final pass only:
  - verify all module docs were already updated during implementation.
  - update root-level or shared summary docs if needed.
  - update `docs/full_system_hardening_progress.md` final status.

### Acceptance Criteria
- All module-specific docs and tests are complete before final regression starts.
- Demo data supports manual validation of every hardened role.
- The project has no known permission/UI mismatch in the hardened workflows.

## Implementation Order
1. Module 1: Permission Policy Foundation.
2. Module 3: Society Management UX and Access Hardening.
3. Module 4: Role Management Hardening.
4. Module 2: Academic and Class Management Hardening.
5. Module 5: Security Hardening.
6. Module 6: UI and Accessibility Hardening.
7. Module 7: Cross-Cutting Release Readiness.

This order fixes the most visible permission bug early, then stabilizes role capabilities before the larger academic changes. Security and accessibility can be started in parallel only when they do not conflict with active feature changes, but heavy commands must not run simultaneously.

## Working Rules
- Run backend commands inside `server/`.
- Run frontend commands inside `client/`.
- Do not run heavy build/test commands simultaneously.
- Use `timeout 120 <command>` for heavy commands.
- Each module must update its tests and docs before it is marked complete.
- Schema changes require migration updates, generated Prisma client sync, and `docs/database_erd.md` updates in the same module.
- Backend remains the authority for permissions; frontend gating improves UX but never replaces backend checks.
