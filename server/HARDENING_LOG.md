# UniConnect Backend Hardening Log

## Document Control
- Started: 2026-03-03
- Last Updated: 2026-03-05
- Type: Append-only implementation log
- Plan Reference: `HARDENING_PLAN.md`

## Current Snapshot
- Baseline at start: `446/446` tests passing
- Current verified: `447/447` tests passing
- Implemented: Steps `0-35`
- Pending: None

## Logging Standard
Each entry should include:
1. Step number and title
2. Date
3. Status
4. Tests-after count
5. What was done
6. Deviations from plan
7. Key decisions
8. Issues encountered

## Compact Timeline

| Step Range | Summary | Status |
|---|---|---|
| 0 | Test suite optimization | Complete |
| 1-8 | Performance hardening pass | Complete (Step 6 deferred) |
| 9-16 | Security hardening pass | Complete |
| 17-24 | Production readiness audit phase 1 | Complete |
| 25-29 | Audit phase 2 | Complete |
| 30-33 | Audit phase 3 | Complete |
| 34 | Audit phase 4 | Complete |
| 35 | Audit phase 4 | Complete |

## Implemented Steps Summary

### Step 0
- Test-time bcrypt and seed optimization for faster CI/local feedback.

### Steps 1-8 (Performance)
- Added missing Prisma indexes.
- Removed notification fan-out N+1 unread-count queries.
- Reused preloaded roles in posting flow.
- Parallelized attachment uploads.
- Reduced `canPostInChannel` query waterfall.
- Deferred channel mutation double-fetch elimination.
- Merged society validation queries.
- Added short TTL cache for admin stats.

### Steps 9-16 (Security)
- Added rate limiting tiers.
- Added magic-bytes upload validation.
- Enforced JWT secret length and expiry-format validation.
- Added one-time reset token enforcement via `passwordResetTokenHash`.
- Reduced error information leakage.
- Hardened resolver source handling in authorization.
- Added Socket.IO connection controls and token expiry disconnect.
- Added request/security audit logging.

### Steps 17-24 (Audit Phase 1)
- Added proxy trust for PaaS deployment.
- Added explicit request body limits.
- Removed duplicate Prisma shutdown handlers.
- Added graceful shutdown timeout and process-level crash handlers.
- Extracted shared `parseExpiry` utility.
- Added DB-aware health check response.
- Added `.env.example` template.

### Steps 25-29 (Audit Phase 2)
- Added stale refresh token cleanup utility.
- Added role-permission cache TTL.
- Added multi-origin CORS parsing support.
- Centralized bcrypt rounds constant.
- Tuned helmet config for API deployment profile.

### Steps 30-33 (Audit Phase 3)
- Added request timeout middleware.
- Surfaced email delivery failures in controlled manner.
- Batched bulk user import processing.
- Disabled unnecessary Socket.IO cleanup interval in test mode.

### Step 35 (Audit Phase 4)
- Standardized `server/README.md` into an operations-first runbook.
- Added setup workflow, script reference, troubleshooting guidance, and `.env.example` pointer.
- Added direct cross-links to `API_DEVELOPMENT_PLAN.md`, `PROGRESS.md`, `HARDENING_PLAN.md`, and `HARDENING_LOG.md`.

### Step 34 (Audit Phase 4)
- Added canonical API error code catalog in `docs/API_ERROR_CODES.md`.
- Documented standard error payload, HTTP/code mapping, and frontend handling guidance.
- Linked catalog from `server/README.md` and frontend contract docs.

## Next Entries
Append new entries below this section in chronological order.
