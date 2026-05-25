# Release Readiness

## Purpose
This document owns the Module 7 cross-cutting release checklist. Feature-specific
implementation plans remain in their feature docs; this file verifies that the
hardened system is internally consistent and ready for iterative release.

## Hardening Module 7 Scope
- Error handling and request ID hardening.
- Auth-sensitive audit logging completion.
- Optional Sentry telemetry, disabled unless configured.
- Documentation unification and stale-doc cleanup.
- Dependency/version audit review.
- Seed/demo data review.
- Final full-system regression.

## Environment Checklist
- Backend `.env` is based on `server/.env.example`.
- Frontend `.env` is based on `client/.env.example` when local overrides are
  needed.
- `DATABASE_URL`, JWT secrets, reset secret, email config, and Cloudinary config
  are set per environment.
- `CSRF_ENABLED=true` outside tests unless intentionally disabled for a local
  diagnostic.
- Same-origin production:
  - `AUTH_COOKIE_SAME_SITE=strict`
  - `AUTH_COOKIE_SECURE=auto` or `true`
- Cross-origin production, if ever selected:
  - HTTPS only
  - explicit `CORS_ORIGIN`
  - explicit `CSRF_TRUSTED_ORIGINS`
  - `AUTH_COOKIE_SAME_SITE=none`
  - `AUTH_COOKIE_SECURE=true`

## Seed and Demo Data Checklist
Seed data should support manual validation for:
- admin
- HOD
- Program Director
- Class Representative
- assigned course teacher
- society president
- society convenor
- ordinary society member
- society non-member browser
- server moderator
- channel moderator

## Delegated Workflow Checklist
Confirm these workflows are reachable without relying only on admin routes:
- HOD/PD class workflows under `/academics/classes`.
- Curriculum view under `/academics/programs/:id/curriculum`.
- Society browsing and management under `/societies`.
- Scoped role management under `/roles`.
- Legacy `/admin/societies` and `/admin/roles` routes redirect to delegated
  workspaces.

## Dependency Audit Checklist
- Review `docs/dependency_version_audit.md` against current manifests and locks.
- Do not auto-apply deferred upgrades:
  - ESLint 10 / `@eslint/js` 10
  - `@types/node` 25
- Do not run `npm audit fix` blindly; document vulnerabilities and decide whether
  they require scoped upgrades.

## Final Regression Gate
Run sequentially:

```bash
cd server
timeout 120 npm run build
timeout 120 npm test
```

```bash
cd client
timeout 120 npm run type-check
timeout 120 npm run lint
timeout 120 npm run test
timeout 120 npm run build
timeout 300 npx playwright test
```

If the full Playwright suite is too heavy for a local pass, run and document a
hardened smoke subset covering auth, CSRF recovery, academics, societies, roles,
and accessibility.

## Completion Criteria
- All final gate commands pass or any skipped command has a documented blocker.
- Docs point to a single current source for each topic.
- `docs/release_log.md` contains the Module 7 completion entry.
- No known permission/UI mismatch remains in hardened workflows.
- Root `README.md` reflects current full-system status.

## Module 7 Completion Status
- Status: complete as of 2026-05-25.
- Backend build, focused backend suites, and full backend Jest passed.
- Frontend type-check, lint, Vitest, production build, targeted Playwright, and
  full Playwright passed.
- Remaining follow-ups are operational cleanup items, not release blockers:
  existing Vite large `react-vendor` chunk warning, shutdown-time Vite websocket
  proxy `ECONNRESET` noise in Playwright, and pg concurrent `client.query()`
  deprecation warning.
