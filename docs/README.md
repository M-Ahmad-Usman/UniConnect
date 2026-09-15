# UniConnect Documentation Index

## Purpose
This is the primary documentation entry point. It points to the canonical source for each topic so implementation details do not drift across duplicate files.

## Current Status
- Backend functional modules are complete and hardened.
- Frontend functional modules are complete and hardened.
- Full-system hardening Modules 1-7 are complete.
- Schema/lifecycle/public-ID refactor Modules 0-9 are complete with baseline migration squashed.
- Structured Pino logging with request correlation IDs and sensitive-data redaction is active.
- Mobile Android wrapper project (`mobile/`) is configured with Capacitor 8 and verified deep links.
- Production deployment is live on Azure App Service (`https://uni-connect.dev`).
- Current release log: `docs/release_log.md`.
- Release gate/checklist: `docs/release_readiness.md`.

## Canonical Docs

| Topic | Source of Truth |
|---|---|
| Project overview and setup | `README.md` |
| Backend overview and conventions | `docs/backend.md` |
| Frontend overview and conventions | `docs/frontend.md` |
| Mobile Android wrapper guide | `mobile/README.md` |
| Cross-system security posture | `docs/security.md` |
| Production deployment guide | `docs/deployment.md` |
| Azure concepts and troubleshooting | `docs/azure_concepts.md` |
| Release readiness and final gate | `docs/release_readiness.md` |
| Active implementation/release log | `docs/release_log.md` |
| Entity deletion and lifecycle policy | `docs/entity_deletion_policy.md` |
| Functional requirements and role policy | `docs/functional_requirements.md` |
| Product proposal/context | `docs/product_proposal.md` |
| Database ERD reference | `docs/database_erd.md` |
| Dependency/version decisions | `docs/dependency_version_audit.md` |
| Backend architecture standards | `server/BACKEND_ARCHITECTURE.md` |
| Backend-owned API contract | `server/docs/FRONTEND_BACKEND_CONTRACT.md` |
| Backend-owned error code catalog | `server/docs/API_ERROR_CODES.md` |
| Frontend architecture details | `client/ARCHITECTURE.md` |
| Frontend API integration contract | `client/API_CONTRACT.md` |
| Historical hardening & schema plans | `docs/archive/README.md` |

## Documentation Ownership Rules
- Root `docs/` owns cross-system decisions, release state, and navigation.
- `server/` owns backend implementation standards and emitted API contracts.
- `client/` owns frontend architecture, UI conventions, and client-side API
  integration behavior.
- Historical implementation notes should be summarized into `docs/release_log.md`
  instead of creating new long-lived progress files.
- Completed milestone plans are archived in `docs/archive/`, while active
  specifications remain in canonical docs.
- Do not duplicate endpoint catalogs or architecture rules in root summaries;
  link to the app-local source of truth instead.

## Agent Reading Order
1. `AGENTS.md` for command and coding rules.
2. `docs/README.md` for the current documentation map.
3. `docs/release_readiness.md` and `docs/release_log.md` for active work.
4. `docs/security.md` for auth, CSRF, audit, telemetry, and error policy.
5. `docs/deployment.md` when working on infrastructure, CI/CD, Docker, or Azure
   configuration.
6. `docs/entity_deletion_policy.md` and `docs/archive/` when reviewing entity
   lifecycle rules or refactor history.
7. App-local docs only for the subsystem being changed.
