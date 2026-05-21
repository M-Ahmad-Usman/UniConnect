# UniConnect Backend Progress

## Document Control
- Last Updated: 2026-05-18
- Status: Active
- Scope: Backend (`server/`)

## Executive Snapshot
- Automated tests: baseline `459/459` passing across `17` suites; Module 1 permission foundation focused suite adds `4` passing tests
- Functional modules: `13/13` complete (Modules 0 to 12)
- Hardening plan: Steps `1-35` complete

## Hardening Update (2026-05-18)
- Implemented Module 2 academic/class management hardening: class lifecycle fields, graduation metadata, one-teacher-per-class-course uniqueness, scoped class APIs, student transfer, teacher replacement, and graduation.
- Hardened membership synchronization for student transfer, course removal/replacement, semester progression, and graduated read-only class channels.
- Verified Prisma generation, test migration application, and backend build. DB-backed Jest class suite exceeded the 120s command timeout and needs follow-up split verification.

## Hardening Update (2026-05-20)
- Implemented Module 3 society access hardening: university-wide ordinary member candidates, department-scoped leadership candidate lookup, and explicit HOD privacy boundaries.
- Added `/api/societies/leadership-candidates` for admin/HOD president/convenor selection without broad user-list queries.
- Verified backend build and focused society integration tests.

## Verification Snapshot (2026-05-18)
- Verified `timeout 120 npm test -- tests/modules/permission.test.ts`.
- Verified `timeout 120 npm test -- tests/modules/class.test.ts tests/modules/society.test.ts tests/modules/role.test.ts tests/modules/user.test.ts`.
- Verified `timeout 120 npm run build`.
- Applied the isolated test database migrations with `timeout 120 npm run db:migrate:test`.
- Focused society, role, and notification integration suites passed with 125 Jest tests.
- Full backend suite passed with 459 Jest tests.
- Added frontend Module 8/9 support endpoints, join request review notifications, and role refresh events.

## Module Completion Matrix

| Module | Name | Status | Tests |
|---|---|---|---|
| 0 | Project Foundation and Shared Infrastructure | Complete | 30 |
| 1 | Authentication | Complete | 24 |
| 2 | User Management | Complete | 24 |
| 3 | Department and Program Management | Complete | 36 |
| 4 | Class Management | Complete | 36 |
| 5 | Course Management | Complete | 16 |
| 6 | Society Management | Complete | 52 |
| 7 | Role Management | Complete | 42 |
| 8 | Server and Channel Management | Complete | 59 |
| 9 | Posts and Announcements | Complete | 46 |
| 10 | Notifications and Socket.IO | Complete | 31 |
| 11 | Semester Transition and Curriculum | Complete | 36 |
| 12 | Admin Dashboard | Complete | 19 |

## Hardening and Audit Summary

### Completed
- Performance hardening (indexes, N+1 removal, caching, query optimization)
- Security hardening (rate limiting, magic-bytes validation, secret length rules, reset token invalidation, leakage fixes, Socket.IO guards, audit logging)
- Production readiness audit phases 1 to 3 (proxy trust, timeout controls, health-check hardening, cache TTLs, CORS multi-origin support, operational reliability improvements)
- Production-readiness documentation pass (API error code catalog and frontend integration contract)

### Pending
None

Details: `HARDENING_PLAN.md`, `HARDENING_LOG.md`

## Recent Key Additions
- Backend-driven permission capability foundation with `/api/permissions/me`.
- Caller-specific class and society detail permission payloads for frontend UI gating.
- Type-aware notification preferences with `NEW_POST` and `ROLE_ASSIGNED` controls
- Role-assignment notification creation with server-level mute support
- Society join request approval/rejection notifications with `SOCIETY_REQUEST_REVIEWED`
- Society membership status, university-wide member-candidate, and department-scoped leadership-candidate endpoints for role-based frontend workflows
- `auth:roles-updated` socket event for affected users after role changes
- Notification payload priority metadata for urgent frontend toasts
- `passwordResetTokenHash` one-time token enforcement
- `BCRYPT_ROUNDS` centralized constant
- Shared `parseExpiry` utility extraction
- DB-aware `/api/health`
- Request timeout middleware

## Risks and Gaps
- Periodic documentation drift risk exists because this repository evolves quickly; re-validate this file after major merges.

## Update Policy
- Keep this file concise and status-oriented.
- Store deep implementation history in `HARDENING_LOG.md`.
- Update immediately after major module completion, hardening steps, or test baseline changes.
